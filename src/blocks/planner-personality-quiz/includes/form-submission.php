<?php

add_action('wp_ajax_send_personality_type_by_email', 'send_personality_type_by_email');
add_action('wp_ajax_nopriv_send_personality_type_by_email', 'send_personality_type_by_email');

function send_personality_type_by_email() {
    //function for sending personality type data via email
    check_ajax_referer('sv_ajax_nonce', 'nonce'); // Security check

    $type = isset($_POST['data']['type']) ? sanitize_text_field(wp_unslash($_POST['data']['type'])) : '';
    $userEmail = isset($_POST['data']['email']) ? sanitize_email( $_POST['data']['email'] ) : '';
    $userName = isset($_POST['data']['name']) ? sanitize_text_field(wp_unslash($_POST['data']['name'])) : '';

    // Construct the path to the JSON file
    $data_path = plugin_dir_path(__FILE__) . '../assets/data/' . strtolower($type) . '.json';

    // Check if the file exists
    if (!file_exists($data_path)) {
        wp_send_json_error('Data file not found for the given type.');
        return;
    }

    // Read and decode the JSON file
    $type_data_json = file_get_contents($data_path);
    $type_data = json_decode($type_data_json, true); // Decode as an associative array

    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error('Failed to decode JSON data: ' . json_last_error_msg());
        return;
    }

    // Prepare the email subject
    $subject = 'Kas tu per žvėris? ' . $type_data['name'];

    // You can further process $type_data or send an email here
    $template_path = plugin_dir_path(__FILE__) . '../templates/email-template.html';
    $message = fill_email_template($template_path, $type_data);

    send_email($userEmail, $subject, $message);


    // Respond with success
    wp_send_json_success([
        'message' => 'Data processed successfully'
    ]);

        // wp_send_json_success(array(
        //     'response' => $response,
        // ));
}

function send_email($to, $subject, $message) {
    $headers = ['Content-Type: text/html; charset=UTF-8'];
    wp_mail($to, $subject, $message, $headers);
}

function fill_email_template($template_path, $data = []) {
    if (!file_exists($template_path)) {
        return '';
    }

    // Get the contents of the template
    $template_content = file_get_contents($template_path);
    $data['plugin_url'] = plugin_dir_url( dirname(__FILE__));

    // Replace placeholders with actual data
    foreach ($data as $key => $value) {
        if($key === 'excercise') {
            $i = 1;
            foreach ($value as $h1 => $excercise) {

                $template_content = str_replace('{{pratimas' . $i . 'h1}}', $h1, $template_content);

                if (is_array($excercise)) {
                    // Convert array to paragraphs
                    $excercise = '<p>' . implode('</p><p>', $excercise) . '</p>';

                    $template_content = str_replace('{{pratimas' . $i . '}}', $excercise, $template_content);

                    $i++;
                }
           
            }
        }
        if (is_array($value)) {
            // Convert array to paragraphs
            $value = '<p>' . implode('</p><p>', $value) . '</p>';
        }

        $template_content = str_replace('{{' . $key . '}}', $value, $template_content);
    }

    return $template_content;
}