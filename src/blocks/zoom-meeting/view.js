document.addEventListener('DOMContentLoaded', function() {
    const zoomEmbeds = document.querySelectorAll('.zoom-meeting-embed');
    
    zoomEmbeds.forEach(embedElement => {
        initializeZoomMeeting(embedElement);
    });
});

function initializeZoomMeeting(embedElement) {
    const meetingNumber = embedElement.getAttribute('data-meeting-number');
    const meetingPassword = embedElement.getAttribute('data-meeting-password');
    const userName = embedElement.getAttribute('data-user-name');
    const sdkKey = embedElement.getAttribute('data-sdk-key');
    const sdkSecret = embedElement.getAttribute('data-sdk-secret');

    if (!meetingNumber || !sdkKey || !sdkSecret) {
        embedElement.innerHTML = '<div class="zoom-meeting-error"><p>Missing required Zoom configuration.</p></div>';
        return;
    }

    // Initialize Zoom SDK
    const client = ZoomMtgEmbedded.createClient();

    let meetingSDKElement = embedElement;

    client.init({
        debug: false,
        zoomAppRoot: meetingSDKElement,
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

    // Generate signature for meeting
    generateSignature(meetingNumber, 0, sdkKey, sdkSecret).then(signature => {
        client.join({
            signature: signature,
            meetingNumber: meetingNumber,
            password: meetingPassword,
            userName: userName,
        });
    }).catch(error => {
        console.error('Error generating signature:', error);
        embedElement.innerHTML = '<div class="zoom-meeting-error"><p>Error initializing Zoom meeting.</p></div>';
    });
}

// Generate JWT signature for Zoom SDK
function generateSignature(meetingNumber, role, sdkKey, sdkSecret) {
    return new Promise((resolve, reject) => {
        // In production, this should be done server-side for security
        // This is a simplified client-side implementation
        const iat = Math.round(new Date().getTime() / 1000) - 30;
        const exp = iat + 60 * 60 * 2;

        const oHeader = { alg: 'HS256', typ: 'JWT' };
        const oPayload = {
            iss: sdkKey,
            exp: exp,
            alg: 'HS256',
            appKey: sdkKey,
            tokenExp: exp,
            iat: iat,
            aud: 'zoom'
        };

        try {
            // Note: In production, move signature generation to server-side
            const sHeader = JSON.stringify(oHeader);
            const sPayload = JSON.stringify(oPayload);
            const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);
            resolve(signature);
        } catch (error) {
            reject(error);
        }
    });
}

// Add KJUR library for JWT if not already included
if (typeof KJUR === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsrsasign@11.1.0/lib/jsrsasign-all-min.js';
    document.head.appendChild(script);
}