/**
 * Quarterly Goals Generator - Frontend JavaScript
 * Updated to handle login status from render.php
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import EditableTable from "@components/EditableTable";
import FormRenderer from "@components/FormRenderer";
import AccordionHeader from "@components/AccordionHeader";

export default function RoutineTasksComponent({
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

	const saveToMeta = {
		routine_tasks: "responsibilities_table",
	};

	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(false); // Only load if logged in
	const [inputDataLoaded, setInputDataLoaded] = useState(false);
	const [error, setError] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [routineTasks, setRoutineTasks] = useState([]);

	const [formData, setFormData] = useState({
		activity_area: "",
		job_title: "",
		additional_info: "",
		responsibility_level: "",
	});

	const formConfig = {
		title: "", // Form header title (optional)
		submitButtonText: "Generuoti", // Submit button text
		successMessage: "Thank you!", // Message shown after successful submission
		showRequiredNote: true, // Show "Fields marked with * are required"
		submittingText: "DI asistentas dirba...", // kas rodoma ai blob'e
		submitAnotherResponseText:
			"Paprašyk, kad DI asistentas sugeneruotų naują rutininių užduočių sąrašą",
		canSubmitAnotherResponse: true, // Allow submitting another response
	};

	const formFields = [
		{
			name: "activity_area",
			label: "Veiklos sritis",
			type: "textarea",
			placeholder:
				"Detaliai aprašyk savo veiklos sritį (pvz., komunikacija, edukacija, vadovavimas dirbant su smulkiais verslais ir t.t.)",
			required: true,
			rows: 2,
			key: "activity_area",
		},
		{
			name: "job_title",
			label: "Pareigos",
			type: "text",
			placeholder:
				"Pareigos ir lygis (pvz., projektų vadovas, specialistas, jaunesnysis)",
			required: true,
			key: "job_title",
		},
		{
			name: "additional_info",
			label: "Papildoma informacija",
			type: "textarea",
			placeholder:
				"Konkrečios užduotys ar procesai, kuriuose dalyvauji ar turi bent dalinę atsakomybę",
			required: false,
			rows: 2,
			key: "additional_info",
		},
		{
			name: "responsibility_level",
			label: "Atsakomybės lygis",
			type: "select",
			options: [
				{
					label: "Pilnai atsakinga:s už visą procesą",
					value: "full_responsibility",
				},
				{
					label: "Dalyvauju procese / padedu",
					value: "partial_responsibility",
				},
				{
					label: "Vadovauju komandai, atsakingai už šį procesą",
					value: "team_lead",
				},
				{
					label: "Individuali:us vykdytoja:s",
					value: "individual_contributor",
				},
			],
			required: true,
			key: "responsibility_level",
		},
	];

	const routineTasksColumns = [
		{
			key: "responsibility",
			label: "Užduotis",
			type: "text",
			flex: "flex-4",
			placeholder: "",
		},
		{
			key: "typical_hours_per_month",
			label: "Vidutinė trukmė per mėn. / h",
			type: "number",
			flex: "flex-1",
			placeholder: "",
		},
		{
			key: "weekly_hours",
			label: "Vidutinė trukmė per sav. / h",
			type: "number",
			flex: "flex-1",
			placeholder: "",
			calculated: true, // Mark as calculated
			readonly: true, // User can't edit
			// Function that calculates value from other columns
			calculate: (row) => {
				const hours = Number(row.typical_hours_per_month) || 0;
				const weeklyRate = 4.33; // €25 per hour
				return hours / weeklyRate;
			},
			dependsOn: ["typical_hours_per_month"],
		},
	];

	const tableConfig = {
		title: "",
		allowEditing: true,
		allowAddRemove: true,
		grouped: false,
		showActions: true,
		actionsLabel: "Veiksmai",
		showCounter: false,
		emptyStateText: "Dar nėra rutininių užduočių!",
		emptyStateSubtext:
			"Paprašyk DI asistento pagalbos (forma viršuje), ir rutininių užduočių sąrašas bus sugeneruotas",
		saveButtonText: "Išsaugoti",
		editButtonText: "✎",
		deleteConfirmText: "Ar tikrai nori ištrinti šią užduotį?",
		showTotals: true,
		totalsConfig: {
			label: "VISO",
			position: "bottom",
			fields: {
				responsibility: "iš viso:",
				typical_hours_per_month: "sum",
				weekly_hours: "sum",
			},
		},
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
				meta_keys: JSON.stringify(Object.keys(saveToMeta)),
				can_use_ai_again: canUseAiAgain,
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
				setFormData((prev) => ({ ...prev, ...result.data.input_data }));

				const routineTasksData = result.data.user_data.routine_tasks;
				// routineTasks.forEach((task, index) => {
				// 	task.id = index + 1; // Ensure each task has a unique ID
				// });
				setRoutineTasks(routineTasksData);
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

	const handleTableChange = (tableData) => {
		// const sortedData = tableData.sort((a, b) => {
		// 	const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
		// 	return quarterOrder[a.quarter] - quarterOrder[b.quarter];
		// });
		//update goal data actions value

		setRoutineTasks(tableData);
	};

	const handleSubmit = async (inputData, saveKey) => {
		if (
			inputData.activity_area.length < 1 ||
			inputData.job_title.length < 1 ||
			inputData.responsibility_level.length < 1
		) {
			setError("Užpildyk visus privalomus laukus!");
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

		setFormData((prev) => ({ ...prev, ...inputData }));
		setLoading(true);
		setError("");

		try {
			const params = {
				action: "generate_ai_data",
				nonce: ajaxObject.nonce,
				form_data: JSON.stringify(inputData),
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
				const generatedData = result.data.responsibilities_table;
				// generatedData.array.forEach(task => {
				// 	task.hours_per_week = (task.typical_hours_per_month / 4.33).toFixed(1);
				// });
				setRoutineTasks(generatedData || []);

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
		setRoutineTasks(data);
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
					data: JSON.stringify({ [saveToMeta.routine_tasks]: data }),
					save_to_meta: JSON.stringify(saveToMeta),
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Data saved successfully
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
		<div className="routine-tasks-container">
			{submitted && <div className="sv-ai-generator-submission-success"></div>}

			{loadingSaved && (
				<FormRenderer
					fields={formFields}
					initialData={formData}
					config={formConfig}
					wasSubmitted={routineTasks.length > 0}
					onSubmit={handleSubmit}
					blockAbbr="routine_tasks"
					dataType="inputs"
				/>
			)}
			{/* Results Section */}
			{!loading && (
				<>
					<EditableTable
						data={routineTasks}
						columns={routineTasksColumns}
						config={tableConfig}
						onDataChange={handleTableChange}
						onSave={handleDataSave}
						blockAbbr="routine_tasks"
						dataType="routine_tasks_collection"
						className="routine-tasks-table"
					/>
					<AccordionHeader title="Papildoma informacija">
						{/* Put any content here */}
					</AccordionHeader>
				</>
			)}
		</div>
	);
}
