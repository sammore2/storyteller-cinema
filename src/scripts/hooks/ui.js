import { SkinConfig } from '../apps/skin-config.js';
// import { toggleCinematicMode } from '../core/cinematic.js'; // REMOVED: Now handled by Main Hook -> API
// import { proxy } from '../core/proxy.js';
// import { proxy } from '../core/proxy.js'; 


// --- UI HOOKS REGISTRATION ---
export function registerUIHooks() {
    Hooks.on('getSceneControlButtons', (controls) => {
        // PROTECTION: Normalize controls (can be Object or Array)
        const controlList = Array.isArray(controls) ? controls : Object.values(controls);

        const tokenLayer = controlList.find(c => c.name === 'token');
        if (tokenLayer && tokenLayer.tools && game.user.isGM) {
            tokenLayer.tools.push({
                name: 'cinematic',
                title: 'Storyteller Cinema 2.5D',
                icon: 'fas fa-film',
                toggle: true,
                onClick: async (tog) => {
                    // DB SYNC LOGIC: Just update the flag. The hook handles the visual toggle for everyone.
                    // tog is the button state, but safer to invert current flag
                    const current = canvas.scene.getFlag('storyteller-cinema', 'active') || false;
                    await canvas.scene.setFlag('storyteller-cinema', 'active', !current);
                }
            });
        }
    });

    Hooks.on('renderSceneConfig', (app, html) => {
        const scene = app.document ?? app.object;
        if (!scene) return;

        // PROTECTION: V12+ uses HTMLElement, V11- used JQuery
        let root = html;
        if (html.jquery) root = html[0];

        if (!(root instanceof HTMLElement)) return;

        // Find submit button safely/natively
        const submitBtn = root.querySelector('button[type="submit"]');

        if (submitBtn) {
            // Prevent duplicate injection
            if (root.querySelector('.storyteller-cinema-config')) return;

            // Flags Update
            const flags = scene.flags['storyteller-cinema'] || {};
            const bgValue = flags.cinematicBg || "";
            const viewMode = flags.viewMode || "battlemap";

            const container = document.createElement('div');
            container.className = 'storyteller-cinema-config'; // FIXED: Removed 'form-group' to prevent flexbox layout issues
            container.style.borderTop = "1px solid var(--color-border-light-2)";
            container.style.paddingTop = "10px";
            container.style.marginTop = "10px";

            // V13 Injection - MATCHING FOUNDRY STRUCTURE EXACTLY
            // 1. Find the "Appearance" tab content (usually <div class="tab" data-tab="appearance">)
            const appearanceTab = root.querySelector('.tab[data-tab="appearance"]') || root.querySelector('.tab[data-tab="basic"]'); // Fallback to basic

            // If we found a tab, we append INSIDE it at the bottom.
            const targetContainer = appearanceTab || submitBtn.closest('.form-footer').previousElementSibling;

            // RE-WRITE HTML FOR MANUAL BUTTON (Safer for Injection)
            container.innerHTML = `
                <hr>
                <h3 class="form-header" style="color: white; font-size: 13px;"><i class="fas fa-film"></i> Storyteller Cinema</h3>

                <div class="form-group">
                    <label>Default View Mode</label>
                    <div class="form-fields">
                        <select name="flags.storyteller-cinema.viewMode">
                            <option value="battlemap" ${viewMode === 'battlemap' ? 'selected' : ''}>📍 Battlemap (Tactical)</option>
                            <option value="cinematic" ${viewMode === 'cinematic' ? 'selected' : ''}>🎬 Cinematic (Immersive)</option>
                        </select>
                    </div>
                    <p class="notes">Defines how this scene should start.</p>
                </div>

                <div class="form-group">
                    <label>Cinematic Background</label>
                    <div class="form-fields">
                        <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicBg" title="Browse Files" tabindex="-1">
                            <i class="fas fa-file-import fa-fw"></i>
                        </button>
                        <input class="image" type="text" name="flags.storyteller-cinema.cinematicBg" placeholder="Image path..." value="${bgValue}">
                    </div>
                    <p class="notes">Image displayed only in cinematic mode (replaces map).</p>
                </div>
            `;

            // Append to the end of the form content (not footer)
            targetContainer.appendChild(container);

            // Re-activate listener logic (Cleaned)
            const btn = container.querySelector("button.file-picker");
            if (btn) {
                btn.onclick = (event) => {
                    event.preventDefault();
                    const FilePickerClass = foundry.applications?.apps?.FilePicker || FilePicker;
                    const fp = new FilePickerClass({
                        type: "image",
                        current: bgValue,
                        callback: (path) => {
                            const input = container.querySelector("input[name='flags.storyteller-cinema.cinematicBg']");
                            if (input) {
                                input.value = path;
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    });
                    return fp.browse();
                };
            }

            // Re-adjust height
            app.setPosition({ height: "auto" });
        }
    });

    // --- Interaction: Shift+Wheel SCALING (Hijack Rotation) ---
    // Debounce Control Variable (Module Scope)
    let saveTimeout = null;

    window.addEventListener('wheel', (event) => {
        // Only active if Shift is held AND Cinematic Mode is ON
        if (!event.shiftKey || !document.body.classList.contains('cinematic-mode')) return;

        const hoverToken = canvas.tokens?.hover;
        if (!hoverToken) return;

        // STOP EVERYTHING: Prevent Foundry Rotation
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // Calculate Delta (+/- 0.05)
        const delta = event.deltaY > 0 ? -0.05 : 0.05;

        // 1. Read: Try local preview, else DB flag, else 1.0
        let current = hoverToken._cinemaScalePreview ?? hoverToken.document.getFlag('storyteller-cinema', 'cinematicScale') ?? 1.0;

        // 2. Calc with Limits
        let newScale = Math.max(0.1, Math.min(5.0, current + delta));
        newScale = Math.round(newScale * 100) / 100; // Round 2 decimal places

        // 3. INSTANT VISUAL UPDATE (No DB yet)
        hoverToken._cinemaScalePreview = newScale;
        hoverToken.refresh(); // depth.js will read _cinemaScalePreview now

        // 4. DB SAVE (Debounced / Delayed)
        if (saveTimeout) clearTimeout(saveTimeout);

        saveTimeout = setTimeout(() => {
            // Save and clear preview (DB will have value)
            hoverToken.document.setFlag('storyteller-cinema', 'cinematicScale', newScale).then(() => {
                hoverToken._cinemaScalePreview = null;
            });
            console.log("Storyteller Cinema | Saved to DB:", newScale.toFixed(2));
        }, 600); // Wait 600ms inactivity

    }, { passive: false, capture: true }); // Capture is key to running before Foundry

    // --- Token Configuration Injection ---
    Hooks.on('renderTokenConfig', (app, html, data) => {
        // Validation: Ensure valid context
        if (!app?.document || !html) return;

        const flags = app.document.flags?.["storyteller-cinema"] || {};
        const cinematicTexture = flags.cinematicTexture || "";

        // V13/V12 Compatibility: handle jQuery or HTMLElement
        let root = html instanceof HTMLElement ? html : html[0];

        // Find the "Appearance" tab content or the specific image group
        // Strategy: We inject a new form-group after the main image path.
        // Usually, the first form-group is Name, the second or third is Image.
        // A safer bet is searching for the file-picker input and inserting after its group.

        const appearanceTab = root.querySelector('.tab[data-tab="appearance"]');
        if (!appearanceTab) return;

        // Verify if we already injected
        if (appearanceTab.querySelector('input[name="flags.storyteller-cinema.cinematicTexture"]')) return;

        // Create the Form Group HTML
        const formGroup = document.createElement("div");
        formGroup.className = "form-group";
        formGroup.innerHTML = `
            <label>Cinematic Portrait <span class="units">(Optional)</span></label>
            <div class="form-fields">
                <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicTexture" title="Browse Files" tabindex="-1">
                    <i class="fas fa-file-import fa-fw"></i>
                </button>
                <input class="image" type="text" name="flags.storyteller-cinema.cinematicTexture" placeholder="path/to/image.webp" value="${cinematicTexture}">
            </div>
            <p class="notes">If set, Token swaps to this image when Cinematic Mode is active.</p>
        `;

        // Insert at the top of the appearance tab (or specific location)
        // Let's try to append securely or find a good anchor.
        // In Core V12/V13, there are usually specific sections.
        // We will prepend it to the appearance tab to be visible immediately or append it.
        // Appending usually puts it at the bottom.
        appearanceTab.appendChild(formGroup);

        // Reactivate listeners for the new button (Foundry FilePicker logic requires manual binding if injected late)
        // Actually, render hooks happen *after* listeners. We need to manually bind the file picker click.
        const btn = formGroup.querySelector("button.file-picker");
        if (btn) {
            btn.onclick = (event) => {
                event.preventDefault();
                // V13 Standard: Use namespaced FilePicker
                const FilePickerClass = foundry.applications?.apps?.FilePicker || FilePicker;
                const fp = new FilePickerClass({
                    type: "imagevideo",
                    current: cinematicTexture,
                    callback: (path) => {
                        formGroup.querySelector("input").value = path;
                        // Trigger change to ensure form detects update (if needed)
                        // REMOVED dispatchEvent to prevent 'Cannot read properties of null' error in TokenConfig._onChangeForm
                        // The value is set in DOM, so 'Update Token' will catch it.
                    }
                });
                return fp.browse();
            };
        }

        // Resize window to fit potentially new height
        app.setPosition({ height: "auto" });
    });
}

// === HUD BUTTON (Floating Top-Right) ===
function createHUDButton() {
    if (document.getElementById('storyteller-cinema-toggle')) return;
    if (!game.user.isGM) return; // SECURITY: GM ONLY

    const container = document.createElement('div');
    container.id = 'storyteller-cinema-toggle';
    // Base layout: [Icon] [Text] [ | ] [Custom Select] [Cog]
    container.innerHTML = `
        <div class="hud-toggle-action">
            <i class="fas fa-film"></i> 
            <span class="label">Storyteller Cinema</span>
        </div>
        <div class="hud-controls">
            <span class="separator">|</span>
            
            <div class="custom-skin-select" title="Change Skin">
                <span class="current-value">Loading...</span>
                <i class="fas fa-chevron-down"></i>
                <ul class="dropdown-options">
                    <!-- Populated dynamically -->
                </ul>
            </div>

            <i class="fas fa-cog open-config" title="Open Skin Studio"></i>
        </div>
    `;
    container.title = "Toggle Cinematic Mode";

    document.body.appendChild(container);

    // --- LOGIC ---
    const toggleAction = container.querySelector('.hud-toggle-action');
    const customSelect = container.querySelector('.custom-skin-select');
    const currentValueSpan = customSelect.querySelector('.current-value');
    const optionsList = customSelect.querySelector('.dropdown-options');
    const configBtn = container.querySelector('.open-config');
    const controls = container.querySelector('.hud-controls');

    // 1. Toggle Cinematic Mode
    toggleAction.onclick = async (e) => {
        e.stopPropagation();
        // Close dropdown if open
        customSelect.classList.remove('open');

        const current = canvas.scene.getFlag('storyteller-cinema', 'active') || false;
        await canvas.scene.setFlag('storyteller-cinema', 'active', !current);
    };

    // 2. Initial State Check
    if (document.body.classList.contains('cinematic-mode')) {
        container.classList.add('active');
        controls.style.display = 'flex';
    } else {
        controls.style.display = 'none';
    }

    // 3. Populate Skins Function
    const populateSkins = () => {
        const skins = window.StorytellerCinema?.skins?.getSkins() || [];
        const activeId = window.StorytellerCinema?.skins?.activeSkin || 'default';

        // Update Current Value Text
        const activeSkin = skins.find(s => s.id === activeId);
        currentValueSpan.textContent = activeSkin ? activeSkin.name : 'Select Skin';

        // Populate List
        optionsList.innerHTML = skins.map(s => `
            <li data-value="${s.id}" class="${s.id === activeId ? 'selected' : ''}">
                ${s.name}
            </li>
        `).join('');

        // Re-bind click events for options
        optionsList.querySelectorAll('li').forEach(li => {
            li.onclick = (e) => {
                e.stopPropagation();
                const skinId = li.dataset.value;

                // Close Menu
                customSelect.classList.remove('open');

                // Update UI immediately (optimistic)
                currentValueSpan.textContent = li.textContent.trim();

                // Apply Skin
                if (window.StorytellerCinema?.skins) {
                    window.StorytellerCinema.skins.apply(skinId);
                }
            };
        });
    };

    // Run populate immediately or wait
    if (window.StorytellerCinema?.skins) {
        populateSkins();
    } else {
        setTimeout(populateSkins, 500);
    }

    // 4. Custom Dropdown Toggle
    customSelect.onclick = (e) => {
        e.stopPropagation();
        customSelect.classList.toggle('open');
    };

    // Close dropdown when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });

    // 5. Config Button
    configBtn.onclick = (e) => {
        e.stopPropagation();
        customSelect.classList.remove('open'); // Close dropdown
        new SkinConfig().render(true, { focus: true });
    };

    // 6. Listen for Updates
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === "class") {
                const isActive = document.body.classList.contains('cinematic-mode');
                container.classList.toggle('active', isActive);
                controls.style.display = isActive ? 'flex' : 'none';
                if (!isActive) customSelect.classList.remove('open'); // Close if hidden
            }
        });
    });
    observer.observe(document.body, { attributes: true });

    // Listen for skin changes via Hook
    Hooks.on('storyteller-cinema-skin-changed', (skinId) => {
        populateSkins(); // Re-render to update selected state and text
    });

    Hooks.on('storyteller-cinema-skins-updated', populateSkins);
}

// Ensure button exists on load
Hooks.on('ready', createHUDButton);
Hooks.on('canvasReady', createHUDButton);
