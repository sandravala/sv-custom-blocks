<?php
/**
 * Zoom SDK Signature Handler
 * Handles server-side JWT signature generation for Zoom meetings
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enqueue scripts and localize AJAX data for zoom meetings
 */
function zoom_enqueue_meeting_scripts() {
    // Only enqueue on pages that have the zoom meeting block
    if (has_block('sv-custom-blocks/zoom-meeting')) {
        wp_localize_script('sv-custom-blocks-zoom-meeting-view-script', 'zoomMeetingAjax', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('zoom_signature_nonce'),
        ));
    }
}
add_action('wp_enqueue_scripts', 'zoom_enqueue_meeting_scripts');

/**
 * AJAX handler to generate Zoom JWT signature server-side
 */
function zoom_generate_signature() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'zoom_signature_nonce')) {
        wp_die('Security check failed');
    }

    $meeting_number = isset($_POST['meeting_number']) ? sanitize_text_field($_POST['meeting_number']) : '';
    $role = isset($_POST['role']) ? intval($_POST['role']) : 0;

    if (empty($meeting_number)) {
        wp_send_json_error('Missing meeting number');
        return;
    }

    try {
        // Get encrypted SDK credentials
        $encrypted_sdk_key = get_option('sv_zoom_sdk_key');
        $encrypted_sdk_secret = get_option('sv_zoom_sdk_secret');
        
        if (empty($encrypted_sdk_key) || empty($encrypted_sdk_secret)) {
            wp_send_json_error('Zoom SDK credentials not configured');
            return;
        }
        
        $data_encryption = new BC_Data_Encryption();
        $sdk_key = $data_encryption->decrypt($encrypted_sdk_key);
        $sdk_secret = $data_encryption->decrypt($encrypted_sdk_secret);
        
        if (empty($sdk_key) || empty($sdk_secret)) {
            wp_send_json_error('Failed to decrypt Zoom SDK credentials');
            return;
        }

        // Generate JWT signature
        $signature = zoom_create_jwt_signature($meeting_number, $role, $sdk_key, $sdk_secret);
        
        if ($signature) {
            // Debug log (remove in production)
            error_log("Generated signature for meeting {$meeting_number}: " . substr($signature, 0, 50) . "...");
            
            wp_send_json_success(array(
                'signature' => $signature,
                'sdk_key' => $sdk_key // Only send key, never secret
            ));
        } else {
            wp_send_json_error('Failed to generate signature');
        }

    } catch (Exception $e) {
        wp_send_json_error('Error: ' . $e->getMessage());
    }
}

// Register AJAX handlers for both logged-in and non-logged-in users
add_action('wp_ajax_zoom_generate_signature', 'zoom_generate_signature');
add_action('wp_ajax_nopriv_zoom_generate_signature', 'zoom_generate_signature');

/**
 * Generate JWT signature for Zoom SDK
 * 
 * @param string $meeting_number The meeting number
 * @param int $role User role (0 = attendee, 1 = host)
 * @param string $sdk_key Zoom SDK key
 * @param string $sdk_secret Zoom SDK secret
 * @return string|false JWT signature or false on failure
 */
function zoom_create_jwt_signature($meeting_number, $role, $sdk_key, $sdk_secret) {
    $header = array(
        'alg' => 'HS256',
        'typ' => 'JWT'
    );

    $now = time();
    $payload = array(
        'iss' => $sdk_key,
        'exp' => $now + (60 * 60 * 2), // 2 hours expiry
        'iat' => $now,
        'aud' => 'zoom',
        'appKey' => $sdk_key, // Required for SDK 5.0.0
        'mn' => $meeting_number,
        'role' => $role
    );

    try {
        // Base64 encode header and payload
        $header_encoded = zoom_base64url_encode(json_encode($header));
        $payload_encoded = zoom_base64url_encode(json_encode($payload));
        
        // Create signature
        $signature = hash_hmac('sha256', $header_encoded . '.' . $payload_encoded, $sdk_secret, true);
        $signature_encoded = zoom_base64url_encode($signature);
        
        // Return complete JWT
        return $header_encoded . '.' . $payload_encoded . '.' . $signature_encoded;
        
    } catch (Exception $e) {
        error_log('Zoom JWT generation error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Base64 URL encode helper function
 */
function zoom_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}