/**
 * Universal User Data Generator - Frontend JavaScript
 * Dynamically loads components based on selected component
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { loadComponent } from './components-index.js';

document.addEventListener("DOMContentLoaded", function () {
    renderUniversalDataGeneratorBlocks();
});

async function renderUniversalDataGeneratorBlocks() {
    const containers = document.querySelectorAll("#universal-user-data-generator-block");
    
    containers.forEach(async (container) => {
        // Get data from render.php
        const blockId = container.dataset.blockId;
        const componentName = container.dataset.component;
        const isLoggedIn = container.dataset.isLoggedIn === 'true';
        const formConfig = container.dataset.formConfig ? JSON.parse(container.dataset.formConfig) : {};

        try {
            // Dynamically load the component
            const ComponentClass = await loadComponent(componentName);
            
            if (ComponentClass) {
                const root = createRoot(container);
                root.render(
                    <ComponentClass 
                        blockId={blockId}
                        isLoggedIn={isLoggedIn}
                        ajaxObject={window.sv_ajax_object || {}} // Use global AJAX object
                        componentName={componentName}
                        formConfiguration={formConfig}
                    />
                );
            } else {
                // Fallback if component fails to load
                renderFallback(container, componentName);
            }
        } catch (error) {
            console.error(`Failed to load component ${componentName}:`, error);
            renderFallback(container, componentName);
        }
    });
}

function renderFallback(container, componentName) {
    container.innerHTML = `
        <div style="padding: 20px; text-align: center; border: 1px solid #ddd; border-radius: 4px;">
            <p>⚠️ Component "${componentName}" could not be loaded.</p>
            <p style="font-size: 12px; color: #666;">Please check the component configuration.</p>
        </div>
    `;
}