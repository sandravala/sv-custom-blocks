<?php

add_action('wp_ajax_get_personality_type', 'get_personality_type');
add_action('wp_ajax_nopriv_get_personality_type', 'get_personality_type'); 

add_action('wp_ajax_send_personality_type_by_email', 'send_personality_type_by_email');
add_action('wp_ajax_nopriv_send_personality_type_by_email', 'send_personality_type_by_email');

function get_personality_type() {
    //function for returnin personality type data to FE
    check_ajax_referer('sv_ajax_nonce', 'nonce'); // Security check

    $data = isset($_POST['data']) ? sanitize_text_field(wp_unslash($_POST['data'])) : '';

    // Example processing: Reverse the input string
    $response = strrev($data);

    wp_send_json_success(array(
        'response' => $response,
    ));
}

function send_personality_type_by_email() {
    //function for sending personality type data via email
    check_ajax_referer('sv_ajax_nonce', 'nonce'); // Security check

    $data = isset($_POST['data']) ? sanitize_text_field(wp_unslash($_POST['data'])) : '';

    
    // Example processing: Reverse the input string
    $response = strrev($data);

    $subject = 'Kas tu per žvėris? ' . $_POST['data']['type'];

    wp_send_json_success(array(
        'response' => $response,
    ));
}

function send_email($to, $subject, $message) {
    $headers = ['Content-Type: text/html; charset=UTF-8'];
    wp_mail($to, $subject, $message, $headers);
}


//pasikoreguoti, gal paduoti array su reiksmemis 
function generate_email_content() {
    // Get data from the AJAX request
    $subject = sanitize_text_field($_POST['subject']);
    $title = sanitize_text_field($_POST['title']);
    $message = sanitize_textarea_field($_POST['message']);

    // Load the email template
    $template_path = plugin_dir_path(__FILE__) . 'templates/email-template.html';
    $email_content = load_email_template($template_path, [
        'subject' => $subject,
        'title' => $title,
        'message' => $message,
        'plugin_url' => plugin_dir_path(__FILE__) . 'build/blocks/planner-personality-quiz/'
    ]);

    return $email_content;

}

function load_email_template($template_path, $data = []) {
    if (!file_exists($template_path)) {
        return '';
    }

    // // Get the contents of the template
    // $template_content = file_get_contents($template_path);

    ob_start();
    include($template_path);
    $template_content = ob_get_contents();
    ob_end_clean();

    // Replace placeholders with actual data
    foreach ($data as $key => $value) {
        $template_content = str_replace('{{' . $key . '}}', $value, $template_content);
    }

    return $template_content;
}