/**
 * Smart Goal Generator - Frontend JavaScript
 * Updated to handle login status from render.php
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import EditableTable from "@components/EditableTable";
import FormRenderer from "@components/FormRenderer";

export default function SmartGoalsComponent({
	blockId,
	postId,
	assistantId,
	useResponsesApi,
	isLoggedIn,
	ajaxObject,
	componentName,
	canUseAiAgain,
}) {
	// Create schema name
	const schemaName = String(componentName)
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, "_");

	const [formData, setFormData] = useState({
		specific: "",
		measurable: "",
		achievable: "",
		relevant: "",
		timeBound: "this year",
	});

	const saveToMeta = {
		smart_goal: "smart_goal_sentence",
		resources: "resources_sentence",
	};

	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(false); // Only load if logged in
	const [inputDataLoaded, setInputDataLoaded] = useState(false);
	const [error, setError] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [goalData, setGoalData] = useState({
		smart_goal_sentence: "",
		resources_sentence: "",
	});

	const smartGoalsColumns = [
		{
			key: "generated_data",
			label: "",
			type: "textarea",
			flex: "flex-1",
			placeholder: "",
			rows: 3,
		},
	];

	const tableConfig = {
		title: "Mano SMART tikslas",
		allowEditing: true,
		allowAddRemove: false,
		grouped: true,
		showActions: true,
		showCounter: false,
		emptyStateText: "No SMART goals saved yet",
		emptyStateSubtext:
			"Generate your first SMART goal using the form above, then add it to your collection",
		saveButtonText: "Išsaugoti",
		editButtonText: "✎",
		deleteConfirmText: "Are you sure you want to delete this SMART goal?",
	};

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

	const formFields = useMemo(() => {
		const fields = [];
		for (const [key, [label, placeholder]] of Object.entries(fieldLabels)) {
			fields.push({
				key: key,
				type: "textarea",
				label: label,
				placeholder: placeholder,
				required: true,
				rows: 3,
			});
		}
		return fields;
	}, [fieldLabels]);

	const formConfig = {
		title: "SMART tikslo generatorius", // Form header title (optional)
		submitButtonText: "Generuoti SMART tikslą", // Submit button text
		successMessage: "Pavyko!", // Message shown after successful submission
		showRequiredNote: true, // Show "Fields marked with * are required"
		submittingText: "DI asistentas galvoja...", // kas rodoma ai blob'e
		submitAnotherResponseText: "DI asistento pagalba",
		canSubmitAnotherResponse: true,
	};

	// Load saved data on component mount (only if logged in)
	useEffect(() => {
		if (
			isLoggedIn &&
			((useResponsesApi && blockId) || (!useResponsesApi && assistantId))
		) {
			loadSavedData();
		}
	}, [isLoggedIn, assistantId, blockId, useResponsesApi]);

	const loadSavedData = async () => {
		//JSON.stringify(["meta_key1", "meta_key2"]); - čia kokių ieškoti meta keys vartotojo meta
		try {
			const params = {
				action: "load_saved_data",
				nonce: ajaxObject.nonce,
				can_use_ai_again: canUseAiAgain,
				meta_keys: JSON.stringify(["smart_goal", "resources"]),
			};

			// Use appropriate parameter based on API type
			if (useResponsesApi) params.block_id = blockId;
			else params.assistant_id = assistantId;

			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(params),
			});

			const result = await response.json();

			if (result.success) {
				setGoalData({
					smart_goal_sentence: result.data.user_data.smart_goal || "",
					resources_sentence: result.data.user_data.resources || "",
				});
				setFormData({ ...formData, ...result.data.input_data });
			} else {
				// Error loading data (could be no data exists, which is fine)
				console.log("No saved data found or error:", result.data?.message);
			}
		} catch (err) {
			console.error("Error loading saved data:", err);
			console.log(err);
		} finally {
			setLoadingSaved(true);
		}
	};

	const handleInputChange = (field, value) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (formData, saveKey) => {
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
			setError("Block configuration not found. Please refresh the page.");
			return;
		} else if (!useResponsesApi && !assistantId) {
			setError(
				"OpenAI Assistant ID nenustatytas. Susisiekite su administratoriumi.",
			);
			return;
		}

		setLoading(true);
		setError("");

		try {
			const params = {
				action: "generate_ai_data",
				nonce: ajaxObject.nonce,
				form_data: JSON.stringify(formData),
				schema_name: schemaName,
				save_to_meta: JSON.stringify(saveToMeta),
				use_responses_api: useResponsesApi,
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
				setSubmitted(true);
				setGoalData({
					smart_goal_sentence: result.data.smart_goal_sentence || "",
					resources_sentence: result.data.resources_sentence || "",
				});
				setError("");
			} else {
				setError(result.data.message || "Įvyko klaida generuojant tikslą");
			}
		} catch (err) {
			setError("Įvyko klaida. Bandykite dar kartą.");
		} finally {
			setLoading(false);
			// after few seconds set submitted to false again
			setTimeout(() => {
				setSubmitted(false);
			}, 3000);
		}
	};

	const handleDataSave = async (data, metaKey) => {
		const newGoalData = Object.values(data)
			.flat()
			.reduce((acc, item) => {
				if (item.id && item.generated_data) {
					acc[item.id] = item.generated_data;
				}
				return acc;
			}, {});
		setGoalData(newGoalData);
		setError("");

		try {
			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "save_modified_data",
					nonce: ajaxObject.nonce,
					data: JSON.stringify(newGoalData),
					save_to_meta: JSON.stringify(saveToMeta),
				}),
			});

			const result = await response.json();

			if (result.success) {
			} else {
				setError(result.data.message || "Įvyko klaida išsaugant tikslą");
			}
		} catch (err) {
			setError("Įvyko klaida. Bandykite dar kartą.");
		} finally {
		}
	};

	// Show loading while checking saved data
	if (!loadingSaved) {
		return (
			<div className="sv-table-loading">
				<div className="sv-table-loader"></div>
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
			{submitted && <div className="sv-ai-generator-submission-success"></div>}
			{loadingSaved && (
				<FormRenderer
					fields={formFields}
					initialData={formData}
					config={formConfig}
					wasSubmitted={goalData.smart_goal_sentence.length > 0}
					onSubmit={handleSubmit}
					blockAbbr="smart_goal"
					dataType="inputs"
				/>
			)}
			{/* Results Section */}
			{goalData.smart_goal_sentence.length > 0 && !loading && (
				<EditableTable
					data={
						goalData.smart_goal_sentence
							? {
									"SMART tikslas: ": [
										{
											id: "smart_goal_sentence",
											generated_data: goalData.smart_goal_sentence,
										},
									],
									"Reikalingi ištekliai: ": [
										{
											id: "resources_sentence",
											generated_data: goalData.resources_sentence,
										},
									],
							  }
							: {}
					}
					columns={smartGoalsColumns}
					config={tableConfig}
					// onDataChange={handleTableChange}
					onSave={handleDataSave}
					blockAbbr="sg"
					dataType="goals_collection"
					className="smart-goals-table"
				/>
			)}
		</>
	);
}
