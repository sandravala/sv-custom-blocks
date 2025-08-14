/**
 * Universal AI Block - Frontend JavaScript
 * Dynamically loads components based on selected component
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { loadComponent } from './components-index.js';

document.addEventListener("DOMContentLoaded", function () {
    renderUniversalAIBlocks();
});

async function renderUniversalAIBlocks() {
    const containers = document.querySelectorAll("#universal-ai-block");
    
    containers.forEach(async (container) => {
        // Get data from render.php
        const blockId = container.dataset.blockId;
        const postId = container.dataset.postId;
        const componentName = container.dataset.component;
		const assistantId = container.dataset.assistantId || '';
		const useResponsesApi = ['true', '1'].includes(container.dataset.useResponsesApi);
        const isLoggedIn = container.dataset.isLoggedIn === 'true';
        const canUseAiAgain = ['true', '1'].includes(container.dataset.canUseAiAgain);

        console.log('🎯 Loading component:', componentName);
        
        try {
            // Dynamically load the component
            const ComponentClass = await loadComponent(componentName);
            
            if (ComponentClass) {
                const root = createRoot(container);
                root.render(
                    <ComponentClass 
                        blockId={blockId}
                        postId={postId}
                        assistantId={assistantId}
                        useResponsesApi={useResponsesApi}
                        isLoggedIn={isLoggedIn}
						ajaxObject={sv_ajax_object} // ← Pass the AJAX object
                        componentName={componentName}
                        canUseAiAgain={canUseAiAgain}
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