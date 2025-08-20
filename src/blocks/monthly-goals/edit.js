/**
 * Monthly Goals Block - Edit component
 */
import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import {
	PanelBody,
	SelectControl,
} from "@wordpress/components";

import "./editor.scss";

export default function Edit({ attributes, setAttributes }) {
	const {
		sv_cb_mg_month_selection_mode,
	} = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("Settings", "sv-custom-blocks")}
					initialOpen={true}
				>
					<SelectControl
						label={__("Month Selection Mode", "sv-custom-blocks")}
						value={sv_cb_mg_month_selection_mode}
						options={[
							{
								label: __("Limited (Current/Next Quarter)", "sv-custom-blocks"),
								value: "limited"
							},
							{
								label: __("Extended (All Months)", "sv-custom-blocks"),
								value: "extended"
							}
						]}
						onChange={(value) =>
							setAttributes({ sv_cb_mg_month_selection_mode: value })
						}
						help={__(
							"Limited mode shows only current or next quarter months. Extended mode shows all 12 months.",
							"sv-custom-blocks"
						)}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...useBlockProps()}>
				<div className="monthly-goals-editor-placeholder">
					<div className="monthly-goals-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM19 19H5V8H19V19ZM19 6H5V5H19V6Z" fill="#666"/>
							<path d="M7 10H9V12H7V10ZM11 10H13V12H11V10ZM15 10H17V12H15V10ZM7 14H9V16H7V14ZM11 14H13V16H11V14ZM15 14H17V16H15V14Z" fill="#007cba"/>
						</svg>
					</div>
					<h3>{__("Monthly Goals", "sv-custom-blocks")}</h3>
					<p>{__(
						"Create monthly goals based on your quarterly objectives. Select a month and plan your goals with time allocations.",
						"sv-custom-blocks"
					)}</p>
					<div className="settings-preview">
						<span className="setting-badge">
							{__("Mode:", "sv-custom-blocks")} {sv_cb_mg_month_selection_mode === "limited" 
								? __("Limited", "sv-custom-blocks") 
								: __("Extended", "sv-custom-blocks")
							}
						</span>
					</div>
				</div>
			</div>
		</>
	);
}