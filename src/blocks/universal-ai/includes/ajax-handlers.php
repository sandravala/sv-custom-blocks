<?php

/**
 * Secure AJAX handler - loads permanent configuration from database
 */
class SV_Universal_AI_Ajax_Handler_Secure
{

    use SV_Block_Database_Operations;

    private $block_abbr = 'uai';

    public function __construct()
    {
        add_action('wp_ajax_generate_ai_data', [$this, 'generate_ai_data']);
        add_action('wp_ajax_nopriv_generate_ai_data', [$this, 'generate_ai_data']);
        add_action('wp_ajax_load_block_input_data', [$this, 'load_block_input_data']);


        // Clean up old configurations periodically
        add_action('wp_loaded', [$this, 'maybe_cleanup_old_configs']);
    }


    /**
     * Generate AI data using permanent configuration from database
     */
    public function generate_ai_data()
    {
        check_ajax_referer('sv_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.']);
            return;
        }

        $user_id = get_current_user_id();

        // Get form data
        // FormData contains ONLY user input values
        $user_input = $this->get_form_data();
        if (empty($user_input)) {
            wp_send_json_error(['message' => 'Užpildyk bent vieną laukelį!']);
            return;
        }

        $use_responses_api = isset($_POST['use_responses_api']) ? filter_var(wp_unslash($_POST['use_responses_api']), FILTER_VALIDATE_BOOLEAN) : true;

        // Handle both new block_id system and legacy assistant_id
        $block_id = isset($_POST['block_id']) ? sanitize_text_field(wp_unslash($_POST['block_id'])) : '';
        $assistant_id_legacy = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        $schema_name = isset($_POST['schema_name']) ? sanitize_text_field(wp_unslash($_POST['schema_name'])) : 'sv_uai_schema';

        $save_to_meta = [];
        if (isset($_POST['save_to_meta'])) {
            $raw_meta_config = wp_unslash($_POST['save_to_meta']);
            $decoded_config = json_decode($raw_meta_config, true);

            // Validate that decode was successful and result is array
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_config)) {
                $save_to_meta = $decoded_config;
            } else {
                error_log('Invalid save_to_meta JSON: ' . json_last_error_msg());
            }
        }


        if (!empty($block_id)) {
            // NEW SYSTEM: Load configuration from sv_ai_blocks_options
            $all_configs = get_option('sv_ai_blocks_options', []);
            // Convert stdClass to array if needed
            if (is_object($all_configs)) {
                $all_configs = (array) $all_configs;
            }

            $config = isset($all_configs[$block_id]) ? $all_configs[$block_id] : null;

            if (!$config) {
                wp_send_json_error(['message' => 'Block configuration not found. Please save the block settings first.']);
                return;
            }

            // Extract configuration following your naming convention

            $model = $config['model'] ?? 'gpt-4';
            $system_prompt = $config['systemPrompt'] ?? '';
            $temperature = floatval($config['temperature'] ?? 0.3);
            $max_tokens = intval($config['maxTokens'] ?? 1000);
            $response_format = $config['responseFormat'] ?? 'text';
            $response_schema = $config['responseSchema'] ?? null;
        } else {
            // LEGACY SYSTEM: Fall back to assistant_id only
            if (empty($assistant_id_legacy)) {
                wp_send_json_error(['message' => 'Assistant ID or Block ID ir required.']);
                return;
            }

            $use_responses_api = false;
            $assistant_id = $assistant_id_legacy;
            $model = 'gpt-4'; // Default fallback
            $system_prompt = ''; // Not used in assistant mode
            $temperature = 0.3;
            $max_tokens = 1000;
            $response_format = 'text';
            $response_schema = null;
        }


        try {
            if ($use_responses_api) {
                // Call Responses API
                $result = $this->call_responses_api($user_input, $model, $system_prompt, $temperature, $max_tokens, $response_format, $response_schema, $schema_name);
            } else {
                // Call legacy Assistant API
                $result = $this->call_assistant_api($user_input, $assistant_id);
            }

            if (is_wp_error($result)) {
                wp_send_json_error(['message' => $result->get_error_message()]);
                return;
            }

            // Create identifier for database storage
            $identifier = $use_responses_api ?
                "{$block_id}_responses_{$model}" :
                "{$block_id}_assistant_{$assistant_id}";

            // Save to database using the trait
            $saved = $this->save_block_data($user_id, $block_id, $user_input);


            if ($saved) {
                // Follow your naming convention for user meta
                $this->save_to_user_meta($user_id, 'sv_cb_sg_last_generated', current_time('mysql'));
                $this->process_meta_saves($user_id, $save_to_meta, $result);

                wp_send_json_success($result);
            } else {
                wp_send_json_error(['message' => 'Nepavyko išsaugoti duomenų į duomenų bazę.']);
            }
        } catch (Exception $e) {
            error_log('Smart Goals Generation Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Įvyko klaida generuojant tikslą. Bandykite dar kartą.']);
        }
    }

    /**
     * Get sanitized FormData (all user input values)
     */
    private function get_form_data()
    {
        $form_data = [];
        if (!isset($_POST['form_data']) || empty($_POST['form_data'])) {
            return $form_data; // Return empty array if no data
        }

        // Process all POST data - FormData only contains user values
        foreach ($_POST['form_data'] as $key => $value) {
            // Sanitize based on field type
            if (is_array($value)) {
                $form_data[$key] = array_map('sanitize_text_field', wp_unslash($value));
            } else {
                $form_data[$key] = sanitize_text_field(wp_unslash($value));
            }
        }

        return $form_data;
    }

    /**
     * Call Responses API
     */
    private function call_responses_api($message_data, $model, $system_prompt, $temperature, $max_tokens, $response_format, $response_schema = null, $schema_name = 'sv_uai_schema')
    {
        try {
            $openai_handler = SV_OpenAI_Responses_Handler::get_instance();

            if (!$openai_handler->is_configured()) {
                throw new Exception('OpenAI API raktas nenustatytas. Susisiekite su administratoriumi.');
            }

            $user_message = SV_OpenAI_Responses_Handler::format_message($message_data);

            $options = [
                'instructions' => $system_prompt,
                'temperature' => $temperature,
                'max_output_tokens' => $max_tokens
            ];
            if ($response_format === 'json_object') {
                $options['response_format'] = ['type' => 'json_object'];
            } elseif ($response_format === 'json_schema' && $response_schema) {
                $options['response_format'] = ['type' => 'json_schema'];
                $options['response_schema'] = $response_schema;
                $options['schema_name'] = $schema_name;
            }

            return $openai_handler->call_responses_api($model, $user_message, $options);
        } catch (Exception $e) {
            return new WP_Error('responses_api_error', $e->getMessage());
        }
    }

    /**
     * Call legacy Assistant API
     */
    private function call_assistant_api($message_data, $assistant_id)
    {
        try {
            $openai_handler = SV_OpenAI_Assistant_Handler::get_instance();

            if (!$openai_handler->is_configured()) {
                throw new Exception('OpenAI API raktas nenustatytas. Susisiekite su administratoriumi.');
            }

            $user_message = SV_OpenAI_Assistant_Handler::format_message($message_data);

            return $openai_handler->call_assistant($assistant_id, $user_message);
        } catch (Exception $e) {
            return new WP_Error('assistant_api_error', $e->getMessage());
        }
    }

    /**
     * Load saved smart goals
     */
    /**
     * Load saved input data
     */
    public function load_block_input_data()
    {
        check_ajax_referer('sv_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }

        $user_id = get_current_user_id();
        $block_id = isset($_POST['block_id']) ? sanitize_text_field(wp_unslash($_POST['block_id'])) : '';
        $assistant_id_legacy = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';



        try {
            $data = $this->load_block_data($user_id, $block_id);

            if ($data) {
                // Return both input and response data
                wp_send_json_success([
                    'input_data' => $data['input_data'],
                    'sv_cb_sg_last_updated' => $data['updated_at']
                ]);
            } else {
                wp_send_json_success(null); // No saved data found
            }
        } catch (Exception $e) {
            error_log('Load Smart Goals Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Klaida užkraunant duomenis.']);
        }
    }

    /**
     * Save smart goals changes
     */
    public function save_smart_goals()
    {
        check_ajax_referer('sv_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }

        $user_id = get_current_user_id();
        $block_id = isset($_POST['block_id']) ? sanitize_text_field(wp_unslash($_POST['block_id'])) : '';
        $assistant_id_legacy = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        $table_suffix = isset($_POST['table_suffix']) ? sanitize_text_field(wp_unslash($_POST['table_suffix'])) : 'uai';

        // Get the updated data from POST
        $updated_data = isset($_POST['goal_data']) ? wp_unslash($_POST['goal_data']) : '';

        if (empty($updated_data)) {
            wp_send_json_error(['message' => 'Nėra duomenų išsaugojimui.']);
            return;
        }

        // Sanitize the data (assuming it's JSON)
        if (is_string($updated_data)) {
            $updated_data = json_decode($updated_data, true);
        }

        if (!$updated_data) {
            wp_send_json_error(['message' => 'Neteisingi duomenų formatai.']);
            return;
        }

        if (!empty($block_id)) {
            // NEW SYSTEM: Load configuration from sv_ai_blocks_options
            $all_configs = get_option('sv_ai_blocks_options', []);
            $config = isset($all_configs[$block_id]) ? $all_configs[$block_id] : null;

            if (!$config) {
                wp_send_json_error(['message' => 'Block configuration not found.']);
                return;
            }

            $use_responses_api = $config['useResponsesApi'] ?? true;
            $model = $config['model'] ?? 'gpt-4';
            $assistant_id = $config['assistantId'] ?? '';

            // Create identifier for database storage
            $identifier = $use_responses_api ?
                "{$block_id}_responses_{$model}" :
                "{$block_id}_assistant_{$assistant_id}";
        } else {
            // LEGACY SYSTEM: Use assistant_id directly  
            if (empty($assistant_id_legacy)) {
                wp_send_json_error(['message' => 'Block ID or Assistant ID required.']);
                return;
            }

            $identifier = "legacy_assistant_{$assistant_id_legacy}";
        }

        try {
            //$saved = $this->update_block_response_data($table_suffix, $user_id, $block_id, $updated_data);

            // if ($saved) {
            //     // Follow your naming convention for user meta
            //     $this->save_to_user_meta($user_id, $this->block_abbr, 'sv_cb_sg_last_updated', current_time('mysql'));
            //     wp_send_json_success(['message' => 'Duomenys sėkmingai išsaugoti.']);
            // } else {
            //     wp_send_json_error(['message' => 'Nepavyko išsaugoti duomenų.']);
            // }
        } catch (Exception $e) {
            error_log('Save Smart Goals Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Klaida išsaugojant duomenis.']);
        }
    }

    /**
     * Universal save method - saves edited results to user meta
     */
    public function save_modified_data()
    {
        check_ajax_referer('sv_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }

        $user_id = get_current_user_id();
        $save_to_meta = isset($_POST['save_to_meta']) ? json_decode(wp_unslash($_POST['save_to_meta']), true) : [];
        $updated_data = isset($_POST['data']) ? wp_unslash($_POST['data']) : '';

        if (empty($updated_data)) {
            wp_send_json_error(['message' => 'Nėra duomenų išsaugojimui.']);
            return;
        }

        if (is_string($updated_data)) {
            $updated_data = json_decode($updated_data, true);
        }

        if (!$updated_data) {
            wp_send_json_error(['message' => 'Neteisingi duomenų formatai.']);
            return;
        }

        try {
            // Save timestamp
            $this->save_to_user_meta($user_id, "sv_cb_{$this->block_abbr}_last_updated", current_time('mysql'));

            // Save results to user meta
            $this->process_meta_saves($user_id, $save_to_meta, $updated_data);

            wp_send_json_success(['message' => 'Duomenys sėkmingai išsaugoti.']);
        } catch (Exception $e) {
            error_log("Save Block Error: " . $e->getMessage());
            wp_send_json_error(['message' => 'Klaida išsaugojant duomenis.']);
        }
    }

    /**
     * Clean up old block configurations (optional maintenance)
     * Runs once daily to remove configs from deleted posts
     */
    public function maybe_cleanup_old_configs()
    {
        $last_cleanup = get_option('sv_last_config_cleanup', 0);

        // Run cleanup once per day
        if (time() - $last_cleanup > DAY_IN_SECONDS) {
            $this->cleanup_old_configs();
            update_option('sv_last_config_cleanup', time());
        }
    }

    /**
     * Remove configurations for deleted posts
     */
    private function cleanup_old_configs()
    {
        global $wpdb;

        // Get all block configurations
        $configs = $wpdb->get_results(
            "SELECT option_name, option_value FROM {$wpdb->options} 
             WHERE option_name LIKE 'sv_block_config_sg_%'"
        );

        foreach ($configs as $config) {
            $config_data = maybe_unserialize($config->option_value);

            if (isset($config_data['post_id'])) {
                // Check if post still exists
                $post_exists = get_post($config_data['post_id']);

                if (!$post_exists) {
                    // Post deleted, remove configuration
                    delete_option($config->option_name);
                    error_log("Cleaned up orphaned block config: {$config->option_name}");
                }
            }
        }
    }
}

// Initialize the secure handler - replace your existing handler initialization
new SV_Universal_AI_Ajax_Handler_Secure();
