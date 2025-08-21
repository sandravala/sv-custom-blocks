<?php
/**
 * AJAX handlers for Universal User Data Generator
 * Reuses Universal AI pattern but for user meta operations only
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Universal User Data Generator AJAX Handler
 * Follows Universal AI pattern but without API calls
 */
class SV_Universal_User_Data_Ajax_Handler {

	use SV_Block_Database_Operations;

	private $block_abbr = 'udg';

	public function __construct() {
		// Hook AJAX actions using block abbreviation variable for consistency
		add_action( "wp_ajax_{$this->block_abbr}_load_saved_data", [ $this, 'load_saved_data' ] );
		add_action( "wp_ajax_{$this->block_abbr}_save_modified_data", [ $this, 'save_modified_data' ] );
	}

	/**
	 * Load saved user data
	 * Same pattern as Universal AI but only returns user meta
	 */
	public function load_saved_data() {
		check_ajax_referer( 'sv_ajax_nonce', 'nonce' );

		if ( ! is_user_logged_in() ) {
			wp_send_json_error( [ 'message' => 'Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.' ] );
			return;
		}

		$user_id = get_current_user_id();
		$meta_keys = isset( $_POST['meta_keys'] ) ? wp_unslash( $_POST['meta_keys'] ) : '';

		// Parse meta keys from frontend
		$parsed_meta_keys = $this->parse_meta_keys( $meta_keys );
		if ( empty( $parsed_meta_keys ) ) {
			wp_send_json_error( [ 'message' => 'Meta keys configuration missing.' ] );
			return;
		}

		// Load user data based on meta keys
		$user_data = $this->load_user_data( $user_id, $parsed_meta_keys );

		// Return same structure as Universal AI
		$data_to_return = [
			'user_data' => $user_data
		];

		wp_send_json_success( $data_to_return );
	}

	/**
	 * Save modified user data
	 * Same pattern as Universal AI save_modified_data
	 */
	public function save_modified_data() {
		check_ajax_referer( 'sv_ajax_nonce', 'nonce' );

		if ( ! is_user_logged_in() ) {
			wp_send_json_error( [ 'message' => 'Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.' ] );
			return;
		}

		$user_id = get_current_user_id();
		$data = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : '';
		$save_to_meta = isset( $_POST['save_to_meta'] ) ? wp_unslash( $_POST['save_to_meta'] ) : '';

		// Decode JSON data
		$updated_data = json_decode( $data, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			wp_send_json_error( [ 'message' => 'Invalid data format.' ] );
			return;
		}

		// Parse save to meta configuration
		$meta_config = json_decode( $save_to_meta, true );
		if ( json_last_error() !== JSON_ERROR_NONE || empty( $meta_config ) ) {
			wp_send_json_error( [ 'message' => 'Invalid meta configuration.' ] );
			return;
		}

		try {
			// Save timestamp
			$this->save_to_user_meta( $user_id, "sv_cb_{$this->block_abbr}_last_updated", current_time( 'mysql' ) );

			// Process meta saves using Universal AI pattern
			$this->process_meta_saves( $user_id, $meta_config, $updated_data );

			wp_send_json_success( [ 'message' => 'Duomenys sėkmingai išsaugoti.' ] );
		} catch ( Exception $e ) {
			error_log( "Save User Data Error: " . $e->getMessage() );
			wp_send_json_error( [ 'message' => 'Klaida išsaugojant duomenis.' ] );
		}
	}

	/**
	 * Parse meta keys from frontend
	 * Supports both array and object formats
	 */
	private function parse_meta_keys( $meta_keys_input ) {
		if ( empty( $meta_keys_input ) ) {
			return [];
		}

		// Try to decode as JSON first
		$decoded = json_decode( $meta_keys_input, true );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			return $decoded;
		}

		// Fallback: treat as string and return as array
		return [ $meta_keys_input ];
	}

	/**
	 * Load user data based on meta keys configuration
	 * Flexible to handle different key structures
	 */
	private function load_user_data( $user_id, $meta_keys_config ) {
		$user_data = [];

		if ( is_array( $meta_keys_config ) ) {
			// Handle array format: ['key1', 'key2', 'key3']
			if ( isset( $meta_keys_config[0] ) && is_string( $meta_keys_config[0] ) ) {
				foreach ( $meta_keys_config as $meta_key ) {
					$value = get_user_meta( $user_id, $meta_key, true );
					$user_data[ $meta_key ] = empty( $value ) ? null : $value;
				}
			} 
			// Handle object format: {'alias': 'actual_meta_key'}
			else {
				foreach ( $meta_keys_config as $alias => $meta_key ) {
					$value = get_user_meta( $user_id, $meta_key, true );
					$user_data[ $alias ] = empty( $value ) ? null : $value;
				}
			}
		}

		return $user_data;
	}

	/**
	 * Process meta saves - reuse from Universal AI trait
	 * Uses the same process_meta_saves method from SV_Block_Database_Operations
	 */
	private function process_meta_saves( $user_id, $save_to_meta, $data ) {
		// This method exists in the trait and handles the saving logic
		foreach ( $save_to_meta as $data_key => $meta_key ) {
			if ( isset( $data[ $data_key ] ) ) {
				$this->save_to_user_meta( $user_id, $meta_key, $data[ $data_key ] );
			}
		}
	}
}

// Initialize the handler
new SV_Universal_User_Data_Ajax_Handler();