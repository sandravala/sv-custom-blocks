<?php

/**
 * AJAX handlers for Monthly Goals Block
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class SV_MonthlyGoals_Ajax_Handler
{

    public function __construct()
    {
        add_action('wp_ajax_sv_cb_mg_get_monthly_goals', [$this, 'get_monthly_goals']);
        add_action('wp_ajax_sv_cb_mg_save_monthly_goals', [$this, 'save_monthly_goals']);

        // Enqueue scripts with AJAX data
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
    }

    /**
     * Enqueue scripts and localize AJAX data
     */
    public function enqueue_scripts()
    {
        if (has_block('sv-custom-blocks/monthly-goals')) {
            wp_localize_script('sv-custom-blocks-monthly-goals-view-script', 'mgAjax', [
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('sv_cb_mg_nonce'),
            ]);
        }
    }

    /**
     * Get all monthly goals data and all quarterly context
     */
    public function get_monthly_goals()
    {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'sv_cb_mg_nonce')) {
            wp_die('Security check failed');
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_send_json_error('User not logged in');
            return;
        }

        $user_id = get_current_user_id();

        try {
            // Get ALL quarterly goals/actions for frontend filtering
            $goal_actions = get_user_meta($user_id, 'goal_actions', true);
            if (!is_array($goal_actions)) {
                $goal_actions = [];
            }

            // Get ALL existing monthly goals
            $monthly_goals = get_user_meta($user_id, 'monthly_goals', true);
            if (!is_array($monthly_goals)) {
                $monthly_goals = [];
            }

            // Get ALL TC preferences for frontend filtering
            $tc_preferences = get_user_meta($user_id, 'tc_calculator_preferences', true);
            if (!is_array($tc_preferences)) {
                $tc_preferences = [];
            }

            $routine_tasks = get_user_meta($user_id, 'routine_tasks', true);
            if (!is_array($routine_tasks)) {
                $routine_tasks = [];
            }

            $goal_stages = get_user_meta($user_id, 'goal_stages', true);
            if (!is_array($goal_stages)) {
                $goal_stages = [];
            }

            wp_send_json_success([
                'goal_actions' => $goal_actions,
                'monthly_goals' => $monthly_goals,
                'tc_preferences' => $tc_preferences,
                'routine_tasks' => $routine_tasks,
                'goal_stages' => $goal_stages
            ]);
        } catch (Exception $e) {
            error_log('Monthly Goals Get Error: ' . $e->getMessage());
            wp_send_json_error('Error loading monthly goals data');
        }
    }

    /**
     * Save monthly goals data
     */
    public function save_monthly_goals()
    {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'sv_cb_mg_nonce')) {
            wp_die('Security check failed');
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_send_json_error('User not logged in');
            return;
        }

        $user_id = get_current_user_id();
        $selected_month = isset($_POST['month']) ? sanitize_text_field($_POST['month']) : '';
        $goals_data = isset($_POST['goals']) ? json_decode(wp_unslash($_POST['goals']), true) : [];
        $tc_preferences = isset($_POST['tc_preferences']) ? json_decode(wp_unslash($_POST['tc_preferences']), true) : null;

        if (empty($selected_month)) {
            wp_send_json_error('Month parameter required');
            return;
        }

        if (!is_array($goals_data)) {
            wp_send_json_error('Invalid goals data format');
            return;
        }

        try {
            // Get existing monthly goals
            $monthly_goals = get_user_meta($user_id, 'monthly_goals', true);
            if (!is_array($monthly_goals)) {
                $monthly_goals = [];
            }

            // Update goals for the selected month
            $month_entry_updated = false;
            foreach ($monthly_goals as &$month_entry) {
                if ($month_entry['month'] === $selected_month) {
                    $month_entry['goals'] = $goals_data;
                    $month_entry_updated = true;
                    break;
                }
            }

            // If no entry exists for this month, create new one
            if (!$month_entry_updated) {
                $monthly_goals[] = [
                    'month' => $selected_month,
                    'goals' => $goals_data
                ];
            }

            // Save updated monthly goals
            $saved = update_user_meta($user_id, 'monthly_goals', $monthly_goals);

            // Save TC preferences if provided
            if ($tc_preferences && is_array($tc_preferences)) {
                update_user_meta($user_id, 'tc_calculator_preferences', $tc_preferences);
            }

            // Save timestamp
            update_user_meta($user_id, 'sv_cb_mg_last_updated', current_time('mysql'));

            if ($saved !== false) {
                wp_send_json_success([
                    'message' => 'Monthly goals saved successfully',
                    'goals_count' => count($goals_data)
                ]);
            } else {
                wp_send_json_error('Failed to save monthly goals');
            }
        } catch (Exception $e) {
            error_log('Monthly Goals Save Error: ' . $e->getMessage());
            wp_send_json_error('Error saving monthly goals');
        }
    }

    /**
     * Get quarter from month number
     */
    private function get_quarter_from_month($month_num)
    {
        if ($month_num >= 1 && $month_num <= 3) return 'Q1';
        if ($month_num >= 4 && $month_num <= 6) return 'Q2';
        if ($month_num >= 7 && $month_num <= 9) return 'Q3';
        return 'Q4';
    }
}


// Initialize the handler
new SV_MonthlyGoals_Ajax_Handler();
