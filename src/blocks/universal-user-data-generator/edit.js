/**
 * Universal User Data Generator - Edit component
 * Supports dynamic component selection for data management
 */
import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import {
	PanelBody,
	SelectControl,
	Card,
	CardBody,
} from "@wordpress/components";
import { useState, useEffect } from "@wordpress/element";

import "./editor.scss";

import { availableComponents } from "./components-index.js";

export default function Edit({ attributes, setAttributes }) {
	const { selectedComponent, instanceId } = attributes;

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
						</div>
					</CardBody>
				</Card>
			</div>
		</>
	);
}