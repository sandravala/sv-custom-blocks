<?php
/**
 * Shared OpenAI Responses API Handler
 * Handles all OpenAI API interactions for blocks using the new Responses API
 * 
 * @package sv-custom-blocks
 */

if (!defined('ABSPATH')) {
    exit;
}

class SV_OpenAI_Responses_Handler {
    
    private $api_key;
    private $headers;
    private static $instance = null;
    
    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->init_api_key();
    }
    
    /**
     * Initialize API key from settings
     */
    private function init_api_key() {
        $encrypted_key = get_option('sv_openai_api_key');
        
        if (empty($encrypted_key)) {
            throw new Exception('OpenAI API key not configured');
        }
        
        $data_encryption = new BC_Data_Encryption();
        $this->api_key = $data_encryption->decrypt($encrypted_key);
        
        if (empty($this->api_key)) {
            throw new Exception('Failed to decrypt OpenAI API key');
        }
        
        $this->headers = [
            'Authorization' => 'Bearer ' . $this->api_key,
            'Content-Type' => 'application/json'
        ];
    }
    
    /**
     * Check if API key is configured
     */
    public function is_configured() {
        return !empty($this->api_key);
    }
    
    /**
     * Call OpenAI Responses API with a message
     * 
     * @param string $model The model to use (e.g., 'gpt-4', 'gpt-3.5-turbo')
     * @param string $input The user input/message
     * @param array $options Optional parameters (temperature, max_tokens, system_message, etc.)
     * @return array|WP_Error The parsed response or error
     */
    public function call_responses_api($model, $input, $options = []) {
        try {
            // Prepare the request body
            $body_data = [
                'model' => $model,
                'input' => $input
            ];
            
            // Add optional parameters
            if (!empty($options['temperature'])) {
                $body_data['temperature'] = floatval($options['temperature']);
            }
            
            if (!empty($options['max_tokens'])) {
                $body_data['max_tokens'] = intval($options['max_tokens']);
            }
            
            if (!empty($options['system_message'])) {
                $body_data['system'] = $options['system_message'];
            }
            
            if (!empty($options['tools'])) {
                $body_data['tools'] = $options['tools'];
            }
            
            if (!empty($options['response_format'])) {
                $body_data['response_format'] = $options['response_format'];
            }
            
            // Make the API call
            $response = wp_remote_post('https://api.openai.com/v1/responses', [
                'headers' => $this->headers,
                'body' => json_encode($body_data),
                'timeout' => 60
            ]);
            
            if (is_wp_error($response)) {
                throw new Exception('Failed to call OpenAI API: ' . $response->get_error_message());
            }
            
            $http_code = wp_remote_retrieve_response_code($response);
            if ($http_code !== 200) {
                $error_body = wp_remote_retrieve_body($response);
                $error_data = json_decode($error_body, true);
                throw new Exception('OpenAI API error (' . $http_code . '): ' . 
                    ($error_data['error']['message'] ?? 'Unknown error'));
            }
            
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            if (!$data || isset($data['error'])) {
                throw new Exception('API response error: ' . ($data['error']['message'] ?? 'Unknown error'));
            }
            
            return $this->parse_response($data);
            
        } catch (Exception $e) {
            error_log('OpenAI Responses API Error: ' . $e->getMessage());
            return new WP_Error('openai_error', $e->getMessage());
        }
    }
    
    /**
     * Legacy method for backward compatibility ONLY
     * For blocks still using old Assistant API approach
     * 
     * @param string $assistant_id The OpenAI Assistant ID  
     * @param string $message The user message
     * @param array $options Optional parameters
     * @return array|WP_Error The parsed response or error
     */
    public function call_assistant($assistant_id, $message, $options = []) {
        // This method is only for backward compatibility with old Assistant API blocks
        // New blocks should use call_responses_api() directly with block configuration
        
        // For legacy support, you could either:
        // 1. Still call the old Assistant API handler, or
        // 2. Use some default Responses API configuration
        
        $default_options = array_merge([
            'system_message' => 'You are a helpful assistant.',
            'temperature' => 0.7,
            'max_tokens' => 1500
        ], $options);
        
        return $this->call_responses_api('gpt-4', $message, $default_options);
    }
    
    /**
     * Parse response from Responses API
     */
    private function parse_response($response_data) {
        // Extract the content from the response
        if (isset($response_data['content'])) {
            $content = $response_data['content'];
            
            // Try to parse as JSON first
            $parsed_json = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $parsed_json;
            }
            
            // Return as text response if not JSON
            return ['response' => $content];
        }
        
        // Fallback for different response structures
        return $response_data;
    }
    
    /**
     * Format user message with structured data
     * Helper method for consistent message formatting
     */
    public static function format_message($data_array) {
        $message = "";
        foreach ($data_array as $key => $value) {
            if (!empty($value)) {
                $label = ucwords(str_replace('_', ' ', $key));
                $message .= "{$label}: {$value}\n";
            }
        }
        return trim($message);
    }
}
