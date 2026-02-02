/**
 * Process Data Module
 * Manages processes, datasets, and their relationships.
 * Persists state to localStorage.
 */
const ProcessData = (() => {
    const STORAGE_KEY = 'process_data';

    // Default sample data for samhällsbyggnadsprocessen
    const DEFAULT_DATA = {
        processes: [
            {
                id: 'p1',
                name: 'Översiktsplanering',
                description: 'Framtagande av kommunens översiktsplan som visar hur mark- och vattenområden ska användas.',
                responsible: 'Stadsbyggnadskontoret',
                x: 100, y: 200,
                color: '#4a6fa5'
            },
            {
                id: 'p2',
                name: 'Detaljplanering',
                description: 'Upprättande av detaljplan som reglerar bebyggelse och markanvändning inom ett specifikt område.',
                responsible: 'Plan- och byggavdelningen',
                x: 450, y: 200,
                color: '#3d5d8a'
            },
            {
                id: 'p3',
                name: 'Bygglovsprövning',
                description: 'Prövning av ansökan om bygglov enligt plan- och bygglagen.',
                responsible: 'Bygglovenheten',
                x: 800, y: 200,
                color: '#2e4a6e'
            },
            {
                id: 'p4',
                name: 'Lantmäteriförrättning',
                description: 'Fastighetsbildning, avstyckning och andra förrättningar.',
                responsible: 'Lantmäteriet',
                x: 450, y: 450,
                color: '#6a4fa5'
            },
            {
                id: 'p5',
                name: 'Projektering',
                description: 'Teknisk projektering av byggnader och infrastruktur.',
                responsible: 'Tekniska kontoret',
                x: 1150, y: 200,
                color: '#a5784a'
            },
            {
                id: 'p6',
                name: 'Byggproduktion',
                description: 'Utförande av byggnation och anläggningsarbeten.',
                responsible: 'Entreprenör',
                x: 1150, y: 450,
                color: '#4aa57a'
            },
            {
                id: 'p7',
                name: 'Förvaltning',
                description: 'Drift och underhåll av färdig bebyggelse och infrastruktur.',
                responsible: 'Fastighetskontoret',
                x: 1500, y: 320,
                color: '#a54a4a'
            }
        ],
        datasets: [
            {
                id: 'd1',
                name: 'Fastighetskarta',
                description: 'Grundkarta med fastighetsgränser, byggnader och adresser.',
                source: 'Lantmäteriet',
                format: 'GeoPackage',
                type: 'input'
            },
            {
                id: 'd2',
                name: 'Översiktsplan',
                description: 'Antagen översiktsplan med markanvändning.',
                source: 'Kommunen',
                format: 'PDF/GIS',
                type: 'output'
            },
            {
                id: 'd3',
                name: 'Detaljplanehandlingar',
                description: 'Plankarta, planbeskrivning och genomförandebeskrivning.',
                source: 'Plan- och byggavdelningen',
                format: 'DWG/PDF',
                type: 'output'
            },
            {
                id: 'd4',
                name: 'Geotekniska undersökningar',
                description: 'Markförhållanden och geotekniska rapporter.',
                source: 'Geoteknisk konsult',
                format: 'PDF/GIS',
                type: 'input'
            },
            {
                id: 'd5',
                name: 'Bygglovshandlingar',
                description: 'Ritningar, tekniska beskrivningar och kontrollplan.',
                source: 'Arkitekt/Byggherre',
                format: 'PDF/DWG',
                type: 'output'
            },
            {
                id: 'd6',
                name: 'Miljökonsekvensbeskrivning',
                description: 'Bedömning av planens eller projektets miljöpåverkan.',
                source: 'Miljökonsult',
                format: 'PDF',
                type: 'input'
            },
            {
                id: 'd7',
                name: 'Förrättningskarta',
                description: 'Karta som visar nya fastighetsgränser efter förrättning.',
                source: 'Lantmäteriet',
                format: 'GeoPackage/DWG',
                type: 'output'
            },
            {
                id: 'd8',
                name: 'BIM-modell',
                description: 'Byggnadsinformationsmodell med 3D-geometri och metadata.',
                source: 'Projekteringsgruppen',
                format: 'IFC',
                type: 'output'
            },
            {
                id: 'd9',
                name: 'Relationshandlingar',
                description: 'Slutdokumentation av utförd byggnation.',
                source: 'Entreprenör',
                format: 'PDF/DWG',
                type: 'output'
            },
            {
                id: 'd10',
                name: 'Drift- och underhållsplan',
                description: 'Plan för förvaltning av byggnader och infrastruktur.',
                source: 'Fastighetskontoret',
                format: 'PDF/Excel',
                type: 'output'
            },
            {
                id: 'd11',
                name: 'Befolkningsprognos',
                description: 'Prognoser för befolkningsutveckling i kommunen.',
                source: 'SCB/Kommunen',
                format: 'Excel',
                type: 'input'
            },
            {
                id: 'd12',
                name: 'Trafikutredning',
                description: 'Analys av trafikflöden och kapacitet.',
                source: 'Trafikverket/Konsult',
                format: 'PDF/GIS',
                type: 'input'
            }
        ],
        // connections: which datasets connect to which processes
        // { datasetId, processId, direction: 'in' | 'out' }
        connections: [
            { datasetId: 'd1', processId: 'p1', direction: 'in' },
            { datasetId: 'd11', processId: 'p1', direction: 'in' },
            { datasetId: 'd6', processId: 'p1', direction: 'in' },
            { datasetId: 'd2', processId: 'p1', direction: 'out' },

            { datasetId: 'd2', processId: 'p2', direction: 'in' },
            { datasetId: 'd1', processId: 'p2', direction: 'in' },
            { datasetId: 'd4', processId: 'p2', direction: 'in' },
            { datasetId: 'd6', processId: 'p2', direction: 'in' },
            { datasetId: 'd12', processId: 'p2', direction: 'in' },
            { datasetId: 'd3', processId: 'p2', direction: 'out' },

            { datasetId: 'd3', processId: 'p3', direction: 'in' },
            { datasetId: 'd1', processId: 'p3', direction: 'in' },
            { datasetId: 'd5', processId: 'p3', direction: 'out' },

            { datasetId: 'd3', processId: 'p4', direction: 'in' },
            { datasetId: 'd1', processId: 'p4', direction: 'in' },
            { datasetId: 'd7', processId: 'p4', direction: 'out' },

            { datasetId: 'd5', processId: 'p5', direction: 'in' },
            { datasetId: 'd4', processId: 'p5', direction: 'in' },
            { datasetId: 'd7', processId: 'p5', direction: 'in' },
            { datasetId: 'd8', processId: 'p5', direction: 'out' },

            { datasetId: 'd8', processId: 'p6', direction: 'in' },
            { datasetId: 'd5', processId: 'p6', direction: 'in' },
            { datasetId: 'd9', processId: 'p6', direction: 'out' },

            { datasetId: 'd9', processId: 'p7', direction: 'in' },
            { datasetId: 'd8', processId: 'p7', direction: 'in' },
            { datasetId: 'd10', processId: 'p7', direction: 'out' }
        ]
    };

    let data = null;

    function load() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                data = JSON.parse(stored);
            } catch (e) {
                data = JSON.parse(JSON.stringify(DEFAULT_DATA));
            }
        } else {
            data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
        return data;
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function getProcesses() { return data.processes; }
    function getDatasets() { return data.datasets; }
    function getConnections() { return data.connections; }

    function getProcess(id) { return data.processes.find(p => p.id === id); }
    function getDataset(id) { return data.datasets.find(d => d.id === id); }

    function getProcessInputs(processId) {
        return data.connections
            .filter(c => c.processId === processId && c.direction === 'in')
            .map(c => getDataset(c.datasetId))
            .filter(Boolean);
    }

    function getProcessOutputs(processId) {
        return data.connections
            .filter(c => c.processId === processId && c.direction === 'out')
            .map(c => getDataset(c.datasetId))
            .filter(Boolean);
    }

    function getDatasetProcesses(datasetId) {
        const conns = data.connections.filter(c => c.datasetId === datasetId);
        return conns.map(c => ({
            process: getProcess(c.processId),
            direction: c.direction
        })).filter(item => item.process);
    }

    function getDatasetUsageType(datasetId) {
        const conns = data.connections.filter(c => c.datasetId === datasetId);
        const isInput = conns.some(c => c.direction === 'in');
        const isOutput = conns.some(c => c.direction === 'out');
        if (isInput && isOutput) return 'both';
        if (isOutput) return 'output';
        return 'input';
    }

    function updateProcess(id, updates) {
        const p = getProcess(id);
        if (p) Object.assign(p, updates);
        save();
    }

    function updateDataset(id, updates) {
        const d = getDataset(id);
        if (d) Object.assign(d, updates);
        save();
    }

    function addProcess(proc) {
        proc.id = 'p' + Date.now();
        data.processes.push(proc);
        save();
        return proc;
    }

    function addDataset(ds) {
        ds.id = 'd' + Date.now();
        data.datasets.push(ds);
        save();
        return ds;
    }

    function addConnection(datasetId, processId, direction) {
        const exists = data.connections.some(
            c => c.datasetId === datasetId && c.processId === processId && c.direction === direction
        );
        if (!exists) {
            data.connections.push({ datasetId, processId, direction });
            save();
        }
    }

    function removeConnection(datasetId, processId, direction) {
        data.connections = data.connections.filter(
            c => !(c.datasetId === datasetId && c.processId === processId && c.direction === direction)
        );
        save();
    }

    function deleteProcess(id) {
        data.processes = data.processes.filter(p => p.id !== id);
        data.connections = data.connections.filter(c => c.processId !== id);
        save();
    }

    function deleteDataset(id) {
        data.datasets = data.datasets.filter(d => d.id !== id);
        data.connections = data.connections.filter(c => c.datasetId !== id);
        save();
    }

    function moveProcess(id, x, y) {
        const p = getProcess(id);
        if (p) { p.x = x; p.y = y; }
        save();
    }

    function resetToDefault() {
        data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        save();
    }

    return {
        load, save, resetToDefault,
        getProcesses, getDatasets, getConnections,
        getProcess, getDataset,
        getProcessInputs, getProcessOutputs,
        getDatasetProcesses, getDatasetUsageType,
        updateProcess, updateDataset,
        addProcess, addDataset,
        addConnection, removeConnection,
        deleteProcess, deleteDataset,
        moveProcess
    };
})();
