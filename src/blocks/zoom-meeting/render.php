<?php
$meeting_number = isset($attributes['meetingNumber']) ? sanitize_text_field($attributes['meetingNumber']) : '';
$meeting_password = isset($attributes['meetingPassword']) ? sanitize_text_field($attributes['meetingPassword']) : '';
$user_name = isset($attributes['userName']) ? sanitize_text_field($attributes['userName']) : 'Guest User';
$width = isset($attributes['width']) ? sanitize_text_field($attributes['width']) : '100%';
$height = isset($attributes['height']) ? sanitize_text_field($attributes['height']) : '600px';

if (empty($meeting_number)) {
    return '<div class="zoom-meeting-error"><p>Please configure your Zoom meeting number in the block settings.</p></div>';
}

// Get Zoom SDK credentials from encrypted settings
try {
    $encrypted_sdk_key = get_option('sv_zoom_sdk_key');
    $encrypted_sdk_secret = get_option('sv_zoom_sdk_secret');
    
    if (empty($encrypted_sdk_key) || empty($encrypted_sdk_secret)) {
        return '<div class="zoom-meeting-error"><p>Zoom SDK credentials not configured in plugin settings.</p></div>';
    }
    
    $data_encryption = new BC_Data_Encryption();
    $sdk_key = $data_encryption->decrypt($encrypted_sdk_key);
    $sdk_secret = $data_encryption->decrypt($encrypted_sdk_secret);
    
    if (empty($sdk_key) || empty($sdk_secret)) {
        return '<div class="zoom-meeting-error"><p>Failed to decrypt Zoom SDK credentials.</p></div>';
    }
} catch (Exception $e) {
    return '<div class="zoom-meeting-error"><p>Error accessing Zoom SDK credentials: ' . esc_html($e->getMessage()) . '</p></div>';
}

$unique_id = 'zoom-meeting-' . uniqid();
?>

<div class="zoom-meeting-container" style="width: <?php echo esc_attr($width); ?>;">
    <div 
        id="<?php echo esc_attr($unique_id); ?>" 
        class="zoom-meeting-embed" 
        style="width: 100%; height: <?php echo esc_attr($height); ?>;"
        data-meeting-number="<?php echo esc_attr($meeting_number); ?>"
        data-meeting-password="<?php echo esc_attr($meeting_password); ?>"
        data-user-name="<?php echo esc_attr($user_name); ?>"
        data-sdk-key="<?php echo esc_attr($sdk_key); ?>"
        data-sdk-secret="<?php echo esc_attr($sdk_secret); ?>"
    >
        <div class="zoom-loading">
            <p>Loading Zoom meeting...</p>
        </div>
    </div>
</div>

<script src="https://source.zoom.us/2.18.0/lib/vendor/react.min.js"></script>
<script src="https://source.zoom.us/2.18.0/lib/vendor/react-dom.min.js"></script>
<script src="https://source.zoom.us/2.18.0/lib/vendor/redux.min.js"></script>
<script src="https://source.zoom.us/2.18.0/lib/vendor/redux-thunk.min.js"></script>
<script src="https://source.zoom.us/2.18.0/lib/vendor/lodash.min.js"></script>
<script src="https://source.zoom.us/2.18.0/zoom-meeting-embedded-2.18.0.min.js"></script>