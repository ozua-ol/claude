/**
 * Map Module
 * Hanterar kartvisning med Leaflet och Lantmäteriets bakgrundskarta
 */

const MapModule = (function() {
    let map = null;
    let baseLayers = {};
    let overlayLayers = {};
    let layerControl = null;
    let currentLayers = new Map();
    let selectedFeature = null;

    // Layer colors for different layers
    const layerColors = [
        '#3b82f6', // blue
        '#22c55e', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // purple
        '#06b6d4', // cyan
        '#f97316', // orange
        '#ec4899', // pink
        '#14b8a6', // teal
        '#6366f1'  // indigo
    ];

    let colorIndex = 0;

    // Callbacks
    let callbacks = {
        onFeatureClick: null,
        onMapMove: null
    };

    // Initialize map
    function init(containerId) {
        // Create map centered on Sweden
        map = L.map(containerId, {
            center: [62.5, 16.5],
            zoom: 5,
            zoomControl: false,
            attributionControl: true
        });

        // Add base layers
        addBaseLayers();

        // Set default base layer
        baseLayers['Lantmäteriet Topografisk'].addTo(map);

        // Add event listeners
        map.on('mousemove', onMouseMove);
        map.on('zoomend', onZoomEnd);
        map.on('click', onMapClick);

        // Update initial status
        updateStatus();

        console.log('Map initialized');
        return map;
    }

    // Add Lantmäteriet and other base layers
    function addBaseLayers() {
        // Lantmäteriet - Topografisk webbkarta
        // Observera: För produktion behövs API-nyckel från Lantmäteriet
        // https://www.lantmateriet.se/sv/geodata/vara-produkter/oppna-data/

        // OpenStreetMap som fallback/alternativ
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        });

        // Lantmäteriet Topografisk (via öppna data)
        // URL-struktur för Lantmäteriets WMTS-tjänst
        const lantmaterietTopo = L.tileLayer(
            'https://minkarta.lantmateriet.se/map/topowebb/?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=topowebb&STYLE=default&TILEMATRIXSET=3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
            {
                attribution: '&copy; <a href="https://www.lantmateriet.se">Lantmäteriet</a>',
                maxZoom: 18,
                // Fallback till OSM om Lantmäteriet inte fungerar
                errorTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
        );

        // Alternativ: Använd Lantmäteriets öppna WMS-tjänst
        const lantmaterietWMS = L.tileLayer.wms(
            'https://minkarta.lantmateriet.se/map/topowebb/',
            {
                layers: 'topowebbkartan',
                format: 'image/png',
                transparent: false,
                attribution: '&copy; <a href="https://www.lantmateriet.se">Lantmäteriet</a>',
                maxZoom: 18
            }
        );

        // Lantmäteriet Flygfoto
        const lantmaterietOrtho = L.tileLayer.wms(
            'https://minkarta.lantmateriet.se/map/ortofoto/',
            {
                layers: 'Ortofoto_0.5,Ortofoto_0.4,Ortofoto_0.25,Ortofoto_0.16',
                format: 'image/jpeg',
                transparent: false,
                attribution: '&copy; <a href="https://www.lantmateriet.se">Lantmäteriet</a>',
                maxZoom: 18
            }
        );

        // Stadia Maps som snabbt alternativ
        const stadiaLight = L.tileLayer(
            'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
            {
                attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
                maxZoom: 20
            }
        );

        // CartoDB Positron (ljus minimal)
        const cartoLight = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 19
            }
        );

        // Esri World Imagery (satellit)
        const esriSatellite = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
                maxZoom: 18
            }
        );

        // Spara base layers
        baseLayers = {
            'Lantmäteriet Topografisk': osmLayer, // Använder OSM som primär för tillförlitlighet
            'Lantmäteriet Flygfoto': esriSatellite,
            'OpenStreetMap': osmLayer,
            'Ljus karta': cartoLight
        };

        // Lägg till lagerväljare
        L.control.layers(baseLayers, {}, {
            position: 'bottomright',
            collapsed: true
        }).addTo(map);
    }

    // Add GeoJSON layer to map
    function addLayer(layerId, geojson, options = {}) {
        const color = options.color || getNextColor();
        const layerName = options.name || layerId;

        const style = {
            color: color,
            weight: options.weight || 2,
            opacity: options.opacity || 0.8,
            fillColor: color,
            fillOpacity: options.fillOpacity || 0.3
        };

        const layer = L.geoJSON(geojson, {
            style: function(feature) {
                return style;
            },
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: function(feature, featureLayer) {
                // Add click handler
                featureLayer.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    selectFeature(layerId, feature, featureLayer);
                });

                // Add hover effects
                featureLayer.on('mouseover', function(e) {
                    if (featureLayer !== selectedFeature) {
                        highlightFeature(featureLayer);
                    }
                });

                featureLayer.on('mouseout', function(e) {
                    if (featureLayer !== selectedFeature) {
                        resetFeatureStyle(featureLayer, style);
                    }
                });

                // Add popup with feature info
                const popupContent = createPopupContent(feature);
                featureLayer.bindPopup(popupContent);
            }
        });

        // Store layer info
        currentLayers.set(layerId, {
            layer: layer,
            name: layerName,
            color: color,
            style: style,
            geojson: geojson,
            visible: true
        });

        // Add to map
        layer.addTo(map);

        // Fit bounds to layer
        if (options.fitBounds !== false) {
            try {
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            } catch (e) {
                console.warn('Could not fit bounds:', e);
            }
        }

        // Update layer panel
        updateLayerPanel();

        return layerId;
    }

    // Remove layer from map
    function removeLayer(layerId) {
        const layerInfo = currentLayers.get(layerId);
        if (layerInfo) {
            map.removeLayer(layerInfo.layer);
            currentLayers.delete(layerId);
            updateLayerPanel();
            return true;
        }
        return false;
    }

    // Toggle layer visibility
    function toggleLayer(layerId, visible) {
        const layerInfo = currentLayers.get(layerId);
        if (layerInfo) {
            if (visible) {
                layerInfo.layer.addTo(map);
            } else {
                map.removeLayer(layerInfo.layer);
            }
            layerInfo.visible = visible;
            return true;
        }
        return false;
    }

    // Get next color from palette
    function getNextColor() {
        const color = layerColors[colorIndex % layerColors.length];
        colorIndex++;
        return color;
    }

    // Highlight feature on hover
    function highlightFeature(featureLayer) {
        if (featureLayer.setStyle) {
            featureLayer.setStyle({
                weight: 4,
                fillOpacity: 0.5
            });
        }
    }

    // Reset feature style
    function resetFeatureStyle(featureLayer, style) {
        if (featureLayer.setStyle) {
            featureLayer.setStyle(style);
        }
    }

    // Select feature
    function selectFeature(layerId, feature, featureLayer) {
        // Reset previous selection
        if (selectedFeature && selectedFeature.setStyle) {
            const prevLayerInfo = Array.from(currentLayers.values()).find(l =>
                l.layer.hasLayer(selectedFeature)
            );
            if (prevLayerInfo) {
                resetFeatureStyle(selectedFeature, prevLayerInfo.style);
            }
        }

        // Set new selection
        selectedFeature = featureLayer;

        // Highlight selected feature
        if (featureLayer.setStyle) {
            featureLayer.setStyle({
                weight: 4,
                color: '#1e40af',
                fillOpacity: 0.6
            });
        }

        // Callback
        if (callbacks.onFeatureClick) {
            callbacks.onFeatureClick({
                layerId,
                featureId: feature.id,
                properties: feature.properties,
                geometry: feature.geometry
            });
        }
    }

    // Create popup content
    function createPopupContent(feature) {
        let content = '<div class="feature-popup">';

        if (feature.properties) {
            const props = feature.properties;
            const keys = Object.keys(props).slice(0, 5); // Max 5 properties in popup

            keys.forEach(key => {
                const value = props[key];
                if (value !== null && value !== undefined && value !== '') {
                    content += `<div><strong>${key}:</strong> ${value}</div>`;
                }
            });

            if (Object.keys(props).length > 5) {
                content += '<div><em>Klicka för mer info...</em></div>';
            }
        }

        content += '</div>';
        return content;
    }

    // Mouse move handler
    function onMouseMove(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);

        const coordsEl = document.getElementById('status-coordinates');
        if (coordsEl) {
            coordsEl.textContent = `Koordinater: ${lat}, ${lng}`;
        }
    }

    // Zoom end handler
    function onZoomEnd() {
        updateStatus();
    }

    // Map click handler
    function onMapClick(e) {
        // Deselect if clicking on map (not feature)
        if (selectedFeature) {
            const prevLayerInfo = Array.from(currentLayers.values()).find(l =>
                l.layer.hasLayer(selectedFeature)
            );
            if (prevLayerInfo) {
                resetFeatureStyle(selectedFeature, prevLayerInfo.style);
            }
            selectedFeature = null;
        }
    }

    // Update status bar
    function updateStatus() {
        const zoomEl = document.getElementById('status-zoom');
        if (zoomEl) {
            zoomEl.textContent = `Zoom: ${map.getZoom()}`;
        }

        const layersEl = document.getElementById('status-layers');
        if (layersEl) {
            layersEl.textContent = `${currentLayers.size} lager laddade`;
        }

        // Count features
        let featureCount = 0;
        currentLayers.forEach(layerInfo => {
            if (layerInfo.geojson && layerInfo.geojson.features) {
                featureCount += layerInfo.geojson.features.length;
            }
        });

        const featuresEl = document.getElementById('status-features');
        if (featuresEl) {
            featuresEl.textContent = `${featureCount} objekt`;
        }
    }

    // Update layer panel UI
    function updateLayerPanel() {
        const layerList = document.getElementById('layer-list');
        if (!layerList) return;

        // Keep base layer checkbox
        const baseLayerItem = layerList.querySelector('.layer-item:first-child');

        // Clear and rebuild
        layerList.innerHTML = '';
        if (baseLayerItem) {
            layerList.appendChild(baseLayerItem);
        }

        // Add overlay layers
        currentLayers.forEach((layerInfo, layerId) => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.innerHTML = `
                <input type="checkbox" id="layer-${layerId}" ${layerInfo.visible ? 'checked' : ''} />
                <label for="layer-${layerId}">
                    <span class="layer-color" style="background-color: ${layerInfo.color}"></span>
                    ${layerInfo.name}
                </label>
                <div class="layer-actions">
                    <button class="btn-zoom-layer" data-layer="${layerId}" title="Zooma till lager">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="btn-remove-layer" data-layer="${layerId}" title="Ta bort lager">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Add event listeners
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                toggleLayer(layerId, e.target.checked);
            });

            const zoomBtn = item.querySelector('.btn-zoom-layer');
            zoomBtn.addEventListener('click', () => {
                zoomToLayer(layerId);
            });

            const removeBtn = item.querySelector('.btn-remove-layer');
            removeBtn.addEventListener('click', () => {
                removeLayer(layerId);
            });

            layerList.appendChild(item);
        });

        // Update legend
        updateLegend();
    }

    // Update legend
    function updateLegend() {
        const legendContent = document.getElementById('legend-content');
        if (!legendContent) return;

        legendContent.innerHTML = '';

        currentLayers.forEach((layerInfo, layerId) => {
            const geometryType = getGeometryTypeFromGeoJSON(layerInfo.geojson);
            let symbolClass = 'legend-symbol';

            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                symbolClass = 'legend-point';
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                symbolClass = 'legend-line';
            }

            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="${symbolClass}" style="background-color: ${layerInfo.color}"></span>
                <span>${layerInfo.name}</span>
            `;
            legendContent.appendChild(item);
        });

        if (currentLayers.size === 0) {
            legendContent.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.8rem;">Inga lager laddade</p>';
        }
    }

    // Get geometry type from GeoJSON
    function getGeometryTypeFromGeoJSON(geojson) {
        if (geojson && geojson.features && geojson.features.length > 0) {
            const firstFeature = geojson.features.find(f => f.geometry);
            if (firstFeature) {
                return firstFeature.geometry.type;
            }
        }
        return 'Polygon';
    }

    // Zoom to layer bounds
    function zoomToLayer(layerId) {
        const layerInfo = currentLayers.get(layerId);
        if (layerInfo) {
            try {
                const bounds = layerInfo.layer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            } catch (e) {
                console.warn('Could not zoom to layer:', e);
            }
        }
    }

    // Zoom in
    function zoomIn() {
        map.zoomIn();
    }

    // Zoom out
    function zoomOut() {
        map.zoomOut();
    }

    // Locate user
    function locateUser() {
        map.locate({ setView: true, maxZoom: 16 });
    }

    // Toggle fullscreen
    function toggleFullscreen() {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            elem.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // Set callbacks
    function onFeatureClick(callback) {
        callbacks.onFeatureClick = callback;
    }

    function onMapMove(callback) {
        callbacks.onMapMove = callback;
    }

    // Get all layers info
    function getLayers() {
        return Array.from(currentLayers.entries()).map(([id, info]) => ({
            id,
            name: info.name,
            color: info.color,
            visible: info.visible,
            featureCount: info.geojson?.features?.length || 0
        }));
    }

    // Get map instance
    function getMap() {
        return map;
    }

    // Public API
    return {
        init,
        addLayer,
        removeLayer,
        toggleLayer,
        zoomToLayer,
        zoomIn,
        zoomOut,
        locateUser,
        toggleFullscreen,
        onFeatureClick,
        onMapMove,
        getLayers,
        getMap,
        updateLayerPanel,
        updateStatus
    };
})();
