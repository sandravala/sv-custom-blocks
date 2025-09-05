<?php

/**
 * Updated database operations trait - Block-based instead of assistant-based
 * 
 * @package sv-custom-blocks
 */

trait SV_Block_Database_Operations
{
    const TABLE_SUFFIX = 'ai_blocks';
    /**
     * Save block data 
     * 
     * @param int $user_id User ID
     * @param string $block_id Block instance ID
     * @param array $input_data Input data to save
     * @return bool Success status
     */

    protected function save_block_data($user_id, $block_id, $input_data)
    {
        global $wpdb;

        $table_name = $wpdb->prefix . self::TABLE_SUFFIX; // Universal table for all AI blocks

        // Ensure table exists
        $this->create_table($table_name);

        $data = [
            'user_id' => $user_id,
            'block_id' => $block_id,
            'input_data' => json_encode($input_data),
            'updated_at' => current_time('mysql')
        ];

        // Check if record exists
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table_name} WHERE user_id = %d AND block_id = %s",
            $user_id,
            $block_id
        ));

        if ($existing) {
            $result = $wpdb->update(
                $table_name,
                [
                    'input_data' => $data['input_data'],
                    'updated_at' => $data['updated_at']
                ],
                ['id' => $existing],
                ['%s', '%s'],
                ['%d']
            );
        } else {
            $result = $wpdb->insert($table_name, $data, ['%d', '%s', '%s', '%s']);
        }

        return $result !== false;
    }

    /**
     * Load block data (renamed from load_assistant_data)
     * 
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID  
     * @param string $block_id Block instance ID
     * @return array|null Block data or null if not found
     */
    protected function load_block_data($user_id, $block_id)
    {
        global $wpdb;

        $table_name = $wpdb->prefix . self::TABLE_SUFFIX;
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
            return null; // Table doesn't exist
        }

        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT input_data, created_at, updated_at FROM {$table_name} 
             WHERE user_id = %d AND block_id = %s 
             ORDER BY updated_at DESC LIMIT 1",
            $user_id,
            $block_id
        ));

        if ($result) {
            return [
                'input_data' => json_decode($result->input_data, true),
                'updated_at' => $result->updated_at
            ];
        }

        return null;
    }

    /**
     * Delete block data
     * 
     * @param int $user_id User ID
     * @param string $block_id Block instance ID (optional - if empty, deletes all for user)
     * @return bool Success status
     */
    protected function delete_block_data($user_id, $block_id = null)
    {
        global $wpdb;

        $table_name = $wpdb->prefix . self::TABLE_SUFFIX;
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
            return false; // Table doesn't exist
        }

        $where = ['user_id' => $user_id];
        $where_format = ['%d'];

        if ($block_id !== null) {
            $where['block_id'] = $block_id;  // Changed from assistant_id
            $where_format[] = '%s';
        }

        $result = $wpdb->delete($table_name, $where, $where_format);

        return $result !== false;
    }

    /**
     * Get all block data for a user
     * 
     * @param int $user_id User ID
     * @param int $limit Limit results (optional)
     * @return array Array of records
     */
    protected function get_user_block_data($user_id, $limit = null)
    {
        global $wpdb;

        $table_name = $wpdb->prefix . self::TABLE_SUFFIX;;

        $sql = $wpdb->prepare(
            "SELECT block_id, input_data, created_at, updated_at 
             FROM {$table_name} 
             WHERE user_id = %d 
             ORDER BY updated_at DESC",
            $user_id
        );

        if ($limit) {
            $sql .= $wpdb->prepare(" LIMIT %d", $limit);
        }

        $results = $wpdb->get_results($sql);

        if ($results) {
            return array_map(function ($row) {
                return [
                    'block_id' => $row->block_id,  // Changed from assistant_id
                    'input_data' => json_decode($row->input_data, true),
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at
                ];
            }, $results);
        }

        return [];
    }

    /**
     * Create table for block data (updated schema)
     */
    protected function create_table($table_name)
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            block_id varchar(255) NOT NULL,
            input_data longtext NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY user_block (user_id, block_id),
            KEY user_id (user_id),
            KEY block_id (block_id)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    /**
     * LEGACY: Keep old methods for backward compatibility
     * These methods are deprecated but kept for existing code
     */

    /**
     * @deprecated Use save_block_data() instead
     */
    protected function save_assistant_data($table_suffix, $user_id, $identifier, $input_data, $response_data)
    {
        return $this->save_block_data($table_suffix, $user_id, $identifier, $input_data, $response_data);
    }

    /**
     * @deprecated Use load_block_data() instead
     */
    protected function load_assistant_data($table_suffix, $user_id, $identifier)
    {
        return $this->load_block_data($table_suffix, $user_id, $identifier);
    }

    /**
     * @deprecated Use update_block_response_data() instead
     */
    protected function update_response_data($table_suffix, $user_id, $identifier, $updated_response_data)
    {
        return $this->update_block_response_data($table_suffix, $user_id, $identifier, $updated_response_data);
    }

    /**
     * Universal user meta saving (for results)
     */
    protected function save_to_user_meta($user_id, $meta_key, $value)
    {
        return update_user_meta($user_id, $meta_key, $value);
    }

    /**
     * Get user meta
     */
    protected function get_user_meta($user_id, $meta_key)
    {
        return get_user_meta($user_id, $meta_key, true);
    }

    /**
     * Extract data from response using dot notation
     */
    protected function extract_data_by_path($data, $path)
    {
        if (empty($path)) {
            return $data;
        }

        $keys = explode('.', $path);
        $current = $data;

        foreach ($keys as $key) {
            if (is_array($current) && isset($current[$key])) {
                $current = $current[$key];
            } elseif (is_object($current) && isset($current->$key)) {
                $current = $current->$key;
            } else {
                return null;
            }
        }

        return $current;
    }

    /**
     * Process meta saves - Universal method for saving AI responses or user modifications to WordPress user meta
     * 
     * This method takes a configuration array from the frontend that specifies exactly what data should be saved
     * to which user meta keys. It works for both initial AI generation and subsequent user modifications.
     * 
     * @param int   $user_id       The WordPress user ID
     * @param array $save_to_meta  Configuration array mapping meta keys to data paths
     *                             Format: ['meta_key' => 'path.to.data'] or ['meta_key' => ''] for full data
     *                             Example: [
     *                                 'sv_cb_sg_latest_result' => '',              // Save full response
     *                                 'sv_cb_sg_goals_only' => 'goals',            // Save response.goals
     *                                 'sv_cb_sg_analysis' => 'analysis.summary',   // Save response.analysis.summary
     *                                 'user_goal_count' => 'stats.count'           // Save response.stats.count
     *                             ]
     * @param array $response_data The data to save (either AI response or user-modified data)
     * 
     * How it works:
     * 1. Validates the save configuration
     * 2. For each meta key in the configuration:
     *    - If path is empty: saves the entire response_data to that meta key
     *    - If path is provided: extracts data using dot notation (e.g., 'analysis.summary')
     *      and saves only that extracted value to the meta key
     * 3. Uses extract_data_by_path() to navigate nested data structures
     * 4. Safely handles missing paths (no error if path doesn't exist)
     * 
     * Benefits:
     * - Frontend controls exactly what gets saved where
     * - Same method works for AI generation AND user edits
     * - Supports nested data extraction with dot notation
     * - Data saved to user meta is accessible across all blocks
     * - Prevents database bloat by saving only needed data
     * 
     * Usage Examples:
     * 
     * // AI Generation: Save parts of AI response to user meta
     * $ai_response = ['goals' => [...], 'analysis' => ['summary' => '...'], 'stats' => ['count' => 3]];
     * $config = ['sv_cb_sg_goals' => 'goals', 'user_count' => 'stats.count'];
     * $this->process_meta_saves($user_id, $config, $ai_response);
     * 
     * // User Modification: Save edited data with same configuration
     * $edited_data = ['goals' => [...modified...], 'stats' => ['count' => 4]];
     * $this->process_meta_saves($user_id, $config, $edited_data);
     * 
     * // Result: WordPress user meta gets updated with both original and modified data
     * // Other blocks can access this data via get_user_meta($user_id, 'sv_cb_sg_goals', true)
     */
    protected function process_meta_saves($user_id, $save_to_meta, $response_data)
    {
        if (empty($save_to_meta) || !is_array($save_to_meta)) {
            return;
        }

        foreach ($save_to_meta as $meta_key => $path) {
            if (empty($path)) {
                $this->save_to_user_meta($user_id, $meta_key, $response_data);
            } else {
                $value = $this->extract_data_by_path($response_data, $path);
                if ($value !== null) {
                    $this->save_to_user_meta($user_id, $meta_key, $value);
                }
            }
        }
    }
}
