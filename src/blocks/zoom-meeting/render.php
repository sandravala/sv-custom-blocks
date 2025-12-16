<?php
$meeting_number = isset($attributes['meetingNumber']) ? sanitize_text_field($attributes['meetingNumber']) : '';
$meeting_password = isset($attributes['meetingPassword']) ? sanitize_text_field($attributes['meetingPassword']) : '';
$user_name = isset($attributes['userName']) ? sanitize_text_field($attributes['userName']) : 'Guest User';
$width = isset($attributes['width']) ? sanitize_text_field($attributes['width']) : '100%';
$height = isset($attributes['height']) ? sanitize_text_field($attributes['height']) : '600px';

if (empty($meeting_number)) {
    return '<div class="zoom-meeting-error"><p>Please configure your Zoom meeting number in the block settings.</p></div>';
}

// Check if Zoom SDK credentials are configured (but don't expose them)
try {
    $encrypted_sdk_key = get_option('sv_zoom_sdk_key');
    $encrypted_sdk_secret = get_option('sv_zoom_sdk_secret');
    
    if (empty($encrypted_sdk_key) || empty($encrypted_sdk_secret)) {
        return '<div class="zoom-meeting-error"><p>Zoom SDK credentials not configured in plugin settings.</p></div>';
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
    >
        <div class="zoom-loading">
            <p>Loading Zoom meeting...</p>
        </div>
    </div>
</div>

<script src="https://source.zoom.us/3.8.10/lib/vendor/react.min.js"></script>
<script src="https://source.zoom.us/3.8.10/lib/vendor/react-dom.min.js"></script>
<script src="https://source.zoom.us/3.8.10/lib/vendor/redux.min.js"></script>
<script src="https://source.zoom.us/3.8.10/lib/vendor/redux-thunk.min.js"></script>
<script src="https://source.zoom.us/3.8.10/lib/vendor/lodash.min.js"></script>
<script src="https://source.zoom.us/3.8.10/zoom-meeting-embedded-3.8.10.min.js"></script>