<?php
/**
 * Admin page for viewing user feedback
 * Only accessible to super admins
 *
 * @package sv-custom-blocks
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class SV_Feedback_Admin_Page {

    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'handle_export']);
    }

    /**
     * Add admin menu page
     */
    public function add_admin_menu() {
        // Only show to users with manage_options capability
        if (!current_user_can('manage_options')) {
            return;
        }

        add_management_page(
            'User Feedback',           // Page title
            'User Feedback',           // Menu title
            'manage_options',          // Capability
            'user-feedback-viewer',    // Menu slug
            [$this, 'render_admin_page'] // Callback
        );
    }

    /**
     * Get all feedback form meta keys
     */
    private function get_feedback_forms() {
        global $wpdb;

        // Query all user meta keys that match our pattern
        $meta_keys = $wpdb->get_col("
            SELECT DISTINCT meta_key 
            FROM {$wpdb->usermeta} 
            WHERE meta_key LIKE 'sv_cb_uff_%'
            ORDER BY meta_key
        ");

        $forms = [];

        foreach ($meta_keys as $meta_key) {
            // Get a sample of data to extract form info
            $sample_data = $wpdb->get_var($wpdb->prepare("
                SELECT meta_value 
                FROM {$wpdb->usermeta} 
                WHERE meta_key = %s 
                AND meta_value != '' 
                LIMIT 1
            ", $meta_key));

            if ($sample_data) {
                $decoded = json_decode($sample_data, true);
                
                // Validate it's proper feedback data
                if (is_array($decoded) && isset($decoded['submitted_at'])) {
                    // Count total responses
                    $response_count = $wpdb->get_var($wpdb->prepare("
                        SELECT COUNT(*) 
                        FROM {$wpdb->usermeta} 
                        WHERE meta_key = %s 
                        AND meta_value != ''
                    ", $meta_key));

                    // Try to extract form title from data or use meta key
                    $form_title = $this->extract_form_title($decoded) ?: str_replace('sv_cb_uff_', '', $meta_key);

                    $forms[] = [
                        'meta_key' => $meta_key,
                        'title' => $form_title,
                        'response_count' => $response_count,
                        'sample_data' => $decoded
                    ];
                }
            }
        }

        return $forms;
    }

    /**
     * Try to extract form title from feedback data
     */
    private function extract_form_title($data) {
        // Look for common title indicators in the data
        if (isset($data['form_title'])) {
            return $data['form_title'];
        }
        
        // Could add more logic here based on your data structure
        return null;
    }

    /**
     * Get feedback data for specific form
     */
    private function get_form_responses($meta_key) {
        global $wpdb;

        $results = $wpdb->get_results($wpdb->prepare("
            SELECT u.ID as user_id, u.display_name, u.user_email, um.meta_value, um.meta_key
            FROM {$wpdb->usermeta} um
            JOIN {$wpdb->users} u ON um.user_id = u.ID
            WHERE um.meta_key = %s 
            AND um.meta_value != ''
            ORDER BY u.display_name
        ", $meta_key));

        $responses = [];
        foreach ($results as $row) {
            $feedback_data = json_decode($row->meta_value, true);
            if (is_array($feedback_data)) {
                $responses[] = [
                    'user_id' => $row->user_id,
                    'display_name' => $row->display_name,
                    'user_email' => $row->user_email,
                    'submitted_at' => $feedback_data['submitted_at'] ?? 'Unknown',
                    'feedback_data' => $feedback_data,
                    'meta_key' => $row->meta_key
                ];
            }
        }

        return $responses;
    }

    /**
     * Handle CSV export
     */
    public function handle_export() {
        if (!isset($_GET['action']) || $_GET['action'] !== 'export_feedback') {
            return;
        }

        if (!isset($_GET['meta_key']) || !is_super_admin()) {
            wp_die('Unauthorized access');
        }

        $meta_key = sanitize_text_field($_GET['meta_key']);
        $responses = $this->get_form_responses($meta_key);

        if (empty($responses)) {
            wp_die('No data to export');
        }

        // Generate CSV
        $filename = 'feedback-export-' . date('Y-m-d-H-i-s') . '.csv';
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        // Get all possible field keys from the data
        $all_fields = ['User ID', 'Display Name', 'Email', 'Submitted At'];
        foreach ($responses as $response) {
            foreach ($response['feedback_data'] as $key => $value) {
                if (!in_array($key, ['submitted_at', 'form_version']) && !in_array($key, $all_fields)) {
                    $all_fields[] = ucfirst(str_replace('_', ' ', $key));
                }
            }
        }
        $all_fields = array_unique($all_fields);

        // Write CSV header
        fputcsv($output, $all_fields);

        // Write data rows
        foreach ($responses as $response) {
            $row = [
                $response['user_id'],
                $response['display_name'],
                $response['user_email'],
                $response['submitted_at']
            ];

            // Add feedback field values
            foreach ($all_fields as $field) {
                if (in_array($field, ['User ID', 'Display Name', 'Email', 'Submitted At'])) {
                    continue; // Already added above
                }
                
                $field_key = strtolower(str_replace(' ', '_', $field));
                $value = $response['feedback_data'][$field_key] ?? '';
                
                // Handle arrays/objects in CSV
                if (is_array($value) || is_object($value)) {
                    $value = json_encode($value);
                }
                
                $row[] = $value;
            }

            fputcsv($output, $row);
        }

        fclose($output);
        exit;
    }

/**
     * Render admin page
     */
    public function render_admin_page() {
        $forms = $this->get_feedback_forms();
        $selected_form = isset($_GET['form']) ? sanitize_text_field($_GET['form']) : '';
        $responses = [];

        if ($selected_form) {
            $responses = $this->get_form_responses($selected_form);
        }

        ?>
        <div class="wrap">
            <h1>User Feedback Viewer</h1>
            
            <!-- Form Selection -->
            <div class="card" style="margin-bottom: 20px;">
                <h2>Select Feedback Form</h2>
                <form method="get" action="">
                    <input type="hidden" name="page" value="user-feedback-viewer" />
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">Feedback Form</th>
                            <td>
                                <select name="form" onchange="this.form.submit()">
                                    <option value="">Choose a form...</option>
                                    <?php foreach ($forms as $form): ?>
                                        <option value="<?php echo esc_attr($form['meta_key']); ?>" 
                                                <?php selected($selected_form, $form['meta_key']); ?>>
                                            <?php echo esc_html($form['title']); ?> 
                                            (<?php echo $form['response_count']; ?> responses)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                        </tr>
                    </table>
                </form>
            </div>

            <?php if ($selected_form && !empty($responses)): ?>
                <!-- Export Button -->
                <div style="margin-bottom: 20px;">
                    <a href="<?php echo add_query_arg(['action' => 'export_feedback', 'meta_key' => $selected_form]); ?>" 
                       class="button button-secondary">
                        Export to CSV
                    </a>
                    <span style="margin-left: 10px; color: #666;">
                        Total responses: <?php echo count($responses); ?>
                    </span>
                </div>

                <!-- Responses Table -->
                <div class="card">
                    <table class="wp-list-table widefat fixed striped feedback-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Submitted</th>
                                <th>Feedback</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($responses as $response): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo esc_html($response['display_name']); ?></strong><br>
                                        <small>ID: <?php echo $response['user_id']; ?></small>
                                    </td>
                                    <td><?php echo esc_html($response['user_email']); ?></td>
                                    <td><?php echo esc_html(date('Y-m-d H:i', strtotime($response['submitted_at']))); ?></td>
                                    <td>
                                        <details>
                                            <summary>View Feedback Details</summary>
                                            <div class="feedback-content">
                                                <?php foreach ($response['feedback_data'] as $key => $value): ?>
                                                    <?php if (in_array($key, ['submitted_at', 'form_version'])) continue; ?>
                                                    <div class="feedback-field">
                                                        <span class="feedback-label"><?php echo esc_html(ucfirst(str_replace('_', ' ', $key))); ?>:</span>
                                                        <div class="feedback-value">
                                                            <?php 
                                                            if (is_array($value) || is_object($value)) {
                                                                echo '<code>' . esc_html(json_encode($value, JSON_PRETTY_PRINT)) . '</code>';
                                                            } else {
                                                                echo esc_html($value);
                                                            }
                                                            ?>
                                                        </div>
                                                    </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </details>
                                    </td>
                                    <td>
                                        <a href="<?php echo get_edit_user_link($response['user_id']); ?>" 
                                           class="button button-small">
                                            View User
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

            <?php elseif ($selected_form): ?>
                <div class="notice notice-info">
                    <p>No responses found for this form.</p>
                </div>

            <?php elseif (empty($forms)): ?>
                <div class="notice notice-warning">
                    <p>No feedback forms found. Make sure you have created user feedback forms and users have submitted responses.</p>
                </div>
            <?php endif; ?>
        </div>

        <style>
        .feedback-table {
            table-layout: fixed;
            width: 100%;
        }
        
        .feedback-table th:nth-child(1) { width: 10%; } /* User */
        .feedback-table th:nth-child(2) { width: 10%; } /* Email */
        .feedback-table th:nth-child(3) { width: 10%; } /* Date */
        .feedback-table th:nth-child(4) { width: auto; }   /* Feedback - takes remaining space */
        .feedback-table th:nth-child(5) { width: 10%; } /* Actions */
        
        .feedback-table td {
            vertical-align: top;
            word-wrap: break-word;
        }
        
        details summary {
            cursor: pointer;
            color: #0073aa;
            font-weight: 500;
        }
        details summary:hover {
            color: #005177;
        }
        details[open] summary {
            margin-bottom: 10px;
        }
        
        .feedback-content {
            margin-top: 10px;
            padding: 15px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            max-width: 100%;
            overflow-x: auto;
        }
        
        .feedback-field {
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
            margin-bottom: 12px;
        }
        
        .feedback-field:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .feedback-label {
            font-weight: 600;
            color: #333;
            display: block;
            margin-bottom: 4px;
        }
        
        .feedback-value {
            color: #555;
            line-height: 1.4;
        }
        
        .feedback-value code {
            background: #f1f1f1;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 12px;
        }
        
        /* Make the whole card wider */
        .wrap .card {
            max-width: none;
        }
        </style>
        <?php
    }
}

// Initialize the admin page
new SV_Feedback_Admin_Page();