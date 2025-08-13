<?php
/**
 * Smart Goal Generator – Dynamic render callback
 *
 * Outputs only the minimal markup needed for the frontend script:
 * - a stable block instance id (saved as an attribute)
 * - the current post id
 *
 * Your AJAX handler should:
 *  1) receive block_id + post_id,
 *  2) parse the post content,
 *  3) find this block by instanceId,
 *  4) use the saved attributes (model, prompt, schema, etc.) to call the Responses API.
 *
 * Security notes:
 * - Do NOT trust FE for model/prompt etc. Resolve them server-side from saved attributes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * $attributes comes from the saved block attributes.
 * We expect an 'instanceId' attribute set by edit.js on first insert.
 */
$attrs = is_array( $attributes ) ? $attributes : [];

// Prefer the saved instanceId; fall back to a generated one (not ideal — add instanceId in edit.js).
$instance_id = isset( $attrs['instanceId'] ) && is_string( $attrs['instanceId'] ) && $attrs['instanceId'] !== ''
	? $attrs['instanceId']
	: wp_generate_uuid4();

$post_id = get_the_ID();

// A fixed wrapper ID for your current view.js which queries "#smart-goal-generator".
$wrapper_id = 'smart-goal-generator';

// Optional: add extra BEM/utility classes for styling.
$classes = 'smart-goal-generator';
?>
<div
	id="<?php echo esc_attr( $wrapper_id ); ?>"
	class="<?php echo esc_attr( $classes ); ?>"
	data-block-id="<?php echo esc_attr( $instance_id ); ?>"
	data-post-id="<?php echo esc_attr( $post_id ); ?>"
	data-use-responses-api="<?php echo esc_attr( $attrs['useResponsesApi'] ?? 'true' ); ?>"
	<?php if ( isset( $attrs['assistantId'] ) && ! empty( $attrs['assistantId'] ) ) : ?>
	data-assistant-id="<?php echo esc_attr( $attrs['assistantId'] ); ?>"
	<?php endif; ?>
>
	<div class="input-container">
		<!--
			React component will be mounted here by view.js
			Keep minimal, accessible placeholders for no‑JS fallback.
		-->
		<noscript>
			<p><?php esc_html_e( 'This block requires JavaScript to generate SMART goals.', 'sv-custom-blocks' ); ?></p>
		</noscript>
	</div>
</div>
