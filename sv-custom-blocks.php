<?php
/**
 * Plugin Name:       Sv Custom Blocks
 * Description:       Example block scaffolded with Create Block tool.
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Version:           0.4.0
 * Author:            The WordPress Contributors
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       sv-custom-blocks
 *
 * @package           create-block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once plugin_dir_path(__FILE__) . 'vendor/autoload.php';
require_once plugin_dir_path(__FILE__) . 'build/blocks/planner-personality-quiz/includes/key-encryption.php';
require_once plugin_dir_path(__FILE__) . 'build/blocks/planner-personality-quiz/includes/settings-page.php';
require_once plugin_dir_path(__FILE__) . 'build/blocks/planner-personality-quiz/includes/stats-tracking.php';
require_once plugin_dir_path(__FILE__) . 'build/blocks/planner-personality-quiz/includes/form-submission.php';
require_once plugin_dir_path(__FILE__) . 'build/blocks/routine-tasks-generator/includes/openai-handler.php';
require_once plugin_dir_path(__FILE__) . 'build/blocks/time-calculator/includes/ajax-handlers.php';

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function sv_custom_blocks_sv_custom_blocks_block_init() {
	register_block_type( __DIR__ . '/build/blocks/planner-personality-quiz' );
}
add_action( 'init', 'sv_custom_blocks_sv_custom_blocks_block_init' );

function sv_slider_init() {
	register_block_type( __DIR__ . '/build/blocks/sv-slider' );
}
add_action( 'init', 'sv_slider_init' );

function sv_timeblock_init() {
	register_block_type( __DIR__ . '/build/blocks/timeblock-builder' );
}
add_action( 'init', 'sv_timeblock_init' );

function sv_routine_tasks_init() {
	register_block_type( __DIR__ . '/build/blocks/routine-tasks-generator' );
}
add_action( 'init', 'sv_routine_tasks_init' );

function sv_time_calc_init() {
	register_block_type( __DIR__ . '/build/blocks/time-calculator' );
}
add_action( 'init', 'sv_time_calc_init' );

// Hook to add the menu
add_action('admin_menu', 'sv_custom_blocks_add_menu');

// Function to add the menu item
function sv_custom_blocks_add_menu() {
    add_menu_page(
        'SV custom blocks',          // Page title
        'SV custom blocks',               // Menu title
        'manage_options',          // Capability
        'sv-custom-blocks',          // Menu slug
        'sv_custom_blocks_render_menu',   // Callback function
        'dashicons-pets', // Icon (optional)
        25                         // Position (optional)
    );
}

function sv_localize_block_scripts() {
    wp_localize_script('sv-custom-blocks-planner-personality-quiz-view-script', 'sv_ajax_object', array(
        'ajax_url' => admin_url('admin-ajax.php'), // WordPress AJAX URL
        'nonce'    => wp_create_nonce('sv_ajax_nonce'), // Secure the request
    ));
    wp_localize_script('sv-custom-blocks-routine-tasks-generator-view-script', 'sv_ajax_object', array(
        'ajax_url' => admin_url('admin-ajax.php'), // WordPress AJAX URL
        'nonce'    => wp_create_nonce('sv_ajax_nonce'), // Secure the request
    ));
}
add_action('wp_enqueue_scripts', 'sv_localize_block_scripts');
