document.addEventListener('DOMContentLoaded', function() {
    const zoomEmbeds = document.querySelectorAll('.zoom-meeting-embed');
    
    zoomEmbeds.forEach(embedElement => {
        initializeZoomMeeting(embedElement);
    });
});

function initializeZoomMeeting(embedElement) {
    let meetingNumber = embedElement.getAttribute('data-meeting-number');
    const meetingPassword = embedElement.getAttribute('data-meeting-password');
    const userName = embedElement.getAttribute('data-user-name');

    if (!meetingNumber) {
        embedElement.innerHTML = '<div class="zoom-meeting-error"><p>Missing meeting number.</p></div>';
        return;
    }

    // Clean and format meeting number - remove spaces, dashes, etc.
    meetingNumber = meetingNumber.replace(/[^0-9]/g, '');
    
    // Validate meeting number (should be 9-11 digits)
    if (meetingNumber.length < 9 || meetingNumber.length > 11) {
        embedElement.innerHTML = '<div class="zoom-meeting-error"><p>Invalid meeting number format. Please enter 9-11 digits.</p></div>';
        return;
    }

    console.log('Formatted meeting number:', meetingNumber);

    // Request signature from server with the formatted meeting number
    requestZoomSignature(meetingNumber, 0).then(response => {
        console.log('AJAX Response:', response); // Debug log
        
        if (!response.success) {
            embedElement.innerHTML = '<div class="zoom-meeting-error"><p>Error: ' + response.data + '</p></div>';
            return;
        }

        const { signature, sdk_key } = response.data;
        
        console.log('SDK Key:', sdk_key); // Debug log
        console.log('Signature:', signature); // Debug log
        
        if (!sdk_key || !signature) {
            embedElement.innerHTML = '<div class="zoom-meeting-error"><p>Missing SDK key or signature from server</p></div>';
            return;
        }

        // Initialize Zoom SDK
        const client = ZoomMtgEmbedded.createClient();

        client.init({
            debug: true, // Enable debug mode to see more details
            zoomAppRoot: embedElement,
            language: 'en-US',
            customize: {
                meetingInfo: ['topic', 'host', 'mn', 'pwd', 'telPwd', 'invite', 'participant', 'dc', 'enctype'],
                toolbar: {
                    buttons: [
                        {
                            text: 'Custom Button',
                            className: 'CustomButton',
                            onClick: () => {
                                console.log('custom button');
                            }
                        }
                    ]
                }
            }
        });

        // Join meeting with server-generated signature
        client.join({
            sdkKey: sdk_key,
            signature: signature,
            meetingNumber: meetingNumber,
            password: meetingPassword || '',
            userName: userName,
            userEmail: '', // Optional but sometimes helps
            passWord: meetingPassword || '', // Alternative password field
            tk: '' // Leave empty for web SDK
        }).catch(error => {
            console.error('Zoom join error:', error);
            let errorMessage = 'Error joining meeting';
            
            if (error.errorCode === 3706) {
                errorMessage = 'Meeting not found or not active. Please check:<br>• Meeting number is correct<br>• Meeting has started<br>• Meeting doesn\'t require registration';
            } else if (error.errorCode === 3712) {
                errorMessage = 'Invalid meeting password';
            } else if (error.errorCode === 10000) {
                errorMessage = 'SDK version not supported';
            } else if (error.errorCode === 200) {
                errorMessage = 'Failed to join meeting. Please check:<br>• Meeting is currently active<br>• You have permission to join<br>• Meeting allows SDK clients<br>• Try refreshing the page';
            }
            
            embedElement.innerHTML = `<div class="zoom-meeting-error"><p>${errorMessage}</p><small>Error code: ${error.errorCode}</small></div>`;
        });

    }).catch(error => {
        console.error('Error requesting signature:', error);
        embedElement.innerHTML = '<div class="zoom-meeting-error"><p>Error initializing Zoom meeting.</p></div>';
    });
}

// Request signature from server via AJAX
function requestZoomSignature(meetingNumber, role) {
    return new Promise((resolve, reject) => {
        // Check if AJAX variables are available
        if (typeof zoomMeetingAjax === 'undefined') {
            reject('AJAX configuration not found');
            return;
        }

        const formData = new FormData();
        formData.append('action', 'zoom_generate_signature');
        formData.append('meeting_number', meetingNumber);
        formData.append('role', role);
        formData.append('nonce', zoomMeetingAjax.nonce);

        fetch(zoomMeetingAjax.ajaxUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            resolve(data);
        })
        .catch(error => {
            reject(error);
        });
    });
}