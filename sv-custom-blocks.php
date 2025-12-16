<?php

/**
 * Plugin Name:       Sv Custom Blocks
 * Description:       Example block scaffolded with Create Block tool.
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Version:           1.1.2
 * Author:            The WordPress Contributors
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       sv-custom-blocks
 *
 * @package           create-block
 */

if (! defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Load vendor
require_once plugin_dir_path(__FILE__) . 'vendor/autoload.php';

// Load shared includes
require_once plugin_dir_path(__FILE__) . 'includes/class-data-encryption.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-plugin-settings.php';
require_once plugin_dir_path(__FILE__) . 'includes/openai-assistant-handler.php';
require_once plugin_dir_path(__FILE__) . 'includes/openai-responses-handler.php';
require_once plugin_dir_path(__FILE__) . 'includes/trait-block-database-operations.php';
require_once plugin_dir_path(__FILE__) . 'includes/admin-feedback-page.php';
require_once plugin_dir_path(__FILE__) . 'includes/zoom-signature-handler.php';

// Initialize plugin settings
SV_Plugin_Settings::get_instance();

// Load block-specific includes (from BUILD directory)

require_once plugin_dir_path(__FILE__) . 'build/blocks/planner-personality-quiz/includes/form-submission.php';
require_once plugin_dir_path(__FILE__) . 'build/blocks/time-calculator/includes/ajax-handlers.php';

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */

// Register all assistant-based blocks
function sv_register_common_blocks()
{
    $blocks = [
        'universal-ai',
        'universal-user-data-generator'
    ];

    foreach ($blocks as $block) {
        register_block_type(__DIR__ . '/build/blocks/' . $block);

        // Include block-specific AJAX handlers
        $handler_file = plugin_dir_path(__FILE__) . 'build/blocks/' . $block . '/includes/ajax-handlers.php';
        if (file_exists($handler_file)) {
            require_once $handler_file;
        }
    }
}
add_action('init', 'sv_register_common_blocks');

// Create tables on activation
function sv_create_common_tables()
{
    // Tables will be created on-demand by the trait
    // But you can pre-create them here if preferred
}
register_activation_hook(__FILE__, 'sv_create_common_tables');

/**
 * Register custom settings for AI blocks
 */
function sv_register_ai_blocks_settings()
{
    register_setting('general', 'sv_ai_blocks_options', [
        'type' => 'object',
        'show_in_rest' => [
            'schema' => [
                'type' => 'object',
                'properties' => [],  // Dynamic properties for each instanceId
                'additionalProperties' => [
                    'type' => 'object',
                    'properties' => [
                        'selectedComponent' => ['type' => 'string'], 
                        'useResponsesApi' => ['type' => 'boolean'],
                        'model' => ['type' => 'string'],
                        'systemPrompt' => ['type' => 'string'],
                        'temperature' => ['type' => 'number'],
                        'maxTokens' => ['type' => 'integer'],
                        'responseFormat' => ['type' => 'string'],
                        'responseSchema' => ['type' => ['object', 'null']], // Allow null
                        'post_id' => ['type' => 'integer'],
                        'updated_at' => ['type' => 'integer']
                    ]
                ]
            ]
        ],
        'default' => new stdClass(),
        'sanitize_callback' => 'sv_sanitize_ai_blocks_options', // Add sanitization
    ]);
}
add_action('init', 'sv_register_ai_blocks_settings');

/**
 * Sanitize the AI blocks options
 */
function sv_sanitize_ai_blocks_options($value)
{
    if (!is_array($value) && !is_object($value)) {
        return new stdClass();
    }

    // Convert to array for processing
    $value = (array) $value;
    $sanitized = array();

    foreach ($value as $instance_id => $config) {
        if (is_array($config) || is_object($config)) {
            $config = (array) $config;
            $sanitized[sanitize_key($instance_id)] = array(
                'selectedComponent' => sanitize_text_field($config['selectedComponent'] ?? ''),
                'useResponsesApi'   => (bool) ($config['useResponsesApi'] ?? true),
                'model'             => sanitize_text_field($config['model'] ?? 'gpt-4'),
                'systemPrompt'      => sanitize_textarea_field($config['systemPrompt'] ?? ''),
                'temperature'       => floatval($config['temperature'] ?? 0.7),
                'maxTokens'         => intval($config['maxTokens'] ?? 1500),
                'responseFormat'    => sanitize_text_field($config['responseFormat'] ?? 'auto'),
                'responseSchema'    => $config['responseSchema'] ?? null,
                'post_id'           => intval($config['post_id'] ?? 0),
                'updated_at'        => intval($config['updated_at'] ?? time()),
            );
        }
    }

    return (object) $sanitized; // Return as object
}

function sv_custom_blocks_sv_custom_blocks_block_init()
{
    register_block_type(__DIR__ . '/build/blocks/planner-personality-quiz');
}
add_action('init', 'sv_custom_blocks_sv_custom_blocks_block_init');

function sv_slider_init()
{
    register_block_type(__DIR__ . '/build/blocks/sv-slider');
}
add_action('init', 'sv_slider_init');

function sv_timeblock_init()
{
    register_block_type(__DIR__ . '/build/blocks/timeblock-builder');
}
add_action('init', 'sv_timeblock_init');


function sv_time_calc_init()
{
    register_block_type(__DIR__ . '/build/blocks/time-calculator');
}
add_action('init', 'sv_time_calc_init');

function sv_zoom_meeting_init()
{
    register_block_type(__DIR__ . '/build/blocks/zoom-meeting');
}
add_action('init', 'sv_zoom_meeting_init');

// function sv_universal_ai_generator_init()
// {
//     register_block_type(__DIR__ . '/build/blocks/universal-ai');
// }
// add_action('init', 'sv_universal_ai_generator_init');

function sv_localize_block_scripts()
{
    $blocks = [
        'planner-personality-quiz',
        'universal-ai',
        'universal-user-data-generator',
    ];
    foreach ($blocks as $block) {
        wp_localize_script("sv-custom-blocks-{$block}-view-script", 'sv_ajax_object', array(
            'ajax_url' => admin_url('admin-ajax.php'), // WordPress AJAX URL
            'nonce'    => wp_create_nonce('sv_ajax_nonce'), // Secure the request
        ));
    }

}
add_action('wp_enqueue_scripts', 'sv_localize_block_scripts');
