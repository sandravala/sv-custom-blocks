<?php

add_action('wp_ajax_generate_routine_tasks', 'generate_routine_tasks');
add_action('wp_ajax_nopriv_generate_routine_tasks', 'generate_routine_tasks');

function generate_routine_tasks() {
    check_ajax_referer('sv_ajax_nonce', 'nonce');

    // Check if user is logged in
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

    $encrypted_openai_key = get_option('sv_openai_api_key');
    if (empty($encrypted_openai_key)) {
        wp_send_json_error(['message' => 'OpenAI API raktas nenustatytas. Susisiekite su administratoriumi.']);
        return;
    }

    $data_encryption = new BC_Data_Encryption();
    $openai_api_key = $data_encryption->decrypt($encrypted_openai_key);

    if (empty($openai_api_key)) {
        error_log('OpenAI API key is empty after decryption. Encrypted key exists: ' . (!empty($encrypted_openai_key) ? 'yes' : 'no'));
        wp_send_json_error(['message' => 'OpenAI API raktas negali būti iššifruotas. Patikrinkite nustatymus.']);
        return;
    }

    $responsibility_level_text = '';
    switch($responsibility_level) {
        case 'full_responsibility':
            $responsibility_level_text = 'Atsakingas už visą procesą';
            break;
        case 'partial_responsibility':
            $responsibility_level_text = 'Dalyvauju procese / padėdu';
            break;
        case 'team_lead':
            $responsibility_level_text = 'Vadovauju komandai';
            break;
        case 'individual_contributor':
            $responsibility_level_text = 'Individualus vykdytojas';
            break;
        default:
            $responsibility_level_text = '';
    }

    $user_message = "Vartotojas užsiima šia veikla: {$activity_area}\n";
    $user_message .= "Jo pareigos: {$job_title}\n";
    if (!empty($additional_info)) {
        $user_message .= "Papildoma informacija: {$additional_info}\n";
    }
    if (!empty($responsibility_level_text)) {
        $user_message .= "Atsakomybės lygis: {$responsibility_level_text}\n";
    }

    try {
        $openai_response = call_openai_assistant($openai_api_key, $assistant_id, $user_message);
        
        if ($openai_response && isset($openai_response['responsibilities_table'])) {
            // Save to database
            $saved = save_user_routine_tasks($user_id, $assistant_id, [
                'activity_area' => $activity_area,
                'job_title' => $job_title,
                'additional_info' => $additional_info,
                'responsibility_level' => $responsibility_level
            ], $openai_response);
            
            if ($saved) {
                wp_send_json_success($openai_response);
            } else {
                error_log('Failed to save routine tasks to database for user: ' . $user_id);
                wp_send_json_success($openai_response); // Still return success even if save fails
            }
        } else {
            wp_send_json_error(['message' => 'Nepavyko gauti duomenų iš OpenAI']);
        }
    } catch (Exception $e) {
        error_log('OpenAI API Error: ' . $e->getMessage());
        wp_send_json_error(['message' => 'Įvyko klaida generuojant užduotis. Bandykite dar kartą.']);
    }
}

function call_openai_assistant($api_key, $assistant_id, $user_message) {
    $headers = [
        'Authorization' => 'Bearer ' . $api_key,
        'Content-Type' => 'application/json',
        'OpenAI-Beta' => 'assistants=v2'
    ];

    // Step 1: Create a thread
    $thread_response = wp_remote_post('https://api.openai.com/v1/threads', [
        'headers' => $headers,
        'body' => json_encode([]),
        'timeout' => 30
    ]);

    if (is_wp_error($thread_response)) {
        throw new Exception('Failed to create thread: ' . $thread_response->get_error_message());
    }

    $thread_body = wp_remote_retrieve_body($thread_response);
    $thread_data = json_decode($thread_body, true);

    if (!$thread_data || isset($thread_data['error'])) {
        $error_message = isset($thread_data['error']['message']) ? $thread_data['error']['message'] : 'Failed to create thread';
        error_log('OpenAI Thread Creation Error: ' . $error_message . '. Response: ' . $thread_body);
        throw new Exception('Thread creation error: ' . $error_message);
    }

    $thread_id = $thread_data['id'];

    // Step 2: Add user message to thread
    $message_response = wp_remote_post("https://api.openai.com/v1/threads/{$thread_id}/messages", [
        'headers' => $headers,
        'body' => json_encode([
            'role' => 'user',
            'content' => $user_message
        ]),
        'timeout' => 30
    ]);

    if (is_wp_error($message_response)) {
        throw new Exception('Failed to add message: ' . $message_response->get_error_message());
    }

    // Step 3: Run the assistant
    $run_response = wp_remote_post("https://api.openai.com/v1/threads/{$thread_id}/runs", [
        'headers' => $headers,
        'body' => json_encode([
            'assistant_id' => $assistant_id
        ]),
        'timeout' => 30
    ]);

    if (is_wp_error($run_response)) {
        throw new Exception('Failed to run assistant: ' . $run_response->get_error_message());
    }

    $run_body = wp_remote_retrieve_body($run_response);
    $run_data = json_decode($run_body, true);

    if (!$run_data || isset($run_data['error'])) {
        $error_message = isset($run_data['error']['message']) ? $run_data['error']['message'] : 'Failed to run assistant';
        throw new Exception('Run creation error: ' . $error_message);
    }

    $run_id = $run_data['id'];

    // Step 4: Wait for completion and get result
    $max_attempts = 30;
    $attempt = 0;
    
    do {
        sleep(2);
        $attempt++;

        $status_response = wp_remote_get("https://api.openai.com/v1/threads/{$thread_id}/runs/{$run_id}", [
            'headers' => $headers,
            'timeout' => 30
        ]);

        if (is_wp_error($status_response)) {
            throw new Exception('Failed to check run status: ' . $status_response->get_error_message());
        }

        $status_body = wp_remote_retrieve_body($status_response);
        $status_data = json_decode($status_body, true);
        $status = $status_data['status'] ?? 'unknown';

        if ($status === 'completed') {
            break;
        }

        if ($status === 'failed' || $status === 'cancelled' || $status === 'expired') {
            throw new Exception('Assistant run failed with status: ' . $status);
        }

    } while ($attempt < $max_attempts);

    if ($attempt >= $max_attempts) {
        throw new Exception('Assistant run timed out');
    }

    // Step 5: Get the assistant's response
    $messages_response = wp_remote_get("https://api.openai.com/v1/threads/{$thread_id}/messages", [
        'headers' => $headers,
        'timeout' => 30
    ]);

    if (is_wp_error($messages_response)) {
        throw new Exception('Failed to get messages: ' . $messages_response->get_error_message());
    }

    $messages_body = wp_remote_retrieve_body($messages_response);
    $messages_data = json_decode($messages_body, true);

    if (!$messages_data || !isset($messages_data['data'][0]['content'][0]['text']['value'])) {
        throw new Exception('No response content found');
    }

    $response_content = $messages_data['data'][0]['content'][0]['text']['value'];
    
    // Parse JSON response
    $parsed_response = json_decode($response_content, true);
    
    if (!$parsed_response) {
        throw new Exception('Failed to parse assistant response JSON');
    }

    return $parsed_response;
}

// Add AJAX endpoint for loading saved data
add_action('wp_ajax_load_routine_tasks', 'load_routine_tasks');

// Add AJAX endpoint for saving task changes
add_action('wp_ajax_save_task_changes', 'save_task_changes');

function load_routine_tasks() {
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

    $saved_data = get_user_routine_tasks($user_id, $assistant_id);
    
    if ($saved_data) {
        wp_send_json_success($saved_data);
    } else {
        wp_send_json_success(null); // No saved data
    }
}

function save_task_changes() {
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
    $existing_data = get_user_routine_tasks($user_id, $assistant_id);
    if (!$existing_data) {
        wp_send_json_error(['message' => 'Nerasta išsaugotų duomenų.']);
        return;
    }

    // Update the response data with new tasks
    $updated_response = $existing_data['response_data'];
    $updated_response['responsibilities_table'] = $sanitized_tasks;

    // Save updated data
    $saved = save_user_routine_tasks($user_id, $assistant_id, $existing_data['input_data'], $updated_response);
    
    if ($saved) {
        wp_send_json_success(['message' => 'Užduotys išsaugotos']);
    } else {
        wp_send_json_error(['message' => 'Nepavyko išsaugoti užduočių']);
    }
}

function save_user_routine_tasks($user_id, $assistant_id, $input_data, $openai_response) {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'routine_tasks';
    
    // Create table if it doesn't exist
    create_routine_tasks_table();
    
    $data = [
        'user_id' => $user_id,
        'assistant_id' => $assistant_id,
        'input_data' => json_encode($input_data),
        'response_data' => json_encode($openai_response),
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ];
    
    // Check if record exists
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_name} WHERE user_id = %d AND assistant_id = %s",
        $user_id,
        $assistant_id
    ));
    
    if ($existing) {
        // Update existing record
        $result = $wpdb->update(
            $table_name,
            [
                'input_data' => $data['input_data'],
                'response_data' => $data['response_data'],
                'updated_at' => $data['updated_at']
            ],
            ['id' => $existing],
            ['%s', '%s', '%s'],
            ['%d']
        );
    } else {
        // Insert new record
        $result = $wpdb->insert($table_name, $data, ['%d', '%s', '%s', '%s', '%s', '%s']);
    }
    
    return $result !== false;
}

function get_user_routine_tasks($user_id, $assistant_id) {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'routine_tasks';
    
    $result = $wpdb->get_row($wpdb->prepare(
        "SELECT input_data, response_data FROM {$table_name} WHERE user_id = %d AND assistant_id = %s ORDER BY updated_at DESC LIMIT 1",
        $user_id,
        $assistant_id
    ));
    
    if ($result) {
        return [
            'input_data' => json_decode($result->input_data, true),
            'response_data' => json_decode($result->response_data, true)
        ];
    }
    
    return null;
}

function create_routine_tasks_table() {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'routine_tasks';
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        assistant_id varchar(255) NOT NULL,
        input_data longtext NOT NULL,
        response_data longtext NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY user_assistant (user_id, assistant_id),
        KEY user_id (user_id)
    ) {$charset_collate};";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

?>