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
$calculation_mode = isset( $attributes['calculationMode'] ) ? $attributes['calculationMode'] : 'yearly';

?>
<div <?php echo $wrapper_attributes; ?>>
	<div id="time-calculator-widget" class="time-calculator-container" data-calculation-mode="<?php echo esc_attr( $calculation_mode ); ?>">
		<div class="time-calculator-loading">
		</div>
	</div>
</div>