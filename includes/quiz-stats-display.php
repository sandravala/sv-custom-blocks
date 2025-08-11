<?php
/**
 * Quiz Statistics Display
 * Block-specific statistics display
 */

if (!current_user_can('manage_options')) {
    wp_die("You do not have permission to view this page.");
}

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