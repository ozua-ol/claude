/**
 * Main Application
 * Koordinerar alla moduler och hanterar UI
 */

const App = (function() {
    // State
    let selectedFeatureInfo = null;
    let layerCounter = 0;

    // Initialize application
    function init() {
        console.log('Initializing application...');

        // Initialize map
        MapModule.init('map');

        // Setup UI event handlers
        setupEventHandlers();

        // Render Citylab criteria
        renderCriteriaSidebar();

        // Setup map callbacks
        MapModule.onFeatureClick(onFeatureSelect);

        // Update progress
        updateProgress();

        // Hide loading overlay
        hideLoading();

        console.log('Application initialized');
    }

    // Setup event handlers
    function setupEventHandlers() {
        // File upload
        const uploadBtn = document.getElementById('btn-upload');
        const fileInput = document.getElementById('file-input');

        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);

        // Map controls
        document.getElementById('btn-zoom-in').addEventListener('click', () => MapModule.zoomIn());
        document.getElementById('btn-zoom-out').addEventListener('click', () => MapModule.zoomOut());
        document.getElementById('btn-locate').addEventListener('click', () => MapModule.locateUser());
        document.getElementById('btn-fullscreen').addEventListener('click', () => MapModule.toggleFullscreen());

        // Sidebar toggle
        document.getElementById('btn-toggle-sidebar').addEventListener('click', toggleSidebar);

        // Layer panel toggle
        document.getElementById('btn-toggle-layers').addEventListener('click', toggleLayerPanel);

        // Info panel close
        document.getElementById('btn-close-info').addEventListener('click', closeInfoPanel);

        // Criteria search
        document.getElementById('criteria-search').addEventListener('input', filterCriteria);

        // Link criteria button
        document.getElementById('btn-link-criteria').addEventListener('click', linkSelectedCriteria);

        // Modal controls
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
        document.getElementById('btn-modal-save').addEventListener('click', saveModalChanges);

        // Close modal on overlay click
        document.getElementById('criteria-modal').addEventListener('click', (e) => {
            if (e.target.id === 'criteria-modal') {
                closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

        // Citylab callbacks
        CityLab.onCriteriaUpdate(onCriteriaUpdate);
        CityLab.onFeatureLink(onFeatureLinked);

        // Drag and drop
        setupDragAndDrop();
    }

    // Setup drag and drop for file upload
    function setupDragAndDrop() {
        const mapEl = document.getElementById('map');

        mapEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mapEl.style.outline = '3px dashed var(--primary-color)';
        });

        mapEl.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mapEl.style.outline = 'none';
        });

        mapEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mapEl.style.outline = 'none';

            const files = Array.from(e.dataTransfer.files).filter(f =>
                f.name.endsWith('.gpkg') || f.name.endsWith('.geojson') || f.name.endsWith('.json')
            );

            if (files.length > 0) {
                processFiles(files);
            }
        });
    }

    // Handle file upload
    async function handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await processFiles(files);
        }
        e.target.value = ''; // Reset input
    }

    // Process uploaded files
    async function processFiles(files) {
        showLoading();

        for (const file of files) {
            try {
                if (file.name.endsWith('.gpkg')) {
                    await loadGeoPackage(file);
                } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
                    await loadGeoJSON(file);
                }
            } catch (error) {
                console.error(`Failed to load ${file.name}:`, error);
                showToast(`Kunde inte ladda ${file.name}: ${error.message}`, 'error');
            }
        }

        hideLoading();
    }

    // Load GeoPackage file
    async function loadGeoPackage(file) {
        try {
            const result = await GeoPackageLoader.loadFromFile(file);

            console.log('Loaded GeoPackage:', result);

            // Add each layer to the map
            for (const layer of result.layers) {
                const geojson = GeoPackageLoader.toGeoJSON(layer);

                if (geojson.features.length > 0) {
                    const layerId = `gpkg-${layerCounter++}`;
                    MapModule.addLayer(layerId, geojson, {
                        name: layer.name
                    });

                    showToast(`Lager "${layer.name}" laddat med ${geojson.features.length} objekt`, 'success');
                }
            }
        } catch (error) {
            throw new Error(`GeoPackage-fel: ${error.message}`);
        }
    }

    // Load GeoJSON file
    async function loadGeoJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const geojson = JSON.parse(e.target.result);
                    const layerId = `geojson-${layerCounter++}`;
                    const name = file.name.replace(/\.(geojson|json)$/i, '');

                    MapModule.addLayer(layerId, geojson, { name });
                    showToast(`Lager "${name}" laddat`, 'success');
                    resolve();
                } catch (error) {
                    reject(new Error('Ogiltig GeoJSON'));
                }
            };

            reader.onerror = () => reject(new Error('Kunde inte läsa fil'));
            reader.readAsText(file);
        });
    }

    // Render Citylab criteria sidebar
    function renderCriteriaSidebar() {
        const container = document.getElementById('criteria-categories');
        const criteria = CityLab.getAllCriteria();

        container.innerHTML = '';

        Object.entries(criteria).forEach(([categoryKey, category]) => {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'criteria-category';
            categoryEl.innerHTML = `
                <div class="category-header" data-category="${categoryKey}">
                    <div class="category-title">
                        <span class="category-icon category-${categoryKey}">
                            <i class="fas ${category.icon}"></i>
                        </span>
                        <span>${category.name}</span>
                    </div>
                    <div class="category-badge">
                        <span class="count">${category.items.length}</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="category-content" id="category-${categoryKey}">
                    ${renderCriteriaItems(category.items)}
                </div>
            `;

            // Add click handler for category header
            const header = categoryEl.querySelector('.category-header');
            header.addEventListener('click', () => {
                const content = categoryEl.querySelector('.category-content');
                const chevron = header.querySelector('.category-badge i');
                content.classList.toggle('expanded');
                chevron.classList.toggle('fa-chevron-down');
                chevron.classList.toggle('fa-chevron-up');
            });

            container.appendChild(categoryEl);
        });

        // Add click handlers for criteria items
        container.querySelectorAll('.criteria-item').forEach(item => {
            item.addEventListener('click', () => {
                const criteriaId = item.dataset.id;
                openCriteriaModal(criteriaId);
            });
        });

        // Populate criteria select in info panel
        populateCriteriaSelect();
    }

    // Render criteria items HTML
    function renderCriteriaItems(items) {
        return items.map(item => {
            const statusIcon = item.status === 'completed' ? '<i class="fas fa-check"></i>' :
                              item.status === 'partial' ? '<i class="fas fa-minus"></i>' : '';

            const linkedCount = item.linkedFeatures.length;
            const linkedText = linkedCount > 0 ?
                `<div class="criteria-linked"><i class="fas fa-link"></i> ${linkedCount} kopplad${linkedCount > 1 ? 'e' : ''} objekt</div>` : '';

            return `
                <div class="criteria-item ${item.status}" data-id="${item.id}">
                    <div class="criteria-checkbox">${statusIcon}</div>
                    <div class="criteria-info">
                        <div class="criteria-name">${item.name}</div>
                        <div class="criteria-description">${item.description}</div>
                        ${linkedText}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Populate criteria select dropdown
    function populateCriteriaSelect() {
        const select = document.getElementById('criteria-select');
        const criteriaList = CityLab.getCriteriaList();

        select.innerHTML = '<option value="">Välj kriterium...</option>';

        let currentCategory = '';
        criteriaList.forEach(item => {
            if (item.category !== currentCategory) {
                if (currentCategory !== '') {
                    select.innerHTML += '</optgroup>';
                }
                select.innerHTML += `<optgroup label="${item.category}">`;
                currentCategory = item.category;
            }
            select.innerHTML += `<option value="${item.id}">${item.name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }

    // Open criteria detail modal
    function openCriteriaModal(criteriaId) {
        const criteria = CityLab.getCriteriaById(criteriaId);
        if (!criteria) return;

        const modal = document.getElementById('criteria-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = criteria.name;
        body.innerHTML = `
            <div class="modal-criteria-content">
                <p class="criteria-full-description">${criteria.description}</p>

                <div class="criteria-section">
                    <h4>Status</h4>
                    <div class="status-buttons">
                        <button class="btn ${criteria.status === 'pending' ? 'btn-primary' : 'btn-secondary'}"
                                data-status="pending">Ej påbörjad</button>
                        <button class="btn ${criteria.status === 'partial' ? 'btn-primary' : 'btn-secondary'}"
                                data-status="partial">Delvis uppfylld</button>
                        <button class="btn ${criteria.status === 'completed' ? 'btn-primary' : 'btn-secondary'}"
                                data-status="completed">Uppfylld</button>
                    </div>
                </div>

                <div class="criteria-section">
                    <h4>Indikatorer</h4>
                    <ul class="indicators-list">
                        ${criteria.indicators.map(ind => `<li>${ind}</li>`).join('')}
                    </ul>
                </div>

                <div class="criteria-section">
                    <h4>Kopplade objekt (${criteria.linkedFeatures.length})</h4>
                    <div class="linked-features-list">
                        ${criteria.linkedFeatures.length > 0 ?
                            criteria.linkedFeatures.map(f => `
                                <div class="linked-feature-item">
                                    <span>${f.name}</span>
                                    <button class="btn-icon btn-unlink" data-layer="${f.layerId}" data-feature="${f.featureId}">
                                        <i class="fas fa-unlink"></i>
                                    </button>
                                </div>
                            `).join('') :
                            '<p class="no-items">Inga kopplade objekt</p>'
                        }
                    </div>
                </div>

                <div class="criteria-section">
                    <h4>Anteckningar</h4>
                    <textarea id="criteria-notes" rows="4" placeholder="Lägg till anteckningar...">${criteria.notes || ''}</textarea>
                </div>
            </div>
        `;

        // Add modal-specific styles
        const style = document.createElement('style');
        style.textContent = `
            .modal-criteria-content { padding: 0; }
            .criteria-full-description { color: var(--text-secondary); margin-bottom: 20px; }
            .criteria-section { margin-bottom: 20px; }
            .criteria-section h4 { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            .status-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
            .status-buttons .btn { flex: 1; min-width: 100px; justify-content: center; }
            .indicators-list { list-style: disc; padding-left: 20px; color: var(--text-secondary); }
            .indicators-list li { margin-bottom: 4px; }
            .linked-features-list { max-height: 150px; overflow-y: auto; }
            .linked-feature-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-hover); border-radius: var(--border-radius-sm); margin-bottom: 4px; }
            .no-items { color: var(--text-light); font-style: italic; }
            #criteria-notes { width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); font-family: inherit; resize: vertical; }
        `;
        body.appendChild(style);

        // Store criteria ID for saving
        modal.dataset.criteriaId = criteriaId;

        // Add status button handlers
        body.querySelectorAll('.status-buttons .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                body.querySelectorAll('.status-buttons .btn').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            });
        });

        // Add unlink button handlers
        body.querySelectorAll('.btn-unlink').forEach(btn => {
            btn.addEventListener('click', () => {
                const layerId = btn.dataset.layer;
                const featureId = btn.dataset.feature;
                CityLab.unlinkFeatureFromCriteria(criteriaId, { layerId, featureId });
                openCriteriaModal(criteriaId); // Refresh modal
                renderCriteriaSidebar();
            });
        });

        modal.classList.add('visible');
    }

    // Close modal
    function closeModal() {
        const modal = document.getElementById('criteria-modal');
        modal.classList.remove('visible');
        modal.dataset.criteriaId = '';
    }

    // Save modal changes
    function saveModalChanges() {
        const modal = document.getElementById('criteria-modal');
        const criteriaId = modal.dataset.criteriaId;

        if (!criteriaId) return;

        // Get selected status
        const statusBtn = modal.querySelector('.status-buttons .btn-primary');
        if (statusBtn) {
            const status = statusBtn.dataset.status;
            CityLab.updateCriteriaStatus(criteriaId, status);
        }

        // Get notes
        const notes = document.getElementById('criteria-notes').value;
        CityLab.updateCriteriaNotes(criteriaId, notes);

        // Refresh sidebar
        renderCriteriaSidebar();
        updateProgress();

        // Close modal
        closeModal();

        showToast('Ändringar sparade', 'success');
    }

    // Filter criteria by search
    function filterCriteria(e) {
        const searchTerm = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.criteria-item');

        items.forEach(item => {
            const name = item.querySelector('.criteria-name').textContent.toLowerCase();
            const description = item.querySelector('.criteria-description').textContent.toLowerCase();

            if (name.includes(searchTerm) || description.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // Expand categories with visible items
        if (searchTerm) {
            document.querySelectorAll('.category-content').forEach(content => {
                const visibleItems = content.querySelectorAll('.criteria-item:not([style*="display: none"])');
                if (visibleItems.length > 0) {
                    content.classList.add('expanded');
                }
            });
        }
    }

    // On feature select from map
    function onFeatureSelect(featureInfo) {
        selectedFeatureInfo = featureInfo;

        // Show info panel
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        const linkSection = document.getElementById('criteria-link-section');

        infoPanel.classList.add('visible');
        linkSection.style.display = 'block';

        // Build properties display
        let html = '<div class="feature-properties">';

        Object.entries(featureInfo.properties).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                html += `
                    <div class="feature-property">
                        <span class="property-name">${key}</span>
                        <span class="property-value">${value}</span>
                    </div>
                `;
            }
        });

        // Show linked criteria
        const linkedCriteria = CityLab.getCriteriaForFeature(featureInfo.layerId, featureInfo.featureId);
        if (linkedCriteria.length > 0) {
            html += '<div class="linked-criteria-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">';
            html += '<h4 style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">KOPPLADE KRITERIER</h4>';
            linkedCriteria.forEach(c => {
                html += `<div class="linked-criteria-item" style="padding: 8px; background: var(--bg-hover); border-radius: var(--border-radius-sm); margin-bottom: 4px; font-size: 0.875rem;">${c.name}</div>`;
            });
            html += '</div>';
        }

        html += '</div>';

        infoContent.innerHTML = html;
    }

    // Link selected criteria to feature
    function linkSelectedCriteria() {
        if (!selectedFeatureInfo) {
            showToast('Välj först ett objekt i kartan', 'warning');
            return;
        }

        const select = document.getElementById('criteria-select');
        const criteriaId = select.value;

        if (!criteriaId) {
            showToast('Välj ett kriterium att koppla', 'warning');
            return;
        }

        // Get feature name from first property or use ID
        const props = selectedFeatureInfo.properties;
        const featureName = props.name || props.namn || props.NAME || props.NAMN ||
                          props.id || props.ID || `Objekt ${selectedFeatureInfo.featureId}`;

        CityLab.linkFeatureToCriteria(criteriaId, {
            layerId: selectedFeatureInfo.layerId,
            featureId: selectedFeatureInfo.featureId,
            name: featureName
        });

        // Reset select
        select.value = '';

        // Refresh displays
        renderCriteriaSidebar();
        onFeatureSelect(selectedFeatureInfo); // Refresh info panel

        showToast('Objekt kopplat till kriterium', 'success');
    }

    // Callback when criteria updated
    function onCriteriaUpdate(criteria) {
        updateProgress();
    }

    // Callback when feature linked
    function onFeatureLinked(criteria, featureInfo) {
        console.log('Feature linked:', featureInfo, 'to', criteria.name);
    }

    // Update progress display
    function updateProgress() {
        const progress = CityLab.getProgress();

        const progressBar = document.getElementById('total-progress');
        const progressText = document.getElementById('progress-text');

        progressBar.style.width = `${progress.percentage}%`;
        progressText.textContent = `${progress.completed} av ${progress.total} kriterier uppfyllda`;
    }

    // Toggle sidebar
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const btn = document.getElementById('btn-toggle-sidebar');
        const icon = btn.querySelector('i');

        sidebar.classList.toggle('collapsed');
        icon.classList.toggle('fa-chevron-left');
        icon.classList.toggle('fa-chevron-right');
    }

    // Toggle layer panel
    function toggleLayerPanel() {
        const layerList = document.getElementById('layer-list');
        const btn = document.getElementById('btn-toggle-layers');
        const icon = btn.querySelector('i');

        layerList.style.display = layerList.style.display === 'none' ? '' : 'none';
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    }

    // Close info panel
    function closeInfoPanel() {
        const infoPanel = document.getElementById('info-panel');
        infoPanel.classList.remove('visible');
        selectedFeatureInfo = null;
    }

    // Handle keyboard shortcuts
    function handleKeyboard(e) {
        // Escape to close modal/panel
        if (e.key === 'Escape') {
            closeModal();
            closeInfoPanel();
        }

        // Ctrl+O to open file
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            document.getElementById('file-input').click();
        }
    }

    // Show loading overlay
    function showLoading() {
        document.getElementById('loading-overlay').classList.add('visible');
    }

    // Hide loading overlay
    function hideLoading() {
        document.getElementById('loading-overlay').classList.remove('visible');
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        showLoading,
        hideLoading,
        showToast
    };
})();
