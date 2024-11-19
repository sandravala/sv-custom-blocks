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

    wp_send_json_success(array(
        'response' => $response,
    ));
}
