<?php

/**
 * AJAX handlers for Routine Tasks Generator
 * Uses shared OpenAI handler and database trait
 * 
 * @package sv-custom-blocks
 */

// Include shared components
require_once plugin_dir_path(__FILE__) . '../../../../includes/trait-block-database-operations.php';

class SV_QuarterGoals_Ajax_Handler
{

    use SV_Block_Database_Operations;

    private $table_suffix = 'quarter_goals';
    private $block_abbr = 'qg'; // quarterly goals generator

    public function __construct()
    {
        // Register AJAX actions
        add_action('wp_ajax_generate_quarter_goals', [$this, 'generate_quarter_goals']);
        add_action('wp_ajax_nopriv_generate_quarter_goals', [$this, 'generate_quarter_goals']);
        add_action('wp_ajax_load_quarter_goals', [$this, 'load_quarter_goals']);
        add_action('wp_ajax_save_quarter_goals', [$this, 'save_quarter_goals']);
    }

    /**
     * Generate quarterly goals using OpenAI Assistant
     */
    public function generate_quarter_goals()
    {
        check_ajax_referer('sv_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.']);
            return;
        }

        $user_id = get_current_user_id();
        $assistant_id = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        $current_situation = isset($_POST['current_situation']) ? sanitize_text_field(wp_unslash($_POST['current_situation'])) : '';
        $smart_goal = isset($_POST['smart_goal']) ? sanitize_text_field(wp_unslash($_POST['smart_goal'])) : '';

        if ( empty($smart_goal) || empty($assistant_id)) {
            wp_send_json_error(['message' => 'Užpildyk visus privalomus laukus!']);
            return;
        }

        try {
            // Get OpenAI handler instance
            $openai_handler = SV_OpenAI_Assistant_Handler::get_instance();

            if (!$openai_handler->is_configured()) {
                wp_send_json_error(['message' => 'OpenAI API raktas nenustatytas. Susisiek su admin.']);
                return;
            }



            // Format message for assistant
            $message_data = [
                'current_situation' => $current_situation,
                'smart_goal' => $smart_goal
            ];

            $user_message = SV_OpenAI_Assistant_Handler::format_message($message_data);

            // Call assistant
            $openai_response = $openai_handler->call_assistant($assistant_id, $user_message);

            if (is_wp_error($openai_response)) {
                throw new Exception($openai_response->get_error_message());
            }


            // Save to database
            $input_data = [
                'current_situation' => $current_situation
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
                // $this->save_to_user_meta($user_id, $this->block_abbr, 'last_response', json_encode($openai_response));
                // $this->save_to_user_meta($user_id, $this->block_abbr, 'last_updated', current_time('mysql'));

                error_log('Quarter Goals saved successfully for user: ' . $user_id);
            } else {
                error_log('Failed to save Quarter Goals to database for user: ' . $user_id);
            }

            wp_send_json_success($openai_response);
        } catch (Exception $e) {
            error_log('Quarter Goals Generator Error: ' . $e->getMessage());
            wp_send_json_error(['message' => 'Įvyko klaida generuojant ketvirčio tikslus. Bandyk dar kartą.']);
        }
    }

    /**
     * Load saved quarter goals
     */
    public function load_quarter_goals()
    {
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
     * Save edited goal changes
     */
    public function save_goal_changes()
    {
        check_ajax_referer('sv_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Turite būti prisijungę.']);
            return;
        }

        $user_id = get_current_user_id();
        $assistant_id = isset($_POST['assistant_id']) ? sanitize_text_field(wp_unslash($_POST['assistant_id'])) : '';
        $smart_goal = isset($_POST['goal']) ? wp_unslash($_POST['goal']) : '';

        if (empty($assistant_id) || empty($smart_goal)) {
            wp_send_json_error(['message' => 'Trūksta duomenų.']);
            return;
        }
        // Get existing data
        $existing_data = $this->load_assistant_data($this->table_suffix, $user_id, $assistant_id);
        if (!$existing_data) {
            wp_send_json_error(['message' => 'Nerasta išsaugotų duomenų.']);
            return;
        }

        // Save updated data
        $saved = $this->save_assistant_data(
            $this->table_suffix,
            $user_id,
            $assistant_id,
            $existing_data['input_data'],
            $smart_goal
        );

        if ($saved) {

            wp_send_json_success(['message' => 'Tikslas išsaugotas']);
        } else {
            wp_send_json_error(['message' => 'Nepavyko išsaugoti tikslo']);
        }
    }

}

// Initialize the handler
new SV_QuarterGoals_Ajax_Handler();
