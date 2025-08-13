/**
 * Universal AI Block - Edit component
 * Supports dynamic component selection with Responses API
 */
import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import {
	PanelBody,
	TextControl,
	SelectControl,
	TextareaControl,
	RangeControl,
	ToggleControl,
	Card,
	CardBody,
} from "@wordpress/components";
import { useState, useMemo, useEffect } from "@wordpress/element";

import "./editor.scss";

import { availableComponents } from "./components-index.js";

export default function Edit({ attributes, setAttributes }) {
	const {
		selectedComponent,
		assistantId,
		model,
		systemPrompt,
		temperature,
		maxTokens,
		responseFormat,
		responseSchema,
		useResponsesApi,
		instanceId,
	} = attributes;

	const [schemaText, setSchemaText] = useState(
		responseSchema ? JSON.stringify(responseSchema, null, 2) : "",
	);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [hasLoadedData, setHasLoadedData] = useState(false);

	const isJsonValid = useMemo(() => {
		if (!schemaText.trim()) return true;
		try {
			JSON.parse(schemaText);
			return true;
		} catch (e) {
			return false;
		}
	}, [schemaText]);

	// Use the safe version
	const currentComponent =
		availableComponents[selectedComponent] ||
		Object.values(availableComponents)[0];
	console.log("🔍 currentComponent:", currentComponent);

	// Generate instanceId if missing
	useEffect(() => {
		if (!instanceId) {
			const id =
				crypto?.randomUUID?.() ??
				`${Date.now()}-${Math.random().toString(16).slice(2)}`;
			setAttributes({ instanceId: id });
		}
	}, [instanceId, setAttributes]);
	// Load saved data on component mount
	useEffect(() => {
		if (!instanceId || hasLoadedData) return;

		console.log("📥 Loading saved data for instance:", instanceId);

		wp.apiFetch({ path: "/wp/v2/settings" })
			.then((settings) => {
				const allConfigs = settings.sv_ai_blocks_options || {};
				const savedConfig = allConfigs[instanceId];

				if (savedConfig) {
					console.log("✅ Found saved config:", savedConfig);

					// Load all saved settings
					setAttributes({
						selectedComponent: savedConfig.selectedComponent || "smart-goals",
						systemPrompt: savedConfig.systemPrompt || "",
						model: savedConfig.model || "gpt-4",
						temperature: savedConfig.temperature ?? 0.7,
						maxTokens: savedConfig.maxTokens || 1500,
						responseFormat: savedConfig.responseFormat || "auto",
						responseSchema: savedConfig.responseSchema || null,
						useResponsesApi: savedConfig.useResponsesApi ?? true,
					});
				} else {
					console.log("ℹ️ No saved config found, using defaults");

					// Only set default component if no saved data
					if (
						!selectedComponent &&
						Object.keys(availableComponents).length > 0
					) {
						const defaultComponent = Object.keys(availableComponents)[0];
						setAttributes({ selectedComponent: defaultComponent });
					}
				}

				setHasLoadedData(true);
				setIsLoadingData(false);
			})
			.catch((error) => {
				console.error("❌ Failed to load saved data:", error);
				setIsLoadingData(false);
				setHasLoadedData(true);
			});
	}, [instanceId, availableComponents, hasLoadedData]);

	// Auto-update settings ONLY when user manually changes component (after data is loaded)
	useEffect(() => {
		if (!hasLoadedData) return; // Don't auto-update until we've loaded saved data

		// Track if this is a user-initiated change
		if (selectedComponent && availableComponents[selectedComponent]) {
			const component = availableComponents[selectedComponent];

			// Only auto-update if the current prompt is empty or matches a different component's default
			const shouldAutoUpdate =
				!systemPrompt ||
				Object.values(availableComponents).some(
					(comp) => comp.defaultPrompt === systemPrompt && comp !== component,
				);

			if (shouldAutoUpdate) {
				console.log(
					"🔄 Auto-updating settings for component:",
					selectedComponent,
				);
				setAttributes({
					systemPrompt: component.defaultPrompt,
					model: component.recommendedModel || "gpt-4",
					maxTokens: component.recommendedTokens || 1500,
					responseFormat: component.responseFormat || "auto",
				});
			}
		}
	}, [selectedComponent, hasLoadedData]); // Removed availableComponents to prevent auto-updates on load

	// Show loading state
	if (isLoadingData) {
		return (
			<div {...useBlockProps()}>
				<Card>
					<CardBody>
						<div style={{ textAlign: "center", padding: "20px" }}>
							<p>Loading saved settings...</p>
						</div>
					</CardBody>
				</Card>
			</div>
		);
	}

	// Save configuration to database when post is saved
	const [wasSaving, setWasSaving] = useState(false);
	
	useEffect(() => {
		if (!hasLoadedData || !useResponsesApi || !instanceId) return;
		
		const { subscribe } = wp.data;
		let previousSavingState = false;
		
		const unsubscribe = subscribe(() => {
			const editor = wp.data.select('core/editor');
			const isSavingPost = editor?.isSavingPost?.() || false;
			const isAutosavingPost = editor?.isAutosavingPost?.() || false;
			const currentlySaving = isSavingPost && !isAutosavingPost;
			
			// Detect transition from saving to not saving (save completed)
			if (previousSavingState && !currentlySaving) {
				const config = {
					selectedComponent: selectedComponent || '',
					useResponsesApi: useResponsesApi || false,
					model: model || '',
					systemPrompt: systemPrompt || '',
					temperature: temperature || 0.7,
					maxTokens: maxTokens || 1500,
					responseFormat: responseFormat || 'auto',
					responseSchema: responseSchema || null,
					post_id: editor?.getCurrentPostId?.() || null,
					updated_at: Date.now(),
				};

				console.log("💾 Saving config after post save:", config);

				// Save configuration to WordPress options table
				wp.apiFetch({ path: "/wp/v2/settings" })
					.then((settings) => {
						let allConfigs = settings.sv_ai_blocks_options || {};
						if (Array.isArray(allConfigs)) {
							allConfigs = {};
						}
						allConfigs[instanceId] = config;

						return wp.apiFetch({
							path: "/wp/v2/settings",
							method: "POST",
							data: { sv_ai_blocks_options: allConfigs },
						});
					})
					.then(() => {
						console.log("✅ Config saved successfully after post save");
					})
					.catch((error) => {
						console.error("Failed to save block configuration:", error);
					});
			}
			
			previousSavingState = currentlySaving;
		});

		return unsubscribe;
	}, [hasLoadedData, useResponsesApi, instanceId]);


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
					title={__("Component Selection", "universal-ai")}
					initialOpen={true}
				>
					<SelectControl
						label={__("AI Component", "universal-ai")}
						value={selectedComponent}
						options={Object.entries(availableComponents).map(
							([key, component]) => ({
								label: `${component.icon} ${component.name}`,
								value: key,
							}),
						)}
						onChange={(value) => setAttributes({ selectedComponent: value })}
						help={__("Choose which AI component to use", "universal-ai")}
					/>

					{currentComponent.category && (
						<p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
							<strong>Category:</strong> {currentComponent.category} |
							<strong> Version:</strong> {currentComponent.version}
						</p>
					)}
				</PanelBody>

				{/* API Configuration Panel */}
				<PanelBody
					title={__("API Configuration", "universal-ai")}
					initialOpen={false}
				>
					<ToggleControl
						label={__("Use Responses API", "universal-ai")}
						checked={useResponsesApi}
						onChange={(value) => setAttributes({ useResponsesApi: value })}
						help={__(
							"Enable to use the new Responses API instead of Assistant API",
							"universal-ai",
						)}
					/>

					{!useResponsesApi ? (
						// Legacy Assistant API Configuration
						<TextControl
							label={__("OpenAI Assistant ID", "universal-ai")}
							value={assistantId}
							onChange={(value) => setAttributes({ assistantId: value })}
							placeholder={__(
								"Enter Assistant ID (e.g., asst_abc123...)",
								"universal-ai",
							)}
							help={__(
								"Legacy: The ID of the OpenAI Assistant",
								"universal-ai",
							)}
						/>
					) : (
						// New Responses API Configuration
						<>
							<SelectControl
								label={__("OpenAI Model", "universal-ai")}
								value={model}
								options={[
									{ label: "GPT-4 (Recommended)", value: "gpt-4" },
									{ label: "GPT-5", value: "gpt-5" },
									{ label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
									{ label: "GPT-4o", value: "gpt-4o" },
									{ label: "GPT-4o Mini", value: "gpt-4o-mini" },
								]}
								onChange={(value) => setAttributes({ model: value })}
								help={__("Choose the AI model to use", "universal-ai")}
							/>

							<TextareaControl
								label={__("System Prompt", "universal-ai")}
								value={systemPrompt}
								onChange={(value) => setAttributes({ systemPrompt: value })}
								placeholder={
									!systemPrompt ? currentComponent.defaultPrompt : undefined
								}
								help={__(
									"Define how the AI should behave and respond",
									"universal-ai",
								)}
								rows={4}
							/>

							<RangeControl
								label={__("Temperature", "universal-ai")}
								value={temperature}
								onChange={(value) => setAttributes({ temperature: value })}
								min={0}
								max={2}
								step={0.1}
								help={__(
									"Controls randomness: 0 = focused, 2 = creative",
									"universal-ai",
								)}
							/>

							<RangeControl
								label={__("Max Tokens", "universal-ai")}
								value={maxTokens}
								onChange={(value) => setAttributes({ maxTokens: value })}
								min={100}
								max={4000}
								step={100}
								help={__("Maximum response length (tokens)", "universal-ai")}
							/>

							<SelectControl
								label={__("Response Format", "universal-ai")}
								value={responseFormat}
								options={[
									{ label: "Auto", value: "auto" },
									{ label: "JSON Object", value: "json_object" },
									{
										label: "Structured JSON (with schema)",
										value: "json_schema",
									},
									{ label: "Plain Text", value: "text" },
								]}
								onChange={(value) => setAttributes({ responseFormat: value })}
								help={__("Expected format of the AI response", "universal-ai")}
							/>

							{responseFormat === "json_schema" && (
								<TextareaControl
									label={__("JSON Schema", "universal-ai")}
									value={schemaText}
									onChange={(value) => {
										setSchemaText(value);
										try {
											const parsed = JSON.parse(value);
											setAttributes({ responseSchema: parsed });
										} catch (e) {
											// keep typing; attribute will update once valid
										}
									}}
									onBlur={() => {
										if (!schemaText.trim()) {
											setAttributes({ responseSchema: null });
											return;
										}
										try {
											const parsed = JSON.parse(schemaText);
											setAttributes({ responseSchema: parsed });
										} catch (e) {
											// keep invalid text visible, but don't update attributes
										}
									}}
									help={
										isJsonValid
											? __("Define JSON structure (optional)", "universal-ai")
											: __("Invalid JSON. Fix errors to apply.", "universal-ai")
									}
									rows={10}
								/>
							)}
						</>
					)}
				</PanelBody>
			</InspectorControls>

			{/* Block Preview */}
			<div {...useBlockProps()}>
				<Card>
					<CardBody>
						<div style={{ padding: "10px", textAlign: "center" }}>
							<div style={{ fontSize: "48px", marginBottom: "10px" }}>
								{currentComponent.icon}
							</div>
							<h3>{currentComponent.name}</h3>
							<p style={{ color: "#666", marginBottom: "15px" }}>
								{currentComponent.description}
							</p>

							{/* Configuration Status */}
							<div
								style={{
									padding: "10px",
									backgroundColor: useResponsesApi ? "#e7f5e7" : "#fff3cd",
									border: `1px solid ${
										useResponsesApi ? "#28a745" : "#ffc107"
									}`,
									borderRadius: "4px",
									fontSize: "12px",
								}}
							>
								<strong>API: </strong>
								{useResponsesApi ? (
									<>
										<span style={{ color: "#28a745" }}>Responses API</span>
										<br />
										<span>Model: {model || "gpt-4"}</span>
										<br />
										<span>
											Temp: {temperature ?? 0.7}, Tokens: {maxTokens || 1500}
										</span>
									</>
								) : (
									<>
										<span style={{ color: "#ffc107" }}>
											Assistant API (Legacy)
										</span>
										<br />
										<span>
											ID: {assistantId || __("Not configured", "universal-ai")}
										</span>
									</>
								)}
							</div>
						</div>
					</CardBody>
				</Card>
			</div>
		</>
	);
}
