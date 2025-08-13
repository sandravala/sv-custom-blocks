<?php
/**
 * Secure AJAX handler - loads permanent configuration from database
 */
class SV_SmartGoals_Ajax_Handler_Secure {
    
    use SV_Block_Database_Operations;
    
    private $table_suffix = 'smart_goals';
    private $block_abbr = 'sg';
    
    public function __construct() {
        add_action('wp_ajax_generate_smart_goals', [$this, 'generate_smart_goals']);
        add_action('wp_ajax_nopriv_generate_smart_goals', [$this, 'generate_smart_goals']);
        add_action('wp_ajax_load_smart_goals', [$this, 'load_smart_goals']);
        add_action('wp_ajax_save_smart_goals', [$this, 'save_smart_goals']);
        
        // Clean up old configurations periodically
        add_action('wp_loaded', [$this, 'maybe_cleanup_old_configs']);
    }
    
    /**
     * Generate smart goals using permanent configuration from database
     */
    public function generate_smart_goals() {
        check_ajax_referer('sv_ajax_nonce', 'nonce');
        
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.']);
            return;
        }
        
        $user_id = get_current_user_id();
        
        // Get form data
        $specific = isset($_POST['specific']) ? sanitize_text_field(wp_unslash($_POST['specific'])) : '';
        $measurable = isset($_POST['measurable']) ? sanitize_text_field(wp_unslash($_POST['measurable'])) : '';
        $achievable = isset($_POST['achievable']) ? sanitize_text_field(wp_unslash($_POST['achievable'])) : '';
        $relevant = isset($_POST['relevant']) ? sanitize_text_field(wp_unslash($_POST['relevant'])) : '';
        $time_bound = isset($_POST['time_bound']) ? sanitize_text_field(wp_unslash($_POST['time_bound'])) : '';
        
        // Handle both new block_id system and legacy assistant_id
        $block_id = isset($_POST['block_id']) ? sanitize_text_field(wp_unslash($_POST['block_id'])) : '';
        $assistant_id_legacy = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        
        if (!empty($block_id)) {
            // New system: Load configuration from wp_options
            $config = get_option("sv_block_config_{$block_id}");
            
            if (!$config) {
                wp_send_json_error(['message' => 'Block configuration not found. Please save the block settings first.']);
                return;
            }
            
            // Extract configuration
            $use_responses_api = $config['useResponsesApi'] ?? true;
            $assistant_id = $config['assistantId'] ?? '';
            $model = $config['model'] ?? 'gpt-4';
            $system_prompt = $config['systemPrompt'] ?? '';
            $temperature = floatval($config['temperature'] ?? 0.3);
            $max_tokens = intval($config['maxTokens'] ?? 1000);
            $response_format = $config['responseFormat'] ?? 'json_object';
            $response_schema = $config['responseSchema'] ?? null;
            
        } else if (!empty($assistant_id_legacy)) {
            // Legacy system: Use assistant API directly
            $use_responses_api = false;
            $assistant_id = $assistant_id_legacy;
            $model = 'gpt-4'; // Default for legacy
            $system_prompt = '';
            $temperature = 0.3;
            $max_tokens = 1000;
            $response_format = 'text';
            $response_schema = null;
            $block_id = $assistant_id_legacy; // Use assistant_id as identifier for legacy
            
        } else {
            wp_send_json_error(['message' => 'Block or Assistant ID required.']);
            return;
        }
        
        if (empty($specific) || empty($measurable) || empty($achievable) || empty($relevant) || empty($time_bound)) {
            wp_send_json_error(['message' => 'Prašome užpildyti visus privalomų laukų']);
            return;
        }
        
        try {
            // Format message data
            $message_data = [
                'specific' => $specific,
                'measurable' => $measurable,
                'achievable' => $achievable,
                'relevant' => $relevant,
                'time_bound' => $time_bound
            ];
            
            if ($use_responses_api) {
                // Use new Responses API
                $openai_response = $this->call_responses_api($message_data, $model, $system_prompt, $temperature, $max_tokens, $response_format, $response_schema);
                $api_identifier = "{$block_id}_responses_{$model}";
            } else {
                // Use legacy Assistant API
                if (empty($assistant_id)) {
                    wp_send_json_error(['message' => 'Assistant ID reikalingas senam API.']);
                    return;
                }
                
                $openai_response = $this->call_assistant_api($message_data, $assistant_id);
                $api_identifier = "{$block_id}_assistant_{$assistant_id}";
            }
            
            if (is_wp_error($openai_response)) {
                throw new Exception($openai_response->get_error_message());
            }
            
            // Save to database - only user inputs, no API config
            $input_data = [
                'specific' => $specific,
                'measurable' => $measurable,
                'achievable' => $achievable,
                'relevant' => $relevant,
                'time_bound' => $time_bound
            ];
            
            $saved = $this->save_assistant_data(
                $this->table_suffix,
                $user_id,
                $api_identifier,
                $input_data,
                $openai_response
            );
            
            if ($saved) {
                $this->save_to_user_meta($user_id, $this->block_abbr, 'last_response', json_encode($openai_response));
                $this->save_to_user_meta($user_id, $this->block_abbr, 'last_updated', current_time('mysql'));
                
                error_log('Smart Goals saved successfully for user: ' . $user_id);
            }
            
            wp_send_json_success($openai_response);
            
        } catch (Exception $e) {
            error_log('Smart Goals Generator Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Įvyko klaida generuojant tikslą. Bandykite dar kartą.']);
        }
    }
    
    /**
     * Call Responses API
     */
    private function call_responses_api($message_data, $model, $system_prompt, $temperature, $max_tokens, $response_format, $response_schema = null) {
        try {
            $openai_handler = SV_OpenAI_Responses_Handler::get_instance();
            
            if (!$openai_handler->is_configured()) {
                throw new Exception('OpenAI API raktas nenustatytas. Susisiekite su administratoriumi.');
            }
            
            $user_message = SV_OpenAI_Responses_Handler::format_message($message_data);
            
            $options = [
                'system_message' => $system_prompt,
                'temperature' => $temperature,
                'max_tokens' => $max_tokens
            ];
            
            // Handle different response formats
            if ($response_format === 'json_object') {
                $options['response_format'] = ['type' => 'json_object'];
            } elseif ($response_format === 'json_schema' && $response_schema) {
                $options['response_format'] = [
                    'type' => 'json_schema',
                    'json_schema' => [
                        'name' => 'smart_goal_response',
                        'description' => 'A structured SMART goal response',
                        'schema' => $response_schema,
                        'strict' => true
                    ]
                ];
            } elseif ($response_format === 'text') {
                // No response format needed for text
            }
            
            return $openai_handler->call_responses_api($model, $user_message, $options);
            
        } catch (Exception $e) {
            return new WP_Error('responses_api_error', $e->getMessage());
        }
    }
    
    /**
     * Call legacy Assistant API
     */
    private function call_assistant_api($message_data, $assistant_id) {
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
    public function load_smart_goals() {
        check_ajax_referer('sv_ajax_nonce', 'nonce');
        
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }
        
        $user_id = get_current_user_id();
        $block_id = isset($_POST['block_id']) ? sanitize_text_field(wp_unslash($_POST['block_id'])) : '';
        $assistant_id_legacy = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        
        if (!empty($block_id)) {
            // New system: Load config to get identifier
            $config = get_option("sv_block_config_{$block_id}");
            if (!$config) {
                wp_send_json_error(['message' => 'Block configuration not found.']);
                return;
            }
            
            $use_responses_api = $config['useResponsesApi'] ?? true;
            $identifier = $use_responses_api ? 
                "{$block_id}_responses_{$config['model']}" : 
                "{$block_id}_assistant_{$config['assistantId']}";
                
        } else if (!empty($assistant_id_legacy)) {
            // Legacy system: Use assistant_id directly as identifier
            $identifier = $assistant_id_legacy;
            
        } else {
            wp_send_json_error(['message' => 'Block or Assistant ID required.']);
            return;
        }
        
        try {
            $data = $this->load_assistant_data($this->table_suffix, $user_id, $identifier);
            
            if ($data) {
                wp_send_json_success($data);
            } else {
                wp_send_json_error(['message' => 'Duomenų nerasta.']);
            }
            
        } catch (Exception $e) {
            error_log('Load Smart Goals Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Klaida gaunant duomenis.']);
        }
    }
    
    /**
     * Save smart goals changes
     */
    public function save_smart_goals() {
        check_ajax_referer('sv_ajax_nonce', 'nonce');
        
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }
        
        $user_id = get_current_user_id();
        $block_id = isset($_POST['block_id']) ? sanitize_text_field(wp_unslash($_POST['block_id'])) : '';
        $updated_data = isset($_POST['updated_data']) ? json_decode(wp_unslash($_POST['updated_data']), true) : [];
        
        if (empty($block_id) || empty($updated_data)) {
            wp_send_json_error(['message' => 'Trūksta duomenų išsaugojimui.']);
            return;
        }
        
        // Load config to get identifier
        $config = get_option("sv_block_config_{$block_id}");
        if (!$config) {
            wp_send_json_error(['message' => 'Block configuration not found.']);
            return;
        }
        
        $use_responses_api = $config['useResponsesApi'] ?? true;
        $identifier = $use_responses_api ? 
            "{$block_id}_responses_{$config['model']}" : 
            "{$block_id}_assistant_{$config['assistantId']}";
        
        try {
            $saved = $this->update_response_data($this->table_suffix, $user_id, $identifier, $updated_data);
            
            if ($saved) {
                $this->save_to_user_meta($user_id, $this->block_abbr, 'last_updated', current_time('mysql'));
                wp_send_json_success(['message' => 'Duomenys sėkmingai išsaugoti.']);
            } else {
                wp_send_json_error(['message' => 'Nepavyko išsaugoti duomenų.']);
            }
            
        } catch (Exception $e) {
            error_log('Save Smart Goals Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Klaida išsaugojant duomenis.']);
        }
    }
    
    /**
     * Clean up old block configurations (optional maintenance)
     * Runs once daily to remove configs from deleted posts
     */
    public function maybe_cleanup_old_configs() {
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
    private function cleanup_old_configs() {
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
new SV_SmartGoals_Ajax_Handler_Secure();