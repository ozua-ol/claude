/**
 * Citylab Utvärderingskriterier Module
 * Hanterar Citylab-kriterier för hållbar stadsutveckling
 */

const CityLab = (function() {
    // Citylab Action utvärderingskriterier
    // Baserat på Citylab Guide för hållbar stadsutveckling
    const criteria = {
        ekologi: {
            name: "Ekologisk hållbarhet",
            icon: "fa-leaf",
            color: "#22c55e",
            items: [
                {
                    id: "eko-1",
                    name: "Grönstruktur och ekosystemtjänster",
                    description: "Bevara och utveckla grönstruktur som bidrar till biologisk mångfald och ekosystemtjänster",
                    indicators: ["Andel grönyta", "Träddäckning", "Grönytefaktor"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-2",
                    name: "Dagvattenhantering",
                    description: "Lokalt omhändertagande av dagvatten genom naturbaserade lösningar",
                    indicators: ["Fördröjningskapacitet", "Andel hårdgjord yta", "Infiltrationsytor"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-3",
                    name: "Klimatanpassning",
                    description: "Åtgärder för att hantera klimatförändringar som värmeböljor och översvämningar",
                    indicators: ["Värmeöeffekt", "Översvämningsrisk", "Skuggande vegetation"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-4",
                    name: "Biologisk mångfald",
                    description: "Skapa livsmiljöer för djur och växter i stadsmiljön",
                    indicators: ["Artrikedom", "Habitatnätverk", "Pollinatorvänliga ytor"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-5",
                    name: "Energieffektivitet",
                    description: "Minimera energianvändning och främja förnybar energi",
                    indicators: ["Energiförbrukning", "Solcellspotential", "Fjärrvärme"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-6",
                    name: "Materialval och resurser",
                    description: "Hållbara materialval och resurseffektivitet i byggprocessen",
                    indicators: ["Återvunnet material", "Livscykelanalys", "Lokala material"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                }
            ]
        },
        social: {
            name: "Social hållbarhet",
            icon: "fa-users",
            color: "#3b82f6",
            items: [
                {
                    id: "soc-1",
                    name: "Tillgänglighet",
                    description: "Universell utformning för alla åldrar och funktionsvariationer",
                    indicators: ["Tillgängliga gångvägar", "Ramper", "Kontrastmarkeringar"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "soc-2",
                    name: "Mötesplatser och social interaktion",
                    description: "Skapa platser som främjar möten mellan människor",
                    indicators: ["Torg och platser", "Sittplatser", "Aktivitetsytor"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "soc-3",
                    name: "Trygghet och säkerhet",
                    description: "Utformning som främjar trygghet och säkerhet",
                    indicators: ["Belysning", "Siktlinjer", "Aktivitet under dygnets timmar"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "soc-4",
                    name: "Hälsa och välbefinnande",
                    description: "Miljöer som främjar fysisk aktivitet och mental hälsa",
                    indicators: ["Motionsstråk", "Rekreationsytor", "Bullernivå"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "soc-5",
                    name: "Kulturella värden",
                    description: "Bevara och integrera kulturhistoriska värden",
                    indicators: ["Kulturmiljöer", "Konst i offentlig miljö", "Identitetsskapande element"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "soc-6",
                    name: "Delaktighet och inflytande",
                    description: "Medborgardialog och involvering i planprocessen",
                    indicators: ["Dialogtillfällen", "Inkomna synpunkter", "Implementerade förslag"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                }
            ]
        },
        ekonomi: {
            name: "Ekonomisk hållbarhet",
            icon: "fa-chart-line",
            color: "#f59e0b",
            items: [
                {
                    id: "eko-e-1",
                    name: "Livscykelekonomi",
                    description: "Ekonomisk analys över hela livscykeln",
                    indicators: ["LCC-analys", "Underhållskostnader", "Driftskostnader"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-e-2",
                    name: "Lokal ekonomi och arbetstillfällen",
                    description: "Främja lokal ekonomi och sysselsättning",
                    indicators: ["Lokala företag", "Arbetstillfällen", "Serviceutbud"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-e-3",
                    name: "Transporteffektivitet",
                    description: "Effektiva transporter och minskade transportkostnader",
                    indicators: ["Kollektivtrafiknärhet", "Cykelinfrastruktur", "Parkeringstal"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "eko-e-4",
                    name: "Flexibilitet och anpassningsbarhet",
                    description: "Byggnader och ytor som kan anpassas över tid",
                    indicators: ["Flexibla lokaler", "Generalitet", "Framtidssäkring"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                }
            ]
        },
        process: {
            name: "Processledning",
            icon: "fa-cogs",
            color: "#8b5cf6",
            items: [
                {
                    id: "pro-1",
                    name: "Hållbarhetsprogram",
                    description: "Övergripande program för hållbarhetsarbetet",
                    indicators: ["Dokumenterat program", "Uppföljningsplan", "Ansvarsfördelning"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "pro-2",
                    name: "Samordning och samverkan",
                    description: "Effektiv samordning mellan aktörer",
                    indicators: ["Samverkansmöten", "Gemensamma mål", "Informationsdelning"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "pro-3",
                    name: "Innovation och lärande",
                    description: "Främja innovation och erfarenhetsåterföring",
                    indicators: ["Pilotprojekt", "Kunskapsdelning", "Best practice"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                },
                {
                    id: "pro-4",
                    name: "Uppföljning och utvärdering",
                    description: "Systematisk uppföljning av hållbarhetsmål",
                    indicators: ["KPI:er", "Mätningar", "Rapportering"],
                    status: "pending",
                    linkedFeatures: [],
                    notes: ""
                }
            ]
        }
    };

    // State
    let state = {
        criteria: JSON.parse(JSON.stringify(criteria)),
        linkedFeatures: new Map(),
        callbacks: {
            onCriteriaUpdate: null,
            onFeatureLink: null
        }
    };

    // Load saved state from localStorage
    function loadState() {
        try {
            const saved = localStorage.getItem('citylab_criteria_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge saved state with default criteria
                Object.keys(parsed.criteria || {}).forEach(category => {
                    if (state.criteria[category]) {
                        parsed.criteria[category].items.forEach((savedItem, index) => {
                            if (state.criteria[category].items[index]) {
                                state.criteria[category].items[index].status = savedItem.status || 'pending';
                                state.criteria[category].items[index].linkedFeatures = savedItem.linkedFeatures || [];
                                state.criteria[category].items[index].notes = savedItem.notes || '';
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('Could not load saved Citylab state:', e);
        }
    }

    // Save state to localStorage
    function saveState() {
        try {
            const toSave = {
                criteria: state.criteria,
                timestamp: Date.now()
            };
            localStorage.setItem('citylab_criteria_state', JSON.stringify(toSave));
        } catch (e) {
            console.warn('Could not save Citylab state:', e);
        }
    }

    // Get all criteria
    function getAllCriteria() {
        return state.criteria;
    }

    // Get criteria by ID
    function getCriteriaById(id) {
        for (const category of Object.values(state.criteria)) {
            const item = category.items.find(i => i.id === id);
            if (item) return item;
        }
        return null;
    }

    // Update criteria status
    function updateCriteriaStatus(id, status) {
        const item = getCriteriaById(id);
        if (item) {
            item.status = status;
            saveState();
            if (state.callbacks.onCriteriaUpdate) {
                state.callbacks.onCriteriaUpdate(item);
            }
            return true;
        }
        return false;
    }

    // Link feature to criteria
    function linkFeatureToCriteria(criteriaId, featureInfo) {
        const item = getCriteriaById(criteriaId);
        if (item) {
            // Check if already linked
            const existing = item.linkedFeatures.find(f =>
                f.layerId === featureInfo.layerId && f.featureId === featureInfo.featureId
            );
            if (!existing) {
                item.linkedFeatures.push({
                    layerId: featureInfo.layerId,
                    featureId: featureInfo.featureId,
                    name: featureInfo.name || 'Unnamed feature',
                    linkedAt: Date.now()
                });
                saveState();
                if (state.callbacks.onFeatureLink) {
                    state.callbacks.onFeatureLink(item, featureInfo);
                }
            }
            return true;
        }
        return false;
    }

    // Unlink feature from criteria
    function unlinkFeatureFromCriteria(criteriaId, featureInfo) {
        const item = getCriteriaById(criteriaId);
        if (item) {
            item.linkedFeatures = item.linkedFeatures.filter(f =>
                !(f.layerId === featureInfo.layerId && f.featureId === featureInfo.featureId)
            );
            saveState();
            return true;
        }
        return false;
    }

    // Get progress statistics
    function getProgress() {
        let total = 0;
        let completed = 0;
        let partial = 0;

        Object.values(state.criteria).forEach(category => {
            category.items.forEach(item => {
                total++;
                if (item.status === 'completed') completed++;
                else if (item.status === 'partial') partial++;
            });
        });

        return {
            total,
            completed,
            partial,
            pending: total - completed - partial,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    // Get criteria linked to a specific feature
    function getCriteriaForFeature(layerId, featureId) {
        const linked = [];
        Object.values(state.criteria).forEach(category => {
            category.items.forEach(item => {
                const isLinked = item.linkedFeatures.some(f =>
                    f.layerId === layerId && f.featureId === featureId
                );
                if (isLinked) {
                    linked.push(item);
                }
            });
        });
        return linked;
    }

    // Update criteria notes
    function updateCriteriaNotes(id, notes) {
        const item = getCriteriaById(id);
        if (item) {
            item.notes = notes;
            saveState();
            return true;
        }
        return false;
    }

    // Set callback
    function onCriteriaUpdate(callback) {
        state.callbacks.onCriteriaUpdate = callback;
    }

    function onFeatureLink(callback) {
        state.callbacks.onFeatureLink = callback;
    }

    // Export criteria to JSON
    function exportCriteria() {
        return JSON.stringify(state.criteria, null, 2);
    }

    // Import criteria from JSON
    function importCriteria(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            state.criteria = imported;
            saveState();
            return true;
        } catch (e) {
            console.error('Failed to import criteria:', e);
            return false;
        }
    }

    // Reset all criteria
    function resetCriteria() {
        state.criteria = JSON.parse(JSON.stringify(criteria));
        saveState();
    }

    // Get flat list of all criteria for dropdown
    function getCriteriaList() {
        const list = [];
        Object.entries(state.criteria).forEach(([categoryKey, category]) => {
            category.items.forEach(item => {
                list.push({
                    id: item.id,
                    name: item.name,
                    category: category.name,
                    categoryKey: categoryKey
                });
            });
        });
        return list;
    }

    // Initialize
    loadState();

    // Public API
    return {
        getAllCriteria,
        getCriteriaById,
        getCriteriaList,
        updateCriteriaStatus,
        linkFeatureToCriteria,
        unlinkFeatureFromCriteria,
        getCriteriaForFeature,
        updateCriteriaNotes,
        getProgress,
        onCriteriaUpdate,
        onFeatureLink,
        exportCriteria,
        importCriteria,
        resetCriteria,
        saveState
    };
})();
