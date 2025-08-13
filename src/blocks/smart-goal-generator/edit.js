/**
 * Updated Edit component for Smart Goal Generator
 * Now supports Responses API configuration options
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
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

/**
 * The edit function for Smart Goal Generator with Responses API options
 */
export default function Edit({ attributes, setAttributes }) {
	const {
		assistantId, // Keep for backward compatibility
		model,
		systemPrompt,
		temperature,
		maxTokens,
		responseFormat,
		responseSchema,
		useResponsesApi,
		instanceId
	} = attributes;

	const [schemaText, setSchemaText] = useState(
		responseSchema ? JSON.stringify(responseSchema, null, 2) : "",
	);
	const isJsonValid = useMemo(() => {
		if (!schemaText.trim()) return true;
		try {
			JSON.parse(schemaText);
			return true;
		} catch (e) {
			return false;
		}
	}, [schemaText]);

	useEffect(() => {
		if (!instanceId) {
			const id =
				crypto?.randomUUID?.() ??
				`${Date.now()}-${Math.random().toString(16).slice(2)}`;
			setAttributes({ instanceId: id });
		}
	}, [instanceId, setAttributes]);

	// Save block configuration when using Responses API
	useEffect(() => {
		if (useResponsesApi && instanceId && model && systemPrompt) {
			const config = {
				useResponsesApi,
				model,
				systemPrompt,
				temperature,
				maxTokens,
				responseFormat,
				responseSchema,
				post_id: wp?.data?.select('core/editor')?.getCurrentPostId?.() || null,
				updated_at: Date.now()
			};
			
			// Save configuration to WordPress options table
			wp.apiFetch({
				path: '/wp/v2/options',
				method: 'POST',
				data: {
					[`sv_block_config_${instanceId}`]: config
				}
			}).catch(error => {
				console.warn('Failed to save block configuration:', error);
			});
		}
	}, [useResponsesApi, instanceId, model, systemPrompt, temperature, maxTokens, responseFormat, responseSchema]);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("API Configuration", "smart-goal-generator")}
					initialOpen={true}
				>
					<ToggleControl
						label={__("Use Responses API", "smart-goal-generator")}
						checked={useResponsesApi}
						onChange={(value) => setAttributes({ useResponsesApi: value })}
						help={__(
							"Enable to use the new Responses API instead of Assistant API",
							"smart-goal-generator",
						)}
					/>

					{!useResponsesApi ? (
						// Legacy Assistant API Configuration
						<TextControl
							label={__("OpenAI Assistant ID", "smart-goal-generator")}
							value={assistantId}
							onChange={(value) => setAttributes({ assistantId: value })}
							placeholder={__(
								"Enter Assistant ID (e.g., asst_abc123...)",
								"smart-goal-generator",
							)}
							help={__(
								"Legacy: The ID of the OpenAI Assistant",
								"smart-goal-generator",
							)}
						/>
					) : (
						// New Responses API Configuration
						<>
							<SelectControl
								label={__("OpenAI Model", "smart-goal-generator")}
								value={model}
								options={[
									{ label: "GPT-5 (Recommended)", value: "gpt-5" },
									{ label: "GPT-4", value: "gpt-4" },
									{ label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
									{ label: "GPT-4o", value: "gpt-4o" },
									{ label: "GPT-4o Mini", value: "gpt-4o-mini" },
								]}
								onChange={(value) => setAttributes({ model: value })}
								help={__(
									"Choose the AI model to use for generating goals",
									"smart-goal-generator",
								)}
							/>

							<TextareaControl
								label={__("System Prompt", "smart-goal-generator")}
								value={systemPrompt}
								onChange={(value) => setAttributes({ systemPrompt: value })}
								placeholder={__(
									"You are a SMART goals expert...",
									"smart-goal-generator",
								)}
								help={__(
									"Define how the AI should behave and respond",
									"smart-goal-generator",
								)}
								rows={4}
							/>

							<RangeControl
								label={__("Temperature", "smart-goal-generator")}
								value={temperature}
								onChange={(value) => setAttributes({ temperature: value })}
								min={0}
								max={2}
								step={0.1}
								help={__(
									"Controls randomness: 0 = focused, 2 = creative",
									"smart-goal-generator",
								)}
							/>

							<RangeControl
								label={__("Max Tokens", "smart-goal-generator")}
								value={maxTokens}
								onChange={(value) => setAttributes({ maxTokens: value })}
								min={100}
								max={4000}
								step={100}
								help={__(
									"Maximum response length (tokens)",
									"smart-goal-generator",
								)}
							/>

							<SelectControl
								label={__("Response Format", "smart-goal-generator")}
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
								help={__(
									"Expected format of the AI response",
									"smart-goal-generator",
								)}
							/>

							{responseFormat === "json_schema" && (
								<TextareaControl
									label={__("JSON Schema", "smart-goal-generator")}
									value={schemaText}
									onChange={(value) => {
										setSchemaText(value);
										// optional: live-apply only when valid
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
											// keep invalid text visible, but don’t update attributes
										}
									}}
									help={
										isJsonValid
											? __(
													"Define JSON structure (optional)",
													"smart-goal-generator",
											  )
											: __(
													"Invalid JSON. Fix errors to apply.",
													"smart-goal-generator",
											  )
									}
									rows={10}
								/>
							)}
						</>
					)}
				</PanelBody>

				{useResponsesApi && (
					<PanelBody
						title={__("Preset Configurations", "smart-goal-generator")}
						initialOpen={false}
					>
						<div
							style={{ display: "flex", flexDirection: "column", gap: "10px" }}
						>
							<button
								className="components-button is-secondary"
								onClick={() =>
									setAttributes({
										model: "gpt-4",
										systemPrompt:
											"You are a SMART goals expert. Help users create Specific, Measurable, Achievable, Relevant, and Time-bound goals. Always provide structured, actionable goal statements with clear metrics and timelines. Respond in JSON format with detailed goal breakdown including: goal_statement, specific_actions, success_metrics, timeline, and potential_obstacles.",
										temperature: 0.3,
										maxTokens: 1000,
										responseFormat: "json_object",
									})
								}
							>
								{__("📋 Goal Expert (JSON)", "smart-goal-generator")}
							</button>

							<button
								className="components-button is-secondary"
								onClick={() =>
									setAttributes({
										model: "gpt-4",
										systemPrompt:
											"You are a motivational business coach specializing in SMART goals. Create inspiring yet realistic goals that push users to achieve their best. Provide detailed action plans and success strategies. Use an encouraging, professional tone.",
										temperature: 0.5,
										maxTokens: 1200,
										responseFormat: "text",
									})
								}
							>
								{__("🎯 Business Coach", "smart-goal-generator")}
							</button>

							<button
								className="components-button is-secondary"
								onClick={() =>
									setAttributes({
										model: "gpt-3.5-turbo",
										systemPrompt:
											"Help users create simple, clear SMART goals. Focus on practical, achievable outcomes. Keep responses concise and actionable.",
										temperature: 0.2,
										maxTokens: 600,
										responseFormat: "text",
									})
								}
							>
								{__("⚡ Quick & Simple", "smart-goal-generator")}
							</button>
						</div>
					</PanelBody>
				)}
			</InspectorControls>

			<div {...useBlockProps()}>
				<Card>
					<CardBody>
						<div style={{ padding: "10px", textAlign: "center" }}>
							<div style={{ fontSize: "48px", marginBottom: "10px" }}>🎯</div>
							<h3>{__("Smart Goal Generator", "smart-goal-generator")}</h3>
							<p style={{ color: "#666", marginBottom: "15px" }}>
								{__(
									"This block will display a form for users to generate SMART goals using OpenAI.",
									"smart-goal-generator",
								)}
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
											ID:{" "}
											{assistantId ||
												__("Not configured", "smart-goal-generator")}
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
