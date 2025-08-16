// FormRenderer.js - Simple form renderer for frontend users
// Renders form fields based on configuration, users fill and submit

import React, { useState, useEffect } from "react";

/**
 * FormRenderer Component - Simple form renderer
 *
 * @param {Object} props
 * @param {Array} props.fields - Form field configuration
 * @param {Object} props.config - Form configuration
 * @param {Function} props.onSubmit - Callback for form submission
 * @param {string} props.blockAbbr - Block abbreviation for naming convention
 * @param {string} props.dataType - Data type for naming convention
 * @param {string} props.className - Additional CSS classes
 */
const FormRenderer = ({
	fields = [],
	config = {},
	initialData = {},
	onSubmit,
	wasSubmitted = false,
	blockAbbr = "",
	dataType = "",
	className = "",
}) => {
	// Default configuration
	const defaultConfig = {
		title: "Forma",
		submitButtonText: "Generuoti",
		successMessage: "Duomenys sėkmingai išsiųsti!",
		showRequiredNote: true,
		submittingText: "Produktyvumo robotas dirba...",
		submitAnotherResponseText: "Pabandyk dar kartą",
		canSubmitAnotherResponse: true,
	};

	const formConfig = { ...defaultConfig, ...config };

	// State management
	const [formData, setFormData] = useState({});
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(wasSubmitted);

	// Initialize form data based on fields and initialData
	useEffect(() => {
		const initialFormData = {};
		fields.forEach((field, index) => {
			const fieldKey = field.key || `field_${index}`;
			// Use initialData value if provided, otherwise use field's defaultValue
			initialFormData[fieldKey] =
				initialData[fieldKey] || field.defaultValue || "";
		});
		setFormData(initialFormData);
	}, []);


	// Handle input changes
	const handleInputChange = (fieldKey, value) => {
		setFormData((prev) => ({
			...prev,
			[fieldKey]: value,
		}));

		// Clear error when user starts typing
		if (errors[fieldKey]) {
			setErrors((prev) => ({
				...prev,
				[fieldKey]: null,
			}));
		}
	};

	// Validate form
	const validateForm = () => {
		const newErrors = {};

		fields.forEach((field) => {
			if (
				field.required &&
				(!formData[field.key] || formData[field.key].toString().trim() === "")
			) {
				newErrors[field.key] = "laukelis yra privalomas";
			}

			// Email validation
			if (field.type === "email" && formData[field.key]) {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(formData[field.key])) {
					newErrors[field.key] = "Įvesk galiojantį el. pašto adresą";
				}
			}
		});

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsSubmitting(true);

		try {
			if (onSubmit) {
				await onSubmit(formData, `sv_cb_${blockAbbr}_${dataType}`);
			}
			setIsSubmitted(true);
			//setFormData({}); // Reset form
		} catch (error) {
			console.error("Form submission error:", error);
			setErrors({
				submit: "Robotas kažkur trumpam išėjęs :O ...pabandyk dar kartą.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Render field input based on type
	const renderField = (field) => {
		const value = formData[field.key] || "";
		const hasError = errors[field.key];
		const inputId = `${blockAbbr}_${dataType}_${field.key}`;

		const commonProps = {
			id: inputId,
			name: field.key,
			value: value,
			placeholder: field.placeholder || "",
			required: field.required,
			className: `sv-field-input ${hasError ? "error" : ""}`,
			onChange: (e) => handleInputChange(field.key, e.target.value),
		};

		let inputElement;

		switch (field.type) {
			case "textarea":
				inputElement = (
					<textarea
						{...commonProps}
						rows={field.rows || 4}
						onChange={(e) => handleInputChange(field.key, e.target.value)}
					/>
				);
				break;

			case "select":
				inputElement = (
					<select
						{...commonProps}
						onChange={(e) => handleInputChange(field.key, e.target.value)}
					>
						<option value="">Pasirink</option>
						{field.options?.map((option, index) => (
							<option key={index} value={option.value || option}>
								{option.label || option}
							</option>
						))}
					</select>
				);
				break;

			case "checkbox":
				inputElement = (
					<label className="sv-checkbox-wrapper">
						<input
							type="checkbox"
							id={inputId}
							name={field.key}
							checked={!!value}
							required={field.required}
							className="sv-checkbox-input"
							onChange={(e) => handleInputChange(field.key, e.target.checked)}
						/>
						<span className="sv-checkbox-label">{field.label}</span>
					</label>
				);
				break;

			case "radio":
				inputElement = (
					<div className="sv-radio-group">
						{field.options?.map((option, index) => (
							<label key={index} className="sv-radio-wrapper">
								<input
									type="radio"
									name={field.key}
									value={option.value || option}
									checked={value === (option.value || option)}
									required={field.required}
									className="sv-radio-input"
									onChange={(e) => handleInputChange(field.key, e.target.value)}
								/>
								<span className="sv-radio-label">{option.label || option}</span>
							</label>
						))}
					</div>
				);
				break;

			default:
				inputElement = <input {...commonProps} type={field.type || "text"} />;
				break;
		}

		return (
			<div key={field.key} className="sv-form-field">
				{field.type !== "checkbox" && (
					<label htmlFor={inputId} className="sv-field-label">
						{field.label}
						{field.required && <span className="sv-required">*</span>}
					</label>
				)}

				{inputElement}

				{hasError && <div className="sv-field-error">{hasError}</div>}

				{field.help && <div className="sv-field-help">{field.help}</div>}
			</div>
		);
	};

	// Show success message after submission
	if (isSubmitted && formConfig.canSubmitAnotherResponse) {
		return (
			<div className={`sv-form-renderer ${className}`}>
				<div className="sv-form-success">
					{/* <div className="sv-success-icon">
						<svg
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div> */}
					{/* <h3 className="sv-success-title">Thank you!</h3>
					<p className="sv-success-message">{formConfig.successMessage}</p> */}
					<button
						className="sv-btn sv-btn-secondary sv-btn-submit-another"
						onClick={() => setIsSubmitted(false)}
					>
						{formConfig.submitAnotherResponseText}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`sv-form-renderer ${className} ${
				isSubmitting ? "generating-data" : ""
			}`}
		>
			{!isSubmitting && 
				<form onSubmit={handleSubmit} className="sv-form-container" noValidate>
					{formConfig.title && (
						<div className="sv-form-header">
							<h3 className="sv-form-title">{formConfig.title}</h3>
							{formConfig.showRequiredNote &&
								fields.some((f) => f.required) && (
									<p className="sv-required-note">
										Laukeliai, pažymėti <span className="sv-required">*</span>{" "}
										yra privalomi
									</p>
								)}
						</div>
					)}

					<div className="sv-form-fields">
						{fields.map((field) => renderField(field))}
					</div>

					{errors.submit && (
						<div className="sv-form-error">{errors.submit}</div>
					)}

					<div className="sv-form-actions">
						<button
							type="submit"
							className="sv-btn sv-btn-primary"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Generuojama..." : formConfig.submitButtonText}
						</button>
					</div>
				</form>
			}

			{isSubmitting && (
				<div className="ai-blob" style={{ "--ai-size": "300px" }}>
					<span className="ai-blob__orb" />
					<span className="ai-blob__orb ai-blob__orb--slow" />
					<span className="ai-blob__text">{formConfig.submittingText}</span>
				</div>
			)}
		</div>
	);
};

export default FormRenderer;
