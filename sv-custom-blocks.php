<?php
/**
 * Plugin Name:       Sv Custom Blocks
 * Description:       Example block scaffolded with Create Block tool.
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Version:           0.1.0
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

require_once plugin_dir_path(__FILE__) . 'build/blocks/planner-personality-quiz/includes/form-submission.php';

function sv_localize_block_scripts() {
    wp_localize_script('sv-custom-blocks-planner-personality-quiz-view-script', 'sv_ajax_object', array(
        'ajax_url' => admin_url('admin-ajax.php'), // WordPress AJAX URL
        'nonce'    => wp_create_nonce('sv_ajax_nonce'), // Secure the request
    ));
}
add_action('wp_enqueue_scripts', 'sv_localize_block_scripts');
