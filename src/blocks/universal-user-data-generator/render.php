<?php
/**
 * Universal User Data Generator - Render template
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

$attrs = is_array($attributes) ? $attributes : [];


$instance_id = isset($attrs['instanceId']) && $attrs['instanceId'] !== ''
    ? $attrs['instanceId']
    : wp_generate_uuid4();

$selected_component = isset($attrs['selectedComponent']) 
    ? $attrs['selectedComponent'] 
    : 'monthly-time-allocation';

?>
<div
    id="universal-user-data-generator-block"
    data-block-id="<?php echo esc_attr($instance_id); ?>"
    data-component="<?php echo esc_attr($selected_component); ?>"
    data-is-logged-in="<?php echo esc_attr(is_user_logged_in() ? 'true' : 'false'); ?>"
>
    <?php if (!is_user_logged_in()): ?>
        <div class="sv-block-login-notice">
            <p><?php _e('Please log in to access your data management tools.', 'sv-custom-blocks'); ?></p>
        </div>
    <?php else: ?>
        <!-- Component loads here via view.js -->
        <div class="universal-user-data-generator-loading">
            <p><?php _e('Loading data component...', 'sv-custom-blocks'); ?></p>
        </div>
    <?php endif; ?>
</div>