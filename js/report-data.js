/**
 * ReportData - Data module for the interactive sustainability report.
 * Contains sample data inspired by Resvaneundersökning Östergötland 2023.
 * Designed as a reusable template - swap data for different topics.
 */
const ReportData = (function () {

  /* ── Colour palettes ─────────────────────────────────── */
  const modeColors = {
    bil: '#e76f51',
    kollektivtrafik: '#457b9d',
    cykel: '#2a9d8f',
    gang: '#e9c46a',
    ovrigt: '#adb5bd'
  };

  const modeLabels = {
    bil: 'Bil',
    kollektivtrafik: 'Kollektivtrafik',
    cykel: 'Cykel',
    gang: 'Gång',
    ovrigt: 'Övrigt'
  };

  const purposeColors = {
    arbete: '#264653',
    utbildning: '#2a9d8f',
    inkop: '#e9c46a',
    fritid: '#f4a261',
    service: '#e76f51',
    ovrigt: '#adb5bd'
  };

  const purposeLabels = {
    arbete: 'Arbete',
    utbildning: 'Utbildning',
    inkop: 'Inköp',
    fritid: 'Fritid & rekreation',
    service: 'Service & vård',
    ovrigt: 'Övrigt'
  };

  /* ── Municipality data ───────────────────────────────── */
  const municipalities = [
    {
      id: 'linkoping',
      name: 'Linköping',
      population: 164616,
      lat: 58.4108,
      lng: 15.6214,
      respondents: 1240,
      modeShare: { bil: 52, kollektivtrafik: 14, cykel: 18, gang: 12, ovrigt: 4 },
      tripPurpose: { arbete: 32, utbildning: 14, inkop: 20, fritid: 17, service: 10, ovrigt: 7 },
      avgTripsPerDay: 2.8,
      avgDistance: 8.2,
      trend: { 2015: 40, 2017: 41, 2019: 43, 2021: 38, 2023: 44 }
    },
    {
      id: 'norrkoping',
      name: 'Norrköping',
      population: 143171,
      lat: 58.5942,
      lng: 16.1826,
      respondents: 1080,
      modeShare: { bil: 55, kollektivtrafik: 12, cykel: 15, gang: 13, ovrigt: 5 },
      tripPurpose: { arbete: 30, utbildning: 13, inkop: 22, fritid: 18, service: 10, ovrigt: 7 },
      avgTripsPerDay: 2.7,
      avgDistance: 9.1,
      trend: { 2015: 36, 2017: 37, 2019: 39, 2021: 34, 2023: 40 }
    },
    {
      id: 'motala',
      name: 'Motala',
      population: 43881,
      lat: 58.5375,
      lng: 15.0364,
      respondents: 420,
      modeShare: { bil: 62, kollektivtrafik: 8, cykel: 14, gang: 11, ovrigt: 5 },
      tripPurpose: { arbete: 28, utbildning: 11, inkop: 24, fritid: 19, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.5,
      avgDistance: 10.4,
      trend: { 2015: 30, 2017: 31, 2019: 32, 2021: 28, 2023: 33 }
    },
    {
      id: 'mjolby',
      name: 'Mjölby',
      population: 27942,
      lat: 58.3269,
      lng: 15.1319,
      respondents: 310,
      modeShare: { bil: 65, kollektivtrafik: 7, cykel: 12, gang: 11, ovrigt: 5 },
      tripPurpose: { arbete: 29, utbildning: 10, inkop: 24, fritid: 19, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.4,
      avgDistance: 11.6,
      trend: { 2015: 27, 2017: 28, 2019: 29, 2021: 25, 2023: 30 }
    },
    {
      id: 'finspang',
      name: 'Finspång',
      population: 21763,
      lat: 58.7068,
      lng: 15.7676,
      respondents: 260,
      modeShare: { bil: 68, kollektivtrafik: 6, cykel: 10, gang: 10, ovrigt: 6 },
      tripPurpose: { arbete: 30, utbildning: 9, inkop: 23, fritid: 20, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.3,
      avgDistance: 13.2,
      trend: { 2015: 24, 2017: 24, 2019: 26, 2021: 22, 2023: 26 }
    },
    {
      id: 'vadstena',
      name: 'Vadstena',
      population: 7377,
      lat: 58.4490,
      lng: 14.8880,
      respondents: 120,
      modeShare: { bil: 60, kollektivtrafik: 5, cykel: 15, gang: 15, ovrigt: 5 },
      tripPurpose: { arbete: 26, utbildning: 8, inkop: 25, fritid: 22, service: 12, ovrigt: 7 },
      avgTripsPerDay: 2.3,
      avgDistance: 12.8,
      trend: { 2015: 32, 2017: 33, 2019: 34, 2021: 30, 2023: 35 }
    },
    {
      id: 'odeshog',
      name: 'Ödeshög',
      population: 5432,
      lat: 58.2280,
      lng: 14.6530,
      respondents: 95,
      modeShare: { bil: 72, kollektivtrafik: 4, cykel: 8, gang: 10, ovrigt: 6 },
      tripPurpose: { arbete: 27, utbildning: 8, inkop: 25, fritid: 22, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.2,
      avgDistance: 16.1,
      trend: { 2015: 20, 2017: 20, 2019: 22, 2021: 18, 2023: 22 }
    },
    {
      id: 'boxholm',
      name: 'Boxholm',
      population: 5541,
      lat: 58.1960,
      lng: 15.0540,
      respondents: 90,
      modeShare: { bil: 74, kollektivtrafik: 3, cykel: 7, gang: 10, ovrigt: 6 },
      tripPurpose: { arbete: 28, utbildning: 7, inkop: 26, fritid: 21, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.1,
      avgDistance: 17.3,
      trend: { 2015: 18, 2017: 18, 2019: 20, 2021: 16, 2023: 20 }
    },
    {
      id: 'kinda',
      name: 'Kinda',
      population: 10048,
      lat: 58.0950,
      lng: 15.6310,
      respondents: 140,
      modeShare: { bil: 75, kollektivtrafik: 4, cykel: 6, gang: 9, ovrigt: 6 },
      tripPurpose: { arbete: 29, utbildning: 7, inkop: 25, fritid: 21, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.1,
      avgDistance: 18.5,
      trend: { 2015: 17, 2017: 17, 2019: 19, 2021: 15, 2023: 19 }
    },
    {
      id: 'ydre',
      name: 'Ydre',
      population: 3812,
      lat: 57.8590,
      lng: 15.2770,
      respondents: 70,
      modeShare: { bil: 78, kollektivtrafik: 2, cykel: 5, gang: 9, ovrigt: 6 },
      tripPurpose: { arbete: 27, utbildning: 6, inkop: 27, fritid: 22, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.0,
      avgDistance: 21.4,
      trend: { 2015: 14, 2017: 15, 2019: 16, 2021: 12, 2023: 16 }
    },
    {
      id: 'atvidaberg',
      name: 'Åtvidaberg',
      population: 11682,
      lat: 58.2050,
      lng: 15.9980,
      respondents: 155,
      modeShare: { bil: 70, kollektivtrafik: 5, cykel: 9, gang: 10, ovrigt: 6 },
      tripPurpose: { arbete: 29, utbildning: 8, inkop: 24, fritid: 21, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.2,
      avgDistance: 14.7,
      trend: { 2015: 22, 2017: 22, 2019: 24, 2021: 20, 2023: 24 }
    },
    {
      id: 'valdemarsvik',
      name: 'Valdemarsvik',
      population: 7683,
      lat: 58.2030,
      lng: 16.6000,
      respondents: 110,
      modeShare: { bil: 73, kollektivtrafik: 3, cykel: 7, gang: 11, ovrigt: 6 },
      tripPurpose: { arbete: 26, utbildning: 7, inkop: 26, fritid: 23, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.1,
      avgDistance: 16.9,
      trend: { 2015: 19, 2017: 19, 2019: 21, 2021: 17, 2023: 21 }
    },
    {
      id: 'soderkoping',
      name: 'Söderköping',
      population: 15267,
      lat: 58.4810,
      lng: 16.3220,
      respondents: 185,
      modeShare: { bil: 66, kollektivtrafik: 6, cykel: 11, gang: 12, ovrigt: 5 },
      tripPurpose: { arbete: 28, utbildning: 9, inkop: 24, fritid: 21, service: 11, ovrigt: 7 },
      avgTripsPerDay: 2.3,
      avgDistance: 13.8,
      trend: { 2015: 26, 2017: 27, 2019: 29, 2021: 24, 2023: 29 }
    }
  ];

  /* ── Distance distribution (region) ──────────────────── */
  const distanceDistribution = [
    { range: '< 1 km',    pct: 15, dominantMode: 'gang' },
    { range: '1–3 km',    pct: 22, dominantMode: 'cykel' },
    { range: '3–5 km',    pct: 18, dominantMode: 'cykel' },
    { range: '5–10 km',   pct: 20, dominantMode: 'bil' },
    { range: '10–20 km',  pct: 13, dominantMode: 'bil' },
    { range: '20–50 km',  pct: 8,  dominantMode: 'bil' },
    { range: '> 50 km',   pct: 4,  dominantMode: 'kollektivtrafik' }
  ];

  /* ── Mode share by distance (region) ─────────────────── */
  const modeByDistance = [
    { range: '< 1 km',    bil: 15, kollektivtrafik: 2,  cykel: 20, gang: 60, ovrigt: 3 },
    { range: '1–3 km',    bil: 25, kollektivtrafik: 5,  cykel: 35, gang: 30, ovrigt: 5 },
    { range: '3–5 km',    bil: 45, kollektivtrafik: 12, cykel: 25, gang: 12, ovrigt: 6 },
    { range: '5–10 km',   bil: 65, kollektivtrafik: 18, cykel: 10, gang: 2,  ovrigt: 5 },
    { range: '10–20 km',  bil: 72, kollektivtrafik: 20, cykel: 2,  gang: 0,  ovrigt: 6 },
    { range: '20–50 km',  bil: 68, kollektivtrafik: 25, cykel: 0,  gang: 0,  ovrigt: 7 },
    { range: '> 50 km',   bil: 55, kollektivtrafik: 35, cykel: 0,  gang: 0,  ovrigt: 10 }
  ];

  /* ── Mode share by age group (region) ────────────────── */
  const modeByAge = [
    { range: '16–24', bil: 35, kollektivtrafik: 25, cykel: 20, gang: 15, ovrigt: 5 },
    { range: '25–34', bil: 55, kollektivtrafik: 15, cykel: 15, gang: 10, ovrigt: 5 },
    { range: '35–44', bil: 65, kollektivtrafik: 10, cykel: 12, gang: 8,  ovrigt: 5 },
    { range: '45–54', bil: 68, kollektivtrafik: 8,  cykel: 12, gang: 7,  ovrigt: 5 },
    { range: '55–64', bil: 62, kollektivtrafik: 10, cykel: 14, gang: 9,  ovrigt: 5 },
    { range: '65–74', bil: 55, kollektivtrafik: 12, cykel: 15, gang: 13, ovrigt: 5 },
    { range: '75–84', bil: 40, kollektivtrafik: 15, cykel: 8,  gang: 30, ovrigt: 7 }
  ];

  /* ── Regional trend (% sustainable share) ────────────── */
  const regionTrend = [
    { year: 2015, hallbart: 32, bil: 63, ovrigt: 5 },
    { year: 2017, hallbart: 33, bil: 62, ovrigt: 5 },
    { year: 2019, hallbart: 35, bil: 60, ovrigt: 5 },
    { year: 2021, hallbart: 30, bil: 64, ovrigt: 6 },
    { year: 2023, hallbart: 34, bil: 60, ovrigt: 6 }
  ];

  /* ── Report metadata ─────────────────────────────────── */
  const reportMeta = {
    title: 'Resvaneundersökning Östergötland 2023',
    subtitle: 'Interaktiv rapport för hållbar stadsplanering',
    author: 'Region Östergötland',
    date: '2023',
    region: 'Östergötland',
    totalPopulation: 468215,
    totalRespondents: 5295,
    surveyPeriod: 'September–November 2023',
    methodology: 'Kombinerad enkät (webb och papper), stratifierat urval per kommun, ålder och kön.'
  };

  /* ── Helper functions ────────────────────────────────── */

  function getSustainableShare(modeShare) {
    return (modeShare.kollektivtrafik || 0) + (modeShare.cykel || 0) + (modeShare.gang || 0);
  }

  function getRegionModeShare() {
    const totalPop = municipalities.reduce((s, m) => s + m.population, 0);
    const weighted = {};
    Object.keys(modeLabels).forEach(mode => {
      weighted[mode] = municipalities.reduce((s, m) => {
        return s + (m.modeShare[mode] || 0) * m.population;
      }, 0) / totalPop;
    });
    // Round to 1 decimal
    Object.keys(weighted).forEach(k => { weighted[k] = Math.round(weighted[k] * 10) / 10; });
    return weighted;
  }

  function getRegionPurpose() {
    const totalPop = municipalities.reduce((s, m) => s + m.population, 0);
    const weighted = {};
    Object.keys(purposeLabels).forEach(p => {
      weighted[p] = municipalities.reduce((s, m) => {
        return s + (m.tripPurpose[p] || 0) * m.population;
      }, 0) / totalPop;
    });
    Object.keys(weighted).forEach(k => { weighted[k] = Math.round(weighted[k] * 10) / 10; });
    return weighted;
  }

  function getYears() {
    return [2015, 2017, 2019, 2021, 2023];
  }

  function getMunicipality(id) {
    return municipalities.find(m => m.id === id);
  }

  function getMunicipalitiesSorted(key, desc) {
    const copy = [...municipalities];
    copy.sort((a, b) => {
      let va, vb;
      if (key === 'sustainableShare') {
        va = getSustainableShare(a.modeShare);
        vb = getSustainableShare(b.modeShare);
      } else if (key.startsWith('mode.')) {
        const mode = key.split('.')[1];
        va = a.modeShare[mode] || 0;
        vb = b.modeShare[mode] || 0;
      } else {
        va = a[key];
        vb = b[key];
      }
      return desc ? vb - va : va - vb;
    });
    return copy;
  }

  /* ── Public API ──────────────────────────────────────── */
  return {
    municipalities,
    modeColors,
    modeLabels,
    purposeColors,
    purposeLabels,
    distanceDistribution,
    modeByDistance,
    modeByAge,
    regionTrend,
    reportMeta,
    getSustainableShare,
    getRegionModeShare,
    getRegionPurpose,
    getYears,
    getMunicipality,
    getMunicipalitiesSorted
  };
})();
