/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';
import { TextControl } from '@wordpress/components';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const { assistantId } = attributes;
	
	return (
		<>
			<div { ...useBlockProps() }>
				<div style={{ padding: '20px', border: '2px dashed #ccc', backgroundColor: '#f9f9f9' }}>
					<h3>{ __('Smart Goal Generator', 'smart-goal-generator') }</h3>
					<p>{ __('This block will display a form for users to generate smart goals using OpenAI.', 'smart-goal-generator') }</p>
					
					<TextControl
						label={ __('OpenAI Assistant ID', 'smart-goal-generator') }
						value={ assistantId }
						onChange={ (value) => setAttributes({ assistantId: value }) }
						placeholder={ __('Enter OpenAI Assistant ID (e.g., asst_abc123...)', 'smart-goal-generator') }
						help={ __('The ID of the OpenAI Assistant to use for generating smart goals. You can find this in your OpenAI dashboard.', 'smart-goal-generator') }
					/>
				</div>
			</div>
		</>
	);
}