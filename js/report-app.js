/**
 * ReportApp – Main application logic for the interactive sustainability report.
 * Handles charts (Chart.js), map (Leaflet/OSM), table, navigation, and cross-filtering.
 */
const ReportApp = (function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     STATE
     ══════════════════════════════════════════════════════ */
  const state = {
    selectedMunicipalities: [],   // array of municipality ids
    charts: {},                   // chartId -> Chart instance
    chartTypes: {},               // chartId -> current type string
    map: null,
    mapMarkers: {},               // id -> L.circleMarker
    sortColumn: 'name',
    sortDesc: false
  };

  /* ══════════════════════════════════════════════════════
     INIT
     ══════════════════════════════════════════════════════ */
  function init() {
    buildKPIs();
    buildModeLegend();
    buildMethodGrid();
    initNavigation();
    initMap();
    initCharts();
    renderTable();
    initTableSort();
    initChartControls();
    initRefLinks();
    initScrollToTop();
    populateTrendSelect();
    initPurposeSelect();
    initSelectionBar();
  }

  /* ══════════════════════════════════════════════════════
     KPI CARDS
     ══════════════════════════════════════════════════════ */
  function buildKPIs() {
    const grid = document.getElementById('kpiGrid');
    const regionMode = ReportData.getRegionModeShare();
    const sustainable = Math.round(regionMode.kollektivtrafik + regionMode.cykel + regionMode.gang);
    const meta = ReportData.reportMeta;

    const kpis = [
      { label: 'Kommuner', value: ReportData.municipalities.length, detail: 'i undersökningen', cls: '' },
      { label: 'Respondenter', value: meta.totalRespondents.toLocaleString('sv-SE'), detail: meta.surveyPeriod, cls: '' },
      { label: 'Hållbar resandel', value: sustainable + ' %', detail: 'kollektivtrafik + cykel + gång', cls: 'kpi-card--highlight' },
      { label: 'Bilandel', value: Math.round(regionMode.bil) + ' %', detail: 'av alla resor', cls: 'kpi-card--accent' }
    ];

    grid.innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.cls}">
        <div class="kpi-card__label">${k.label}</div>
        <div class="kpi-card__value">${k.value}</div>
        <div class="kpi-card__detail">${k.detail}</div>
      </div>
    `).join('');
  }

  /* ══════════════════════════════════════════════════════
     MODE LEGEND
     ══════════════════════════════════════════════════════ */
  function buildModeLegend() {
    const el = document.getElementById('modeLegend');
    el.innerHTML = Object.keys(ReportData.modeLabels).map(mode => `
      <span class="mode-legend__item" data-mode="${mode}">
        <span class="mode-legend__dot" style="background:${ReportData.modeColors[mode]}"></span>
        ${ReportData.modeLabels[mode]}
      </span>
    `).join('');
  }

  /* ══════════════════════════════════════════════════════
     METHOD GRID
     ══════════════════════════════════════════════════════ */
  function buildMethodGrid() {
    const el = document.getElementById('methodGrid');
    const m = ReportData.reportMeta;
    const items = [
      { label: 'Region', value: m.region },
      { label: 'Period', value: m.surveyPeriod },
      { label: 'Respondenter', value: m.totalRespondents.toLocaleString('sv-SE') },
      { label: 'Befolkning', value: m.totalPopulation.toLocaleString('sv-SE') },
      { label: 'Metod', value: m.methodology },
      { label: 'Antal kommuner', value: ReportData.municipalities.length }
    ];
    el.innerHTML = items.map(i => `
      <div class="method-card">
        <div class="method-card__label">${i.label}</div>
        <div class="method-card__value">${i.value}</div>
      </div>
    `).join('');
  }

  /* ══════════════════════════════════════════════════════
     NAVIGATION (IntersectionObserver + progress)
     ══════════════════════════════════════════════════════ */
  function initNavigation() {
    const sections = document.querySelectorAll('.report-section');
    const navLinks = document.querySelectorAll('.report-nav a');
    const progressFill = document.getElementById('progressFill');

    // Intersection observer for active section
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'));
          const link = document.querySelector(`.report-nav a[href="#${entry.target.id}"]`);
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));

    // Progress bar
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      progressFill.style.width = pct + '%';
    });

    // Mobile nav toggle
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('reportNav');
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    navLinks.forEach(l => l.addEventListener('click', () => nav.classList.remove('open')));
  }

  /* ══════════════════════════════════════════════════════
     MAP (Leaflet + OpenStreetMap)
     ══════════════════════════════════════════════════════ */
  function initMap() {
    const map = L.map('reportMap', { zoomControl: true }).setView([58.35, 15.6], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);

    state.map = map;

    // Add municipality markers
    ReportData.municipalities.forEach(m => {
      const sustainable = ReportData.getSustainableShare(m.modeShare);
      const radius = Math.sqrt(m.population / 1000) * 2.5;
      const color = sustainableColor(sustainable);

      const marker = L.circleMarker([m.lat, m.lng], {
        radius: Math.max(8, Math.min(30, radius)),
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(buildPopupContent(m));

      marker.on('click', () => {
        toggleMunicipalitySelection(m.id);
      });

      marker.on('mouseover', function () {
        this.setStyle({ weight: 3, fillOpacity: 1 });
        this.openPopup();
      });

      marker.on('mouseout', function () {
        if (!state.selectedMunicipalities.includes(m.id)) {
          this.setStyle({ weight: 2, fillOpacity: 0.8 });
        }
        this.closePopup();
      });

      state.mapMarkers[m.id] = marker;
    });

    // Fit bounds with padding
    const group = L.featureGroup(Object.values(state.mapMarkers));
    map.fitBounds(group.getBounds().pad(0.15));

    // Fix Leaflet sizing issue
    setTimeout(() => map.invalidateSize(), 300);
  }

  function sustainableColor(pct) {
    // Gradient: red (low) -> yellow -> green (high)
    if (pct >= 40) return '#2a9d8f';
    if (pct >= 30) return '#8ab17d';
    if (pct >= 25) return '#e9c46a';
    if (pct >= 20) return '#f4a261';
    return '#e76f51';
  }

  function buildPopupContent(m) {
    const sustainable = ReportData.getSustainableShare(m.modeShare);
    const modes = Object.keys(ReportData.modeLabels);
    let rows = modes.map(mode => `
      <div class="map-popup-stat">
        <span><span class="mode-dot" style="background:${ReportData.modeColors[mode]}"></span>${ReportData.modeLabels[mode]}</span>
        <span><strong>${m.modeShare[mode]} %</strong></span>
      </div>
    `).join('');

    return `
      <div class="map-popup-title">${m.name}</div>
      <div class="map-popup-stat"><span>Befolkning</span><span><strong>${m.population.toLocaleString('sv-SE')}</strong></span></div>
      <div class="map-popup-stat"><span>Hållbart</span><span><strong>${sustainable} %</strong></span></div>
      <hr style="margin:6px 0;border:none;border-top:1px solid #eee;">
      ${rows}
    `;
  }

  /* ══════════════════════════════════════════════════════
     CHARTS
     ══════════════════════════════════════════════════════ */

  // Chart.js defaults
  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  Chart.defaults.font.size = 13;
  Chart.defaults.color = '#5a6c7e';
  Chart.defaults.plugins.legend.position = 'bottom';
  Chart.defaults.animation.duration = 600;

  function initCharts() {
    createModeRegionChart('doughnut');
    createModeKommunChart('bar');
    createPurposeChart('bar');
    createPurposeKommunChart('bar');
    createDistanceChart('bar');
    createDistDistributionChart('bar');
    createAgeChart('bar-stacked');
    createTrendRegionChart('line');
    createTrendKommunChart('line');
    createSustainRankChart('bar-horiz');
  }

  /* ── Mode share region ──────────────────────────── */
  function createModeRegionChart(type) {
    destroyChart('modeRegion');
    const regionMode = ReportData.getRegionModeShare();
    const modes = Object.keys(ReportData.modeLabels);
    const data = {
      labels: modes.map(m => ReportData.modeLabels[m]),
      datasets: [{
        data: modes.map(m => regionMode[m]),
        backgroundColor: modes.map(m => ReportData.modeColors[m]),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
    const chartType = (type === 'polarArea') ? 'polarArea' : (type === 'bar' ? 'bar' : 'doughnut');
    state.charts.modeRegion = new Chart(document.getElementById('chartModeRegion'), {
      type: chartType,
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: chartType !== 'bar' },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed || ctx.parsed.y || ctx.raw} %` }
          }
        },
        scales: chartType === 'bar' ? {
          y: { beginAtZero: true, max: 70, title: { display: true, text: '% av resor' } }
        } : {}
      }
    });
    state.chartTypes.modeRegion = type;
  }

  /* ── Mode share per kommun ──────────────────────── */
  function createModeKommunChart(type) {
    destroyChart('modeKommun');
    const muns = getDisplayMunicipalities();
    const modes = Object.keys(ReportData.modeLabels);
    const isRadar = (type === 'radar');
    const isHoriz = (type === 'bar-horiz');

    const datasets = modes.map(mode => ({
      label: ReportData.modeLabels[mode],
      data: muns.map(m => m.modeShare[mode]),
      backgroundColor: ReportData.modeColors[mode] + (isRadar ? '44' : 'cc'),
      borderColor: ReportData.modeColors[mode],
      borderWidth: isRadar ? 2 : 1
    }));

    const chartType = isRadar ? 'radar' : 'bar';
    state.charts.modeKommun = new Chart(document.getElementById('chartModeKommun'), {
      type: chartType,
      data: {
        labels: muns.map(m => m.name),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: isHoriz ? 'y' : 'x',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} %` } }
        },
        scales: isRadar ? {} : {
          x: { stacked: false },
          y: { beginAtZero: true, stacked: false }
        }
      }
    });
    state.chartTypes.modeKommun = type;
  }

  /* ── Purpose chart ──────────────────────────────── */
  function createPurposeChart(type) {
    destroyChart('purpose');
    const selected = state.selectedMunicipalities;
    const purposes = Object.keys(ReportData.purposeLabels);

    let datasets;
    if (selected.length === 0) {
      const regionPurpose = ReportData.getRegionPurpose();
      datasets = [{
        label: 'Region Östergötland',
        data: purposes.map(p => regionPurpose[p]),
        backgroundColor: purposes.map(p => ReportData.purposeColors[p]),
        borderWidth: 1,
        borderColor: '#fff'
      }];
    } else {
      datasets = selected.map(id => {
        const m = ReportData.getMunicipality(id);
        return {
          label: m.name,
          data: purposes.map(p => m.tripPurpose[p]),
          backgroundColor: purposes.map(p => ReportData.purposeColors[p]),
          borderWidth: 1,
          borderColor: '#fff'
        };
      });
    }

    const isDoughnut = (type === 'doughnut');
    const isRadar = (type === 'radar');
    const chartType = isDoughnut ? 'doughnut' : (isRadar ? 'radar' : 'bar');

    state.charts.purpose = new Chart(document.getElementById('chartPurpose'), {
      type: chartType,
      data: {
        labels: purposes.map(p => ReportData.purposeLabels[p]),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: isDoughnut || isRadar || datasets.length > 1 },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label || ctx.dataset.label}: ${ctx.raw} %` } }
        },
        scales: (isDoughnut || isRadar) ? {} : {
          y: { beginAtZero: true, title: { display: true, text: '% av resor' } }
        }
      }
    });
    state.chartTypes.purpose = type;
  }

  /* ── Purpose per kommun ─────────────────────────── */
  function createPurposeKommunChart(type) {
    destroyChart('purposeKommun');
    const purposeKey = document.getElementById('purposeSelect').value;
    const muns = getDisplayMunicipalities();
    const isHoriz = (type === 'bar-horiz');

    const sorted = [...muns].sort((a, b) => b.tripPurpose[purposeKey] - a.tripPurpose[purposeKey]);

    state.charts.purposeKommun = new Chart(document.getElementById('chartPurposeKommun'), {
      type: 'bar',
      data: {
        labels: sorted.map(m => m.name),
        datasets: [{
          label: ReportData.purposeLabels[purposeKey],
          data: sorted.map(m => m.tripPurpose[purposeKey]),
          backgroundColor: ReportData.purposeColors[purposeKey] + 'cc',
          borderColor: ReportData.purposeColors[purposeKey],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: isHoriz ? 'y' : 'x',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw} %` } }
        },
        scales: {
          x: { beginAtZero: true },
          y: { beginAtZero: true }
        }
      }
    });
    state.chartTypes.purposeKommun = type;
  }

  /* ── Distance mode chart ────────────────────────── */
  function createDistanceChart(type) {
    destroyChart('distance');
    const data = ReportData.modeByDistance;
    const modes = ['bil', 'kollektivtrafik', 'cykel', 'gang', 'ovrigt'];
    const isStacked = (type === 'bar-stacked');
    const isLine = (type === 'line');

    const datasets = modes.map(mode => ({
      label: ReportData.modeLabels[mode],
      data: data.map(d => d[mode]),
      backgroundColor: isLine ? 'transparent' : ReportData.modeColors[mode] + 'cc',
      borderColor: ReportData.modeColors[mode],
      borderWidth: isLine ? 3 : 1,
      fill: isLine ? false : true,
      tension: 0.3,
      pointRadius: isLine ? 4 : 0
    }));

    state.charts.distance = new Chart(document.getElementById('chartDistance'), {
      type: isLine ? 'line' : 'bar',
      data: {
        labels: data.map(d => d.range),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} %` } }
        },
        scales: {
          x: { stacked: isStacked },
          y: { beginAtZero: true, stacked: isStacked, max: isStacked ? 100 : undefined, title: { display: true, text: '% av resor' } }
        }
      }
    });
    state.chartTypes.distance = type;
  }

  /* ── Distance distribution ──────────────────────── */
  function createDistDistributionChart(type) {
    destroyChart('distDistribution');
    const data = ReportData.distanceDistribution;
    const isDoughnut = (type === 'doughnut');
    const colors = data.map(d => ReportData.modeColors[d.dominantMode]);

    state.charts.distDistribution = new Chart(document.getElementById('chartDistDistribution'), {
      type: isDoughnut ? 'doughnut' : 'bar',
      data: {
        labels: data.map(d => d.range),
        datasets: [{
          label: 'Andel resor',
          data: data.map(d => d.pct),
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: isDoughnut ? '#fff' : colors,
          borderWidth: isDoughnut ? 2 : 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: isDoughnut },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} %` } }
        },
        scales: isDoughnut ? {} : {
          y: { beginAtZero: true, title: { display: true, text: '% av resor' } }
        }
      }
    });
    state.chartTypes.distDistribution = type;
  }

  /* ── Age chart ──────────────────────────────────── */
  function createAgeChart(type) {
    destroyChart('age');
    const data = ReportData.modeByAge;
    const modes = ['bil', 'kollektivtrafik', 'cykel', 'gang', 'ovrigt'];
    const isStacked = (type === 'bar-stacked');
    const isLine = (type === 'line');

    const datasets = modes.map(mode => ({
      label: ReportData.modeLabels[mode],
      data: data.map(d => d[mode]),
      backgroundColor: isLine ? 'transparent' : ReportData.modeColors[mode] + 'cc',
      borderColor: ReportData.modeColors[mode],
      borderWidth: isLine ? 3 : 1,
      fill: false,
      tension: 0.3,
      pointRadius: isLine ? 4 : 0
    }));

    state.charts.age = new Chart(document.getElementById('chartAge'), {
      type: isLine ? 'line' : 'bar',
      data: {
        labels: data.map(d => d.range + ' år'),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} %` } }
        },
        scales: {
          x: { stacked: isStacked },
          y: { beginAtZero: true, stacked: isStacked, max: isStacked ? 100 : undefined, title: { display: true, text: '% av resor' } }
        }
      }
    });
    state.chartTypes.age = type;
  }

  /* ── Trend region chart ─────────────────────────── */
  function createTrendRegionChart(type) {
    destroyChart('trendRegion');
    const data = ReportData.regionTrend;
    const isBar = (type === 'bar');

    state.charts.trendRegion = new Chart(document.getElementById('chartTrendRegion'), {
      type: isBar ? 'bar' : 'line',
      data: {
        labels: data.map(d => d.year),
        datasets: [
          {
            label: 'Hållbart (%)',
            data: data.map(d => d.hallbart),
            backgroundColor: '#2a9d8fcc',
            borderColor: '#2a9d8f',
            borderWidth: isBar ? 1 : 3,
            tension: 0.3,
            pointRadius: isBar ? 0 : 5,
            pointBackgroundColor: '#2a9d8f',
            fill: !isBar,
            ...(isBar ? {} : { backgroundColor: 'rgba(42,157,143,0.1)' })
          },
          {
            label: 'Bil (%)',
            data: data.map(d => d.bil),
            backgroundColor: '#e76f51cc',
            borderColor: '#e76f51',
            borderWidth: isBar ? 1 : 3,
            tension: 0.3,
            pointRadius: isBar ? 0 : 5,
            pointBackgroundColor: '#e76f51',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} %` } }
        },
        scales: {
          y: { beginAtZero: false, min: 20, max: 75, title: { display: true, text: '%' } }
        }
      }
    });
    state.chartTypes.trendRegion = type;
  }

  /* ── Trend kommun chart ─────────────────────────── */
  function createTrendKommunChart(type) {
    destroyChart('trendKommun');
    const select = document.getElementById('trendKommunSelect');
    const selectedIds = Array.from(select.selectedOptions).map(o => o.value);
    const years = ReportData.getYears();

    const hueStep = 360 / Math.max(selectedIds.length, 1);
    const datasets = selectedIds.map((id, i) => {
      const m = ReportData.getMunicipality(id);
      if (!m) return null;
      const hue = (i * hueStep + 160) % 360;
      const color = `hsl(${hue}, 60%, 45%)`;
      return {
        label: m.name,
        data: years.map(y => m.trend[y]),
        borderColor: color,
        backgroundColor: type === 'bar' ? color + 'cc' : 'transparent',
        borderWidth: type === 'bar' ? 1 : 3,
        tension: 0.3,
        pointRadius: type === 'bar' ? 0 : 5,
        pointBackgroundColor: color,
        fill: false
      };
    }).filter(Boolean);

    if (datasets.length === 0) {
      // Show all
      const top5 = ReportData.getMunicipalitiesSorted('sustainableShare', true).slice(0, 5);
      top5.forEach((m, i) => {
        const hue = (i * 72 + 160) % 360;
        const color = `hsl(${hue}, 60%, 45%)`;
        datasets.push({
          label: m.name,
          data: years.map(y => m.trend[y]),
          borderColor: color,
          backgroundColor: type === 'bar' ? color + 'cc' : 'transparent',
          borderWidth: type === 'bar' ? 1 : 3,
          tension: 0.3,
          pointRadius: type === 'bar' ? 0 : 5,
          pointBackgroundColor: color,
          fill: false
        });
      });
    }

    state.charts.trendKommun = new Chart(document.getElementById('chartTrendKommun'), {
      type: type === 'bar' ? 'bar' : 'line',
      data: { labels: years, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} %` } }
        },
        scales: {
          y: { beginAtZero: false, min: 10, max: 55, title: { display: true, text: 'Hållbar andel (%)' } }
        }
      }
    });
    state.chartTypes.trendKommun = type;
  }

  /* ── Sustainability ranking ─────────────────────── */
  function createSustainRankChart(type) {
    destroyChart('sustainRank');
    const sorted = ReportData.getMunicipalitiesSorted('sustainableShare', true);
    const isHoriz = (type === 'bar-horiz');

    const sustainable = sorted.map(m => ReportData.getSustainableShare(m.modeShare));
    const colors = sustainable.map(v => sustainableColor(v) + 'cc');

    state.charts.sustainRank = new Chart(document.getElementById('chartSustainRank'), {
      type: 'bar',
      data: {
        labels: sorted.map(m => m.name),
        datasets: [{
          label: 'Hållbar andel (%)',
          data: sustainable,
          backgroundColor: colors,
          borderColor: sustainable.map(v => sustainableColor(v)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: isHoriz ? 'y' : 'x',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw} %` } }
        },
        scales: {
          x: { beginAtZero: true },
          y: { beginAtZero: true }
        }
      }
    });
    state.chartTypes.sustainRank = type;
  }

  /* ── Chart utilities ────────────────────────────── */
  function destroyChart(id) {
    if (state.charts[id]) {
      state.charts[id].destroy();
      state.charts[id] = null;
    }
  }

  function getDisplayMunicipalities() {
    if (state.selectedMunicipalities.length > 0) {
      return state.selectedMunicipalities.map(id => ReportData.getMunicipality(id)).filter(Boolean);
    }
    return ReportData.municipalities;
  }

  /* ══════════════════════════════════════════════════════
     CHART TYPE SWITCHING
     ══════════════════════════════════════════════════════ */
  function initChartControls() {
    document.querySelectorAll('.chart-controls').forEach(group => {
      const chartId = group.dataset.chart;
      group.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          switchChartType(chartId, btn.dataset.type);
        });
      });
    });
  }

  function switchChartType(chartId, type) {
    const creators = {
      modeRegion: createModeRegionChart,
      modeKommun: createModeKommunChart,
      purpose: createPurposeChart,
      purposeKommun: createPurposeKommunChart,
      distance: createDistanceChart,
      distDistribution: createDistDistributionChart,
      age: createAgeChart,
      trendRegion: createTrendRegionChart,
      trendKommun: createTrendKommunChart,
      sustainRank: createSustainRankChart
    };
    if (creators[chartId]) creators[chartId](type);
  }

  /* ══════════════════════════════════════════════════════
     TABLE
     ══════════════════════════════════════════════════════ */
  function renderTable() {
    const tbody = document.getElementById('municipalityTableBody');
    const muns = getSortedMunicipalities();
    tbody.innerHTML = muns.map(m => {
      const sustainable = ReportData.getSustainableShare(m.modeShare);
      const isSelected = state.selectedMunicipalities.includes(m.id);
      return `
        <tr data-id="${m.id}" class="${isSelected ? 'selected' : ''}">
          <td><strong>${m.name}</strong></td>
          <td>${m.population.toLocaleString('sv-SE')}</td>
          <td class="bar-cell">
            <span class="bar-cell__bg" style="width:${m.modeShare.bil}%;background:${ReportData.modeColors.bil}"></span>
            <span class="bar-cell__value">${m.modeShare.bil}</span>
          </td>
          <td class="bar-cell">
            <span class="bar-cell__bg" style="width:${m.modeShare.kollektivtrafik * 5}%;background:${ReportData.modeColors.kollektivtrafik}"></span>
            <span class="bar-cell__value">${m.modeShare.kollektivtrafik}</span>
          </td>
          <td class="bar-cell">
            <span class="bar-cell__bg" style="width:${m.modeShare.cykel * 4}%;background:${ReportData.modeColors.cykel}"></span>
            <span class="bar-cell__value">${m.modeShare.cykel}</span>
          </td>
          <td class="bar-cell">
            <span class="bar-cell__bg" style="width:${m.modeShare.gang * 4}%;background:${ReportData.modeColors.gang}"></span>
            <span class="bar-cell__value">${m.modeShare.gang}</span>
          </td>
          <td class="bar-cell">
            <span class="bar-cell__bg" style="width:${sustainable * 1.8}%;background:${sustainableColor(sustainable)}"></span>
            <span class="bar-cell__value" style="font-weight:700;color:${sustainableColor(sustainable)}">${sustainable}</span>
          </td>
        </tr>
      `;
    }).join('');

    // Row click handler
    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        toggleMunicipalitySelection(row.dataset.id);
      });
    });
  }

  function getSortedMunicipalities() {
    const col = state.sortColumn;
    const desc = state.sortDesc;
    const muns = [...ReportData.municipalities];
    muns.sort((a, b) => {
      let va, vb;
      if (col === 'name') { va = a.name; vb = b.name; return desc ? vb.localeCompare(va, 'sv') : va.localeCompare(vb, 'sv'); }
      if (col === 'population') { va = a.population; vb = b.population; }
      else if (col === 'sustainableShare') { va = ReportData.getSustainableShare(a.modeShare); vb = ReportData.getSustainableShare(b.modeShare); }
      else if (col.startsWith('mode.')) {
        const mode = col.split('.')[1];
        va = a.modeShare[mode] || 0;
        vb = b.modeShare[mode] || 0;
      } else { va = 0; vb = 0; }
      return desc ? vb - va : va - vb;
    });
    return muns;
  }

  function initTableSort() {
    document.querySelectorAll('#municipalityTable thead th').forEach(th => {
      th.addEventListener('click', () => {
        const sortKey = th.dataset.sort;
        if (!sortKey) return;
        if (state.sortColumn === sortKey) {
          state.sortDesc = !state.sortDesc;
        } else {
          state.sortColumn = sortKey;
          state.sortDesc = (sortKey !== 'name');
        }
        // Update sort indicators
        document.querySelectorAll('#municipalityTable thead th').forEach(h => h.classList.remove('sorted'));
        th.classList.add('sorted');
        th.querySelector('.sort-icon i').className = state.sortDesc ? 'fas fa-sort-down' : 'fas fa-sort-up';
        renderTable();
      });
    });
  }

  /* ══════════════════════════════════════════════════════
     CROSS-FILTERING / SELECTION
     ══════════════════════════════════════════════════════ */
  function toggleMunicipalitySelection(id) {
    const idx = state.selectedMunicipalities.indexOf(id);
    if (idx >= 0) {
      state.selectedMunicipalities.splice(idx, 1);
    } else {
      state.selectedMunicipalities.push(id);
    }
    updateAllVisualizations();
  }

  function clearSelection() {
    state.selectedMunicipalities = [];
    updateAllVisualizations();
  }

  function updateAllVisualizations() {
    updateMapMarkers();
    renderTable();
    updateSelectionBar();
    // Recreate charts that depend on selection
    createModeKommunChart(state.chartTypes.modeKommun || 'bar');
    createPurposeChart(state.chartTypes.purpose || 'bar');
    createPurposeKommunChart(state.chartTypes.purposeKommun || 'bar');
  }

  function updateMapMarkers() {
    const hasSelection = state.selectedMunicipalities.length > 0;
    ReportData.municipalities.forEach(m => {
      const marker = state.mapMarkers[m.id];
      if (!marker) return;
      const isSelected = state.selectedMunicipalities.includes(m.id);
      if (hasSelection) {
        marker.setStyle({
          fillOpacity: isSelected ? 0.95 : 0.25,
          weight: isSelected ? 4 : 1,
          color: isSelected ? '#1e3a5f' : '#ccc'
        });
      } else {
        marker.setStyle({
          fillOpacity: 0.8,
          weight: 2,
          color: '#fff'
        });
      }
    });
  }

  function updateSelectionBar() {
    const el = document.getElementById('activeSelection');
    if (state.selectedMunicipalities.length === 0) {
      el.innerHTML = '<span class="selection-badge" style="opacity:0.5;">Alla kommuner</span>';
      return;
    }
    el.innerHTML = state.selectedMunicipalities.map(id => {
      const m = ReportData.getMunicipality(id);
      return `<span class="selection-badge">${m.name}
        <span class="selection-badge__remove" data-id="${id}"><i class="fas fa-xmark"></i></span>
      </span>`;
    }).join('');
    el.querySelectorAll('.selection-badge__remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleMunicipalitySelection(btn.dataset.id);
      });
    });
  }

  function initSelectionBar() {
    document.getElementById('btnClearSelection').addEventListener('click', clearSelection);
  }

  /* ══════════════════════════════════════════════════════
     REFERENCE LINKS (text -> viz)
     ══════════════════════════════════════════════════════ */
  function initRefLinks() {
    document.querySelectorAll('.ref-link').forEach(link => {
      link.addEventListener('click', () => {
        const targetId = link.dataset.target;
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('highlighted');
          setTimeout(() => target.classList.remove('highlighted'), 2500);
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════
     SCROLL TO TOP
     ══════════════════════════════════════════════════════ */
  function initScrollToTop() {
    const btn = document.getElementById('scrollToTop');
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ══════════════════════════════════════════════════════
     TREND KOMMUN SELECT
     ══════════════════════════════════════════════════════ */
  function populateTrendSelect() {
    const select = document.getElementById('trendKommunSelect');
    const sorted = ReportData.getMunicipalitiesSorted('sustainableShare', true);
    select.innerHTML = sorted.map(m => {
      const selected = ['linkoping', 'norrkoping', 'motala'].includes(m.id) ? ' selected' : '';
      return `<option value="${m.id}"${selected}>${m.name}</option>`;
    }).join('');
    select.addEventListener('change', () => {
      createTrendKommunChart(state.chartTypes.trendKommun || 'line');
    });
  }

  /* ══════════════════════════════════════════════════════
     PURPOSE SELECT
     ══════════════════════════════════════════════════════ */
  function initPurposeSelect() {
    document.getElementById('purposeSelect').addEventListener('change', () => {
      createPurposeKommunChart(state.chartTypes.purposeKommun || 'bar');
    });
  }

  /* ══════════════════════════════════════════════════════
     STARTUP
     ══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', init);

  return { state, clearSelection, toggleMunicipalitySelection };
})();
