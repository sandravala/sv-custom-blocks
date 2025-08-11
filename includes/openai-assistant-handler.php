<?php
/**
 * Shared OpenAI Assistant Handler
 * Handles all OpenAI API interactions for blocks
 * 
 * @package sv-custom-blocks
 */

if (!defined('ABSPATH')) {
    exit;
}

class SV_OpenAI_Assistant_Handler {
    
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
            'Content-Type' => 'application/json',
            'OpenAI-Beta' => 'assistants=v2'
        ];
    }
    
    /**
     * Check if API key is configured
     */
    public function is_configured() {
        return !empty($this->api_key);
    }
    
    /**
     * Call OpenAI Assistant with a message
     * 
     * @param string $assistant_id The OpenAI Assistant ID
     * @param string $message The user message
     * @param array $options Optional parameters (temperature, max_tokens, etc.)
     * @return array|WP_Error The parsed response or error
     */
    public function call_assistant($assistant_id, $message, $options = []) {
        try {
            // Step 1: Create thread
            $thread_id = $this->create_thread();
            
            // Step 2: Add message to thread
            $this->add_message($thread_id, $message);
            
            // Step 3: Run assistant
            $run_id = $this->run_assistant($thread_id, $assistant_id, $options);
            
            // Step 4: Wait for completion
            $this->wait_for_completion($thread_id, $run_id);
            
            // Step 5: Get response
            $response = $this->get_response($thread_id);
            
            return $this->parse_response($response);
            
        } catch (Exception $e) {
            error_log('OpenAI Assistant Error: ' . $e->getMessage());
            return new WP_Error('openai_error', $e->getMessage());
        }
    }
    
    /**
     * Create a new thread
     */
    private function create_thread() {
        $response = wp_remote_post('https://api.openai.com/v1/threads', [
            'headers' => $this->headers,
            'body' => json_encode([]),
            'timeout' => 30
        ]);
        
        if (is_wp_error($response)) {
            throw new Exception('Failed to create thread: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || isset($data['error'])) {
            throw new Exception('Thread creation failed: ' . ($data['error']['message'] ?? 'Unknown error'));
        }
        
        return $data['id'];
    }
    
    /**
     * Add message to thread
     */
    private function add_message($thread_id, $message) {
        $response = wp_remote_post("https://api.openai.com/v1/threads/{$thread_id}/messages", [
            'headers' => $this->headers,
            'body' => json_encode([
                'role' => 'user',
                'content' => $message
            ]),
            'timeout' => 30
        ]);
        
        if (is_wp_error($response)) {
            throw new Exception('Failed to add message: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['error'])) {
            throw new Exception('Message creation failed: ' . $data['error']['message']);
        }
    }
    
    /**
     * Run assistant on thread
     */
    private function run_assistant($thread_id, $assistant_id, $options = []) {
        $body_data = ['assistant_id' => $assistant_id];
        
        // Add optional parameters if provided
        if (!empty($options['temperature'])) {
            $body_data['temperature'] = $options['temperature'];
        }
        if (!empty($options['max_tokens'])) {
            $body_data['max_tokens'] = $options['max_tokens'];
        }
        
        $response = wp_remote_post("https://api.openai.com/v1/threads/{$thread_id}/runs", [
            'headers' => $this->headers,
            'body' => json_encode($body_data),
            'timeout' => 30
        ]);
        
        if (is_wp_error($response)) {
            throw new Exception('Failed to run assistant: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || isset($data['error'])) {
            throw new Exception('Run creation failed: ' . ($data['error']['message'] ?? 'Unknown error'));
        }
        
        return $data['id'];
    }
    
    /**
     * Wait for run completion
     */
    private function wait_for_completion($thread_id, $run_id, $max_attempts = 30) {
        $attempt = 0;
        
        do {
            sleep(2);
            $attempt++;
            
            $response = wp_remote_get("https://api.openai.com/v1/threads/{$thread_id}/runs/{$run_id}", [
                'headers' => $this->headers,
                'timeout' => 30
            ]);
            
            if (is_wp_error($response)) {
                throw new Exception('Failed to check run status: ' . $response->get_error_message());
            }
            
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            $status = $data['status'] ?? 'unknown';
            
            if ($status === 'completed') {
                return true;
            }
            
            if (in_array($status, ['failed', 'cancelled', 'expired'])) {
                $error_msg = $data['last_error']['message'] ?? 'Unknown error';
                throw new Exception("Assistant run failed ({$status}): {$error_msg}");
            }
            
        } while ($attempt < $max_attempts);
        
        throw new Exception('Assistant run timed out after ' . ($max_attempts * 2) . ' seconds');
    }
    
    /**
     * Get assistant response from thread
     */
    private function get_response($thread_id) {
        $response = wp_remote_get("https://api.openai.com/v1/threads/{$thread_id}/messages", [
            'headers' => $this->headers,
            'timeout' => 30
        ]);
        
        if (is_wp_error($response)) {
            throw new Exception('Failed to get messages: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['data'][0]['content'][0]['text']['value'])) {
            throw new Exception('No response content found');
        }
        
        return $data['data'][0]['content'][0]['text']['value'];
    }
    
    /**
     * Parse response (attempt JSON decode, fallback to plain text)
     */
    private function parse_response($response_content) {
        $parsed = json_decode($response_content, true);
        
        if (json_last_error() === JSON_ERROR_NONE) {
            return $parsed;
        }
        
        // Return as plain text if not JSON
        return ['response' => $response_content];
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