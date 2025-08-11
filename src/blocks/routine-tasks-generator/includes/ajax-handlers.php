<?php
/**
 * AJAX handlers for Routine Tasks Generator
 * Uses shared OpenAI handler and database trait
 * 
 * @package sv-custom-blocks
 */

// Include shared components
require_once plugin_dir_path(__FILE__) . '../../../../includes/trait-block-database-operations.php';

class SV_RoutineTasks_Ajax_Handler {
    
    use SV_Block_Database_Operations;
    
    private $table_suffix = 'routine_tasks';
    private $block_abbr = 'rtg'; // routine tasks generator
    
    public function __construct() {
        // Register AJAX actions
        add_action('wp_ajax_generate_routine_tasks', [$this, 'generate_routine_tasks']);
        add_action('wp_ajax_nopriv_generate_routine_tasks', [$this, 'generate_routine_tasks']);
        add_action('wp_ajax_load_routine_tasks', [$this, 'load_routine_tasks']);
        add_action('wp_ajax_save_task_changes', [$this, 'save_task_changes']);
    }
    
    /**
     * Generate routine tasks using OpenAI Assistant
     */
    public function generate_routine_tasks() {
        check_ajax_referer('sv_ajax_nonce', 'nonce');
        
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.']);
            return;
        }
        
        $user_id = get_current_user_id();
        $assistant_id = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        $activity_area = isset($_POST['activity_area']) ? sanitize_textarea_field(wp_unslash($_POST['activity_area'])) : '';
        $job_title = isset($_POST['job_title']) ? sanitize_text_field(wp_unslash($_POST['job_title'])) : '';
        $additional_info = isset($_POST['additional_info']) ? sanitize_textarea_field(wp_unslash($_POST['additional_info'])) : '';
        $responsibility_level = isset($_POST['responsibility_level']) ? sanitize_text_field(wp_unslash($_POST['responsibility_level'])) : '';
        
        if (empty($activity_area) || empty($job_title) || empty($assistant_id)) {
            wp_send_json_error(['message' => 'Prašome užpildyti visus privalomų laukus']);
            return;
        }
        
        try {
            // Get OpenAI handler instance
            $openai_handler = SV_OpenAI_Assistant_Handler::get_instance();
            
            if (!$openai_handler->is_configured()) {
                wp_send_json_error(['message' => 'OpenAI API raktas nenustatytas. Susisiekite su administratoriumi.']);
                return;
            }
            
            // Prepare responsibility level text
            $responsibility_level_text = $this->get_responsibility_level_text($responsibility_level);
            
            // Format message for assistant
            $message_data = [
                'veiklos_sritis' => $activity_area,
                'pareigos' => $job_title
            ];
            
            if (!empty($additional_info)) {
                $message_data['papildoma_informacija'] = $additional_info;
            }
            
            if (!empty($responsibility_level_text)) {
                $message_data['atsakomybės_lygis'] = $responsibility_level_text;
            }
            
            $user_message = SV_OpenAI_Assistant_Handler::format_message($message_data);
            
            // Call assistant
            $openai_response = $openai_handler->call_assistant($assistant_id, $user_message);
            
            if (is_wp_error($openai_response)) {
                throw new Exception($openai_response->get_error_message());
            }
            
            // Validate response structure
            if (!isset($openai_response['responsibilities_table'])) {
                throw new Exception('Invalid response format from assistant');
            }
            
            // Save to database
            $input_data = [
                'activity_area' => $activity_area,
                'job_title' => $job_title,
                'additional_info' => $additional_info,
                'responsibility_level' => $responsibility_level
            ];
            
            $saved = $this->save_assistant_data(
                $this->table_suffix,
                $user_id,
                $assistant_id,
                $input_data,
                $openai_response
            );
            
            if ($saved) {
                // Save to user meta
                $this->save_to_user_meta($user_id, $this->block_abbr, 'last_response', json_encode($openai_response));
                $this->save_to_user_meta($user_id, $this->block_abbr, 'last_updated', current_time('mysql'));
                
                error_log('Routine tasks saved successfully for user: ' . $user_id);
            } else {
                error_log('Failed to save routine tasks to database for user: ' . $user_id);
            }
            
            wp_send_json_success($openai_response);
            
        } catch (Exception $e) {
            error_log('Routine Tasks Generator Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Įvyko klaida generuojant užduotis. Bandykite dar kartą.']);
        }
    }
    
    /**
     * Load saved routine tasks
     */
    public function load_routine_tasks() {
        check_ajax_referer('sv_ajax_nonce', 'nonce');
        
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }
        
        $user_id = get_current_user_id();
        $assistant_id = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        
        if (empty($assistant_id)) {
            wp_send_json_error(['message' => 'Assistant ID reikalingas.']);
            return;
        }
        
        $saved_data = $this->load_assistant_data($this->table_suffix, $user_id, $assistant_id);
        
        if ($saved_data) {
            wp_send_json_success($saved_data);
        } else {
            wp_send_json_success(null); // No saved data
        }
    }
    
    /**
     * Save edited task changes
     */
    public function save_task_changes() {
        check_ajax_referer('sv_ajax_nonce', 'nonce');
        
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }
        
        $user_id = get_current_user_id();
        $assistant_id = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        $tasks_json = isset($_POST['tasks']) ? wp_unslash($_POST['tasks']) : '';
        
        if (empty($assistant_id) || empty($tasks_json)) {
            wp_send_json_error(['message' => 'Trūksta duomenų.']);
            return;
        }
        
        $tasks = json_decode($tasks_json, true);
        if (!$tasks) {
            wp_send_json_error(['message' => 'Neteisingi užduočių duomenys.']);
            return;
        }
        
        // Sanitize task data
        $sanitized_tasks = [];
        foreach ($tasks as $task) {
            if (isset($task['responsibility']) && isset($task['typical_hours_per_month'])) {
                $sanitized_tasks[] = [
                    'responsibility' => sanitize_text_field($task['responsibility']),
                    'typical_hours_per_month' => floatval($task['typical_hours_per_month'])
                ];
            }
        }
        
        // Get existing data
        $existing_data = $this->load_assistant_data($this->table_suffix, $user_id, $assistant_id);
        if (!$existing_data) {
            wp_send_json_error(['message' => 'Nerasta išsaugotų duomenų.']);
            return;
        }
        
        // Update the response data with new tasks
        $updated_response = $existing_data['response_data'];
        $updated_response['responsibilities_table'] = $sanitized_tasks;
        
        // Save updated data
        $saved = $this->save_assistant_data(
            $this->table_suffix,
            $user_id,
            $assistant_id,
            $existing_data['input_data'],
            $updated_response
        );
        
        if ($saved) {
            // Update user meta
            $this->save_to_user_meta($user_id, $this->block_abbr, 'last_response', json_encode($updated_response));
            $this->save_to_user_meta($user_id, $this->block_abbr, 'tasks_edited', true);
            $this->save_to_user_meta($user_id, $this->block_abbr, 'last_edited', current_time('mysql'));
            
            wp_send_json_success(['message' => 'Užduotys išsaugotos']);
        } else {
            wp_send_json_error(['message' => 'Nepavyko išsaugoti užduočių']);
        }
    }
    
    /**
     * Convert responsibility level to Lithuanian text
     */
    private function get_responsibility_level_text($level) {
        $levels = [
            'full_responsibility' => 'Atsakingas už visą procesą',
            'partial_responsibility' => 'Dalyvauju procese / padėju',
            'team_lead' => 'Vadovauju komandai',
            'individual_contributor' => 'Individualus vykdytojas'
        ];
        
        return $levels[$level] ?? '';
    }
}

// Initialize the handler
new SV_RoutineTasks_Ajax_Handler();