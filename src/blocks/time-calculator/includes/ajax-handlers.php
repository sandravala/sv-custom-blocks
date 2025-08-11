<?php
/**
 * AJAX handlers for Time Calculator user preferences
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueue scripts and localize AJAX data for time calculator
 */
function tc_enqueue_calculator_scripts() {
	// Only enqueue on pages that have the time calculator block
	if ( has_block( 'sv-custom-blocks/time-calculator' ) ) {
		wp_localize_script( 'sv-custom-blocks-time-calculator-view-script', 'tcCalculatorAjax', array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'   => wp_create_nonce( 'tc_calculator_nonce' ),
		));
	}
}
add_action( 'wp_enqueue_scripts', 'tc_enqueue_calculator_scripts' );

/**
 * AJAX handler to get user preferences
 */
function tc_get_user_preferences() {
	// Verify nonce
	if ( ! wp_verify_nonce( $_POST['nonce'], 'tc_calculator_nonce' ) ) {
		wp_die( 'Security check failed' );
	}

	// Check if user is logged in
	if ( ! is_user_logged_in() ) {
		wp_send_json_error( 'User not logged in' );
		return;
	}

	$user_id = get_current_user_id();
	$calculation_mode = isset( $_POST['calculation_mode'] ) ? sanitize_text_field( $_POST['calculation_mode'] ) : 'yearly';
	$year = isset( $_POST['year'] ) ? intval( $_POST['year'] ) : null;
	$month = isset( $_POST['month'] ) ? intval( $_POST['month'] ) : null;

	// Get user preferences
	$preferences = get_user_meta( $user_id, 'tc_calculator_preferences', true );

	// Get vacation days based on calculation mode
	if ( $calculation_mode === 'yearly' ) {
		$preferences['vacation_days_yearly'] = get_user_meta( $user_id, 'tc_vacation_days_yearly', true );
	} else {
		$preferences['vacation_days_monthly'] = get_user_meta( $user_id, 'tc_vacation_days_monthly', true );
	}

	//get yearly or monthly preferences based on calculation mode
	$preferences_calc_mode = $preferences[$calculation_mode] ?? array();

	//get only required year and / or month 
	$preferences_to_return = array();

	if ( $calculation_mode === 'yearly' ) {
		$preferences_to_return = $preferences_calc_mode[$year] ?? null;
	} else {
		$monthly_key = "{$year}_{$month}";
		$preferences_to_return = $preferences_calc_mode[$monthly_key] ?? null;
	}

	wp_send_json_success( $preferences_to_return );
}
add_action( 'wp_ajax_tc_get_user_preferences', 'tc_get_user_preferences' );

/**
 * AJAX handler to save user preferences
 */
function tc_save_user_preferences() {
	// Verify nonce
	if ( ! wp_verify_nonce( $_POST['nonce'], 'tc_calculator_nonce' ) ) {
		wp_die( 'Security check failed' );
	}

	// Check if user is logged in
	if ( ! is_user_logged_in() ) {
		wp_send_json_error( 'User not logged in' );
		return;
	}

	$user_id = get_current_user_id();
	$calculation_mode = isset( $_POST['calculation_mode'] ) ? sanitize_text_field( $_POST['calculation_mode'] ) : 'yearly';
	
	// Sanitize and validate inputs
	$year = isset( $_POST['year'] ) ? intval( $_POST['year'] ) : null;
	$month = isset( $_POST['month'] ) ? intval( $_POST['month'] ) : null;
	$working_hours = isset( $_POST['working_hours_yearly'] ) ? floatval( $_POST['working_hours_yearly'] ) : 
					(isset( $_POST['working_hours_monthly'] ) ? floatval( $_POST['working_hours_monthly'] ) : null);
	$vacation_days = isset( $_POST['vacation_days_yearly'] ) ? intval( $_POST['vacation_days_yearly'] ) : 
					(isset( $_POST['vacation_days_monthly'] ) ? intval( $_POST['vacation_days_monthly'] ) : null);

	// Get existing preferences
	$saved_prefs = get_user_meta( $user_id, 'tc_calculator_preferences', true );
	if ( ! $saved_prefs ) {
		$saved_prefs = array(
			'yearly' => array(),
			'monthly' => array()
		);
	}

	$updated = false;

	if ( $calculation_mode === 'yearly' ) {
		// Save yearly preferences
		if ( $year && $year >= 2020 && $year <= 2035 ) {
			$saved_prefs['yearly']['year'] = $year;
			$updated = true;
		}

		if ( $working_hours && $working_hours >= 1 && $working_hours <= 8 ) {
			$saved_prefs['yearly']['working_hours'] = $working_hours;
			$updated = true;
		}

		if ( $vacation_days && $vacation_days >= 20 && $vacation_days <= 50 ) {
			$saved_prefs['yearly']['vacation_days'] = $vacation_days;
			$updated = true;
		}
	} else {
		// Save monthly preferences
		if ( $year && $year >= 2020 && $year <= 2035 && $month && $month >= 1 && $month <= 12 ) {
			$monthly_key = "{$year}_{$month}";
			
			if ( ! isset( $saved_prefs['monthly'][ $monthly_key ] ) ) {
				$saved_prefs['monthly'][ $monthly_key ] = array();
			}

			if ( $working_hours && $working_hours >= 1 && $working_hours <= 8 ) {
				$saved_prefs['monthly'][ $monthly_key ]['working_hours'] = $working_hours;
				$updated = true;
			}

			if ( $vacation_days !== null && $vacation_days >= 0 && $vacation_days <= 10 ) {
				$saved_prefs['monthly'][ $monthly_key ]['vacation_days'] = $vacation_days;
				$updated = true;
			}
		}
	}

	if ( $updated ) {
		update_user_meta( $user_id, 'tc_calculator_preferences', $saved_prefs );
		wp_send_json_success( array( 'updated' => true, 'mode' => $calculation_mode ) );
	} else {
		wp_send_json_error( 'No valid data to save' );
	}
}
add_action( 'wp_ajax_tc_save_user_preferences', 'tc_save_user_preferences' );