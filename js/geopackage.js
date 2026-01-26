/**
 * GeoPackage Loader Module
 * Hanterar inläsning och parsing av GeoPackage-filer
 * Använder sql.js för att läsa SQLite-baserade GeoPackage
 */

const GeoPackageLoader = (function() {
    let SQL = null;
    let initialized = false;

    // Initialize sql.js
    async function init() {
        if (initialized) return true;

        try {
            SQL = await initSqlJs({
                locateFile: file => `https://unpkg.com/sql.js@1.8.0/dist/${file}`
            });
            initialized = true;
            console.log('GeoPackage loader initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize sql.js:', error);
            throw error;
        }
    }

    // Load GeoPackage from File
    async function loadFromFile(file) {
        await init();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const result = await parseGeoPackage(data, file.name);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    // Parse GeoPackage data
    async function parseGeoPackage(data, fileName) {
        const db = new SQL.Database(data);

        try {
            // Get GeoPackage metadata
            const metadata = getGeoPackageMetadata(db);

            // Get all feature tables
            const tables = getFeatureTables(db);

            // Load features from each table
            const layers = [];
            for (const table of tables) {
                const layer = await loadLayer(db, table);
                if (layer && layer.features.length > 0) {
                    layers.push(layer);
                }
            }

            db.close();

            return {
                name: fileName.replace('.gpkg', ''),
                metadata,
                layers
            };
        } catch (error) {
            db.close();
            throw error;
        }
    }

    // Get GeoPackage metadata
    function getGeoPackageMetadata(db) {
        const metadata = {
            version: null,
            srs: []
        };

        try {
            // Get GeoPackage version
            const versionResult = db.exec("SELECT * FROM gpkg_contents LIMIT 1");
            if (versionResult.length > 0) {
                metadata.version = '1.x';
            }

            // Get spatial reference systems
            const srsResult = db.exec("SELECT srs_id, srs_name, organization, organization_coordsys_id FROM gpkg_spatial_ref_sys");
            if (srsResult.length > 0) {
                srsResult[0].values.forEach(row => {
                    metadata.srs.push({
                        id: row[0],
                        name: row[1],
                        org: row[2],
                        orgId: row[3]
                    });
                });
            }
        } catch (e) {
            console.warn('Could not read GeoPackage metadata:', e);
        }

        return metadata;
    }

    // Get feature tables from GeoPackage
    function getFeatureTables(db) {
        const tables = [];

        try {
            const result = db.exec(`
                SELECT table_name, data_type, identifier, description,
                       min_x, min_y, max_x, max_y, srs_id
                FROM gpkg_contents
                WHERE data_type IN ('features', 'tiles')
            `);

            if (result.length > 0) {
                result[0].values.forEach(row => {
                    tables.push({
                        name: row[0],
                        dataType: row[1],
                        identifier: row[2] || row[0],
                        description: row[3],
                        bounds: {
                            minX: row[4],
                            minY: row[5],
                            maxX: row[6],
                            maxY: row[7]
                        },
                        srsId: row[8]
                    });
                });
            }
        } catch (e) {
            // Try fallback - list all tables
            try {
                const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'gpkg_%' AND name NOT LIKE 'sqlite_%'");
                if (tablesResult.length > 0) {
                    tablesResult[0].values.forEach(row => {
                        tables.push({
                            name: row[0],
                            dataType: 'features',
                            identifier: row[0],
                            description: '',
                            bounds: null,
                            srsId: 4326
                        });
                    });
                }
            } catch (e2) {
                console.error('Could not get feature tables:', e2);
            }
        }

        return tables;
    }

    // Load a single layer
    async function loadLayer(db, table) {
        const layer = {
            name: table.identifier || table.name,
            tableName: table.name,
            description: table.description,
            bounds: table.bounds,
            srsId: table.srsId,
            geometryType: null,
            features: [],
            properties: []
        };

        try {
            // Get geometry column info
            const geomInfo = getGeometryColumnInfo(db, table.name);
            layer.geometryColumn = geomInfo.column;
            layer.geometryType = geomInfo.type;

            // Get all columns
            const columnsResult = db.exec(`PRAGMA table_info('${table.name}')`);
            if (columnsResult.length > 0) {
                layer.properties = columnsResult[0].values
                    .map(row => row[1])
                    .filter(col => col !== geomInfo.column);
            }

            // Load features
            const features = loadFeatures(db, table.name, geomInfo.column, layer.properties);
            layer.features = features;

            // Determine geometry type from features if not set
            if (!layer.geometryType && features.length > 0) {
                const firstGeom = features.find(f => f.geometry);
                if (firstGeom) {
                    layer.geometryType = firstGeom.geometry.type;
                }
            }

        } catch (e) {
            console.error(`Failed to load layer ${table.name}:`, e);
        }

        return layer;
    }

    // Get geometry column info
    function getGeometryColumnInfo(db, tableName) {
        let column = 'geom';
        let type = null;

        try {
            const result = db.exec(`
                SELECT column_name, geometry_type_name
                FROM gpkg_geometry_columns
                WHERE table_name = '${tableName}'
            `);

            if (result.length > 0 && result[0].values.length > 0) {
                column = result[0].values[0][0];
                type = result[0].values[0][1];
            }
        } catch (e) {
            // Try to find geometry column by name
            try {
                const columnsResult = db.exec(`PRAGMA table_info('${tableName}')`);
                if (columnsResult.length > 0) {
                    const geomCol = columnsResult[0].values.find(row =>
                        ['geom', 'geometry', 'the_geom', 'shape'].includes(row[1].toLowerCase())
                    );
                    if (geomCol) {
                        column = geomCol[1];
                    }
                }
            } catch (e2) {
                console.warn('Could not determine geometry column:', e2);
            }
        }

        return { column, type };
    }

    // Load features from a table
    function loadFeatures(db, tableName, geomColumn, properties) {
        const features = [];

        try {
            // Select all columns including geometry
            const selectCols = properties.map(p => `"${p}"`).join(', ');
            const query = selectCols
                ? `SELECT "${geomColumn}", ${selectCols}, rowid as _fid FROM "${tableName}"`
                : `SELECT "${geomColumn}", rowid as _fid FROM "${tableName}"`;

            const result = db.exec(query);

            if (result.length > 0) {
                const columns = result[0].columns;
                const geomIndex = columns.indexOf(geomColumn);
                const fidIndex = columns.indexOf('_fid');

                result[0].values.forEach((row, index) => {
                    const geometry = parseGeometry(row[geomIndex]);
                    const props = {};

                    columns.forEach((col, i) => {
                        if (col !== geomColumn && col !== '_fid') {
                            props[col] = row[i];
                        }
                    });

                    features.push({
                        id: row[fidIndex] || index,
                        geometry,
                        properties: props
                    });
                });
            }
        } catch (e) {
            console.error(`Failed to load features from ${tableName}:`, e);
        }

        return features;
    }

    // Parse GeoPackage binary geometry
    function parseGeometry(blob) {
        if (!blob) return null;

        try {
            const data = new Uint8Array(blob);

            // GeoPackage geometry header
            // Magic: GP (0x47, 0x50)
            // Version: 0x00
            // Flags: 1 byte
            // srs_id: 4 bytes (int32)
            // envelope: variable (based on flags)

            if (data[0] !== 0x47 || data[1] !== 0x50) {
                // Not a valid GeoPackage geometry, try WKB directly
                return parseWKB(data, 0);
            }

            const flags = data[3];
            const envelopeType = (flags >> 1) & 0x07;
            const byteOrder = flags & 0x01; // 0 = big endian, 1 = little endian
            const isEmpty = (flags >> 4) & 0x01;

            if (isEmpty) return null;

            // Calculate envelope size
            let envelopeSize = 0;
            switch (envelopeType) {
                case 1: envelopeSize = 32; break; // minx, maxx, miny, maxy
                case 2: envelopeSize = 48; break; // + minz, maxz
                case 3: envelopeSize = 48; break; // + minm, maxm
                case 4: envelopeSize = 64; break; // + minz, maxz, minm, maxm
            }

            // WKB starts after header (8 bytes) + envelope
            const wkbStart = 8 + envelopeSize;
            return parseWKB(data, wkbStart);

        } catch (e) {
            console.warn('Failed to parse geometry:', e);
            return null;
        }
    }

    // Parse WKB (Well-Known Binary)
    function parseWKB(data, offset) {
        if (offset >= data.length) return null;

        const view = new DataView(data.buffer, data.byteOffset + offset);
        const byteOrder = data[offset]; // 0 = big endian, 1 = little endian
        const littleEndian = byteOrder === 1;

        const wkbType = view.getUint32(1, littleEndian);
        const geomType = wkbType & 0xFF; // Remove Z/M flags

        let pos = 5; // After byte order and type

        switch (geomType) {
            case 1: // Point
                return parsePoint(view, pos, littleEndian);
            case 2: // LineString
                return parseLineString(view, pos, littleEndian);
            case 3: // Polygon
                return parsePolygon(view, pos, littleEndian);
            case 4: // MultiPoint
                return parseMultiPoint(data, offset + pos, littleEndian);
            case 5: // MultiLineString
                return parseMultiLineString(data, offset + pos, littleEndian);
            case 6: // MultiPolygon
                return parseMultiPolygon(data, offset + pos, littleEndian);
            default:
                console.warn('Unsupported geometry type:', geomType);
                return null;
        }
    }

    function parsePoint(view, pos, littleEndian) {
        const x = view.getFloat64(pos, littleEndian);
        const y = view.getFloat64(pos + 8, littleEndian);
        return {
            type: 'Point',
            coordinates: [x, y]
        };
    }

    function parseLineString(view, pos, littleEndian) {
        const numPoints = view.getUint32(pos, littleEndian);
        pos += 4;

        const coordinates = [];
        for (let i = 0; i < numPoints; i++) {
            const x = view.getFloat64(pos, littleEndian);
            const y = view.getFloat64(pos + 8, littleEndian);
            coordinates.push([x, y]);
            pos += 16;
        }

        return {
            type: 'LineString',
            coordinates
        };
    }

    function parsePolygon(view, pos, littleEndian) {
        const numRings = view.getUint32(pos, littleEndian);
        pos += 4;

        const coordinates = [];
        for (let r = 0; r < numRings; r++) {
            const numPoints = view.getUint32(pos, littleEndian);
            pos += 4;

            const ring = [];
            for (let i = 0; i < numPoints; i++) {
                const x = view.getFloat64(pos, littleEndian);
                const y = view.getFloat64(pos + 8, littleEndian);
                ring.push([x, y]);
                pos += 16;
            }
            coordinates.push(ring);
        }

        return {
            type: 'Polygon',
            coordinates
        };
    }

    function parseMultiPoint(data, offset, littleEndian) {
        const view = new DataView(data.buffer, data.byteOffset + offset);
        const numGeoms = view.getUint32(0, littleEndian);
        let pos = 4;

        const coordinates = [];
        for (let i = 0; i < numGeoms; i++) {
            const point = parseWKB(data, offset + pos);
            if (point) {
                coordinates.push(point.coordinates);
            }
            pos += 21; // 1 + 4 + 16 (byte order + type + point)
        }

        return {
            type: 'MultiPoint',
            coordinates
        };
    }

    function parseMultiLineString(data, offset, littleEndian) {
        const view = new DataView(data.buffer, data.byteOffset + offset);
        const numGeoms = view.getUint32(0, littleEndian);
        let pos = 4;

        const coordinates = [];
        for (let i = 0; i < numGeoms; i++) {
            // Each geometry has its own header
            const geom = parseWKB(data, offset + pos);
            if (geom) {
                coordinates.push(geom.coordinates);
                // Calculate size: header (5) + numPoints (4) + points (16 each)
                const numPoints = new DataView(data.buffer, data.byteOffset + offset + pos + 5).getUint32(0, littleEndian);
                pos += 9 + (numPoints * 16);
            }
        }

        return {
            type: 'MultiLineString',
            coordinates
        };
    }

    function parseMultiPolygon(data, offset, littleEndian) {
        const view = new DataView(data.buffer, data.byteOffset + offset);
        const numGeoms = view.getUint32(0, littleEndian);

        // For multi-polygon, we need more careful parsing
        // This is a simplified version
        const coordinates = [];

        // Note: Full implementation would need to track position through each polygon
        // For now, return placeholder
        return {
            type: 'MultiPolygon',
            coordinates: []
        };
    }

    // Convert GeoPackage layer to GeoJSON
    function toGeoJSON(layer) {
        return {
            type: 'FeatureCollection',
            features: layer.features
                .filter(f => f.geometry)
                .map(f => ({
                    type: 'Feature',
                    id: f.id,
                    geometry: f.geometry,
                    properties: f.properties
                }))
        };
    }

    // Transform coordinates from one CRS to another (simplified - assumes SWEREF99 to WGS84)
    function transformCoordinates(coords, fromSrs) {
        // If data is in SWEREF99 TM (EPSG:3006), transform to WGS84
        if (fromSrs === 3006) {
            return transformSWEREF99ToWGS84(coords);
        }
        // Assume already WGS84
        return coords;
    }

    // SWEREF99 TM to WGS84 transformation (approximate)
    function transformSWEREF99ToWGS84(coords) {
        // This is a simplified transformation
        // For production, use proj4js or similar
        const [x, y] = coords;

        // Approximate inverse projection for SWEREF99 TM
        // Central meridian: 15°E, Scale: 0.9996
        const lon0 = 15;
        const k0 = 0.9996;
        const falseEasting = 500000;
        const falseNorthing = 0;

        const a = 6378137; // WGS84 semi-major axis
        const f = 1 / 298.257222101; // WGS84 flattening

        // Simplified inverse Transverse Mercator
        const x0 = x - falseEasting;
        const y0 = y - falseNorthing;

        // Very rough approximation
        const lat = y0 / 111320;
        const lon = lon0 + (x0 / (111320 * Math.cos(lat * Math.PI / 180)));

        return [lon, lat];
    }

    // Public API
    return {
        init,
        loadFromFile,
        toGeoJSON,
        transformCoordinates
    };
})();
