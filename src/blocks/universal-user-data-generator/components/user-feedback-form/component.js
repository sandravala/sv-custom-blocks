/**
 * User Feedback Form Component - Frontend JavaScript
 * Reads configuration from block attributes and uses FormRenderer
 */

import React, { useState, useEffect, useMemo } from "react";
import FormRenderer from "@components/FormRenderer";

export default function UserFeedbackFormComponent({
	blockId,
	isLoggedIn,
	ajaxObject,
	componentName,
	formConfiguration
}) {
	// Extract configuration from block element

	// Get form configuration from data attribute (following your established pattern)
	const formConfigData = formConfiguration;

	// Component state
	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(false);
	const [error, setError] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [formData, setFormData] = useState({});
	const [existingData, setExistingData] = useState({});

	// Parse form configuration from admin settings
	const formConfig = useMemo(() => {
		const config = {
			title: formConfigData.title || "",
			submitButtonText: formConfigData.submitButtonText || "Pateikti",
			successMessage:
				formConfigData.successMessage || "Ačiū už tavo grįžtamąjį ryšį!",
			showRequiredNote: true,
			submittingText: "Tavo grįžtamasis ryšys saugomas...",
			submitAnotherResponseText: "Pateikti kitą atsakymą",
			submitAgainConfirmText:
				"Ar tikrai nori pradėti iš naujo? Ankstesni duomenys bus ištrinti.",
			canSubmitAnotherResponse: false,
		};
		
		// Add description if provided
		if (formConfigData.description) {
			config.description = formConfigData.description;
		}

		return config;
	}, [formConfigData]);

	// Parse form fields from JSON
	const formFields = useMemo(() => {
		if (!formConfigData.fieldsJson) {
			console.error("No form fields configuration found");
			return [];
		}

		try {
			const fields = JSON.parse(formConfigData.fieldsJson);

			// Validate and normalize fields
			return fields.map((field, index) => ({
				key: field.key || `field_${index}`,
				type: field.type || "text",
				label: field.label || `Field ${index + 1}`,
				placeholder: field.placeholder || "",
				required: field.required || false,
				options: field.options || [],
				rows: field.rows || 3,
				defaultValue: field.defaultValue || "",
			}));
		} catch (error) {
			console.error("Error parsing form fields JSON:", error);
			setError("Form configuration error. Please contact administrator.");
			return [];
		}
	}, [formConfigData.fieldsJson]);

	// User meta key where data will be saved
	const userMetaKey = formConfigData.userMetaKey || componentName +"user_feedback_data";

	// Load saved data on component mount (only if logged in)
	useEffect(() => {
		if (isLoggedIn && userMetaKey) {
			loadSavedData();
		}
	}, [isLoggedIn, userMetaKey]);

	const loadSavedData = async () => {
		setLoadingSaved(false);

		try {
			const params = {
				action: "udg_load_saved_data",
				nonce: ajaxObject.nonce,
				meta_keys: JSON.stringify([userMetaKey]),
			};

			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(params),
			});

			const result = await response.json();

			if (result.success && result.data.user_data[userMetaKey]) {
				// Parse existing JSON data
				const userData = JSON.parse(result.data.user_data[userMetaKey]);
				setFormData(userData);
				setExistingData(userData);
				setSubmitted(!!userData.submitted_at);
			}
		} catch (err) {
			console.error("Error loading saved data:", err);
		} finally {
			setLoadingSaved(true);
		}
	};

	const handleSubmit = async (formSubmissionData) => {
		if (!formSubmissionData) {
			setError("No data to submit");
			return;
		}

		setLoading(true);
		setError("");

		try {

			// Merge new form data with existing data
			const mergedData = {
				...existingData,
				...formSubmissionData,
				submitted_at: new Date().toISOString(),
				form_version: blockId, // Track which form instance this came from
			};

			// Save merged data as JSON
			const saveParams = {
				action: "udg_save_modified_data",
				nonce: ajaxObject.nonce,
				data: JSON.stringify({ [userMetaKey]: JSON.stringify(mergedData) }),
				save_to_meta: JSON.stringify({ [userMetaKey]: userMetaKey }),
			};

			const saveResponse = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(saveParams),
			});

			const saveResult = await saveResponse.json();

			if (saveResult.success) {
				setSubmitted(true);
				setFormData(mergedData);
			} else {
				throw new Error(saveResult.data?.message || "Failed to save form data");
			}
		} catch (err) {
			console.error("Error submitting form:", err);
			setError(err.message || "Error submitting form. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// Show loading while checking saved data
	if (!loadingSaved) {
		return (
			<div className="loading-message">
				<p>Loading form...</p>
			</div>
		);
	}

	// Show login required message if not logged in
	if (!isLoggedIn) {
		return (
			<div className="login-required">
				<h4>Prisijunk, kad galėtum peržiūrėti</h4>
				
				<p>
					<a href="/wp-login.php">Prisijungti</a> arba{" "}
					<a href="/wp-login.php?action=register">Registruotis</a>
				</p>
			</div>
		);
	}

	// Show error if form configuration is invalid
	if (error) {
		return (
			<div className="form-error">
				<h4>Konfigūracijos klaida</h4>
				<p>{error}</p>
			</div>
		);
	}

	// Show form if fields are configured
	if (formFields.length === 0) {
		return (
			<div className="form-not-configured">
				<h4>Formos konfigūracija nerasta</h4>
				<p>Prašome sukonfigūruoti formos laukus bloko nustatymuose.</p>
			</div>
		);
	}

	return (
		<>
			{submitted && (
				<div className="sv-form-submission-success">
					{/* Success notification could go here */}
				</div>
			)}

			{!submitted &&<FormRenderer
				fields={formFields}
				initialData={formData}
				config={formConfig}
				wasSubmitted={submitted}
				onSubmit={handleSubmit}
				blockAbbr="uff" // user feedback form
				dataType="form_data"
				className="user-feedback-form"
			/>}


			{/* Show submitted data preview for logged in users */}
			{submitted && formData && Object.keys(formData).length > 0 && (
				<div
					className="submitted-data-preview"
					style={{
						marginTop: "20px",
						padding: "15px",
						backgroundColor: "#f9f9f9",
						borderRadius: "6px",
						fontSize: "14px",
					}}
				>
					<h4 style={{ margin: "0 0 10px 0" }}>Tavo vertinimas:</h4>
					<div style={{ fontSize: "12px", color: "#666" }}>
						{Object.entries(formData)
							.filter(
								([key]) => !["submitted_at", "form_version"].includes(key),
							)
							.map(([key, value]) => {
								const field = formFields.find((f) => f.key === key);
								const fieldLabel = field?.label || key;
								return (
									<div key={key} style={{ marginBottom: "8px" }}>
										<strong>{fieldLabel}:</strong>{" "}
										{typeof value === "boolean"
											? value
												? "Taip"
												: "Ne"
											: String(value)}
									</div>
								);
							})}
						<div style={{ marginTop: "10px", color: "#888" }}>
							<small>
								Pateikta: {new Date(formData.submitted_at).toLocaleString()}
							</small>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

