<?php

$attrs = is_array($attributes) ? $attributes : [];

$instance_id = isset($attrs['instanceId']) && $attrs['instanceId'] !== ''
    ? $attrs['instanceId']
    : wp_generate_uuid4();

$selected_component = isset($attrs['selectedComponent']) 
    ? $attrs['selectedComponent'] 
    : 'smart-goals';

	$assistant_id = isset($attrs['assistantId']) 
	? $attrs['assistantId'] 
	: '';

		$use_responses_api = isset($attrs['useResponsesApi']) 
	? $attrs['useResponsesApi'] 
	: 1;

?>
<div
    id="universal-ai-block"
    data-block-id="<?php echo esc_attr($instance_id); ?>"
    data-component="<?php echo esc_attr($selected_component); ?>"
    data-config="<?php echo esc_attr(json_encode($block_config)); ?>"
    data-assistant-id="<?php echo esc_attr($assistant_id); ?>"
    data-use-responses-api="<?php echo esc_attr($use_responses_api); ?>"
    data-is-logged-in="<?php echo esc_attr(is_user_logged_in() ? 'true' : 'false'); ?>"
>
    <!-- Component loads here -->
</div>