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
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

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
	const { meetingNumber, meetingPassword, userName, width, height, alternativeLink } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Zoom Meeting Settings', 'sv-custom-blocks')}>
					<TextControl
						label={__('Meeting Number', 'sv-custom-blocks')}
						value={meetingNumber}
						onChange={(value) => setAttributes({ meetingNumber: value })}
						placeholder="123-456-789 or 123456789"
						help={__('Enter your Zoom meeting number (9-11 digits, spaces/dashes OK)', 'sv-custom-blocks')}
					/>
					<TextControl
						label={__('Meeting Password', 'sv-custom-blocks')}
						value={meetingPassword}
						onChange={(value) => setAttributes({ meetingPassword: value })}
						placeholder="Optional password"
						help={__('Enter meeting password if required', 'sv-custom-blocks')}
					/>
					<TextControl
						label={__('User Name', 'sv-custom-blocks')}
						value={userName}
						onChange={(value) => setAttributes({ userName: value })}
						placeholder="Guest User"
						help={__('Display name for joining the meeting', 'sv-custom-blocks')}
					/>
					<TextControl
						label={__('Alternative Zoom meeting link', 'sv-custom-blocks')}
						value={alternativeLink}
						onChange={(value) => setAttributes({ alternativeLink: value })}
						placeholder="https://zoom.us/j/123456789"
						help={__('Alternative link to join the Zoom meeting', 'sv-custom-blocks')}
					/>
					<TextControl
						label={__('Width', 'sv-custom-blocks')}
						value={width}
						onChange={(value) => setAttributes({ width: value })}
						placeholder="100%"
						help={__('Width of the meeting embed (e.g., 100%, 800px)', 'sv-custom-blocks')}
					/>
					<TextControl
						label={__('Height', 'sv-custom-blocks')}
						value={height}
						onChange={(value) => setAttributes({ height: value })}
						placeholder="600px"
						help={__('Height of the meeting embed (e.g., 600px, 50vh)', 'sv-custom-blocks')}
					/>
				</PanelBody>
			</InspectorControls>
			
			<div {...useBlockProps()}>
				<div className="zoom-meeting-preview">
					{meetingNumber ? (
						<div 
							className="zoom-embed-placeholder"
							style={{
								width: width || '100%',
								height: height || '600px',
								border: '2px dashed #ccc',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor: '#f9f9f9'
							}}
						>
							<div style={{ textAlign: 'center' }}>
								<p><strong>{__('Zoom Meeting Embed', 'sv-custom-blocks')}</strong></p>
								<p>{__('Meeting Number:', 'sv-custom-blocks')} {meetingNumber}</p>
								<p>{__('User:', 'sv-custom-blocks')} {userName}</p>
								{meetingPassword && <p>{__('Password Protected', 'sv-custom-blocks')}</p>}
								<p><em>{__('Live meeting will show on frontend', 'sv-custom-blocks')}</em></p>
							</div>
						</div>
					) : (
						<div className="zoom-meeting-placeholder">
							<p>{__('Please enter a Meeting Number in the block settings to configure your Zoom meeting embed.', 'sv-custom-blocks')}</p>
							<p><small>{__('Note: Zoom SDK credentials must be configured in plugin settings.', 'sv-custom-blocks')}</small></p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}