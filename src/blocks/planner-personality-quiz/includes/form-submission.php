<?php

use MailerLite\MailerLite;

add_action('wp_ajax_send_personality_type_by_email', 'send_personality_type_by_email');
add_action('wp_ajax_nopriv_send_personality_type_by_email', 'send_personality_type_by_email');

function send_personality_type_by_email()
{
    //function for sending personality type data via email
    check_ajax_referer('sv_ajax_nonce', 'nonce'); // Security check

    $type = isset($_POST['data']['type']) ? sanitize_text_field(wp_unslash($_POST['data']['type'])) : '';
    $userEmail = isset($_POST['data']['email']) ? sanitize_email($_POST['data']['email']) : '';
    $userName = isset($_POST['data']['name']) ? sanitize_text_field(wp_unslash($_POST['data']['name'])) : '';
    $subscribe = isset($_POST['data']['subscribe']) ? true : false;
    $selectedGuide = isset($_POST['data']['guide']) ? sanitize_text_field(wp_unslash($_POST['data']['guide'])) : '';

    // EMAIL SENDING DISABLED - Only MailerLite subscription is active
    // Uncomment the code below to re-enable email sending


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
        wp_send_json_error('Failed to decode type JSON data: ' . json_last_error_msg());
        return;
    }

    $type_data['typeImg'] = plugin_dir_url(dirname(__FILE__)) . 'assets/img/type-img/' . strtolower($type) . '.jpg';
    $type_data['typeGif'] = plugin_dir_url(dirname(__FILE__)) . 'assets/img/type-meme/' . strtolower($type) . '.gif';
    // Prepare the email subject
    $subject = 'Kas tu per žvėris?';

    // You can further process $type_data or send an email here
    $template_path = plugin_dir_path(__FILE__) . '../templates/email-template.html';
    $message = fill_email_template($template_path, $type_data);

    send_email($userEmail, $subject, $message);

    if ($selectedGuide === '') {

        // Construct the path to the JSON file with type group data
        $group_data_path = plugin_dir_path(__FILE__) . '../assets/data/typeGroups.json';

        // Check if the file exists
        if (!file_exists($group_data_path)) {
            wp_send_json_error('Group file not found for the given type.');
            return;
        }

        // Read and decode the JSON file
        $group_data_json = file_get_contents($group_data_path);
        $group_data = json_decode($group_data_json, true); // Decode as an associative array

        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error('Failed to decode type group JSON data: ' . json_last_error_msg());
            return;
        }
        $selectedGuide = $group_data[$type];
    }


    $sanitizedContactInfo = array();
    $sanitizedContactInfo['email'] = $userEmail;
    $sanitizedContactInfo['firstName'] = $userName;
    $sanitizedContactInfo['type'] = $type;
    $sanitizedContactInfo['typeGroup'] = $selectedGuide;

    if ($subscribe) {
        $subscription_result = subscribeToMailerlite($sanitizedContactInfo);
        // dont need to notify user about subscription failure - admin will be notified instead via email
        // if (!$subscription_result) {
        //     wp_send_json_error('Subscription failed. Please try again or contact support.');
        //     return;
        // }
    }

    // Respond with success
    wp_send_json_success([
        'message' => 'Data processed successfully'
    ]);
}

function send_email($to, $subject, $message)
{
    $headers = array('Content-Type: text/html; charset=UTF-8', 'From: Sandra | 12GM <sandra@12gm.lt>');
    wp_mail($to, $subject, $message, $headers);
}

function fill_email_template($template_path, $data = [])
{
    if (!file_exists($template_path)) {
        return '';
    }

    // Get the contents of the template
    $template_content = file_get_contents($template_path);
    $data['plugin_url'] = plugin_dir_url(dirname(__FILE__));

    // Replace placeholders with actual data
    foreach ($data as $key => $value) {
        if ($key === 'excercise') {
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

function subscribeToMailerlite($sanitizedContactInfo)
{

    $data_encryption = new BC_Data_Encryption();
    $api_key = get_option('sv_ml_api_key');
    $group_id = 139088837103060331;

    if ($api_key) {
        $api_key = $data_encryption->decrypt(get_option('sv_ml_api_key'));
    }


    $mailerLite = new MailerLite(['api_key' => $api_key]);

    $data = [
        'email' => $sanitizedContactInfo['email'],
        "fields" => [
            "name" => isset($sanitizedContactInfo['firstName']) ? $sanitizedContactInfo['firstName'] : null,
            "tags" => [isset($sanitizedContactInfo['type']) ? $sanitizedContactInfo['type'] : null, isset($sanitizedContactInfo['typeGroup']) ? $sanitizedContactInfo['typeGroup'] : null]
        ]
    ];

    if (is_numeric($group_id) && $group_id > 0) {
        $data['groups'] = [$group_id];
    }

    try {
        $response = $mailerLite->subscribers->create($data);
    } catch (Exception $e) {
        // Send email to admin
        sendSubscriptionErrorEmailToAdmin($sanitizedContactInfo, $e->getMessage());
        return false;
    }
    return true;
}

function sendSubscriptionErrorEmailToAdmin($sanitizedContactInfo, $errorMessage)
{
    $admin_email = get_option('admin_email');
    $subject = 'Failed MailerLite Subscription Attempt';

    // Construct the message including all contact fields
    $message = 'A user attempted to subscribe with the following details but encountered an error: ' . PHP_EOL;
    foreach ($sanitizedContactInfo as $field => $value) {
        $message .= ucfirst($field) . ': ' . $value . PHP_EOL;
    }
    $message .= 'Error Message: ' . $errorMessage;

    // Send email to admin
    wp_mail($admin_email, $subject, $message);
}
