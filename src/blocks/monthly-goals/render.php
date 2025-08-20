<?php
/**
 * Monthly Goals Block - Render template
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

$attrs = is_array($attributes) ? $attributes : [];

$month_selection_mode = isset($attrs['sv_cb_mg_month_selection_mode']) 
    ? $attrs['sv_cb_mg_month_selection_mode'] 
    : 'limited';

// Generate unique block ID
$block_id = 'monthly-goals-' . wp_generate_uuid4();

?>
<div 
    id="<?php echo esc_attr($block_id); ?>" 
    class="sv-monthly-goals-block"
    data-month-selection-mode="<?php echo esc_attr($month_selection_mode); ?>"
    data-is-logged-in="<?php echo esc_attr(is_user_logged_in() ? 'true' : 'false'); ?>"
>
    <?php if (!is_user_logged_in()): ?>
        <div class="sv-block-login-notice">
            <p><?php _e('Please log in to access your monthly goals.', 'sv-custom-blocks'); ?></p>
        </div>
    <?php else: ?>
        <!-- Monthly Goals Component loads here via view.js -->
        <div class="monthly-goals-loading">
            <p><?php _e('Loading monthly goals...', 'sv-custom-blocks'); ?></p>
        </div>
    <?php endif; ?>
</div>