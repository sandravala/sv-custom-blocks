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

/**
 * WordPress components for the editor controls
 */
import { PanelBody, SelectControl } from '@wordpress/components';

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
	const { calculationMode } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Skaičiavimo nustatymai', 'sv-custom-blocks')}>
					<SelectControl
						label={__('Skaičiavimo tipas', 'sv-custom-blocks')}
						value={calculationMode}
						options={[
							{ label: __('Metinis', 'sv-custom-blocks'), value: 'yearly' },
							{ label: __('Mėnesinis', 'sv-custom-blocks'), value: 'monthly' },
						]}
						onChange={(value) => setAttributes({ calculationMode: value })}
						help={__('Pasirinkite ar skaičiuoti valandas per metus ar per mėnesį', 'sv-custom-blocks')}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="time-calculator-editor-placeholder">
					<div className="time-calculator-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM9 17H7V7H9V17ZM13 17H11V7H13V17ZM17 17H15V7H17V17Z" fill="#666"/>
						</svg>
					</div>
					<h3>{__('Laiko skaičiuoklė', 'sv-custom-blocks')}</h3>
					<p>
						{calculationMode === 'yearly' 
							? __('Skaičiuoja galimas darbo valandas per metus', 'sv-custom-blocks')
							: __('Skaičiuoja galimas darbo valandas per mėnesį', 'sv-custom-blocks')
						}
					</p>
					<p className="editor-mode-indicator">
						<strong>{__('Režimas:', 'sv-custom-blocks')} </strong>
						{calculationMode === 'yearly' ? __('Metinis', 'sv-custom-blocks') : __('Mėnesinis', 'sv-custom-blocks')}
					</p>
				</div>
			</div>
		</>
	);
}