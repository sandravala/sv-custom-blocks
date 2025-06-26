<?php

// Create database table for tracking statistics
add_action('wp_loaded', 'create_quiz_stats_table');

function create_quiz_stats_table() {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'quiz_stats';
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        stat_type varchar(50) NOT NULL,
        count bigint(20) DEFAULT 0,
        last_updated datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY stat_type (stat_type)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    // Initialize default stats if they don't exist (only insert if not exists)
    $stats = ['show_answer_clicks', 'send_email_clicks', 'first_radio_clicks'];
    
    foreach ($stats as $stat) {
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE stat_type = %s",
            $stat
        ));
        
        if (!$existing) {
            $wpdb->insert(
                $table_name,
                array(
                    'stat_type' => $stat,
                    'count' => 0
                ),
                array('%s', '%d')
            );
        }
    }
}

// AJAX handler for recording statistics
add_action('wp_ajax_record_quiz_stat', 'record_quiz_stat');
add_action('wp_ajax_nopriv_record_quiz_stat', 'record_quiz_stat');

function record_quiz_stat() {
    check_ajax_referer('sv_ajax_nonce', 'nonce');
    
    $stat_type = isset($_POST['stat_type']) ? sanitize_text_field($_POST['stat_type']) : '';
    
    if (empty($stat_type)) {
        wp_send_json_error('Invalid stat type');
        return;
    }
    
    // Validate stat type
    $allowed_stats = ['show_answer_clicks', 'send_email_clicks', 'first_radio_clicks'];
    if (!in_array($stat_type, $allowed_stats)) {
        wp_send_json_error('Invalid stat type');
        return;
    }
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'quiz_stats';
    
    // Increment the count (insert if doesn't exist, update if exists)
    $result = $wpdb->query($wpdb->prepare(
        "INSERT INTO $table_name (stat_type, count) VALUES (%s, 1) ON DUPLICATE KEY UPDATE count = count + 1",
        $stat_type
    ));
    
    if ($result === false) {
        wp_send_json_error('Failed to update stat');
    } else {
        wp_send_json_success('Stat recorded successfully');
    }
}

// Function to get quiz statistics
function get_quiz_stats($stat_type = null) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'quiz_stats';
    
    if ($stat_type) {
        return $wpdb->get_var($wpdb->prepare(
            "SELECT count FROM $table_name WHERE stat_type = %s",
            $stat_type
        ));
    } else {
        return $wpdb->get_results(
            "SELECT stat_type, count FROM $table_name ORDER BY stat_type"
        );
    }
}