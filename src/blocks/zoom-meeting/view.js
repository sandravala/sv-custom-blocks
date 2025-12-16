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

	// Show name input form first
	showNameInputForm(
		embedElement,
		meetingNumber,
		meetingPassword,
		defaultUserName,
	);
}

function showNameInputForm(
	embedElement,
	meetingNumber,
	meetingPassword,
	defaultUserName,
) {
	embedElement.innerHTML = `
		<div class="zoom-name-input">
			<h3>Join Zoom Meeting</h3>
			<div class="input-group">
				<label for="zoom-user-name">Your Name:</label>
				<input type="text" id="zoom-user-name" value="${defaultUserName}" placeholder="Enter your name" />
			</div>
			<button id="join-meeting-btn" class="join-btn">Join Meeting</button>
		</div>
	`;

	const nameInput = embedElement.querySelector("#zoom-user-name");
	const joinBtn = embedElement.querySelector("#join-meeting-btn");

	joinBtn.addEventListener("click", () => {
		const userName = nameInput.value.trim() || defaultUserName;
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

			// Calculate sizes within available space
			const containerWidth = embedElement.offsetWidth;
			const videoWidth = Math.min(800, containerWidth - 40);
			const videoHeight = Math.round(videoWidth * 9 / 16); // 16:9 ratio
			// Initialize Zoom SDK
			const client = ZoomMtgEmbedded.createClient();

			client.init({
				zoomAppRoot: embedElement,
				language: "en-US",
				patchJsMedia: true,
                maximumVideosInGalleryView: 1,
                leaveOnPageUnload: false,
				customize: {
					video: {
						isResizable: false,
						defaultViewType: "speaker",
                        viewSizes: {
                            default: {
                                width: videoWidth,
                                height: videoHeight
                            }
                        }
					},
					meetingInfo: ["topic", "host", "mn"],
				},
			}).then(() => {
				// Debug: Log any elements that might be overflowing
				const containerRect = embedElement.getBoundingClientRect();
				console.log('Container bottom:', containerRect.bottom);
				
				// Check for overflowing Zoom elements after a delay (let them render)
				setTimeout(() => {
					const allZoomElements = document.querySelectorAll('[class*="zmwebsdk"], [class*="zoom-"], .zmmtg-root, #zmmtg-root');
					console.log('Found Zoom elements:', allZoomElements.length);
					
					allZoomElements.forEach((el, index) => {
						const rect = el.getBoundingClientRect();
						if (rect.bottom > containerRect.bottom + 50) { // 50px tolerance
							console.log(`OVERFLOWING ELEMENT ${index}:`, {
								className: el.className,
								id: el.id,
								bottom: rect.bottom,
								containerBottom: containerRect.bottom,
								overflow: rect.bottom - containerRect.bottom,
								element: el
							});
							
							// Try to reposition overflowing elements
							if (el.style) {
								el.style.maxHeight = '500px';
								el.style.bottom = 'auto';
								el.style.top = containerRect.top + 'px';
							}
						}
					});
				}, 2000); // Wait 2 seconds for elements to fully render
			});

			// Join meeting with server-generated signature
			client
				.join({
					signature: signature,
					meetingNumber: meetingNumber,
					password: meetingPassword || "",
					userName: userName,
					userEmail: "", // Optional but sometimes helps
					passWord: meetingPassword || "", // Alternative password field
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
