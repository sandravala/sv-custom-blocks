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
import { InspectorControls, InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, RangeControl } from '@wordpress/components';

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

export default function Edit({setAttributes, attributes}) {

    const blockProps = useBlockProps();
    const { autoplay, timeframe, height, fixedHeight } = attributes;
	
	return (
		<div {...blockProps}>
            <InspectorControls>
                <PanelBody title={ __('Slider Settings', 'myplugin') }>
                    <ToggleControl
                        label={ __('Autoplay', 'myplugin') }
                        checked={ autoplay }
                        onChange={ (value) => setAttributes({ autoplay: value }) }
                    />
                    { autoplay && (
                        <RangeControl
                            label={ __('Timeframe (ms)', 'myplugin') }
                            value={ timeframe }
                            onChange={ (value) => setAttributes({ timeframe: value }) }
                            min={3000}
                            max={10000}
                            step={500}
                        />
                    ) }
                    <ToggleControl
                        label={ __('Fixed height', 'myplugin') }
                        checked={ fixedHeight }
                        onChange={ (value) => setAttributes({ fixedHeight: value }) }
                    />
                    {fixedHeight && (<RangeControl
                        label={ __('Height (vh)', 'myplugin') }
                        value={ height }
                        onChange={ (value) => setAttributes({ height: value }) }
                        min={0}
                        max={100}
                        step={5}
                    />)}
                </PanelBody>
            </InspectorControls>
            <div>slider block
                <InnerBlocks />
            </div>
		</div>
	);
}
