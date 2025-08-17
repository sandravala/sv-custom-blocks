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
		instanceId,
		assistantId,
		useResponsesApi,
		canUseAiAgain,
	} = attributes; // Only get instanceId from block attributes

	// All sensitive configuration as local state (NOT block attributes)
	const [systemPrompt, setSystemPrompt] = useState("");
	const [model, setModel] = useState("gpt-4");
	const [temperature, setTemperature] = useState(0.7);
	const [maxTokens, setMaxTokens] = useState(1500);
	const [responseFormat, setResponseFormat] = useState("auto");
	const [responseSchema, setResponseSchema] = useState(null);

	// Loading states
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [hasLoadedData, setHasLoadedData] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [lastSaved, setLastSaved] = useState(null);

	// Schema text for JSON editor
	const [schemaText, setSchemaText] = useState("");

	// Generate instanceId if missing (only this goes to block attributes)
	useEffect(() => {
		if (!instanceId) {
			const id =
				crypto?.randomUUID?.() ??
				`${Date.now()}-${Math.random().toString(16).slice(2)}`;
			setAttributes({ instanceId: id }); // Only instanceId saved to post
		}
	}, [instanceId, setAttributes]);

	// Load ALL configuration from wp_options
	useEffect(() => {
		if (!instanceId || hasLoadedData) return;

		console.log("📥 Loading saved data for instance:", instanceId);
		setIsLoadingData(true);

		wp.apiFetch({ path: "/wp/v2/settings" })
			.then((settings) => {
				const allConfigs = settings.sv_ai_blocks_options || {};
				const savedConfig = allConfigs[instanceId];

				if (savedConfig) {
					console.log("✅ Found saved config:", savedConfig);

					// Load ALL saved settings into local state
					setSystemPrompt(savedConfig.systemPrompt || "");
					setModel(savedConfig.model || "gpt-4");
					setTemperature(savedConfig.temperature ?? 0.7);
					setMaxTokens(savedConfig.maxTokens || 1500);
					setResponseFormat(savedConfig.responseFormat || "auto");
					setResponseSchema(savedConfig.responseSchema || null);

					// Set schema text for editor
					if (savedConfig.responseSchema) {
						setSchemaText(JSON.stringify(savedConfig.responseSchema, null, 2));
					}
				} else {
					console.log("ℹ️ No saved config found, using defaults");

					// Set default values if no saved data
					if (
						!selectedComponent &&
						Object.keys(availableComponents).length > 0
					) {
						const defaultComponent = Object.keys(availableComponents)[0];
						setAttributes({
							selectedComponent: selectedComponent || defaultComponent,
						});

						// Set component's default prompt
						const component = availableComponents[defaultComponent];
						if (component) {
							setSystemPrompt(component.defaultPrompt || "");
							setModel(component.recommendedModel || "gpt-4");
							setMaxTokens(component.recommendedTokens || 1500);
							setResponseFormat(component.responseFormat || "auto");
						}
					}
				}

				setHasLoadedData(true);
				setIsLoadingData(false);
			})
			.catch((error) => {
				console.error("❌ Failed to load saved data:", error);
				setIsLoadingData(false);
				setHasLoadedData(true);

				// Set defaults on error
				if (Object.keys(availableComponents).length > 0) {
					const defaultComponent = Object.keys(availableComponents)[0];
					setAttributes({ selectedComponent: defaultComponent });
				}
			});
	}, [instanceId, availableComponents, hasLoadedData]);

	// Auto-update settings when component changes (after data is loaded)
	useEffect(() => {
		if (
			!hasLoadedData ||
			!selectedComponent ||
			!availableComponents[selectedComponent]
		)
			return;

		const component = availableComponents[selectedComponent];

		// Only auto-update if prompt is empty or from a different component
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
			setSystemPrompt(component.defaultPrompt || "");
			setModel(component.recommendedModel || "gpt-4");
			setMaxTokens(component.recommendedTokens || 1500);
			setResponseFormat(component.responseFormat || "auto");
		}
	}, [selectedComponent, hasLoadedData, systemPrompt, availableComponents]);

	// Auto-save configuration when post is saved
useEffect(() => {
	if (!hasLoadedData || !instanceId) return;

	// Subscribe to post saving status
	const unsubscribe = wp.data.subscribe(() => {
		const editor = wp.data.select('core/editor');
		const isSavingPost = editor?.isSavingPost?.();
		const isAutosaving = editor?.isAutosavingPost?.();
		
		// Only trigger on manual save, not autosave
		if (isSavingPost && !isAutosaving && !isSaving) {
			console.log('🔄 Post is being saved, auto-saving Universal AI config...');
			saveConfigNow();
		}
	});

	// Cleanup subscription on unmount
	return () => unsubscribe();
}, [hasLoadedData, instanceId, isSaving, saveConfigNow]);
	// Save configuration to wp_options only
	const saveConfigNow = async () => {
		if (!instanceId || !hasLoadedData) return;

		setIsSaving(true);

		const config = {
			selectedComponent,
			useResponsesApi,
			model,
			systemPrompt,
			temperature,
			maxTokens,
			responseFormat,
			responseSchema,
			assistantId,
			post_id: wp?.data?.select("core/editor")?.getCurrentPostId?.() || null,
			updated_at: Date.now(),
		};

		try {
			const settings = await wp.apiFetch({ path: "/wp/v2/settings" });
			let allConfigs = settings.sv_ai_blocks_options || {};
			if (Array.isArray(allConfigs)) {
				allConfigs = {};
			}
			allConfigs[instanceId] = config;

			await wp.apiFetch({
				path: "/wp/v2/settings",
				method: "POST",
				data: { sv_ai_blocks_options: allConfigs },
			});

			setLastSaved(new Date().toLocaleTimeString());
			console.log("✅ Config saved to wp_options!");
		} catch (error) {
			console.error("Failed to save:", error);
			alert("Failed to save configuration. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	// JSON schema validation
	const isJsonValid = useMemo(() => {
		if (!schemaText.trim()) return true;
		try {
			JSON.parse(schemaText);
			return true;
		} catch (e) {
			return false;
		}
	}, [schemaText]);

	// Handle schema text changes
	const handleSchemaChange = (value) => {
		setSchemaText(value);
		try {
			const parsed = JSON.parse(value);
			setResponseSchema(parsed);
		} catch (e) {
			// Keep typing; schema will update when valid
		}
	};

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
						onChange={(value) => setAttributes({ selectedComponent: value })} // ← Back to attributes
						help={__("Choose which AI component to use", "universal-ai")}
					/>

					{currentComponent.category && (
						<p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
							<strong>Category:</strong> {currentComponent.category} |
							<strong> Version:</strong> {currentComponent.version}
						</p>
					)}

					{/* Save Button */}
					<div
						style={{
							marginTop: "15px",
							padding: "10px",
							backgroundColor: "#f8f9fa",
							borderRadius: "4px",
						}}
					>
						<button
							onClick={saveConfigNow}
							className="components-button is-primary"
							disabled={isSaving}
							style={{ width: "100%" }}
						>
							{isSaving ? "Saving..." : "Save Configuration"}
						</button>
						{lastSaved && (
							<p
								style={{
									fontSize: "12px",
									color: "#666",
									marginTop: "5px",
									textAlign: "center",
								}}
							>
								Last saved: {lastSaved}
							</p>
						)}
					</div>
				</PanelBody>

				{/* API Configuration Panel */}
				<PanelBody
					title={__("API Configuration", "universal-ai")}
					initialOpen={false}
				>
					<ToggleControl
						label={__("Use Responses API", "universal-ai")}
						checked={useResponsesApi}
						onChange={(value) => setAttributes({ useResponsesApi: value })} // Local state
						help={__(
							"Enable to use the new Responses API instead of Assistant API",
							"universal-ai",
						)}
					/>
					<ToggleControl
						label={__("Can use AI generator again?", "universal-ai")}
						checked={canUseAiAgain}
						onChange={(value) => setAttributes({ canUseAiAgain: value })} // Local state
						help={__(
							"Let's user generate data repeatedly vs only once",
							"universal-ai",
						)}
					/>

					{!useResponsesApi ? (
						<TextControl
							label={__("OpenAI Assistant ID", "universal-ai")}
							value={assistantId}
							onChange={(value) => setAttributes({ assistantId: value })} // Local state
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
								onChange={(value) => setModel(value)} // Local state
								help={__("Choose the AI model to use", "universal-ai")}
							/>

							<TextareaControl
								label={__("System Prompt", "universal-ai")}
								value={systemPrompt}
								onChange={(value) => setSystemPrompt(value)} // Local state
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
								onChange={(value) => setTemperature(value)} // Local state
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
								onChange={(value) => setMaxTokens(value)} // Local state
								min={100}
								max={10000}
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
								onChange={(value) => setResponseFormat(value)} // Local state
								help={__("Expected format of the AI response", "universal-ai")}
							/>

							{responseFormat === "json_schema" && (
								<TextareaControl
									label={__("JSON Schema", "universal-ai")}
									value={schemaText}
									onChange={handleSchemaChange}
									onBlur={() => {
										if (!schemaText.trim()) {
											setResponseSchema(null);
											return;
										}
										try {
											const parsed = JSON.parse(schemaText);
											setResponseSchema(parsed);
										} catch (e) {
											// Keep invalid text visible
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
							<div>
								<h3 style={{ margin: 0 }}>
									{currentComponent.icon} {currentComponent.name}
								</h3>
								<p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
									{currentComponent.description}
								</p>
							</div>

							<div style={{ textAlign: "right" }}>
								<button
									onClick={saveConfigNow}
									className="components-button is-primary"
									disabled={isSaving}
									style={{ marginBottom: "5px" }}
								>
									{isSaving ? "💾 Saving..." : "💾 Save"}
								</button>
								{lastSaved && (
									<div style={{ fontSize: "10px", color: "#666" }}>
										{lastSaved}
									</div>
								)}
							</div>

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
										<span>Model: {model}</span>
										<br />
										<span>
											Temp: {temperature}, Tokens: {maxTokens}
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
