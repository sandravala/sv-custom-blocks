document.addEventListener("DOMContentLoaded", function () {
	const zoomEmbeds = document.querySelectorAll(".zoom-meeting-embed");

	zoomEmbeds.forEach((embedElement) => {
		initializeZoomMeeting(embedElement);
	});
});

function initializeZoomMeeting(embedElement) {
	let meetingNumber = embedElement.getAttribute("data-meeting-number");
	const meetingPassword = embedElement.getAttribute("data-meeting-password");
	const defaultUserName = embedElement.getAttribute("data-user-name");

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
		);
	} else {
		startZoomMeeting(embedElement, meetingNumber, meetingPassword, savedName);
	}
}

function showNameInputForm(
	embedElement,
	meetingNumber,
	meetingPassword,
	defaultUserName,
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
		console.log(nameInput.value.trim());
		const userName = nameInput.value.trim() || defaultUserName;
		console.log("Using user name:", userName);
		// save to local storage for future use for 24 hours
		localStorage.setItem("zoomUserName", userName);
		startZoomMeeting(embedElement, meetingNumber, meetingPassword, userName);
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

			console.log(`Device: ${isMobile ? "mobile" : "desktop"}`);
			console.log(`Container: ${containerWidth}x${containerHeight}`);
			console.log(
				`Video: ${Math.round(videoWidth)}x${Math.round(videoHeight)}`,
			);
			console.log(`UUser name: ${userName}`);
			// ...existing code...

			// get element with aria-label="Zoom app container"
			const zoomAppContainer = document
				.querySelector('[aria-label="Zoom app container"]');

			// Initialize Zoom SDK
			const client = ZoomMtgEmbedded.createClient();

			client.init({
				zoomAppRoot: embedElement,
				language: "en-US",
				patchJsMedia: true,
				maximumVideosInGalleryView: 1,
				leaveOnPageUnload: true,
				customize: {
					video: {
						isResizable: true,
						defaultViewType: "speaker",
						// viewSizes: {
						// 	default: {
						// 		width: videoWidth,
						// 		height: videoHeight,
						// 	},
						// },
					},
					chat: {
						popper: {
							anchorElement: embedElement,
							placement: "bottom-end", // Opens to left of anchor
						},
					},
					participants: {
						popper: {
							anchorElement: zoomAppContainer,
							placement: "right", // Opens above anchor
						},
					},
					settings: {
						popper: {
							anchorElement: zoomAppContainer,
							placement: "right",
						},
					},
					meetingInfo: ["topic", "host", "mn"],
				},
			});

			// Debug: Monitor for overflowing Zoom elements
			// client.on("video-resize", () => {
			// 	console.log("Video resized event detected");
			// }).then(() => {
			// 	// Debug: Log any elements that might be overflowing
			// 	const containerRect = embedElement.getBoundingClientRect();
			// 	console.log('Container bottom:', containerRect.bottom);

			// 	// Check for overflowing Zoom elements after a delay (let them render)
			// 	setTimeout(() => {
			// 		const allZoomElements = document.querySelectorAll('[class*="zmwebsdk"], [class*="zoom-"], .zmmtg-root, #zmmtg-root');
			// 		console.log('Found Zoom elements:', allZoomElements.length);

			// 		allZoomElements.forEach((el, index) => {
			// 			const rect = el.getBoundingClientRect();
			// 			if (rect.bottom > containerRect.bottom + 50) { // 50px tolerance
			// 				console.log(`OVERFLOWING ELEMENT ${index}:`, {
			// 					className: el.className,
			// 					id: el.id,
			// 					bottom: rect.bottom,
			// 					containerBottom: containerRect.bottom,
			// 					overflow: rect.bottom - containerRect.bottom,
			// 					element: el
			// 				});

			// 				// Try to reposition overflowing elements
			// 				if (el.style) {
			// 					el.style.maxHeight = '500px';
			// 					el.style.bottom = 'auto';
			// 					el.style.top = containerRect.top + 'px';
			// 				}
			// 			}
			// 		});
			// 	}, 2000); // Wait 2 seconds for elements to fully render
			// });
try {
    sessionStorage.removeItem('zmmtg-root__username');
    sessionStorage.removeItem('zmmtg-root__useremail');
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
				.catch((error) => {
					console.error("Zoom join error:", error);
					let errorMessage = "Error joining meeting";

					if (error.errorCode === 3706) {
						errorMessage =
							"Meeting not found or not active. Please check:<br>• Meeting number is correct<br>• Meeting has started<br>• Meeting doesn't require registration";
					} else if (error.errorCode === 3712) {
						errorMessage = "Invalid meeting password";
					} else if (error.errorCode === 3004) {
						errorMessage =
							"Meeting passcode is required or incorrect.<br>• Check if meeting requires a passcode<br>• Verify the passcode is correct<br>• Try without passcode if meeting is open";
					} else if (error.errorCode === 10000) {
						errorMessage = "SDK version not supported";
					} else if (error.errorCode === 200) {
						errorMessage =
							"Failed to join meeting. Please check:<br>• Meeting is currently active<br>• You have permission to join<br>• Meeting allows SDK clients<br>• Try refreshing the page";
					}

					embedElement.innerHTML = `<div class="zoom-meeting-error"><p>${errorMessage}</p><small>Error code: ${error.errorCode}</small></div>`;
				});
		})
		.catch((error) => {
			console.error("Error requesting signature:", error);
			embedElement.innerHTML =
				'<div class="zoom-meeting-error"><p>Error initializing Zoom meeting.</p></div>';
		});
}

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
				reject(error);
			});
	});
}
