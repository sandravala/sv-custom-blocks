/**
 * Smart Goal Generator - Frontend JavaScript
 * Updated to handle login status from render.php
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

export default function SmartGoalsComponent({ blockId, postId, assistantId, useResponsesApi, isLoggedIn, ajaxObject, componentName }) {
	console.log("🔍 ajaxObject received:", ajaxObject);
	// Create schema name
		const schemaName = String(componentName).toLowerCase().replace(/[^a-z0-9_]/g, "_");

	const [formData, setFormData] = useState({
		specific: "",
		measurable: "",
		achievable: "",
		relevant: "",
		timeBound: "this year",
	});

	console.log("useResponsesApi:", useResponsesApi);

	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(isLoggedIn); // Only load if logged in
	const [error, setError] = useState("");
	const [goalData, setGoalData] = useState({
		smart_goal_sentence: "",
		resources_sentence: "",
	});

	// Field labels and placeholders
	const fieldLabels = Object.freeze({
		specific: [
			"Ko nori pasiekti?",
			"Apibrėžia tikslą konkrečiai. Pavyzdys: Išmokti programuoti Python kalba",
		],
		measurable: [
			"Kaip žinosi, kad pavyko ir matuosi progresą?",
			"Apibrėžia kriterijus ir rodiklius. Pavyzdys: Sukursiu mini web aplikaciją su duomenų baze",
		],
		achievable: [
			"Ar gali tai padaryti?",
			'Ar šis tikslas yra pasiekiamas? Apibrėžia galimybes ir išteklius. Atsako: "Ar turiu viską, ko reikia?" Pavyzdys: "Turiu kompiuterį, 2 val./dieną laiko ir galiu mokytis internetu"',
		],
		relevant: [
			"Kodėl TAU tai yra SVARBU?",
			'Apibrėžia motyvaciją ir prasmę. Atsako: "Kodėl man to reikia?" Pavyzdys: "Noriu pakeisti karjerą ir tapti programuotoju"',
		],
	});

	// Load saved data on component mount (only if logged in)
	useEffect(() => {
		if (isLoggedIn && ((useResponsesApi && blockId) || (!useResponsesApi && assistantId))) {
			loadSavedData();
		} else {
			setLoadingSaved(false);
		}
	}, [isLoggedIn, assistantId, blockId, useResponsesApi]);

	const loadSavedData = async () => {
		try {
			const params = {
				action: "load_smart_goals",
				nonce: ajaxObject.nonce,
				table_suffix: 'smart_goals',
			};
			
			// Use appropriate parameter based on API type
			if(useResponsesApi)
				params.block_id = blockId;
			else
				params.assistant_id = assistantId;

			console.log("Loading saved data with params:", params);

			const response = await fetch(sv_ajax_object.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(params),
			});

			const result = await response.json();

			if (result.success) {
				console.log("Loaded saved data:", result.data);
				if (result.data && result.data.input_data) {
					// Convert snake_case to camelCase for form fields
					const inputData = result.data.input_data;
					setFormData({
						specific: inputData.specific || "",
						measurable: inputData.measurable || "",
						achievable: inputData.achievable || "",
						relevant: inputData.relevant || "",
						timeBound: inputData.time_bound || "",
					});
					
					if (result.data.response_data) {
						setGoalData({
							smart_goal_sentence:
								result.data.response_data.smart_goal_sentence || "",
							resources_sentence:
								result.data.response_data.resources_sentence || "",
						});
					}
				}
			} else {
				// Error loading data (could be no data exists, which is fine)
				console.log("No saved data found or error:", result.data?.message);
			}
		} catch (err) {
			console.error("Error loading saved data:", err);
			console.log(err);
		} finally {
			setLoadingSaved(false);
		}
	};

	const handleInputChange = (field, value) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		console.log("Submitting SMART goal:", formData);
		if (
			!formData.specific ||
			!formData.measurable ||
			!formData.achievable ||
			!formData.relevant
		) {
			setError("Prašome užpildyti visus privalomus laukus");
			return;
		}

		if (useResponsesApi && !blockId) {
			setError(
				"Block configuration not found. Please refresh the page.",
			);
			return;
		} else if (!useResponsesApi && !assistantId) {
			setError(
				"OpenAI Assistant ID nenustatytas. Susisiekite su administratoriumi.",
			);
			return;
		}

		setLoading(true);
		setError("");

		const saveToMeta = {
			smart_goal: 'smart_goal_sentence',
			resources: 'resources_sentence',
		};

		try {
			const params = {
				action: "generate_ai_data",
				nonce: ajaxObject.nonce,
				form_data: JSON.stringify(formData),
				schema_name: schemaName,
				save_to_meta: JSON.stringify(saveToMeta),
				use_responses_api: useResponsesApi
			};
			
			// Use appropriate parameter based on API type
			if (useResponsesApi) {
				params.block_id = blockId;
			} else {
				params.assistant_id = assistantId;
			}
			
			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(params),
			});

			const result = await response.json();

			if (result.success) {
				console.log("Generated SMART goal:", result.data);
				setGoalData({
					smart_goal_sentence: result.data.smart_goal_sentence || "",
					resources_sentence: result.data.resources_sentence || "",
				});
				setError("");
			} else {
				setError(result.data.message || "Įvyko klaida generuojant tikslą");
				console.log(result.data.data.toString());
			}
		} catch (err) {
			setError("Įvyko klaida. Bandykite dar kartą.");
		} finally {
			setLoading(false);
		}
	};

	// Show loading while checking saved data
	if (loadingSaved) {
		return (
			<div className="loading-message">
				<p>Kraunami duomenys...</p>
			</div>
		);
	}

	// Show login required message if not logged in
	if (!isLoggedIn) {
		return (
			<div className="login-required">
				<h4>Prisijungimas reikalingas</h4>
				<p>Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.</p>
				<p>
					<a href="/wp-login.php">Prisijungti</a> arba{" "}
					<a href="/wp-login.php?action=register">Registruotis</a>
				</p>
			</div>
		);
	}

	return (
		<>
			{goalData.smart_goal_sentence.length === 0 &&
				(!loading ? (
					// Form Section
					<div className="smart-goal-form-section">
						<h3>SMART Tikslo Generatorius</h3>
						<form onSubmit={handleSubmit} className="smart-goal-form">
							{/* Form fields */}
							{Object.entries(fieldLabels).map(([field, [label, placeholder]]) => (
								<div key={field} className="form-group">
									<label htmlFor={field}>
										{label} {field !== 'timeBound' && <span className="required">*</span>}
									</label>
									<textarea
										id={field}
										value={formData[field]}
										onChange={(e) => handleInputChange(field, e.target.value)}
										placeholder={placeholder}
										required={field !== 'timeBound'}
										rows="3"
									/>
								</div>
							))}

							{error && <div className="error-message">{error}</div>}

							<button type="submit" className="generate-button">
								Generuoti SMART tikslą
							</button>
						</form>
					</div>
				) : (
					// Loading Animation
					<div className="ai-blob" style={{ "--ai-size": "220px" }}>
						<span className="ai-blob__orb" />
						<span className="ai-blob__orb ai-blob__orb--slow" />
						<span className="ai-blob__text">Generuojamas SMART tikslas…</span>
					</div>
				))}

			{/* Results Section */}
			{goalData.smart_goal_sentence && (
				<div className="smart-goal-results">
					<div className="results-header">
						<h3>Jūsų SMART tikslas</h3>
						<button 
							onClick={() => {
								setGoalData({ smart_goal_sentence: "", resources_sentence: "" });
								setError("");
							}} 
							className="edit-button"
						>
							Redaguoti
						</button>
					</div>

					<div className="smart-goal-content">
						<div className="goal-statement">
							<h4>Tikslo formuluotė:</h4>
							<p id="smart-goal-sentence">{goalData.smart_goal_sentence}</p>
						</div>

						{goalData.resources_sentence && (
							<div className="resources-statement">
								<h4>Reikalingi ištekliai:</h4>
								<p id="resources-sentence">{goalData.resources_sentence}</p>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}