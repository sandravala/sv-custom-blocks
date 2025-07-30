<?php

add_action('admin_post_sv_custom_blocks_submit_settings', 'sv_custom_blocks_submit_settings');


// Submit functionality
function sv_custom_blocks_submit_settings(){

    // Make sure user actually has the capability to edit the options
    if (!current_user_can('edit_theme_options')) {
        wp_die("You do not have permission to view this page.");
    }

    // pass in the nonce ID from our form's nonce field - if the nonce fails this will kill script
    check_admin_referer('sv_custom_blocks_api_options_verify');

    if (isset($_POST['sv_ml_api_key'])) {

        $data_encryption = new BC_Data_Encryption();
        $submitted_api_key = sanitize_text_field($_POST['sv_ml_api_key']);

        $api_key = $data_encryption->encrypt($submitted_api_key);

        $api_exists = get_option('sv_ml_api_key');
        $decrypted_api = $data_encryption->decrypt(get_option('sv_ml_api_key'));

        if (!empty($api_key) && !empty($api_exists)) {
            update_option('sv_ml_api_key', $api_key);
        } else {
            add_option('sv_ml_api_key', $api_key);
        }
    }

    if (isset($_POST['sv_ml_group_id'])) {

        $data_encryption = new BC_Data_Encryption();
        $submitted_group_id = sanitize_text_field($_POST['sv_ml_group_id']);

        $group_id = $data_encryption->encrypt($submitted_group_id);

        $group_exists = get_option('sv_ml_group_id');
        $decrypted_group = $data_encryption->decrypt(get_option('sv_ml_group_id'));

        if (!empty($group_id) && !empty($group_exists)) {
            update_option('sv_ml_group_id', $group_id);
        } else {
            add_option('sv_ml_group_id', $group_id);
        }
    }


    // Redirect to same page with status=1 to show our options updated banner
    wp_redirect($_SERVER['HTTP_REFERER'] . '&ml_status=1');
}

// Function to render the Boat Configurator admin page
function sv_custom_blocks_render_menu() {

    // Make sure user actually has the capability to edit the options
    if (!current_user_can('edit_theme_options')) {
        wp_die("You do not have permission to view this page.");
    }


    $data_encryption = new BC_Data_Encryption();
    $api_key = get_option('sv_ml_api_key');


    if ($api_key) {
        $api_key = $data_encryption->decrypt(get_option('sv_ml_api_key'));
    }

    ?>

  <div class="wrap"></div>
    <h2>Mailerlite nustatymai</h2>
        <?php

            if (!current_user_can('edit_theme_options')) {
                wp_die("You do not have permission to view this page.");
            }

        // Check if status is 1 which means a successful options save just happened

        //phpcs:disable
        if (isset($_GET['ml_status']) && $_GET['ml_status'] == 1): 
        
        //phpcs:enable
        ?>

            <div class="notice notice-success inline">
                <p>Nustatymai išsaugoti!</p>
            </div>

            <?php endif;

        ?>
        <form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="POST">

            <!-- The nonce field is a security feature to avoid submissions from outside WP admin -->
            <?php wp_nonce_field('sv_custom_blocks_api_options_verify');?>

            <div class="sv-settings-ml-form">
                <label for="sv_ml_api_key">Mailerlite API Key</label>
                <input type="password" id="sv_ml_api_key" name="sv_ml_api_key" placeholder="Įveskite Mailerlite API key" value="<?php echo $api_key ? esc_attr($api_key) : ''; ?>">
            </div>


            <input type="hidden" name="action" value="sv_custom_blocks_submit_settings">
            <button type="submit" name="submit_form" id="submit_form">Išsaugoti</button>
        </form>

        <hr style="margin: 30px 0;">
        
        <h2>Quiz statistikos</h2>
        
        <?php
        $stats = get_quiz_stats();
        if ($stats && !empty($stats)) {
            $stat_labels = array(
                'show_answer_clicks' => 'Užbaigė testą iki rezultato parodymo',
                'send_email_clicks' => 'Įvedė el. paštą',
                'first_radio_clicks' => 'Pradėjo testą'
            );
            ?>
            <table class="widefat" style="max-width: 600px;">
                <thead>
                    <tr>
                        <th>Veiksmas</th>
                        <th>Skaičius</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($stats as $stat): ?>
                        <tr>
                            <td><?php echo esc_html($stat_labels[$stat->stat_type] ?? $stat->stat_type); ?></td>
                            <td><strong><?php echo esc_html($stat->count); ?></strong></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php
        } else {
            echo '<p>Statistikos duomenų dar nėra.</p>';
        }
        ?>

    <?php

}