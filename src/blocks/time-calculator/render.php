<?php
/**
 * Server-side rendering for the Time Calculator block
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$wrapper_attributes = get_block_wrapper_attributes();

?>
<div <?php echo $wrapper_attributes; ?>>
	<div id="time-calculator-widget" class="time-calculator-container">
		<div class="time-calculator-loading">
			<p><?php _e( 'Kraunama laiko skaičiuoklė...', 'sv-custom-blocks' ); ?></p>
		</div>
	</div>
</div>