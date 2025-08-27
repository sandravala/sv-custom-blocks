/**
 * Universal User Data Generator - Edit component
 * Supports dynamic component selection for data management
 */
import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	Card,
	CardBody,
} from "@wordpress/components";
import { useState, useEffect } from "@wordpress/element";

import "./editor.scss";

import { availableComponents } from "./components-index.js";

export default function Edit({ attributes, setAttributes }) {
	const { selectedComponent, instanceId, formConfiguration } = attributes;

	// Loading states
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [hasLoadedData, setHasLoadedData] = useState(false);

	// Generate instanceId if missing
	useEffect(() => {
		if (!instanceId) {
			const id =
				crypto?.randomUUID?.() ??
				`${Date.now()}-${Math.random().toString(16).slice(2)}`;
			setAttributes({ instanceId: id });
		}
	}, [instanceId, setAttributes]);

	// Set loading complete (no complex config needed for data generator)
	useEffect(() => {
		setIsLoadingData(false);
		setHasLoadedData(true);
	}, []);

	// Show loading state
	if (isLoadingData) {
		return (
			<div {...useBlockProps()}>
				<Card>
					<CardBody>
						<div style={{ textAlign: "center", padding: "20px" }}>
							<p>Loading configuration...</p>
						</div>
					</CardBody>
				</Card>
			</div>
		);
	}

	const currentComponent =
		availableComponents[selectedComponent] ||
		Object.values(availableComponents)[0];

	if (!currentComponent) {
		return (
			<div {...useBlockProps()}>
				<Card>
					<CardBody>
						<div style={{ textAlign: "center", padding: "20px" }}>
							<p>
								No components found. Please add components to the components
								directory and rebuild.
							</p>
						</div>
					</CardBody>
				</Card>
			</div>
		);
	}

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("Component Selection", "sv-custom-blocks")}
					initialOpen={true}
				>
					<SelectControl
						label={__("Data Component", "sv-custom-blocks")}
						value={selectedComponent}
						options={Object.entries(availableComponents).map(
							([key, component]) => ({
								label: `${component.icon} ${component.name}`,
								value: key,
							}),
						)}
						onChange={(value) => setAttributes({ selectedComponent: value })}
						help={__("Choose which data component to use", "sv-custom-blocks")}
					/>

					{currentComponent.category && (
						<p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
							<strong>Category:</strong> {currentComponent.category} |
							<strong> Version:</strong> {currentComponent.version}
						</p>
					)}
				</PanelBody>

				{/* Form Configuration Panel - Only for user-feedback-form */}
				{selectedComponent === "user-feedback-form" && (
					<PanelBody
						title={__("Form Configuration", "sv-custom-blocks")}
						initialOpen={true}
					>
						<TextControl
							label={__("Form Title", "sv-custom-blocks")}
							value={formConfiguration?.title || "User Feedback Form"}
							onChange={(value) =>
								setAttributes({
									formConfiguration: {
										...formConfiguration,
										title: value,
									},
								})
							}
							help={__(
								"Title displayed at the top of the form",
								"sv-custom-blocks",
							)}
						/>

						<TextControl
							label={__("User Meta Key", "sv-custom-blocks")}
							value={
								formConfiguration?.userMetaKey || "sv_cb_uff_feedback_data"
							}
							onChange={(value) =>
								setAttributes({
									formConfiguration: {
										...formConfiguration,
										userMetaKey: value,
									},
								})
							}
							help={__(
								"Single meta key where ALL form data will be saved as JSON",
								"sv-custom-blocks",
							)}
						/>

						<TextareaControl
							label={__("Form Fields JSON", "sv-custom-blocks")}
							value={
								formConfiguration?.fieldsJson ||
								`[
  {
    "key": "overall_satisfaction",
    "type": "select",
    "label": "Overall Satisfaction",
    "required": true,
    "options": [
      {"label": "Very Satisfied", "value": "5"},
      {"label": "Satisfied", "value": "4"},
      {"label": "Neutral", "value": "3"},
      {"label": "Dissatisfied", "value": "2"},
      {"label": "Very Dissatisfied", "value": "1"}
    ]
  },
  {
    "key": "comments",
    "type": "textarea",
    "label": "Comments & Suggestions",
    "placeholder": "Please share your thoughts...",
    "required": false,
    "rows": 4
  }
]`
							}
							onChange={(value) =>
								setAttributes({
									formConfiguration: {
										...formConfiguration,
										fieldsJson: value,
									},
								})
							}
							help={__(
								"Define form fields as JSON array. Supported types: text, email, number, textarea, select, checkbox, radio, date",
								"sv-custom-blocks",
							)}
							rows={12}
						/>

						<TextControl
							label={__("Submit Button Text", "sv-custom-blocks")}
							value={formConfiguration?.submitButtonText || "Submit Feedback"}
							onChange={(value) =>
								setAttributes({
									formConfiguration: {
										...formConfiguration,
										submitButtonText: value,
									},
								})
							}
						/>

						<TextControl
							label={__("Success Message", "sv-custom-blocks")}
							value={
								formConfiguration?.successMessage ||
								"Thank you for your feedback!"
							}
							onChange={(value) =>
								setAttributes({
									formConfiguration: {
										...formConfiguration,
										successMessage: value,
									},
								})
							}
						/>
					</PanelBody>
				)}
			</InspectorControls>

			{/* Block Preview */}
			<div {...useBlockProps()}>
				<Card>
					<CardBody>
						<div style={{ padding: "10px", textAlign: "center" }}>
							<div style={{ fontSize: "48px", marginBottom: "10px" }}>
								{currentComponent.icon}
							</div>
							<div>
								<h3 style={{ margin: 0 }}>
									{currentComponent.icon} {currentComponent.name}
								</h3>
								<p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
									{currentComponent.description}
								</p>

								{/* Show form configuration preview for user-feedback-form */}
								{selectedComponent === "user-feedback-form" &&
									formConfiguration && (
										<div
											style={{
												marginTop: "15px",
												textAlign: "left",
												fontSize: "12px",
												padding: "10px",
												backgroundColor: "#f9f9f9",
												borderRadius: "4px",
											}}
										>
											<div style={{ marginBottom: "8px" }}>
												<strong>Form:</strong>{" "}
												{formConfiguration.title || "User Feedback Form"}
											</div>
											<div style={{ marginBottom: "8px" }}>
												<strong>Meta Key:</strong>{" "}
												<code>
													{formConfiguration.userMetaKey ||
														"sv_cb_uff_feedback_data"}
												</code>
											</div>
											{formConfiguration.fieldsJson && (
												<div>
													<strong>Fields:</strong>
													{(() => {
														try {
															const fields = JSON.parse(
																formConfiguration.fieldsJson,
															);
															return (
																<ul
																	style={{
																		margin: "5px 0",
																		paddingLeft: "15px",
																	}}
																>
																	{fields.map((field, index) => (
																		<li key={index}>
																			{field.label} ({field.type})
																			{field.required && (
																				<span style={{ color: "#d63384" }}>
																					{" "}
																					*
																				</span>
																			)}
																		</li>
																	))}
																</ul>
															);
														} catch (e) {
															return (
																<span style={{ color: "#d63384" }}>
																	{" "}
																	Invalid JSON
																</span>
															);
														}
													})()}
												</div>
											)}
										</div>
									)}
							</div>
						</div>
					</CardBody>
				</Card>
			</div>
		</>
	);
}
