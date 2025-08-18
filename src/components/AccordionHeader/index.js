// AccordionHeader.js - Reusable collapsible container component
// Follows existing design patterns from EditableTable

import React, { useState } from "react";

/**
 * AccordionHeader Component
 *
 * @param {Object} props
 * @param {string} props.title - Main title for the accordion
 * @param {string} props.subtitle - Optional subtitle
 * @param {React.ReactNode} props.children - Content to display when expanded
 * @param {Array} props.actions - Optional action buttons for header
 * @param {Object} props.config - Configuration options
 * @param {boolean} props.defaultExpanded - Whether to start expanded
 * @param {Function} props.onToggle - Callback when expanded/collapsed
 * @param {string} props.className - Additional CSS classes
 */
const AccordionHeader = ({
	title,
	subtitle = null,
	children,
	actions = [],
	config = {},
	defaultExpanded = false,
	onToggle,
	className = "",
}) => {
	// Default configuration
	const defaultConfig = {
		showToggleIcon: true,
		clickableHeader: true,
		animationDuration: 300,
	};

	const componentConfig = { ...defaultConfig, ...config };
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	// Handle toggle
	const handleToggle = () => {
		const newExpanded = !isExpanded;
		setIsExpanded(newExpanded);
		if (onToggle) {
			onToggle(newExpanded);
		}
	};

	// Handle header click (only if clickableHeader is enabled)
	const handleHeaderClick = (e) => {
		// Don't toggle if clicking on action buttons
		if (e.target.closest('.sv-accordion-actions')) {
			return;
		}
		
		if (componentConfig.clickableHeader) {
			handleToggle();
		}
	};

	return (
		<div className={`sv-accordion ${isExpanded ? 'expanded' : ''} ${className}`}>
			<div 
				className="sv-accordion-header"
				onClick={handleHeaderClick}
				style={{ cursor: componentConfig.clickableHeader ? 'pointer' : 'default' }}
			>
				<div className="sv-accordion-title-wrapper">
					<h3 className="sv-accordion-title">{title}</h3>
					{subtitle && (
						<p className="sv-accordion-subtitle">{subtitle}</p>
					)}
				</div>

				<div className="sv-accordion-actions">
					{/* Render action buttons */}
					{actions.map((action, index) => (
						<React.Fragment key={index}>
							{action}
						</React.Fragment>
					))}

					{/* Toggle button */}
					{componentConfig.showToggleIcon && (
						<button
							className="sv-accordion-toggle"
							onClick={(e) => {
								e.stopPropagation();
								handleToggle();
							}}
							aria-label={isExpanded ? "Collapse" : "Expand"}
						>
							<svg 
								className="sv-accordion-toggle-icon" 
								viewBox="0 0 20 20" 
								fill="currentColor"
							>
								<path 
									fillRule="evenodd" 
									d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
									clipRule="evenodd"
								/>
							</svg>
						</button>
					)}
				</div>
			</div>

			{/* Content area */}
			<div className="sv-accordion-content">
				<div className="sv-accordion-content-inner">
					{children}
				</div>
			</div>
		</div>
	);
};

export default AccordionHeader;