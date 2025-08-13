/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from "@wordpress/i18n";

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { TextControl, PanelBody, ToggleControl } from "@wordpress/components";

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import "./editor.scss";

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const {
		sv_cb_qgoals_assistant_id,
		sv_cb_qgoals_show_smart_goal,
		sv_cb_qgoals_show_timeframe,
		sv_cb_qgoals_show_assumptions,
		sv_cb_qgoals_show_resources,
		sv_cb_qgoals_show_risks,
		sv_cb_qgoals_show_kpis,
		sv_cb_qgoals_show_stages,
		sv_cb_qgoals_show_actions,
		sv_cb_qgoals_show_totals,
		sv_cb_qgoals_allow_editing,
		sv_cb_qgoals_group_actions_by_quarter,
	} = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={__("Display Options", "sv-custom-blocks")}>
					<ToggleControl
						label={__("Show SMART Goal", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_smart_goal}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_smart_goal: value })
						}
					/>
					<ToggleControl
						label={__("Show Timeframe", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_timeframe}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_timeframe: value })
						}
					/>
					<ToggleControl
						label={__("Show Assumptions", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_assumptions}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_assumptions: value })
						}
					/>
					<ToggleControl
						label={__("Show Required Resources", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_resources}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_resources: value })
						}
					/>
					<ToggleControl
						label={__("Show Risks & Mitigations", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_risks}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_risks: value })
						}
					/>
					<ToggleControl
						label={__("Show KPI Summary", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_kpis}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_kpis: value })
						}
					/>
					<ToggleControl
						label={__("Show Quarterly Stages", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_stages}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_stages: value })
						}
					/>
					<ToggleControl
						label={__("Show Actions List", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_actions}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_actions: value })
						}
					/>
					<ToggleControl
						label={__("Show Time Totals", "sv-custom-blocks")}
						checked={sv_cb_qgoals_show_totals}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_show_totals: value })
						}
					/>
				</PanelBody>

				<PanelBody title={__("Configuration", "sv-custom-blocks")}>
					<TextControl
						label={__("OpenAI Assistant ID", "sv-custom-blocks")}
						value={sv_cb_qgoals_assistant_id}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_assistant_id: value })
						}
						placeholder={__("Enter OpenAI Assistant ID", "sv-custom-blocks")}
						help={__(
							"Assistant ID for generating quarter goals",
							"sv-custom-blocks",
						)}
					/>
					<ToggleControl
						label={__("Allow Action Editing", "sv-custom-blocks")}
						checked={sv_cb_qgoals_allow_editing}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_allow_editing: value })
						}
						help={__(
							"Allow users to edit action names, hours, and add/remove actions",
							"sv-custom-blocks",
						)}
					/>
					<ToggleControl
						label={__("Group Actions by Quarter", "sv-custom-blocks")}
						checked={sv_cb_qgoals_group_actions_by_quarter}
						onChange={(value) =>
							setAttributes({ sv_cb_qgoals_group_actions_by_quarter: value })
						}
						help={__(
							"Display actions grouped by quarters (Q1, Q2, Q3, Q4)",
							"sv-custom-blocks",
						)}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...useBlockProps()}>
				<div className="quarter-goals-editor-placeholder">
					<div className="quarter-goals-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM7 7H9V9H7V7ZM7 11H9V13H7V11ZM7 15H9V17H7V15ZM17 17H11V15H17V17ZM17 13H11V11H17V13ZM17 9H11V7H17V9Z" fill="#666"/>
						</svg>
					</div>
					<h3>{__("Quarter Goals Generator", "sv-custom-blocks")}</h3>
					<p>{__(
						"Generate comprehensive quarterly goals with SMART objectives, actions, and time estimates.",
						"sv-custom-blocks"
					)}</p>

					<div className="editor-settings-preview">
						<h4>{__("Active Display Options:", "sv-custom-blocks")}</h4>
						<ul>
							{sv_cb_qgoals_show_smart_goal && (
								<li>✓ {__("SMART Goal", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_timeframe && (
								<li>✓ {__("Timeframe", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_assumptions && (
								<li>✓ {__("Assumptions", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_resources && (
								<li>✓ {__("Required Resources", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_risks && (
								<li>✓ {__("Risks & Mitigations", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_kpis && (
								<li>✓ {__("KPI Summary", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_stages && (
								<li>✓ {__("Quarterly Stages", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_actions && (
								<li>✓ {__("Actions List", "sv-custom-blocks")}</li>
							)}
							{sv_cb_qgoals_show_totals && (
								<li>✓ {__("Time Totals", "sv-custom-blocks")}</li>
							)}
						</ul>

						{sv_cb_qgoals_allow_editing && (
							<p>
								<strong>{__("Editing enabled", "sv-custom-blocks")}</strong> -{" "}
								{__("Users can modify actions and hours", "sv-custom-blocks")}
							</p>
						)}

						{sv_cb_qgoals_group_actions_by_quarter && (
							<p>
								<strong>
									{__("Quarterly grouping", "sv-custom-blocks")}
								</strong>{" "}
								- {__("Actions will be grouped by Q1-Q4", "sv-custom-blocks")}
							</p>
						)}
					</div>
				</div>
			</div>
		</>
	);
}