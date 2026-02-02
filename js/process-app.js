/**
 * Process App Module
 * Coordinates views, detail panel, modals and user interactions.
 */
(() => {
    // State
    let currentView = 'flow';

    // Elements
    const viewFlow = document.getElementById('view-flow');
    const viewData = document.getElementById('view-data');
    const detailPanel = document.getElementById('detail-panel');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    function init() {
        ProcessData.load();

        ProcessRenderer.init(document.getElementById('flow-canvas'), {
            onNodeClick: openProcessDetail,
            onNodeDoubleClick: openProcessDetail
        });

        // Navigation
        document.querySelectorAll('.btn-nav').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });

        // Toolbar
        document.getElementById('btn-zoom-in').addEventListener('click', ProcessRenderer.zoomIn);
        document.getElementById('btn-zoom-out').addEventListener('click', ProcessRenderer.zoomOut);
        document.getElementById('btn-zoom-fit').addEventListener('click', ProcessRenderer.zoomFit);
        document.getElementById('btn-add-process').addEventListener('click', showAddProcessModal);
        document.getElementById('btn-add-dataset').addEventListener('click', showAddDatasetModal);

        // Detail panel
        document.getElementById('btn-close-detail').addEventListener('click', closeDetail);

        // Modal
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

        // Data view
        document.getElementById('data-search').addEventListener('input', renderDataList);
        document.getElementById('data-sort').addEventListener('change', renderDataList);
        document.getElementById('data-filter-type').addEventListener('change', renderDataList);

        // Keyboard
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeDetail();
                closeModal();
            }
        });

        // Initial render
        setTimeout(() => ProcessRenderer.zoomFit(), 100);
    }

    function switchView(view) {
        currentView = view;
        document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        viewFlow.classList.toggle('active', view === 'flow');
        viewData.classList.toggle('active', view === 'data');

        if (view === 'flow') {
            ProcessRenderer.resize();
        } else {
            renderDataList();
        }
        closeDetail();
    }

    // === Detail Panel ===

    function openProcessDetail(type, id) {
        if (type !== 'process') return;
        const p = ProcessData.getProcess(id);
        if (!p) return;

        ProcessRenderer.setSelected(id);
        detailTitle.textContent = p.name;

        const inputs = ProcessData.getProcessInputs(id);
        const outputs = ProcessData.getProcessOutputs(id);

        detailContent.innerHTML = `
            <div class="detail-section">
                <h3>Beskrivning</h3>
                <div class="detail-field">
                    <textarea id="edit-desc" rows="3">${escHtml(p.description || '')}</textarea>
                </div>
            </div>
            <div class="detail-section">
                <h3>Ansvarig enhet</h3>
                <div class="detail-field">
                    <input type="text" id="edit-responsible" value="${escHtml(p.responsible || '')}" />
                </div>
            </div>
            <div class="detail-section">
                <h3><i class="fas fa-sign-in-alt" style="color:var(--primary)"></i> Indata (${inputs.length})</h3>
                ${inputs.map(d => `
                    <div class="detail-list-item" data-dataset="${d.id}">
                        <i class="fas fa-file-alt"></i>
                        <span>${escHtml(d.name)}</span>
                        <span class="tag source">${escHtml(d.source)}</span>
                    </div>
                `).join('')}
                <button class="btn btn-sm" style="margin-top:6px" id="btn-add-input">
                    <i class="fas fa-plus"></i> Lägg till indata
                </button>
            </div>
            <div class="detail-section">
                <h3><i class="fas fa-sign-out-alt" style="color:var(--accent)"></i> Utdata (${outputs.length})</h3>
                ${outputs.map(d => `
                    <div class="detail-list-item" data-dataset="${d.id}">
                        <i class="fas fa-file-export"></i>
                        <span>${escHtml(d.name)}</span>
                        <span class="tag">${escHtml(d.format || '')}</span>
                    </div>
                `).join('')}
                <button class="btn btn-sm" style="margin-top:6px" id="btn-add-output">
                    <i class="fas fa-plus"></i> Lägg till utdata
                </button>
            </div>
            <div class="detail-actions">
                <button class="btn btn-primary" id="btn-save-process"><i class="fas fa-save"></i> Spara</button>
                <button class="btn btn-danger" id="btn-delete-process"><i class="fas fa-trash"></i> Ta bort</button>
            </div>
        `;

        // Bind events
        detailContent.getElementById_safe = (sel) => detailContent.querySelector('#' + sel);

        detailContent.querySelector('#btn-save-process').addEventListener('click', () => {
            ProcessData.updateProcess(id, {
                description: detailContent.querySelector('#edit-desc').value,
                responsible: detailContent.querySelector('#edit-responsible').value
            });
            ProcessRenderer.render();
            openProcessDetail('process', id); // refresh
        });

        detailContent.querySelector('#btn-delete-process').addEventListener('click', () => {
            if (confirm('Ta bort processen "' + p.name + '"?')) {
                ProcessData.deleteProcess(id);
                closeDetail();
                ProcessRenderer.setSelected(null);
                ProcessRenderer.render();
            }
        });

        detailContent.querySelector('#btn-add-input').addEventListener('click', () => {
            showLinkDatasetModal(id, 'in');
        });

        detailContent.querySelector('#btn-add-output').addEventListener('click', () => {
            showLinkDatasetModal(id, 'out');
        });

        // Click on dataset items to show dataset detail
        detailContent.querySelectorAll('[data-dataset]').forEach(el => {
            el.addEventListener('click', () => {
                openDatasetDetail(el.dataset.dataset);
            });
        });

        detailPanel.classList.add('open');
    }

    function openDatasetDetail(id) {
        const d = ProcessData.getDataset(id);
        if (!d) return;

        ProcessRenderer.setSelected(null);
        detailTitle.textContent = d.name;

        const usages = ProcessData.getDatasetProcesses(id);

        detailContent.innerHTML = `
            <div class="detail-section">
                <h3>Information</h3>
                <div class="detail-field">
                    <label>Namn</label>
                    <input type="text" id="edit-ds-name" value="${escHtml(d.name)}" />
                </div>
                <div class="detail-field">
                    <label>Beskrivning</label>
                    <textarea id="edit-ds-desc" rows="3">${escHtml(d.description || '')}</textarea>
                </div>
                <div class="detail-field">
                    <label>Källa</label>
                    <input type="text" id="edit-ds-source" value="${escHtml(d.source || '')}" />
                </div>
                <div class="detail-field">
                    <label>Format</label>
                    <input type="text" id="edit-ds-format" value="${escHtml(d.format || '')}" />
                </div>
            </div>
            <div class="detail-section">
                <h3>Används i processer</h3>
                ${usages.map(u => `
                    <div class="detail-list-item" data-process="${u.process.id}">
                        <i class="fas fa-${u.direction === 'in' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
                        <span>${escHtml(u.process.name)}</span>
                        <span class="tag">${u.direction === 'in' ? 'Indata' : 'Utdata'}</span>
                    </div>
                `).join('')}
            </div>
            <div class="detail-actions">
                <button class="btn btn-primary" id="btn-save-dataset"><i class="fas fa-save"></i> Spara</button>
                <button class="btn btn-danger" id="btn-delete-dataset"><i class="fas fa-trash"></i> Ta bort</button>
            </div>
        `;

        detailContent.querySelector('#btn-save-dataset').addEventListener('click', () => {
            ProcessData.updateDataset(id, {
                name: detailContent.querySelector('#edit-ds-name').value,
                description: detailContent.querySelector('#edit-ds-desc').value,
                source: detailContent.querySelector('#edit-ds-source').value,
                format: detailContent.querySelector('#edit-ds-format').value
            });
            ProcessRenderer.render();
            openDatasetDetail(id);
        });

        detailContent.querySelector('#btn-delete-dataset').addEventListener('click', () => {
            if (confirm('Ta bort informationsmängden "' + d.name + '"?')) {
                ProcessData.deleteDataset(id);
                closeDetail();
                ProcessRenderer.render();
            }
        });

        detailContent.querySelectorAll('[data-process]').forEach(el => {
            el.addEventListener('click', () => {
                openProcessDetail('process', el.dataset.process);
            });
        });

        detailPanel.classList.add('open');
    }

    function closeDetail() {
        detailPanel.classList.remove('open');
        ProcessRenderer.setSelected(null);
        ProcessRenderer.render();
    }

    // === Data List View ===

    function renderDataList() {
        const search = document.getElementById('data-search').value.toLowerCase();
        const sort = document.getElementById('data-sort').value;
        const filterType = document.getElementById('data-filter-type').value;

        let datasets = ProcessData.getDatasets().map(d => ({
            ...d,
            usageType: ProcessData.getDatasetUsageType(d.id),
            processes: ProcessData.getDatasetProcesses(d.id)
        }));

        // Filter
        if (search) {
            datasets = datasets.filter(d =>
                d.name.toLowerCase().includes(search) ||
                d.source.toLowerCase().includes(search) ||
                d.description.toLowerCase().includes(search)
            );
        }
        if (filterType) {
            datasets = datasets.filter(d => {
                if (filterType === 'input') return d.usageType === 'input' || d.usageType === 'both';
                if (filterType === 'output') return d.usageType === 'output' || d.usageType === 'both';
                if (filterType === 'both') return d.usageType === 'both';
                return true;
            });
        }

        // Sort
        datasets.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name, 'sv');
            if (sort === 'type') return a.usageType.localeCompare(b.usageType);
            if (sort === 'source') return (a.source || '').localeCompare(b.source || '', 'sv');
            return 0;
        });

        const list = document.getElementById('data-list');
        list.innerHTML = datasets.map(d => {
            const typeLabel = { input: 'Indata', output: 'Utdata', both: 'In & Ut' }[d.usageType] || 'Indata';
            const iconClass = d.usageType;
            return `
                <div class="data-card" data-id="${d.id}">
                    <div class="data-card-icon ${iconClass}">
                        <i class="fas fa-${d.usageType === 'output' ? 'file-export' : d.usageType === 'both' ? 'exchange-alt' : 'file-import'}"></i>
                    </div>
                    <div class="data-card-body">
                        <h4>${escHtml(d.name)}</h4>
                        <p>${escHtml(d.description || '')}</p>
                        <div class="data-card-tags">
                            <span class="tag">${typeLabel}</span>
                            <span class="tag source">${escHtml(d.source || '')}</span>
                            <span class="tag">${escHtml(d.format || '')}</span>
                            ${d.processes.map(u =>
                                `<span class="tag process">${escHtml(u.process.name)} (${u.direction === 'in' ? 'in' : 'ut'})</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.data-card').forEach(card => {
            card.addEventListener('click', () => {
                openDatasetDetail(card.dataset.id);
            });
        });
    }

    // === Modals ===

    function showAddProcessModal() {
        modalTitle.textContent = 'Ny process';
        modalBody.innerHTML = `
            <div class="detail-field">
                <label>Namn</label>
                <input type="text" id="new-proc-name" placeholder="Processnamn" />
            </div>
            <div class="detail-field">
                <label>Beskrivning</label>
                <textarea id="new-proc-desc" rows="3" placeholder="Beskriv processen..."></textarea>
            </div>
            <div class="detail-field">
                <label>Ansvarig enhet</label>
                <input type="text" id="new-proc-responsible" placeholder="T.ex. Stadsbyggnadskontoret" />
            </div>
        `;
        openModal(() => {
            const name = document.getElementById('new-proc-name').value.trim();
            if (!name) return;
            ProcessData.addProcess({
                name,
                description: document.getElementById('new-proc-desc').value,
                responsible: document.getElementById('new-proc-responsible').value,
                x: 300 + Math.random() * 200,
                y: 200 + Math.random() * 200,
                color: '#4a6fa5'
            });
            ProcessRenderer.render();
            closeModal();
        });
    }

    function showAddDatasetModal() {
        modalTitle.textContent = 'Ny informationsmängd';
        modalBody.innerHTML = `
            <div class="detail-field">
                <label>Namn</label>
                <input type="text" id="new-ds-name" placeholder="Namn på informationsmängd" />
            </div>
            <div class="detail-field">
                <label>Beskrivning</label>
                <textarea id="new-ds-desc" rows="3" placeholder="Beskriv informationsmängden..."></textarea>
            </div>
            <div class="detail-field">
                <label>Källa</label>
                <input type="text" id="new-ds-source" placeholder="Var kommer datan ifrån?" />
            </div>
            <div class="detail-field">
                <label>Format</label>
                <input type="text" id="new-ds-format" placeholder="T.ex. GeoPackage, PDF, IFC" />
            </div>
        `;
        openModal(() => {
            const name = document.getElementById('new-ds-name').value.trim();
            if (!name) return;
            ProcessData.addDataset({
                name,
                description: document.getElementById('new-ds-desc').value,
                source: document.getElementById('new-ds-source').value,
                format: document.getElementById('new-ds-format').value,
                type: 'input'
            });
            if (currentView === 'data') renderDataList();
            closeModal();
        });
    }

    function showLinkDatasetModal(processId, direction) {
        const existing = direction === 'in'
            ? ProcessData.getProcessInputs(processId).map(d => d.id)
            : ProcessData.getProcessOutputs(processId).map(d => d.id);

        const available = ProcessData.getDatasets().filter(d => !existing.includes(d.id));

        modalTitle.textContent = direction === 'in' ? 'Lägg till indata' : 'Lägg till utdata';
        modalBody.innerHTML = available.length === 0
            ? '<p>Inga tillgängliga informationsmängder. Skapa en ny först.</p>'
            : available.map(d => `
                <label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:6px;" class="detail-list-item">
                    <input type="checkbox" value="${d.id}" />
                    <span>${escHtml(d.name)}</span>
                    <span class="tag source">${escHtml(d.source)}</span>
                </label>
            `).join('');

        openModal(() => {
            modalBody.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
                ProcessData.addConnection(cb.value, processId, direction);
            });
            ProcessRenderer.render();
            openProcessDetail('process', processId);
            closeModal();
        });
    }

    function openModal(onSave) {
        modalOverlay.classList.add('open');
        const saveBtn = document.getElementById('btn-modal-save');
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener('click', onSave);
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
    }

    // === Helpers ===

    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Boot
    document.addEventListener('DOMContentLoaded', init);
})();
