<?php
/**
 * Shared database operations for assistant blocks
 * 
 * @package sv-custom-blocks
 */

trait SV_Block_Database_Operations {
    
    /**
     * Generic save method for assistant responses
     * 
     * @param string $table_suffix The table name suffix (e.g., 'routine_tasks', 'goals')
     * @param int $user_id User ID
     * @param string $assistant_id Assistant ID
     * @param array $input_data Input data to save
     * @param array $response_data Response data from OpenAI
     * @return bool Success status
     */
    protected function save_assistant_data($table_suffix, $user_id, $assistant_id, $input_data, $response_data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        // Ensure table exists
        $this->create_table($table_suffix);
        
        $data = [
            'user_id' => $user_id,
            'assistant_id' => $assistant_id,
            'input_data' => json_encode($input_data),
            'response_data' => json_encode($response_data),
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
     * Generic load method for assistant data
     */
    protected function load_assistant_data($table_suffix, $user_id, $assistant_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT input_data, response_data FROM {$table_name} 
             WHERE user_id = %d AND assistant_id = %s 
             ORDER BY updated_at DESC LIMIT 1",
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
    
    /**
     * Update response data for existing record
     * 
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID
     * @param string $assistant_id Assistant ID
     * @param array $updated_response_data Updated response data
     * @return bool Success status
     */
    protected function update_response_data($table_suffix, $user_id, $assistant_id, $updated_response_data) {
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
                'assistant_id' => $assistant_id
            ],
            ['%s', '%s'],
            ['%d', '%s']
        );
        
        return $result !== false;
    }
    
    /**
     * Update both input and response data for existing record
     * 
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID
     * @param string $assistant_id Assistant ID
     * @param array $updated_input_data Updated input data (optional)
     * @param array $updated_response_data Updated response data
     * @return bool Success status
     */
    protected function update_assistant_data($table_suffix, $user_id, $assistant_id, $updated_input_data = null, $updated_response_data = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        $update_data = ['updated_at' => current_time('mysql')];
        $format = ['%s'];
        
        if ($updated_input_data !== null) {
            $update_data['input_data'] = json_encode($updated_input_data);
            $format[] = '%s';
        }
        
        if ($updated_response_data !== null) {
            $update_data['response_data'] = json_encode($updated_response_data);
            $format[] = '%s';
        }
        
        if (count($update_data) === 1) {
            // Only timestamp to update, nothing to do
            return true;
        }
        
        $result = $wpdb->update(
            $table_name,
            $update_data,
            [
                'user_id' => $user_id,
                'assistant_id' => $assistant_id
            ],
            $format,
            ['%d', '%s']
        );
        
        return $result !== false;
    }
    
    /**
     * Delete assistant data
     * 
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID
     * @param string $assistant_id Assistant ID (optional - if empty, deletes all for user)
     * @return bool Success status
     */
    protected function delete_assistant_data($table_suffix, $user_id, $assistant_id = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        $where = ['user_id' => $user_id];
        $where_format = ['%d'];
        
        if ($assistant_id !== null) {
            $where['assistant_id'] = $assistant_id;
            $where_format[] = '%s';
        }
        
        $result = $wpdb->delete($table_name, $where, $where_format);
        
        return $result !== false;
    }
    
    /**
     * Get all assistant data for a user
     * 
     * @param string $table_suffix The table name suffix
     * @param int $user_id User ID
     * @param int $limit Limit results (optional)
     * @return array Array of records
     */
    protected function get_user_assistant_data($table_suffix, $user_id, $limit = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
        
        $sql = $wpdb->prepare(
            "SELECT assistant_id, input_data, response_data, created_at, updated_at 
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
                    'assistant_id' => $row->assistant_id,
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
     * Create table for block data
     */
    protected function create_table($table_suffix) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . $table_suffix;
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