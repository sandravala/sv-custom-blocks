<?php

/**
 * Plugin Settings Page
 * Handles API keys and general plugin configuration
 * 
 * @package sv-custom-blocks
 */

class SV_Plugin_Settings
{

    private static $instance = null;

    public static function get_instance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_post_sv_custom_blocks_submit_settings', [$this, 'submit_settings']);
    }



    public function add_menu()
    {
        add_menu_page(
            'SV Custom Blocks Settings',
            'SV Custom Blocks',
            'manage_options',
            'sv-custom-blocks',
            [$this, 'render_settings_page'],
            'dashicons-pets',
            25
        );

        add_submenu_page(
            'sv-custom-blocks',      // parent slug
            'Quiz Stats',            // page title
            'Quiz Stats',            // menu title
            'manage_options',        // capability
            'quiz-stats',            // slug
            [$this, 'render_quiz_stats_page']
        );
    }




    public function render_settings_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die("You do not have permission to view this page.");
        }

        $data_encryption = new BC_Data_Encryption();

        // Get decrypted keys
        $ml_api_key = get_option('sv_ml_api_key');
        $openai_key = get_option('sv_openai_api_key');

        if ($ml_api_key) {
            $ml_api_key = $data_encryption->decrypt($ml_api_key);
        }

        if ($openai_key) {
            $openai_key = $data_encryption->decrypt($openai_key);
        }

?>
        <div class="wrap">
            <h1>SV Custom Blocks Settings</h1>

            <?php if (isset($_GET['status']) && $_GET['status'] == '1'): ?>
                <div class="notice notice-success">
                    <p>Settings saved successfully!</p>
                </div>
            <?php endif; ?>

            <form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="POST">
                <?php wp_nonce_field('sv_custom_blocks_api_options_verify'); ?>

                <h2>API Settings</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="sv_openai_api_key">OpenAI API Key</label>
                        </th>
                        <td>
                            <input type="password"
                                id="sv_openai_api_key"
                                name="sv_openai_api_key"
                                class="regular-text"
                                value="<?php echo esc_attr($openai_key ?: ''); ?>"
                                placeholder="sk-..." />
                            <p class="description">Enter your OpenAI API key for AI-powered blocks</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="sv_ml_api_key">MailerLite API Key</label>
                        </th>
                        <td>
                            <input type="password"
                                id="sv_ml_api_key"
                                name="sv_ml_api_key"
                                class="regular-text"
                                value="<?php echo esc_attr($ml_api_key ?: ''); ?>" />
                            <p class="description">Enter your MailerLite API key for email subscriptions</p>
                        </td>
                    </tr>
                </table>

                <input type="hidden" name="action" value="sv_custom_blocks_submit_settings">
                <p class="submit">
                    <button type="submit" class="button button-primary">Save Settings</button>
                </p>
            </form>
        </div>
    <?php
    }

    public function submit_settings()
    {
        if (!current_user_can('manage_options')) {
            wp_die("You do not have permission to perform this action.");
        }

        check_admin_referer('sv_custom_blocks_api_options_verify');

        $data_encryption = new BC_Data_Encryption();

        // Handle OpenAI API Key
        if (isset($_POST['sv_openai_api_key'])) {
            $openai_key = sanitize_text_field($_POST['sv_openai_api_key']);
            if (!empty($openai_key)) {
                $encrypted = $data_encryption->encrypt($openai_key);
                update_option('sv_openai_api_key', $encrypted);
            }
        }

        // Handle MailerLite API Key
        if (isset($_POST['sv_ml_api_key'])) {
            $ml_key = sanitize_text_field($_POST['sv_ml_api_key']);
            if (!empty($ml_key)) {
                $encrypted = $data_encryption->encrypt($ml_key);
                update_option('sv_ml_api_key', $encrypted);
            }
        }

        wp_redirect(admin_url('admin.php?page=sv-custom-blocks&status=1'));
        exit;
    }

    // Function to get quiz statistics
    public function get_quiz_stats($stat_type = null)
    {
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

    public function render_quiz_stats_page()
    {
        // Quiz statistics rendering (moved from original)
    ?>
        <div class="wrap">
            <h1>Quiz Statistics</h1>
            <?php
            $stats = get_quiz_stats();
            if ($stats && !empty($stats)) {
                $stat_labels = array(
                    'show_answer_clicks' => 'Completed quiz to result',
                    'send_email_clicks' => 'Entered email',
                    'first_radio_clicks' => 'Started quiz'
                );
            ?>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Count</th>
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
                echo '<p>No statistics data yet.</p>';
            }
            ?>
        </div>
<?php
    }
}
