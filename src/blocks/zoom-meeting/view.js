document.addEventListener("DOMContentLoaded", function () {

	const zoomEmbeds = document.querySelectorAll(".zoom-meeting-embed");

	zoomEmbeds.forEach((embedElement) => {
		initializeZoomMeeting(embedElement);
	});

// 	window.addEventListener('unhandledrejection', function(event) {
// 	console.log('Unhandled rejection:', event.reason);
// 	console.log('Promise:', event.promise);
// });
});


function initializeZoomMeeting(embedElement) {
	let meetingNumber = embedElement.getAttribute("data-meeting-number");
	const meetingPassword = embedElement.getAttribute("data-meeting-password");
	const defaultUserName = embedElement.getAttribute("data-user-name");
	const alternativeLink = embedElement.getAttribute("data-alternative-link");

	if (!meetingNumber) {
		embedElement.innerHTML =
			'<div class="zoom-meeting-error"><p>Missing meeting number.</p></div>';
		return;
	}

	// Show name input form first if no saved name
	const savedName = localStorage.getItem("zoomUserName");
	if (!savedName || savedName.trim() === "") {
		showNameInputForm(
			embedElement,
			meetingNumber,
			meetingPassword,
			defaultUserName,
			alternativeLink,
		);
	} else {
		startZoomMeeting(embedElement, meetingNumber, meetingPassword, savedName, alternativeLink);
	}
}

function showNameInputForm(
	embedElement,
	meetingNumber,
	meetingPassword,
	defaultUserName,
	alternativeLink,
) {
	embedElement.innerHTML = `
		<div class="zoom-name-input">
			<h3>Prisijungti</h3>
			<div class="input-group">
				<label for="zoom-user-name">Vardas:</label>
				<input type="text" id="zoom-user-name" value="${defaultUserName}" placeholder="Įvesk savo vardą" />
			</div>
			<button id="join-meeting-btn" class="join-btn">Jungtis</button>
		</div>
	`;

	const nameInput = embedElement.querySelector("#zoom-user-name");
	const joinBtn = embedElement.querySelector("#join-meeting-btn");

	joinBtn.addEventListener("click", () => {
		const userName = nameInput.value.trim() || defaultUserName;
		// save to local storage for future use for 24 hours
		localStorage.setItem("zoomUserName", userName);
		startZoomMeeting(embedElement, meetingNumber, meetingPassword, userName, alternativeLink);
	});

	nameInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			joinBtn.click();
		}
	});
}

function startZoomMeeting(
	embedElement,
	meetingNumber,
	meetingPassword,
	userName,
	alternativeLink,
) {
	// Clean and format meeting number - remove spaces, dashes, etc.
	meetingNumber = meetingNumber.replace(/[^0-9]/g, "");

	// Validate meeting number (should be 9-11 digits)
	if (meetingNumber.length < 9 || meetingNumber.length > 11) {
		embedElement.innerHTML =
			'<div class="zoom-meeting-error"><p>Invalid meeting number format. Please enter 9-11 digits.</p></div>';
		return;
	}

	// Request signature from server with the formatted meeting number
	requestZoomSignature(meetingNumber, 0)
		.then((response) => {
			//console.log("AJAX Response:", response); // Debug log

			if (!response.success) {
				embedElement.innerHTML =
					'<div class="zoom-meeting-error"><p>Error: ' +
					response.data +
					"</p></div>";
				return;
			}

			

			const { signature, sdk_key } = response.data;

			if (!sdk_key || !signature) {
				embedElement.innerHTML =
					'<div class="zoom-meeting-error"><p>Missing SDK key or signature from server</p></div>';
				return;
			}

			// ...existing code...

			// Calculate sizes within available space
			const containerWidth = embedElement.offsetWidth;
			const containerHeight = embedElement.offsetHeight;

			// Detect mobile (or just use width as indicator)
			const isMobile = containerWidth < 600;

			// Chrome height varies: mobile has compact controls but still ~80-100px
			const chromeHeight = isMobile ? 80 : 100;

			// On mobile: width is usually the limiting factor
			// On desktop: could be either
			let videoWidth, videoHeight;

			if (isMobile) {
				// Mobile: fit to width, let height follow
				videoWidth = containerWidth;
				videoHeight = Math.min(
					(videoWidth * 9) / 16 + chromeHeight,
					containerHeight,
				);
			} else {
				// Desktop: fit to container, prefer width
				videoWidth = containerWidth;
				videoHeight = (videoWidth * 9) / 16 + chromeHeight;

				// If too tall, recalculate from height
				if (videoHeight > containerHeight) {
					videoHeight = containerHeight;
					videoWidth = ((videoHeight - chromeHeight) * 16) / 9;
				}
			}

			// Zoom SDK has minimum sizes
			const MIN_WIDTH = isMobile ? 300 : 400;
			const MIN_HEIGHT = isMobile ? 200 : 300;

			videoWidth = Math.max(videoWidth, MIN_WIDTH);
			videoHeight = Math.max(videoHeight, MIN_HEIGHT);
			// ...existing code...

			// get element with aria-label="Zoom app container"
			const zoomAppContainer = document.querySelector(
				'[aria-label="Zoom app container"]',
			);

			const videoContainer = document.querySelector("#video-anchor");
			const chatContainer = document.querySelector("#chat-anchor");

			// Initialize Zoom SDK
			const client = ZoomMtgEmbedded.createClient();

			client.init({
				zoomAppRoot: embedElement,
				language: "en-US",
				patchJsMedia: true,
				//maximumVideosInGalleryView: 1,
				leaveOnPageUnload: true,
				customize: {
					video: {
						isResizable: true,
						defaultViewType: "gallery",
						viewSizes: {
							default: {
								width: 100,
								height: 56,
							},
						},
						popper: {
							anchorElement: videoContainer,
							placement: "top", // Opens below anchor
							modifiers: [
								{
									name: "preventOverflow",
									options: {
										boundary: embedElement,
									},
								},
							],
						},
					},
					chat: {
						notificationCls: {
							anchorElement: chatContainer,
							placement: "bottom", // Opens to left of anchor
							// modifiers: [
							// 	{
							// 		name: "preventOverflow",
							// 		options: {
							// 			boundary: embedElement,
							// 		},
							// 	},
							// 	// {
							// 	// 	name: "offset",
							// 	// 	options: {
							// 	// 		offset: [0, 10], // [skidding, distance]
							// 	// 	},
							// 	// },

							// ],
						},
						popper: {
							anchorElement: chatContainer,
							placement: "left-start", // Opens to left of anchor
							modifiers: [
								{
									name: "preventOverflow",
									options: {
										boundary: embedElement,
									},
								},
								{
									name: "flip",
									options: {
										fallbackPlacements: ["left", "bottom", "top"],
									},
								},
							],
						},
					},
					participants: {
						popper: {
							anchorElement: chatContainer,
							placement: "left-start", // Opens to left of anchor
							modifiers: [
								{
									name: "preventOverflow",
									options: {
										boundary: embedElement,
									},
								},
								{
									name: "flip",
									options: {
										fallbackPlacements: ["left", "bottom", "top"],
									},
								},
							],
						},
					},
					settings: {
						popper: {
							anchorElement: chatContainer,
							placement: "left-start", // Opens to left of anchor
							modifiers: [
								{
									name: "preventOverflow",
									options: {
										boundary: embedElement,
									},
								},
								{
									name: "flip",
									options: {
										fallbackPlacements: ["bottom", "top"],
									},
								},
							],
						},
					},
					meetingInfo: ["topic", "host", "mn"],
				},
			});

			try {
				sessionStorage.removeItem("zmmtg-root__username");
				sessionStorage.removeItem("zmmtg-root__useremail");
			} catch (e) {}

			// Join meeting with server-generated signature
			client
				.join({
					signature: signature,
					meetingNumber: meetingNumber,
					password: meetingPassword || "",
					userName: userName,
					tk: "", // Leave empty for web SDK
				})
				.then(() => {
					//client.setViewType({ viewType: "active" }); // "minimized" | "speaker" | "ribbon" | "gallery" | "active"
					// Wait 2 seconds for elements to fully render

					// Listen for meeting end
	client.on("connection-change", (payload) => {
		console.log("Connection change:", payload);
		if (payload.state === "Closed") {
			showMeetingEndedMessage(embedElement, alternativeLink);
		}
	});
				})
				.catch((error) => {
					console.error("Zoom join error:", error);
					let errorMessage = "Kažkas nepavyko ;(";
					if (alternativeLink && alternativeLink.trim() !== "") {
						errorMessage += ` Pamėgink prisijungti prie zoom tiesiogiai per šią nuorodą ${alternativeLink}`;
					} else {
						errorMessage += ` Pamėgink perkrauti puslapį ir bandyk dar kartą.`;
					}
					if (error.errorCode === 3008 || error.errorCode === 3000) {
						errorMessage =
							"Zoom'as dar neprasidėjo. Palauk, perkrauk puslapį ir bandyk dar kartą.";
						setTimeout(() => {
							location.reload();
						}, 30000);
					}

					embedElement.innerHTML = `<div class="zoom-meeting-error"><p>${errorMessage}</p></div>`;
				});
		})
		.catch((error) => {
			console.error("Error requesting signature:", error);
			let errorMessage = "Kažkas nepavyko ;(";
			if (alternativeLink && alternativeLink.trim() !== "") {
				errorMessage += ` Pamėgink prisijungti prie zoom tiesiogiai per šią nuorodą ${alternativeLink}`;
			} else {
				errorMessage += ` Pamėgink perkrauti puslapį ir bandyk dar kartą.`;
			}
			embedElement.innerHTML = `<div class="zoom-meeting-error"><p>${errorMessage}</p></div>`;
		});
}

function showMeetingEndedMessage(embedElement) {
	let message = `
		<div class="zoom-meeting-ended">
			<h3>susitikimas baigėsi</h3>
			<p>ačiū, kad dalyvavai!</p>
	`;
	
	message += `</div>`;
	
	embedElement.innerHTML = message;
}

function showOnlyMyVideo() {
	const allContainers = document.querySelectorAll("video-player-container");
	const myVideo = document.querySelector('[aria-label="Video for Sandra"]');

	if (allContainers.length === 0) {
		return false; // Not ready yet
	}

	// Hide all
	allContainers.forEach((container) => {
		container.style.display = "none";
	});

	// Show only Sandra's
	if (myVideo) {
		const myContainer = myVideo.closest("video-player-container");
		if (myContainer) {
			myContainer.style.display = "block";
			return true; // Success
		}
	}

	return false;
}

function checkForCanvas() {
	const canvas = document.querySelector('canvas[aria-label="Screen share"]');
	if (canvas) {
		return true;
	}
	return false;
}

// Keep trying until it works
let attempts = 0;
const maxAttempts = 20; // Try for ~20 seconds

const checkInterval = setInterval(() => {
	attempts++;
	const success = showOnlyMyVideo();

	if (success || attempts >= maxAttempts) {
		clearInterval(checkInterval);
	}
}, 1000); // Check every second

// Request signature from server via AJAX
function requestZoomSignature(meetingNumber, role) {
	return new Promise((resolve, reject) => {
		// Check if AJAX variables are available
		if (typeof zoomMeetingAjax === "undefined") {
			reject("AJAX configuration not found");
			return;
		}

		const formData = new FormData();
		formData.append("action", "zoom_generate_signature");
		formData.append("meeting_number", meetingNumber);
		formData.append("role", role);
		formData.append("nonce", zoomMeetingAjax.nonce);

		fetch(zoomMeetingAjax.ajaxUrl, {
			method: "POST",
			body: formData,
		})
			.then((response) => response.json())
			.then((data) => {
				resolve(data);
			})
			.catch((error) => {
				//console.error("AJAX request error:", error);
				reject(error);
			});
	});

}
