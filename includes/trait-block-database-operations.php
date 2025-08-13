<?php
/**
 * Updated database operations trait - Block-based instead of assistant-based
 * 
 * @package sv-custom-blocks
 */

trait SV_Block_Database_Operations {
    
    /**
     * Save block data (renamed from save_assistant_data)
     * 
     * @param string $table_suffix The table name suffix (e.g., 'routine_tasks', 'smart_goals')
     * @param int $user_id User ID
     * @param string $block_id Block instance ID
     * @param array $input_data Input data to save
     * @param array $response_data Response data from AI
     * @return bool Success status
     */
    protected function save_block_data($table_suffix, $user_id, $block_id, $input_data, $response_data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        // Ensure table exists
        $this->create_table($table_suffix);
        
        $data = [
            'user_id' => $user_id,
            'block_id' => $block_id,  // Changed from assistant_id
            'input_data' => json_encode($input_data),
            'response_data' => json_encode($response_data),
            'created_at' => current_time('mysql'),
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
                    'response_data' => $data['response_data'],
                    'updated_at' => $data['updated_at']
                ],
                ['id' => $existing],
                ['%s', '%s', '%s'],
                ['%d']
            );
        } else {
            $result = $wpdb->insert($table_name, $data, ['%d', '%s', '%s', '%s', '%s', '%s']);
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
    protected function load_block_data($table_suffix, $user_id, $block_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT input_data, response_data, created_at, updated_at FROM {$table_name} 
             WHERE user_id = %d AND block_id = %s 
             ORDER BY updated_at DESC LIMIT 1",
            $user_id,
            $block_id
        ));
        
        if ($result) {
            return [
                'input_data' => json_decode($result->input_data, true),
                'response_data' => json_decode($result->response_data, true),
                'created_at' => $result->created_at,
                'updated_at' => $result->updated_at
            ];
        }
        
        return null;
    }
    
    /**
     * Update response data for existing block
     * 
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID
     * @param string $block_id Block instance ID
     * @param array $updated_response_data Updated response data
     * @return bool Success status
     */
    protected function update_block_response_data($table_suffix, $user_id, $block_id, $updated_response_data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        $result = $wpdb->update(
            $table_name,
            [
                'response_data' => json_encode($updated_response_data),
                'updated_at' => current_time('mysql')
            ],
            [
                'user_id' => $user_id,
                'block_id' => $block_id  // Changed from assistant_id
            ],
            ['%s', '%s'],
            ['%d', '%s']
        );
        
        return $result !== false;
    }
    
    /**
     * Delete block data
     * 
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID
     * @param string $block_id Block instance ID (optional - if empty, deletes all for user)
     * @return bool Success status
     */
    protected function delete_block_data($table_suffix, $user_id, $block_id = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
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
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID
     * @param int $limit Limit results (optional)
     * @return array Array of records
     */
    protected function get_user_block_data($table_suffix, $user_id, $limit = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        $sql = $wpdb->prepare(
            "SELECT block_id, input_data, response_data, created_at, updated_at 
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
            return array_map(function($row) {
                return [
                    'block_id' => $row->block_id,  // Changed from assistant_id
                    'input_data' => json_decode($row->input_data, true),
                    'response_data' => json_decode($row->response_data, true),
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
    protected function create_table($table_suffix) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            block_id varchar(255) NOT NULL,
            input_data longtext NOT NULL,
            response_data longtext NOT NULL,
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
    protected function save_assistant_data($table_suffix, $user_id, $identifier, $input_data, $response_data) {
        return $this->save_block_data($table_suffix, $user_id, $identifier, $input_data, $response_data);
    }
    
    /**
     * @deprecated Use load_block_data() instead
     */
    protected function load_assistant_data($table_suffix, $user_id, $identifier) {
        return $this->load_block_data($table_suffix, $user_id, $identifier);
    }
    
    /**
     * @deprecated Use update_block_response_data() instead
     */
    protected function update_response_data($table_suffix, $user_id, $identifier, $updated_response_data) {
        return $this->update_block_response_data($table_suffix, $user_id, $identifier, $updated_response_data);
    }
    
    /**
     * Save to user meta using naming convention
     */
    protected function save_to_user_meta($user_id, $block_abbr, $data_type, $value) {
        $meta_key = "sv_cb_{$block_abbr}_{$data_type}";
        return update_user_meta($user_id, $meta_key, $value);
    }
    
    /**
     * Load from user meta using naming convention
     */
    protected function load_from_user_meta($user_id, $block_abbr, $data_type) {
        $meta_key = "sv_cb_{$block_abbr}_{$data_type}";
        return get_user_meta($user_id, $meta_key, true);
    }
    
    /**
     * Delete from user meta using naming convention
     */
    protected function delete_from_user_meta($user_id, $block_abbr, $data_type) {
        $meta_key = "sv_cb_{$block_abbr}_{$data_type}";
        return delete_user_meta($user_id, $meta_key);
    }
}
?>