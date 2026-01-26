/**
 * Admin Module
 * Hanterar administration av kartlager, referenssystem och färgsättning
 */

const AdminModule = (function() {
    // Layer storage
    let layers = new Map();
    let hasUnsavedChanges = false;

    // Default layer style
    const defaultStyle = {
        color: '#3b82f6',
        strokeColor: '#1e40af',
        fillOpacity: 0.3,
        strokeOpacity: 0.8,
        strokeWidth: 2,
        pointRadius: 8
    };

    // Available CRS options
    const crsOptions = {
        '4326': { name: 'WGS84', epsg: 'EPSG:4326', description: 'Globalt geografiskt koordinatsystem' },
        '3006': { name: 'SWEREF99 TM', epsg: 'EPSG:3006', description: 'Sveriges officiella referenssystem' },
        '3857': { name: 'Web Mercator', epsg: 'EPSG:3857', description: 'Webb-kartors projektion' },
        '3021': { name: 'RT90 2.5 gon V', epsg: 'EPSG:3021', description: 'Äldre svenskt system' }
    };

    // Layer colors palette
    const colorPalette = [
        '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1'
    ];

    let colorIndex = 0;

    // Initialize
    function init() {
        // Load saved layers from localStorage
        loadFromStorage();

        // Setup event listeners
        setupEventListeners();

        // Update UI
        updateLayerTable();
        updateStatus();

        console.log('Admin module initialized');
    }

    // Setup event listeners
    function setupEventListeners() {
        // Import button
        const btnImport = document.getElementById('btn-import');
        const fileInput = document.getElementById('file-input');
        if (btnImport && fileInput) {
            btnImport.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileImport);
        }

        // Export button
        const btnExport = document.getElementById('btn-export');
        if (btnExport) {
            btnExport.addEventListener('click', exportConfiguration);
        }

        // Default opacity slider
        const defaultOpacity = document.getElementById('default-opacity');
        const opacityValue = document.getElementById('opacity-value');
        if (defaultOpacity && opacityValue) {
            defaultOpacity.addEventListener('input', (e) => {
                opacityValue.textContent = e.target.value + '%';
            });
        }

        // Layer edit form
        const layerEditForm = document.getElementById('layer-edit-form');
        if (layerEditForm) {
            layerEditForm.addEventListener('submit', handleLayerSave);
        }

        // Close detail panel
        const btnCloseDetail = document.getElementById('btn-close-detail');
        if (btnCloseDetail) {
            btnCloseDetail.addEventListener('click', closeDetailPanel);
        }

        // Reset style button
        const btnResetStyle = document.getElementById('btn-reset-style');
        if (btnResetStyle) {
            btnResetStyle.addEventListener('click', resetLayerStyle);
        }

        // Color picker sync with hex input
        setupColorPickers();

        // Opacity sliders in edit form
        setupOpacitySliders();

        // Color presets
        setupColorPresets();

        // Warn before leaving with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    // Setup color pickers
    function setupColorPickers() {
        const colorInputs = [
            { color: 'edit-color', hex: 'edit-color-hex' },
            { color: 'edit-stroke-color', hex: 'edit-stroke-color-hex' }
        ];

        colorInputs.forEach(({ color, hex }) => {
            const colorEl = document.getElementById(color);
            const hexEl = document.getElementById(hex);

            if (colorEl && hexEl) {
                colorEl.addEventListener('input', (e) => {
                    hexEl.value = e.target.value.toUpperCase();
                });

                hexEl.addEventListener('input', (e) => {
                    let value = e.target.value;
                    if (!value.startsWith('#')) {
                        value = '#' + value;
                    }
                    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                        colorEl.value = value;
                    }
                });
            }
        });
    }

    // Setup opacity sliders
    function setupOpacitySliders() {
        const sliders = [
            { slider: 'edit-fill-opacity', value: 'edit-fill-opacity-value' },
            { slider: 'edit-stroke-opacity', value: 'edit-stroke-opacity-value' }
        ];

        sliders.forEach(({ slider, value }) => {
            const sliderEl = document.getElementById(slider);
            const valueEl = document.getElementById(value);

            if (sliderEl && valueEl) {
                sliderEl.addEventListener('input', (e) => {
                    valueEl.textContent = e.target.value + '%';
                });
            }
        });
    }

    // Setup color presets
    function setupColorPresets() {
        const presets = document.getElementById('color-presets');
        if (presets) {
            presets.addEventListener('click', (e) => {
                const preset = e.target.closest('.color-preset');
                if (preset) {
                    const color = preset.dataset.color;
                    const colorInput = document.getElementById('edit-color');
                    const hexInput = document.getElementById('edit-color-hex');

                    if (colorInput) colorInput.value = color;
                    if (hexInput) hexInput.value = color.toUpperCase();

                    // Update selected state
                    document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
                    preset.classList.add('selected');
                }
            });
        }
    }

    // Handle file import
    async function handleFileImport(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        showLoading(true);

        for (const file of files) {
            try {
                if (file.name.endsWith('.gpkg')) {
                    await loadGeoPackage(file);
                } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
                    await loadGeoJSON(file);
                } else {
                    showToast(`Filformat stöds ej: ${file.name}`, 'warning');
                }
            } catch (error) {
                console.error('Error loading file:', error);
                showToast(`Fel vid inläsning av ${file.name}: ${error.message}`, 'error');
            }
        }

        // Clear input
        e.target.value = '';

        showLoading(false);
        updateLayerTable();
        updateStatus();
        saveToStorage();
    }

    // Load GeoPackage file
    async function loadGeoPackage(file) {
        const result = await GeoPackageLoader.loadFromFile(file);

        const layersList = result.layers || [];
        const srsInfo = result.metadata ? result.metadata.srs : [];

        for (const layer of layersList) {
            const geojson = GeoPackageLoader.toGeoJSON(layer);
            if (geojson && geojson.features && geojson.features.length > 0) {
                const layerId = generateLayerId(layer.name);
                const color = getNextColor();

                // Determine CRS from SRS info
                let crs = '4326'; // Default
                if (srsInfo && srsInfo.length > 0) {
                    const layerSrs = srsInfo.find(s => s.id === layer.srsId);
                    if (layerSrs) {
                        if (layerSrs.orgId === 3006) crs = '3006';
                        else if (layerSrs.orgId === 3857) crs = '3857';
                        else if (layerSrs.orgId === 3021) crs = '3021';
                    }
                }

                layers.set(layerId, {
                    id: layerId,
                    name: layer.name,
                    crs: crs,
                    geojson: geojson,
                    featureCount: geojson.features.length,
                    geometryType: getGeometryType(geojson),
                    visible: true,
                    style: {
                        color: color,
                        strokeColor: darkenColor(color, 20),
                        fillOpacity: 0.3,
                        strokeOpacity: 0.8,
                        strokeWidth: 2,
                        pointRadius: 8
                    },
                    source: {
                        type: 'geopackage',
                        filename: file.name,
                        tableName: layer.tableName
                    }
                });

                showToast(`Lager "${layer.name}" laddat (${geojson.features.length} objekt)`, 'success');
            }
        }
    }

    // Load GeoJSON file
    async function loadGeoJSON(file) {
        const text = await file.text();
        const geojson = JSON.parse(text);

        if (!geojson.features && geojson.type !== 'FeatureCollection') {
            // Wrap single feature or geometry
            if (geojson.type === 'Feature') {
                geojson = { type: 'FeatureCollection', features: [geojson] };
            } else {
                throw new Error('Ogiltigt GeoJSON-format');
            }
        }

        const layerName = file.name.replace(/\.(geojson|json)$/i, '');
        const layerId = generateLayerId(layerName);
        const color = getNextColor();

        layers.set(layerId, {
            id: layerId,
            name: layerName,
            crs: '4326', // GeoJSON is typically WGS84
            geojson: geojson,
            featureCount: geojson.features.length,
            geometryType: getGeometryType(geojson),
            visible: true,
            style: {
                color: color,
                strokeColor: darkenColor(color, 20),
                fillOpacity: 0.3,
                strokeOpacity: 0.8,
                strokeWidth: 2,
                pointRadius: 8
            },
            source: {
                type: 'geojson',
                filename: file.name
            }
        });

        showToast(`Lager "${layerName}" laddat (${geojson.features.length} objekt)`, 'success');
    }

    // Generate unique layer ID
    function generateLayerId(name) {
        const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        let id = baseName;
        let counter = 1;
        while (layers.has(id)) {
            id = `${baseName}_${counter}`;
            counter++;
        }
        return id;
    }

    // Get next color from palette
    function getNextColor() {
        const color = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
        return color;
    }

    // Darken a hex color
    function darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Get geometry type from GeoJSON
    function getGeometryType(geojson) {
        if (geojson && geojson.features && geojson.features.length > 0) {
            const firstFeature = geojson.features.find(f => f.geometry);
            if (firstFeature) {
                return firstFeature.geometry.type;
            }
        }
        return 'Unknown';
    }

    // Update layer table
    function updateLayerTable() {
        const tbody = document.getElementById('layer-tbody');
        const emptyState = document.getElementById('empty-state');
        const table = document.getElementById('layer-table');
        const layerCount = document.getElementById('layer-count');

        if (!tbody) return;

        // Clear table
        tbody.innerHTML = '';

        // Update count
        if (layerCount) {
            layerCount.textContent = `${layers.size} lager`;
        }

        // Show/hide empty state
        if (layers.size === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (table) table.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        if (table) table.classList.remove('hidden');

        // Add rows
        layers.forEach((layer, layerId) => {
            const row = createLayerRow(layer);
            tbody.appendChild(row);
        });
    }

    // Create layer row
    function createLayerRow(layer) {
        const row = document.createElement('tr');
        row.dataset.layerId = layer.id;

        const crsInfo = crsOptions[layer.crs] || { name: 'Okänt', epsg: `EPSG:${layer.crs}` };

        row.innerHTML = `
            <td>
                <input type="checkbox" ${layer.visible ? 'checked' : ''} data-action="toggle" />
            </td>
            <td><strong>${escapeHtml(layer.name)}</strong></td>
            <td>
                <span class="layer-crs-badge">${crsInfo.epsg}</span>
            </td>
            <td>
                <div class="layer-color-cell">
                    <span class="layer-color-swatch" style="background-color: ${layer.style.color}"></span>
                    <span>${layer.style.color}</span>
                </div>
            </td>
            <td>
                <div class="opacity-display">
                    <div class="opacity-bar">
                        <div class="opacity-bar-fill" style="width: ${layer.style.fillOpacity * 100}%"></div>
                    </div>
                    <span class="opacity-text">${Math.round(layer.style.fillOpacity * 100)}%</span>
                </div>
            </td>
            <td>${layer.featureCount}</td>
            <td>
                <div class="layer-actions-cell">
                    <button data-action="edit" title="Redigera">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-action="duplicate" title="Duplicera">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button data-action="delete" class="btn-danger" title="Ta bort">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        // Add event listeners
        row.querySelector('[data-action="toggle"]').addEventListener('change', (e) => {
            layer.visible = e.target.checked;
            markAsModified();
        });

        row.querySelector('[data-action="edit"]').addEventListener('click', () => {
            openDetailPanel(layer.id);
        });

        row.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
            duplicateLayer(layer.id);
        });

        row.querySelector('[data-action="delete"]').addEventListener('click', () => {
            deleteLayer(layer.id);
        });

        return row;
    }

    // Open detail panel for editing
    function openDetailPanel(layerId) {
        const layer = layers.get(layerId);
        if (!layer) return;

        const panel = document.getElementById('layer-detail-panel');
        if (!panel) return;

        // Populate form
        document.getElementById('edit-layer-id').value = layerId;
        document.getElementById('edit-layer-name').textContent = layer.name;
        document.getElementById('edit-name').value = layer.name;
        document.getElementById('edit-crs').value = layer.crs;
        document.getElementById('edit-color').value = layer.style.color;
        document.getElementById('edit-color-hex').value = layer.style.color.toUpperCase();
        document.getElementById('edit-stroke-color').value = layer.style.strokeColor;
        document.getElementById('edit-stroke-color-hex').value = layer.style.strokeColor.toUpperCase();
        document.getElementById('edit-fill-opacity').value = Math.round(layer.style.fillOpacity * 100);
        document.getElementById('edit-fill-opacity-value').textContent = Math.round(layer.style.fillOpacity * 100) + '%';
        document.getElementById('edit-stroke-opacity').value = Math.round(layer.style.strokeOpacity * 100);
        document.getElementById('edit-stroke-opacity-value').textContent = Math.round(layer.style.strokeOpacity * 100) + '%';
        document.getElementById('edit-stroke-width').value = layer.style.strokeWidth;
        document.getElementById('edit-point-radius').value = layer.style.pointRadius;

        // Update selected color preset
        document.querySelectorAll('.color-preset').forEach(p => {
            p.classList.toggle('selected', p.dataset.color === layer.style.color);
        });

        // Show panel
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth' });
    }

    // Close detail panel
    function closeDetailPanel() {
        const panel = document.getElementById('layer-detail-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // Handle layer save
    function handleLayerSave(e) {
        e.preventDefault();

        const layerId = document.getElementById('edit-layer-id').value;
        const layer = layers.get(layerId);
        if (!layer) return;

        // Update layer properties
        layer.name = document.getElementById('edit-name').value;
        layer.crs = document.getElementById('edit-crs').value;
        layer.style.color = document.getElementById('edit-color').value;
        layer.style.strokeColor = document.getElementById('edit-stroke-color').value;
        layer.style.fillOpacity = parseInt(document.getElementById('edit-fill-opacity').value) / 100;
        layer.style.strokeOpacity = parseInt(document.getElementById('edit-stroke-opacity').value) / 100;
        layer.style.strokeWidth = parseFloat(document.getElementById('edit-stroke-width').value);
        layer.style.pointRadius = parseInt(document.getElementById('edit-point-radius').value);

        // Update UI
        updateLayerTable();
        closeDetailPanel();
        markAsModified();
        saveToStorage();

        showToast(`Lager "${layer.name}" uppdaterat`, 'success');
    }

    // Reset layer style to defaults
    function resetLayerStyle() {
        const layerId = document.getElementById('edit-layer-id').value;
        const layer = layers.get(layerId);
        if (!layer) return;

        const color = layer.style.color; // Keep the original color

        document.getElementById('edit-fill-opacity').value = 30;
        document.getElementById('edit-fill-opacity-value').textContent = '30%';
        document.getElementById('edit-stroke-opacity').value = 80;
        document.getElementById('edit-stroke-opacity-value').textContent = '80%';
        document.getElementById('edit-stroke-width').value = 2;
        document.getElementById('edit-point-radius').value = 8;
        document.getElementById('edit-stroke-color').value = darkenColor(color, 20);
        document.getElementById('edit-stroke-color-hex').value = darkenColor(color, 20).toUpperCase();
    }

    // Duplicate layer
    function duplicateLayer(layerId) {
        const original = layers.get(layerId);
        if (!original) return;

        const newId = generateLayerId(original.name + '_kopia');
        const newLayer = JSON.parse(JSON.stringify(original));
        newLayer.id = newId;
        newLayer.name = original.name + ' (kopia)';
        newLayer.style.color = getNextColor();
        newLayer.style.strokeColor = darkenColor(newLayer.style.color, 20);

        layers.set(newId, newLayer);
        updateLayerTable();
        markAsModified();
        saveToStorage();

        showToast(`Lager duplicerat som "${newLayer.name}"`, 'success');
    }

    // Delete layer
    function deleteLayer(layerId) {
        const layer = layers.get(layerId);
        if (!layer) return;

        if (confirm(`Är du säker på att du vill ta bort lagret "${layer.name}"?`)) {
            layers.delete(layerId);
            updateLayerTable();
            closeDetailPanel();
            markAsModified();
            saveToStorage();

            showToast(`Lager "${layer.name}" borttaget`, 'info');
        }
    }

    // Export configuration
    function exportConfiguration() {
        const config = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            defaultCrs: document.getElementById('default-crs').value,
            defaultOpacity: parseInt(document.getElementById('default-opacity').value),
            layers: Array.from(layers.values()).map(layer => ({
                id: layer.id,
                name: layer.name,
                crs: layer.crs,
                visible: layer.visible,
                style: layer.style,
                featureCount: layer.featureCount,
                geometryType: layer.geometryType,
                source: layer.source
            }))
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kartlager-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Konfiguration exporterad', 'success');
    }

    // Save to localStorage
    function saveToStorage() {
        try {
            const data = {
                layers: Array.from(layers.entries()),
                colorIndex: colorIndex
            };
            localStorage.setItem('admin_layers', JSON.stringify(data));
            hasUnsavedChanges = false;
            updateStatus();
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    // Load from localStorage
    function loadFromStorage() {
        try {
            const data = localStorage.getItem('admin_layers');
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.layers) {
                    layers = new Map(parsed.layers);
                }
                if (parsed.colorIndex) {
                    colorIndex = parsed.colorIndex;
                }
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }

    // Mark as modified
    function markAsModified() {
        hasUnsavedChanges = true;
        updateStatus();
    }

    // Update status bar
    function updateStatus() {
        const statusLayers = document.getElementById('status-layers');
        const statusModified = document.getElementById('status-modified');

        if (statusLayers) {
            statusLayers.textContent = `${layers.size} lager`;
        }

        if (statusModified) {
            if (hasUnsavedChanges) {
                statusModified.textContent = 'Ändringar sparade';
                statusModified.classList.remove('modified');
            } else {
                statusModified.textContent = 'Inga osparade ändringar';
                statusModified.classList.remove('modified');
            }
        }
    }

    // Show loading overlay
    function showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('visible', show);
        }
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Get toast icon based on type
    function getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    return {
        init,
        getLayers: () => Array.from(layers.values()),
        getLayer: (id) => layers.get(id),
        updateLayer: (id, props) => {
            const layer = layers.get(id);
            if (layer) {
                Object.assign(layer, props);
                updateLayerTable();
                saveToStorage();
            }
        }
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AdminModule.init();
});
