'use strict';

// =========================================================================
// 1. DATA CONSTANTS & DETERMINISTIC RECONCILIATION ENGINE (500 RECORDS)
// =========================================================================
const chartRegistry = {};

const CIs = [
  "Nexora Web Application",
  "Nexora Production Database",
  "Nexora Production Application Cluster",
  "Nexora Identity/SSO",
  "Nexora Production Load Balancer"
];

const Groups = [
  "Nexora Application Operations",
  "Nexora Database Operations",
  "Nexora Identity & Access",
  "Nexora Network Operations"
];

const Locations = ["Bangalore", "Chennai", "Delhi", "Hyderabad", "Mumbai", "Pune"];

const Families = [
  "Database Performance/Latency",
  "Authentication/SSO Failure",
  "Application Resource Saturation",
  "Database Capacity/Resource Saturation",
  "Regional Network Connectivity",
  "Identity Provisioning Failure",
  "Load Balancer Route Latency",
  "Application Runtime Exception",
  "Database Transaction Contention",
  "Incident Triage/Assignment Routing"
];

const INCIDENTS = [];

(function initDeterministicDataset() {
  const pPool = [];
  for (let i = 0; i < 29; i++) pPool.push(1);
  for (let i = 0; i < 118; i++) pPool.push(2);
  for (let i = 0; i < 166; i++) pPool.push(3);
  for (let i = 0; i < 187; i++) pPool.push(4);

  let seed = 42;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  for (let i = pPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pPool[i], pPool[j]] = [pPool[j], pPool[i]];
  }

  const quotas = { 1: 26, 2: 78, 3: 69, 4: 34 };
  const currBreaches = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let chgCount = 0, prbCount = 0;

  for (let i = 0; i < 500; i++) {
    const p = pPool[i];
    const target = p === 1 ? 1.0 : p === 2 ? 8.0 : p === 3 ? 24.0 : 48.0;
    const willBreach = currBreaches[p] < quotas[p];
    if (willBreach) currBreaches[p]++;

    let dur = willBreach
      ? (p === 1 ? 1.2 + rand() * 45 : p === 2 ? 8.5 + rand() * 40 : p === 3 ? 24.5 + rand() * 32 : 48.5 + rand() * 15)
      : (p === 1 ? 0.35 + rand() * 0.55 : p === 2 ? 1.0 + rand() * 6.5 : p === 3 ? 3.0 + rand() * 19 : 5.0 + rand() * 40);
    dur = parseFloat(dur.toFixed(2));

    const ci = i < 137 ? CIs[0] : i < 272 ? CIs[1] : i < 358 ? CIs[2] : i < 436 ? CIs[3] : CIs[4];
    const grp = ci.includes("Database") ? Groups[1] : ci.includes("Identity") ? Groups[2] : ci.includes("Load") ? Groups[3] : Groups[0];

    let rChg = null, factor = "None identified";
    if (chgCount < 52 && (i % 9 === 0 || i < 40)) {
      chgCount++;
      const idx = (i % 25) + 1;
      rChg = `CHG3000${idx < 10 ? '0' + idx : idx}`;
      factor = ["Recent Change", "Recent deployment", "Recent configuration update"][i % 3];
    }

    let isPrb = false, prbReason = "";
    if (prbCount < 68 && (rChg || p <= 2 || i % 6 === 0)) {
      isPrb = true;
      prbCount++;
      prbReason = rChg 
        ? "Potential systemic issue associated with a Change; RCA review warranted" 
        : (i % 2 === 0 ? "Recurring incident pattern requires Problem review" : "Technical condition may warrant trend and RCA review");
    }

    const openDate = new Date(2026, 3, 1, 8, 0, 0);
    openDate.setDate(openDate.getDate() + Math.floor((i / 500) * 152));
    openDate.setHours(openDate.getHours() + Math.floor(rand() * 12));
    const resolveDate = new Date(openDate);
    resolveDate.setMinutes(resolveDate.getMinutes() + Math.round(dur * 60));

    INCIDENTS.push({
      sys_id: `b4f8e21a9c${100000 + i}f4e803d17a`,
      number: `INC${10001 + i}`,
      priority: p,
      impact: p <= 2 ? 1 : 2,
      urgency: p === 1 ? 1 : 2,
      cmdb_ci: ci,
      assignment_group: grp,
      assigned_to: `Engineer ${1 + (i % 12)}`,
      caller_id: `USR00${1 + (i % 24)}`,
      caller_location: Locations[i % Locations.length],
      category: ci.includes("Database") ? "Database" : ci.includes("Identity") ? "Access" : ci.includes("Load") ? "Network" : "Software",
      primary_incident_family: Families[i % Families.length],
      technical_cause: willBreach ? "Long-running queries and resource saturation" : "Service condition cleared",
      resolution_duration_hours: dur,
      sla_target_hours: target,
      has_breached: willBreach,
      sla_variance_hours: parseFloat((dur - target).toFixed(2)),
      related_change: rChg,
      contributing_factor: factor,
      problem_candidate: isPrb,
      problem_candidate_reason: prbReason,
      opened_at: openDate,
      resolved_at: resolveDate,
      scenario_id: `SCN-${10 + (i % 30)}`
    });
  }
})();

// =========================================================================
// 2. STATE & URL DEEP LINKING ENGINE
// =========================================================================
const FilterState = {
  priorities: [1, 2, 3, 4],
  ci: "ALL",
  group: "ALL",
  problemOnly: false,
  changeOnly: false,
  search: ""
};

let filteredData = [...INCIDENTS];
let currentTab = 1;

const TableState = {
  ci: { col: 'vol', asc: false, page: 1, size: 5 },
  breach: { col: 'variance', asc: false, page: 1, size: 10 },
  problem: { col: 'number', asc: true, page: 1, size: 10 },
  change: { col: 'chg', asc: true, page: 1, size: 10 }
};

function updateURLState() {
  const p = new URLSearchParams();
  if (currentTab !== 1) p.set('tab', currentTab);
  if (FilterState.priorities.length < 4) p.set('p', FilterState.priorities.sort().join(','));
  if (FilterState.ci !== 'ALL') p.set('ci', FilterState.ci);
  if (FilterState.group !== 'ALL') p.set('grp', FilterState.group);
  if (FilterState.problemOnly) p.set('prb', '1');
  if (FilterState.changeOnly) p.set('chg', '1');
  if (FilterState.search) p.set('q', FilterState.search);
  const qs = p.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
}

function parseURLState() {
  const p = new URLSearchParams(window.location.search);
  if (p.has('tab')) currentTab = Math.min(7, Math.max(1, parseInt(p.get('tab')) || 1));
  if (p.has('p')) FilterState.priorities = p.get('p').split(',').map(Number).filter(n => n >= 1 && n <= 4);
  if (p.has('ci')) FilterState.ci = p.get('ci');
  if (p.has('grp')) FilterState.group = p.get('grp');
  if (p.has('prb')) FilterState.problemOnly = p.get('prb') === '1';
  if (p.has('chg')) FilterState.changeOnly = p.get('chg') === '1';
  if (p.has('q')) FilterState.search = p.get('q');

  const ciEl = document.getElementById('filterCI');
  const grpEl = document.getElementById('filterGroup');
  const qEl = document.getElementById('globalSearch');
  if (ciEl) ciEl.value = FilterState.ci;
  if (grpEl) grpEl.value = FilterState.group;
  if (qEl) qEl.value = FilterState.search;

  if (FilterState.problemOnly) document.getElementById('btnProblemOnly')?.classList.add('border-problemViolet', 'bg-problemViolet/10');
  if (FilterState.changeOnly) document.getElementById('btnChangeOnly')?.classList.add('border-changeCyan', 'bg-changeCyan/10');

  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`pFilter-${i}`);
    if (btn) {
      btn.className = FilterState.priorities.includes(i)
        ? `px-2 py-0.5 rounded text-[11px] font-bold transition-all bg-p${i}/20 text-p${i} border border-p${i}/40`
        : 'px-2 py-0.5 rounded text-[11px] font-bold transition-all bg-nxCanvas text-slate-600 border border-nxBorder';
    }
  }
}

// =========================================================================
// 3. FILTER CONTROLLERS & KPI RECALCULATION
// =========================================================================
function togglePriorityFilter(p) {
  const idx = FilterState.priorities.indexOf(p);
  const btn = document.getElementById(`pFilter-${p}`);
  if (idx > -1) {
    if (FilterState.priorities.length === 1) return;
    FilterState.priorities.splice(idx, 1);
    if (btn) btn.className = 'px-2 py-0.5 rounded text-[11px] font-bold transition-all bg-nxCanvas text-slate-600 border border-nxBorder';
  } else {
    FilterState.priorities.push(p);
    if (btn) btn.className = `px-2 py-0.5 rounded text-[11px] font-bold transition-all bg-p${p}/20 text-p${p} border border-p${p}/40`;
  }
  applyFilters();
}

function toggleProblemOnly() {
  FilterState.problemOnly = !FilterState.problemOnly;
  const btn = document.getElementById('btnProblemOnly');
  btn?.classList.toggle('border-problemViolet');
  btn?.classList.toggle('bg-problemViolet/10');
  applyFilters();
}

function toggleChangeOnly() {
  FilterState.changeOnly = !FilterState.changeOnly;
  const btn = document.getElementById('btnChangeOnly');
  btn?.classList.toggle('border-changeCyan');
  btn?.classList.toggle('bg-changeCyan/10');
  applyFilters();
}

function resetGlobalFilters() {
  FilterState.priorities = [1, 2, 3, 4];
  FilterState.ci = "ALL";
  FilterState.group = "ALL";
  FilterState.problemOnly = false;
  FilterState.changeOnly = false;
  FilterState.search = "";

  document.getElementById('filterCI').value = "ALL";
  document.getElementById('filterGroup').value = "ALL";
  document.getElementById('globalSearch').value = "";
  document.getElementById('btnProblemOnly')?.classList.remove('border-problemViolet', 'bg-problemViolet/10');
  document.getElementById('btnChangeOnly')?.classList.remove('border-changeCyan', 'bg-changeCyan/10');

  for (let p = 1; p <= 4; p++) {
    const btn = document.getElementById(`pFilter-${p}`);
    if (btn) btn.className = `px-2 py-0.5 rounded text-[11px] font-bold transition-all bg-p${p}/20 text-p${p} border border-p${p}/40`;
  }
  showToast("Filters reset to default view");
  applyFilters();
}

function applyFilters() {
  FilterState.ci = document.getElementById('filterCI')?.value || "ALL";
  FilterState.group = document.getElementById('filterGroup')?.value || "ALL";
  FilterState.search = (document.getElementById('globalSearch')?.value || "").toLowerCase().trim();

  filteredData = INCIDENTS.filter(item => {
    if (!FilterState.priorities.includes(item.priority)) return false;
    if (FilterState.ci !== "ALL" && item.cmdb_ci !== FilterState.ci) return false;
    if (FilterState.group !== "ALL" && item.assignment_group !== FilterState.group) return false;
    if (FilterState.problemOnly && !item.problem_candidate) return false;
    if (FilterState.changeOnly && !item.related_change) return false;
    if (FilterState.search !== "") {
      const match = item.number.toLowerCase().includes(FilterState.search) ||
                    item.cmdb_ci.toLowerCase().includes(FilterState.search) ||
                    item.technical_cause.toLowerCase().includes(FilterState.search) ||
                    item.assigned_to.toLowerCase().includes(FilterState.search) ||
                    (item.related_change && item.related_change.toLowerCase().includes(FilterState.search));
      if (!match) return false;
    }
    return true;
  });

  let activeCount = 0;
  if (FilterState.priorities.length < 4) activeCount++;
  if (FilterState.ci !== "ALL") activeCount++;
  if (FilterState.group !== "ALL") activeCount++;
  if (FilterState.problemOnly) activeCount++;
  if (FilterState.changeOnly) activeCount++;
  if (FilterState.search !== "") activeCount++;

  const badge = document.getElementById('activeFilterBadge');
  if (badge) {
    badge.textContent = activeCount;
    badge.classList.toggle('hidden', activeCount === 0);
  }

  TableState.breach.page = 1;
  TableState.problem.page = 1;
  TableState.change.page = 1;

  updateURLState();
  updateExecutiveKPIs();
  renderActiveTabVisuals();
}

function updateExecutiveKPIs() {
  const total = filteredData.length;
  document.getElementById('kpiTotal').textContent = total;
  if (total === 0) {
    document.getElementById('kpiSLAComp').textContent = "0.0%";
    document.getElementById('kpiSLABreach').textContent = "0";
    document.getElementById('kpiMTTR').textContent = "0.0h";
    document.getElementById('kpiMajor').textContent = "0";
    document.getElementById('kpiProb').textContent = "0";
    return;
  }
  const breaches = filteredData.filter(d => d.has_breached).length;
  const compRate = (((total - breaches) / total) * 100).toFixed(1);
  const totalHours = filteredData.reduce((acc, cur) => acc + cur.resolution_duration_hours, 0);
  const mttr = (totalHours / total).toFixed(1);
  const major = filteredData.filter(d => d.priority <= 2).length;
  const prob = filteredData.filter(d => d.problem_candidate).length;

  document.getElementById('kpiSLAComp').textContent = `${compRate}%`;
  document.getElementById('kpiSLABreach').textContent = breaches;
  document.getElementById('kpiMTTR').textContent = `${mttr}h`;
  document.getElementById('kpiMajor').textContent = major;
  document.getElementById('kpiProb').textContent = prob;
}

// =========================================================================
// 4. TAB NAVIGATION & VISUALS ROUTER
// =========================================================================
function switchTab(tabId) {
  currentTab = tabId;
  for (let i = 1; i <= 7; i++) {
    const btn = document.getElementById(`tab-${i}`);
    const view = document.getElementById(`pageView-${i}`);
    if (btn) btn.classList.toggle('tab-active', i === tabId);
    if (view) view.classList.toggle('hidden', i !== tabId);
  }
  updateURLState();
  renderActiveTabVisuals();
  lucide.createIcons();
}

function destroyChart(id) {
  if (chartRegistry[id]) {
    chartRegistry[id].destroy();
    delete chartRegistry[id];
  }
}

function renderActiveTabVisuals() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = '"JetBrains Mono", monospace';
  Chart.defaults.font.size = 11;

  if (currentTab === 1) renderPage1Charts();
  else if (currentTab === 2) renderPage2Charts();
  else if (currentTab === 3) renderPage3Charts();
  else if (currentTab === 4) renderPage4Charts();
  else if (currentTab === 5) renderPage5Charts();
  else if (currentTab === 6) renderPage6Charts();
}

// =========================================================================
// 5. CHART RENDERERS
// =========================================================================
function renderPage1Charts() {
  destroyChart('chart1_trend');
  const ctxTrend = document.getElementById('chart1_trend');
  if (ctxTrend) {
    chartRegistry['chart1_trend'] = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels: ['Apr 01', 'Apr 15', 'May 01', 'May 15', 'Jun 01', 'Jun 15', 'Jul 01', 'Jul 15', 'Aug 01', 'Aug 15'],
        datasets: [
          {
            label: 'Rolling MTTR (h)',
            data: [22.4, 23.8, 25.1, 26.2, 24.8, 23.5, 25.9, 24.1, 23.9, 25.5],
            type: 'line',
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y1',
            tension: 0.3
          },
          { label: 'P1 Critical', data: [3, 2, 4, 3, 2, 4, 3, 2, 3, 3], backgroundColor: '#EF4444', yAxisID: 'y' },
          { label: 'P2 High', data: [12, 11, 14, 12, 10, 13, 11, 12, 13, 10], backgroundColor: '#F97316', yAxisID: 'y' },
          { label: 'P3/P4 Low', data: [35, 38, 36, 34, 39, 35, 37, 36, 34, 31], backgroundColor: 'rgba(59, 130, 246, 0.65)', yAxisID: 'y' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' } },
          y1: { position: 'right', grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  destroyChart('chart1_priority');
  const ctxPrio = document.getElementById('chart1_priority');
  if (ctxPrio) {
    chartRegistry['chart1_priority'] = new Chart(ctxPrio, {
      type: 'doughnut',
      data: {
        labels: ['P1 Critical', 'P2 High', 'P3 Moderate', 'P4 Low'],
        datasets: [{
          data: [1, 2, 3, 4].map(p => filteredData.filter(d => d.priority === p).length),
          backgroundColor: ['#EF4444', '#F97316', '#F59E0B', '#3B82F6'],
          borderColor: '#111827', borderWidth: 3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } }
    });
  }

  destroyChart('chart1_ci');
  const ctxCI = document.getElementById('chart1_ci');
  if (ctxCI) {
    chartRegistry['chart1_ci'] = new Chart(ctxCI, {
      type: 'bar',
      data: {
        labels: CIs.map(c => c.replace("Nexora Production ", "").replace("Nexora ", "")),
        datasets: [
          { label: 'Compliant', data: CIs.map(ci => filteredData.filter(d => d.cmdb_ci === ci && !d.has_breached).length), backgroundColor: '#10B981' },
          { label: 'Breached', data: CIs.map(ci => filteredData.filter(d => d.cmdb_ci === ci && d.has_breached).length), backgroundColor: '#DC2626' }
        ]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });
  }

  destroyChart('chart1_group');
  const ctxGrp = document.getElementById('chart1_group');
  if (ctxGrp) {
    chartRegistry['chart1_group'] = new Chart(ctxGrp, {
      type: 'bar',
      data: {
        labels: ['App Ops', 'DB Ops', 'Identity', 'Network'],
        datasets: [
          { label: 'Total Volume', data: Groups.map(g => filteredData.filter(d => d.assignment_group === g).length), backgroundColor: 'rgba(99, 102, 241, 0.75)' },
          { label: 'Breached Volume', data: Groups.map(g => filteredData.filter(d => d.assignment_group === g && d.has_breached).length), backgroundColor: '#EF4444' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function renderPage2Charts() {
  destroyChart('chart2_families');
  const ctxFam = document.getElementById('chart2_families');
  if (ctxFam) {
    chartRegistry['chart2_families'] = new Chart(ctxFam, {
      type: 'bar',
      data: {
        labels: Families.map(f => f.length > 22 ? f.substring(0, 20) + '...' : f),
        datasets: [{ label: 'Frequency', data: Families.map(f => filteredData.filter(d => d.primary_incident_family === f).length), backgroundColor: 'rgba(249, 115, 22, 0.8)', borderRadius: 4 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
  }

  destroyChart('chart2_familyPriority');
  const ctxFP = document.getElementById('chart2_familyPriority');
  if (ctxFP) {
    const top5 = Families.slice(0, 5);
    chartRegistry['chart2_familyPriority'] = new Chart(ctxFP, {
      type: 'bar',
      data: {
        labels: top5.map(f => f.length > 18 ? f.substring(0, 16) + '...' : f),
        datasets: [
          { label: 'P1 Critical', data: top5.map(f => filteredData.filter(d => d.primary_incident_family === f && d.priority === 1).length), backgroundColor: '#EF4444' },
          { label: 'P2 High', data: top5.map(f => filteredData.filter(d => d.primary_incident_family === f && d.priority === 2).length), backgroundColor: '#F97316' },
          { label: 'P3/P4 Low', data: top5.map(f => filteredData.filter(d => d.primary_incident_family === f && d.priority >= 3).length), backgroundColor: '#3B82F6' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });
  }

  renderCiTable();
}

function renderPage3Charts() {
  destroyChart('chart3_compliance');
  const ctxComp = document.getElementById('chart3_compliance');
  if (ctxComp) {
    chartRegistry['chart3_compliance'] = new Chart(ctxComp, {
      type: 'bar',
      data: {
        labels: ['P1 (1h)', 'P2 (8h)', 'P3 (24h)', 'P4 (48h)'],
        datasets: [
          { label: 'Met SLA %', data: [10.3, 33.9, 58.4, 81.8], backgroundColor: '#10B981' },
          { label: 'Breached %', data: [89.7, 66.1, 41.6, 18.2], backgroundColor: '#DC2626' }
        ]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, max: 100 }, y: { stacked: true } } }
    });
  }

  destroyChart('chart3_histogram');
  const ctxHist = document.getElementById('chart3_histogram');
  if (ctxHist) {
    chartRegistry['chart3_histogram'] = new Chart(ctxHist, {
      type: 'bar',
      data: {
        labels: ['0-5h', '5-10h', '10-20h', '20-30h', '30-40h', '40-50h', '50-60h'],
        datasets: [{ label: 'Incident Count', data: [85, 92, 110, 105, 52, 34, 22], backgroundColor: 'rgba(99, 102, 241, 0.75)', borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  renderBreachTable();
}

function renderPage4Charts() {
  destroyChart('chart4_bubble');
  const ctxBubble = document.getElementById('chart4_bubble');
  if (ctxBubble) {
    chartRegistry['chart4_bubble'] = new Chart(ctxBubble, {
      type: 'bubble',
      data: {
        datasets: [
          { label: 'Critical Problems', data: [{ x: 36, y: 3.8, r: 18 }, { x: 31, y: 3.4, r: 15 }], backgroundColor: '#EF4444' },
          { label: 'Major Defects', data: [{ x: 14, y: 3.7, r: 12 }, { x: 18, y: 3.2, r: 10 }], backgroundColor: '#F97316' },
          { label: 'Chronic Friction', data: [{ x: 33, y: 1.8, r: 14 }, { x: 28, y: 2.1, r: 11 }], backgroundColor: '#8B5CF6' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Recurrence' } }, y: { title: { display: true, text: 'Severity Score' }, min: 1, max: 4 } } }
    });
  }

  destroyChart('chart4_reasons');
  const ctxReas = document.getElementById('chart4_reasons');
  if (ctxReas) {
    chartRegistry['chart4_reasons'] = new Chart(ctxReas, {
      type: 'bar',
      data: {
        labels: ['Technical RCA', 'Recurring Pattern', 'Change Post-Mortem'],
        datasets: [{ label: 'Candidates', data: [32, 20, 16], backgroundColor: ['#8B5CF6', '#6366F1', '#06B6D4'], borderRadius: 4 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
  }

  renderProblemTable();
}

function renderPage5Charts() {
  destroyChart('chart5_blast');
  const ctxBlast = document.getElementById('chart5_blast');
  if (ctxBlast) {
    chartRegistry['chart5_blast'] = new Chart(ctxBlast, {
      type: 'bar',
      data: {
        labels: ['CHG300002', 'CHG300001', 'CHG300010', 'CHG300014', 'CHG300023', 'CHG300025'],
        datasets: [{ label: 'Incidents Generated', data: [6, 5, 4, 4, 3, 3], backgroundColor: 'rgba(6, 182, 212, 0.85)', borderRadius: 4 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
  }

  destroyChart('chart5_ci');
  const ctxChgCI = document.getElementById('chart5_ci');
  if (ctxChgCI) {
    chartRegistry['chart5_ci'] = new Chart(ctxChgCI, {
      type: 'bar',
      data: {
        labels: CIs.map(c => c.replace("Nexora Production ", "").replace("Nexora ", "")),
        datasets: [{ label: 'Change Incidents', data: CIs.map(ci => filteredData.filter(d => d.cmdb_ci === ci && d.related_change).length), backgroundColor: '#EF4444', borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  renderChangeTable();
}

function renderPage6Charts() {
  destroyChart('chart6_geo');
  const ctxGeo = document.getElementById('chart6_geo');
  if (ctxGeo) {
    chartRegistry['chart6_geo'] = new Chart(ctxGeo, {
      type: 'bar',
      data: {
        labels: Locations,
        datasets: [{ label: 'Incident Volume by Metro Hub', data: Locations.map(loc => filteredData.filter(d => d.caller_location === loc).length), backgroundColor: 'rgba(99, 102, 241, 0.8)', borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// =========================================================================
// 6. UNIVERSAL TABLE SORTING & PAGINATION ENGINE
// =========================================================================
function renderCiTable() {
  const tbody = document.getElementById('ciHealthTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const stats = CIs.map((ci, idx) => {
    const list = filteredData.filter(d => d.cmdb_ci === ci);
    const vol = list.length;
    const share = parseFloat(((vol / (filteredData.length || 1)) * 100).toFixed(1));
    const major = list.filter(d => d.priority <= 2).length;
    const prob = list.filter(d => d.problem_candidate).length;
    const totalDur = list.reduce((a, c) => a + c.resolution_duration_hours, 0);
    const mttr = vol > 0 ? parseFloat((totalDur / vol).toFixed(1)) : 0;
    const breachRate = vol > 0 ? parseFloat((((list.filter(d => d.has_breached).length) / vol) * 100).toFixed(1)) : 0;
    return { rank: idx + 1, ci, vol, share, major, prob, mttr, breachRate };
  });

  const { col, asc } = TableState.ci;
  stats.sort((a, b) => {
    let vA = a[col], vB = b[col];
    return typeof vA === 'string' ? (asc ? vA.localeCompare(vB) : vB.localeCompare(vA)) : (asc ? vA - vB : vB - vA);
  });

  ['rank', 'ci', 'vol', 'share', 'major', 'prob', 'mttr', 'breach'].forEach(c => {
    const el = document.getElementById(`ciSort_${c}`);
    if (el) el.textContent = col === c ? (asc ? '▲' : '▼') : '';
  });

  stats.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-nxSurface cursor-pointer transition-colors";
    tr.innerHTML = `
      <td class="p-3 text-slate-500">0${item.rank}</td>
      <td class="p-3 font-bold text-white">${item.ci}</td>
      <td class="p-3 font-semibold">${item.vol}</td>
      <td class="p-3 text-slate-400">${item.share}%</td>
      <td class="p-3 text-p2 font-bold">${item.major}</td>
      <td class="p-3 text-problemViolet font-bold">${item.prob}</td>
      <td class="p-3">${item.mttr}h</td>
      <td class="p-3 ${item.breachRate > 40 ? 'text-p1 font-bold' : 'text-slate-300'}">${item.breachRate}%</td>
      <td class="p-3 text-right">
        <button onclick="document.getElementById('filterCI').value='${item.ci}'; applyFilters();" class="px-2 py-1 bg-brandIndigo/20 text-brandIndigo rounded text-[10px] hover:bg-brandIndigo/40 transition-colors">Filter</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function sortCiTable(col) {
  TableState.ci.asc = TableState.ci.col === col ? !TableState.ci.asc : false;
  TableState.ci.col = col;
  renderCiTable();
}

function genericTableSort(key, col) {
  TableState[key].asc = TableState[key].col === col ? !TableState[key].asc : true;
  TableState[key].col = col;
  TableState[key].page = 1;
  if (key === 'breach') renderBreachTable();
  else if (key === 'problem') renderProblemTable();
  else if (key === 'change') renderChangeTable();
}

function genericPageChange(key, delta) {
  TableState[key].page += delta;
  if (key === 'breach') renderBreachTable();
  else if (key === 'problem') renderProblemTable();
  else if (key === 'change') renderChangeTable();
}

function renderBreachTable() {
  const list = filteredData.filter(d => d.has_breached);
  const badge = document.getElementById('breachRecordCountBadge');
  if (badge) badge.textContent = `${list.length} Breached Records`;
  const { col, asc, page, size } = TableState.breach;

  list.sort((a, b) => {
    let vA = a[col], vB = b[col];
    if (col === 'number') { vA = parseInt(a.number.replace('INC', '')); vB = parseInt(b.number.replace('INC', '')); }
    else if (col === 'duration') { vA = a.resolution_duration_hours; vB = b.resolution_duration_hours; }
    else if (col === 'variance') { vA = a.sla_variance_hours; vB = b.sla_variance_hours; }
    else if (col === 'target') { vA = a.sla_target_hours; vB = b.sla_target_hours; }
    else if (col === 'ci') { vA = a.cmdb_ci; vB = b.cmdb_ci; }
    else if (col === 'group') { vA = a.assignment_group; vB = b.assignment_group; }
    else if (col === 'engineer') { vA = a.assigned_to; vB = b.assigned_to; }
    return typeof vA === 'string' ? (asc ? vA.localeCompare(vB) : vB.localeCompare(vA)) : (asc ? vA - vB : vB - vA);
  });

  ['number', 'priority', 'ci', 'group', 'engineer', 'target', 'duration', 'variance'].forEach(c => {
    const el = document.getElementById(`brSort_${c}`);
    if (el) el.textContent = col === c ? (asc ? '▲' : '▼') : '';
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  TableState.breach.page = Math.min(Math.max(1, page), totalPages);
  const curPage = TableState.breach.page;
  const start = (curPage - 1) * size;
  const items = list.slice(start, start + size);

  const tbody = document.getElementById('breachTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.length === 0
    ? `<tr><td colspan="9" class="p-6 text-center text-slate-500">No breached records found.</td></tr>`
    : items.map(inc => `
      <tr class="hover:bg-nxSurface transition-colors">
        <td class="p-3 text-white font-bold">${inc.number}</td>
        <td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-p${inc.priority}/20 text-p${inc.priority}">P${inc.priority}</span></td>
        <td class="p-3 text-slate-300">${inc.cmdb_ci.replace("Nexora Production ", "").replace("Nexora ", "")}</td>
        <td class="p-3 text-slate-400">${inc.assignment_group.replace("Nexora ", "")}</td>
        <td class="p-3">${inc.assigned_to}</td>
        <td class="p-3 text-slate-500">${inc.sla_target_hours}h</td>
        <td class="p-3 font-semibold">${inc.resolution_duration_hours}h</td>
        <td class="p-3 text-p1 font-bold">+${inc.sla_variance_hours}h</td>
        <td class="p-3 text-right">
          <button onclick="openDrawer('${inc.number}')" class="px-2 py-1 bg-nxSurface border border-nxBorder hover:border-slate-500 text-slate-300 rounded text-[10px] transition-colors">Inspect</button>
        </td>
      </tr>
    `).join('');

  document.getElementById('breachPaginationInfo').textContent = total === 0 ? "Showing 0 entries" : `Showing ${start + 1} to ${Math.min(start + size, total)} of ${total} entries`;
  document.getElementById('breachCurrentPageText').textContent = `Page ${curPage} / ${totalPages}`;
  document.getElementById('btnBreachPrev').disabled = curPage === 1;
  document.getElementById('btnBreachNext').disabled = curPage === totalPages || totalPages === 0;
}

function renderProblemTable() {
  const list = filteredData.filter(d => d.problem_candidate);
  const badge = document.getElementById('probRecordCountBadge');
  if (badge) badge.textContent = `${list.length} Problem Candidates`;
  const { col, asc, page, size } = TableState.problem;

  list.sort((a, b) => {
    let vA = a[col], vB = b[col];
    if (col === 'number') { vA = parseInt(a.number.replace('INC', '')); vB = parseInt(b.number.replace('INC', '')); }
    else if (col === 'ci') { vA = a.cmdb_ci; vB = b.cmdb_ci; }
    else if (col === 'family') { vA = a.primary_incident_family; vB = b.primary_incident_family; }
    return typeof vA === 'string' ? (asc ? vA.localeCompare(vB) : vB.localeCompare(vA)) : (asc ? vA - vB : vB - vA);
  });

  ['number', 'priority', 'ci', 'family'].forEach(c => {
    const el = document.getElementById(`prSort_${c}`);
    if (el) el.textContent = col === c ? (asc ? '▲' : '▼') : '';
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  TableState.problem.page = Math.min(Math.max(1, page), totalPages);
  const curPage = TableState.problem.page;
  const start = (curPage - 1) * size;
  const items = list.slice(start, start + size);

  const tbody = document.getElementById('problemTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.length === 0
    ? `<tr><td colspan="7" class="p-6 text-center text-slate-500">No problem candidates found.</td></tr>`
    : items.map(inc => `
      <tr class="hover:bg-nxSurface transition-colors">
        <td class="p-3 text-white font-bold">${inc.number}</td>
        <td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-p${inc.priority}/20 text-p${inc.priority}">P${inc.priority}</span></td>
        <td class="p-3">${inc.cmdb_ci.replace("Nexora Production ", "").replace("Nexora ", "")}</td>
        <td class="p-3 text-slate-400">${inc.primary_incident_family}</td>
        <td class="p-3 text-slate-300 truncate max-w-[180px]">${inc.technical_cause}</td>
        <td class="p-3 text-problemViolet text-[11px] truncate max-w-[220px]" title="${inc.problem_candidate_reason}">${inc.problem_candidate_reason}</td>
        <td class="p-3 text-right">
          <button onclick="openDrawer('${inc.number}')" class="px-2 py-1 bg-nxSurface border border-nxBorder hover:border-slate-500 text-slate-300 rounded text-[10px] transition-colors">Inspect</button>
        </td>
      </tr>
    `).join('');

  document.getElementById('problemPaginationInfo').textContent = total === 0 ? "Showing 0 entries" : `Showing ${start + 1} to ${Math.min(start + size, total)} of ${total} entries`;
  document.getElementById('problemCurrentPageText').textContent = `Page ${curPage} / ${totalPages}`;
  document.getElementById('btnProblemPrev').disabled = curPage === 1;
  document.getElementById('btnProblemNext').disabled = curPage === totalPages || totalPages === 0;
}

function renderChangeTable() {
  const list = filteredData.filter(d => d.related_change);
  const badge = document.getElementById('chgRecordCountBadge');
  if (badge) badge.textContent = `${list.length} Change Incidents`;
  const { col, asc, page, size } = TableState.change;

  list.sort((a, b) => {
    let vA = a[col], vB = b[col];
    if (col === 'chg') { vA = a.related_change || ""; vB = b.related_change || ""; }
    else if (col === 'number') { vA = parseInt(a.number.replace('INC', '')); vB = parseInt(b.number.replace('INC', '')); }
    else if (col === 'ci') { vA = a.cmdb_ci; vB = b.cmdb_ci; }
    return typeof vA === 'string' ? (asc ? vA.localeCompare(vB) : vB.localeCompare(vA)) : (asc ? vA - vB : vB - vA);
  });

  ['chg', 'number', 'priority', 'ci'].forEach(c => {
    const el = document.getElementById(`chSort_${c}`);
    if (el) el.textContent = col === c ? (asc ? '▲' : '▼') : '';
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  TableState.change.page = Math.min(Math.max(1, page), totalPages);
  const curPage = TableState.change.page;
  const start = (curPage - 1) * size;
  const items = list.slice(start, start + size);

  const tbody = document.getElementById('changeTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.length === 0
    ? `<tr><td colspan="8" class="p-6 text-center text-slate-500">No change-linked records found.</td></tr>`
    : items.map(inc => `
      <tr class="hover:bg-nxSurface transition-colors">
        <td class="p-3 text-changeCyan font-bold">${inc.related_change}</td>
        <td class="p-3 text-slate-400">${inc.contributing_factor}</td>
        <td class="p-3 text-white font-bold">${inc.number}</td>
        <td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-p${inc.priority}/20 text-p${inc.priority}">P${inc.priority}</span></td>
        <td class="p-3">${inc.cmdb_ci.replace("Nexora Production ", "").replace("Nexora ", "")}</td>
        <td class="p-3 text-slate-300 truncate max-w-[180px]">${inc.technical_cause}</td>
        <td class="p-3 text-slate-400">Resolved</td>
        <td class="p-3 text-right">
          <button onclick="openDrawer('${inc.number}')" class="px-2 py-1 bg-nxSurface border border-nxBorder hover:border-slate-500 text-slate-300 rounded text-[10px] transition-colors">Inspect</button>
        </td>
      </tr>
    `).join('');

  document.getElementById('changePaginationInfo').textContent = total === 0 ? "Showing 0 entries" : `Showing ${start + 1} to ${Math.min(start + size, total)} of ${total} entries`;
  document.getElementById('changeCurrentPageText').textContent = `Page ${curPage} / ${totalPages}`;
  document.getElementById('btnChangePrev').disabled = curPage === 1;
  document.getElementById('btnChangeNext').disabled = curPage === totalPages || totalPages === 0;
}

// Global hooks for table sorting and pagination
const sortBreachTable = (c) => genericTableSort('breach', c);
const changeBreachPage = (d) => genericPageChange('breach', d);
const sortProblemTable = (c) => genericTableSort('problem', c);
const changeProblemPage = (d) => genericPageChange('problem', d);
const sortChangeTable = (c) => genericTableSort('change', c);
const changeChangePage = (d) => genericPageChange('change', d);

// =========================================================================
// 7. CSDM TOPOLOGY GRAPH INTERACTIVITY
// =========================================================================
let selectedNodeCI = "Nexora Web Application";
function selectCSDMNode(ciName) {
  selectedNodeCI = ciName;
  document.getElementById('csdmName').textContent = ciName;
  const list = filteredData.filter(d => d.cmdb_ci === ciName);
  const vol = list.length;
  const breachRate = vol > 0 ? (((list.filter(d => d.has_breached).length) / vol) * 100).toFixed(1) : "0.0";
  document.getElementById('csdmVol').textContent = vol || "137";
  document.getElementById('csdmBreach').textContent = `${breachRate}%`;
  document.getElementById('csdmCause').textContent = ciName.includes("Database") ? "Long-running query locks" : ciName.includes("Identity") ? "SSO token mismatch" : "Runtime exception / Capacity";
}

function filterBySelectedCI() {
  if (CIs.includes(selectedNodeCI)) {
    document.getElementById('filterCI').value = selectedNodeCI;
    applyFilters();
    showToast(`Filtered suite to: ${selectedNodeCI}`);
  }
}

// =========================================================================
// 8. INCIDENT DRAWER (FORM & SERVICENOW REST JSON VIEW)
// =========================================================================
function openDrawer(incNum) {
  const inc = INCIDENTS.find(d => d.number === incNum);
  if (!inc) return;

  document.getElementById('drawerIncNumber').textContent = inc.number;
  const pBadge = document.getElementById('drawerPriorityBadge');
  pBadge.textContent = `P${inc.priority}`;
  pBadge.className = `px-2 py-0.5 rounded text-xs font-bold bg-p${inc.priority}/20 text-p${inc.priority} border border-p${inc.priority}/30`;

  document.getElementById('drawerCI').textContent = inc.cmdb_ci;
  document.getElementById('drawerGroup').textContent = inc.assignment_group;
  document.getElementById('drawerEngineer').textContent = inc.assigned_to;
  document.getElementById('drawerCaller').textContent = `${inc.caller_id} (${inc.caller_location})`;
  document.getElementById('drawerCategory').textContent = inc.category;
  document.getElementById('drawerFamily').textContent = inc.primary_incident_family;
  document.getElementById('drawerCause').textContent = inc.technical_cause;
  document.getElementById('drawerScenario').textContent = inc.scenario_id;
  document.getElementById('drawerDescription').textContent = `Operational symptom: ${inc.primary_incident_family} detected on ${inc.cmdb_ci}. Continuous monitoring triggered telemetry threshold alert.`;

  document.getElementById('drawerOpened').textContent = inc.opened_at.toISOString().replace('T', ' ').substring(0, 19);
  document.getElementById('drawerResolved').textContent = inc.resolved_at.toISOString().replace('T', ' ').substring(0, 19);
  document.getElementById('drawerDuration').textContent = `${inc.resolution_duration_hours} Hours`;
  document.getElementById('drawerTarget').textContent = `${inc.sla_target_hours} Hours (Priority ${inc.priority})`;

  const slaBadge = document.getElementById('drawerSLAStatus');
  const varSpan = document.getElementById('drawerVariance');
  if (inc.has_breached) {
    slaBadge.textContent = "BREACHED";
    slaBadge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-slaBreach/20 text-slaBreach border border-slaBreach/30";
    varSpan.textContent = `+${inc.sla_variance_hours}h over contract`;
    varSpan.className = "font-bold text-p1";
  } else {
    slaBadge.textContent = "COMPLIANT";
    slaBadge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-slaMet/20 text-slaMet border border-slaMet/30";
    varSpan.textContent = `${Math.abs(inc.sla_variance_hours)}h buffer remaining`;
    varSpan.className = "font-bold text-emerald-400";
  }

  document.getElementById('drawerFactor').textContent = inc.contributing_factor;
  document.getElementById('drawerChange').textContent = inc.related_change || "None (Organic Incident)";
  document.getElementById('drawerProblem').textContent = inc.problem_candidate ? "Yes (Candidate Tagged)" : "No";
  document.getElementById('drawerProblemReason').textContent = inc.problem_candidate_reason || "";
  document.getElementById('drawerCSDMPath').textContent = `Nexora Core → Nexora Core - Production → ${inc.cmdb_ci}`;

  const jsonPayload = {
    sys_id: inc.sys_id,
    number: inc.number,
    state: "6",
    stage: inc.has_breached ? "breached" : "achieved",
    priority: inc.priority.toString(),
    impact: inc.impact.toString(),
    urgency: inc.urgency.toString(),
    cmdb_ci: { display_value: inc.cmdb_ci, link: `https://nexora.service-now.com/api/now/table/cmdb_ci/${inc.sys_id}` },
    assignment_group: { display_value: inc.assignment_group },
    assigned_to: { display_value: inc.assigned_to },
    caller_id: { display_value: inc.caller_id, location: inc.caller_location },
    category: inc.category.toLowerCase(),
    subcategory: inc.primary_incident_family,
    opened_at: inc.opened_at.toISOString(),
    resolved_at: inc.resolved_at.toISOString(),
    calendar_duration: `${Math.round(inc.resolution_duration_hours * 3600)}`,
    business_duration_hours: inc.resolution_duration_hours,
    task_sla: { target: `${inc.sla_target_hours}h`, has_breached: inc.has_breached, variance_hours: inc.sla_variance_hours },
    rfc: inc.related_change || null,
    problem_id: inc.problem_candidate ? `PRB${inc.number.replace('INC', '')}` : null
  };

  document.getElementById('drawerJsonContent').textContent = JSON.stringify(jsonPayload, null, 2);
  switchDrawerView('form');

  document.getElementById('drawerBackdrop')?.classList.remove('opacity-0', 'pointer-events-none');
  document.getElementById('incidentDrawer')?.classList.remove('translate-x-full');
  lucide.createIcons();
}

function switchDrawerView(view) {
  const isForm = view === 'form';
  document.getElementById('drawerViewTab_form').className = isForm 
    ? "flex-1 py-2.5 px-4 text-center font-bold text-white border-b-2 border-brandIndigo bg-brandIndigo/10 flex items-center justify-center gap-2 transition-all" 
    : "flex-1 py-2.5 px-4 text-center font-bold text-slate-400 hover:text-white border-b-2 border-transparent flex items-center justify-center gap-2 transition-all";
  document.getElementById('drawerViewTab_json').className = !isForm 
    ? "flex-1 py-2.5 px-4 text-center font-bold text-white border-b-2 border-brandIndigo bg-brandIndigo/10 flex items-center justify-center gap-2 transition-all" 
    : "flex-1 py-2.5 px-4 text-center font-bold text-slate-400 hover:text-white border-b-2 border-transparent flex items-center justify-center gap-2 transition-all";
  document.getElementById('drawerView_form')?.classList.toggle('hidden', !isForm);
  document.getElementById('drawerView_json')?.classList.toggle('hidden', isForm);
}

function closeDrawer() {
  document.getElementById('drawerBackdrop')?.classList.add('opacity-0', 'pointer-events-none');
  document.getElementById('incidentDrawer')?.classList.add('translate-x-full');
}

function copyDrawerJSON() {
  const text = document.getElementById('drawerJsonContent')?.textContent;
  copyToClipboard(text, "ServiceNow REST JSON copied to clipboard!");
}

// =========================================================================
// 9. CLIENT-SIDE CSV AUDIT EXPORTER
// =========================================================================
function exportFilteredToCSV() {
  if (!filteredData || filteredData.length === 0) {
    showToast("No records available to export with current filters.");
    return;
  }
  const headers = [
    "Incident_Number", "Priority", "Configuration_Item", "Assignment_Group", 
    "Assigned_Engineer", "Caller_Location", "Resolution_Duration_Hours", 
    "SLA_Target_Hours", "Breach_Status", "Variance_Hours", "Related_Change", 
    "Problem_Candidate", "Primary_Family", "Technical_Cause"
  ];
  const rows = filteredData.map(d => [
    d.number, `P${d.priority}`, `"${d.cmdb_ci}"`, `"${d.assignment_group}"`, 
    `"${d.assigned_to}"`, `"${d.caller_location}"`, d.resolution_duration_hours, 
    d.sla_target_hours, d.has_breached ? "BREACHED" : "COMPLIANT", d.sla_variance_hours,
    d.related_change ? `"${d.related_change}"` : "NONE", d.problem_candidate ? "YES" : "NO",
    `"${d.primary_incident_family}"`, `"${d.technical_cause}"`
  ]);

  const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csv));
  link.setAttribute("download", `nexora_incident_governance_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${filteredData.length} records to CSV!`);
}

// =========================================================================
// 10. DAX & SQL FORMULA INSPECTOR MODAL
// =========================================================================
const FormulaCatalog = {
  mttr: {
    def: "Mean Time to Resolve (MTTR): Average business hours elapsed between incident opened_at and resolved_at for resolved and closed tasks.",
    dax: `MTTR_Hours = 
AVERAGEX(
    FILTER('Incident', 'Incident'[state] IN {"Resolved", "Closed"} && NOT(ISBLANK('Incident'[resolved_at]))),
    DATEDIFF('Incident'[opened_at], 'Incident'[resolved_at], MINUTE) / 60.0
)`,
    sql: `SELECT cmdb_ci,
       ROUND(AVG(DATEDIFF('minute', opened_at, resolved_at) / 60.0), 2) AS mttr_hours,
       COUNT(*) AS volume
FROM sn_incident
WHERE state IN ('6', '7') -- 6: Resolved, 7: Closed
  AND opened_at >= '2026-04-01'
GROUP BY cmdb_ci;`
  },
  sla: {
    def: "SLA Compliance Rate (%): Percentage of task SLA records that fulfilled contractual response or resolution timelines without breach.",
    dax: `SLA_Compliance_Pct = 
DIVIDE(
    CALCULATE(COUNTROWS('Task_SLA'), 'Task_SLA'[has_breached] = FALSE),
    COUNTROWS('Task_SLA'),
    0
) * 100`,
    sql: `SELECT priority,
       COUNT(*) AS total_slas,
       SUM(CASE WHEN has_breached = FALSE THEN 1 ELSE 0 END) AS met_count,
       ROUND((SUM(CASE WHEN has_breached = FALSE THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100.0, 2) AS sla_compliance_pct
FROM sn_task_sla
GROUP BY priority;`
  },
  backlog: {
    def: "Backlog Aging Buckets: Distribution of unresolved operational tasks evaluated against opened_at to identify aging risks (>30d, 15-30d, 7-14d, <7d).",
    dax: `Backlog_Aging_Bucket = 
SWITCH(
    TRUE(),
    ISBLANK('Incident'[resolved_at]) && (TODAY() - INT('Incident'[opened_at])) > 30, "> 30 Days (Critical)",
    ISBLANK('Incident'[resolved_at]) && (TODAY() - INT('Incident'[opened_at])) >= 15, "15-30 Days",
    ISBLANK('Incident'[resolved_at]) && (TODAY() - INT('Incident'[opened_at])) >= 7, "7-14 Days",
    ISBLANK('Incident'[resolved_at]), "< 7 Days (Fresh)",
    "Resolved"
)`,
    sql: `SELECT CASE 
         WHEN DATEDIFF('day', opened_at, CURRENT_DATE) > 30 THEN '> 30 Days'
         WHEN DATEDIFF('day', opened_at, CURRENT_DATE) BETWEEN 15 AND 30 THEN '15-30 Days'
         WHEN DATEDIFF('day', opened_at, CURRENT_DATE) BETWEEN 7 AND 14 THEN '7-14 Days'
         ELSE '< 7 Days'
       END AS aging_tier,
       COUNT(*) AS active_tickets
FROM sn_incident
WHERE state NOT IN ('6', '7')
GROUP BY 1;`
  },
  fcr: {
    def: "First Contact Resolution (FCR %): Percentage of incidents resolved on first assignment group dispatch without reassignment transfers.",
    dax: `FCR_Pct = 
DIVIDE(
    CALCULATE(COUNTROWS('Incident'), 'Incident'[reassignment_count] = 0, 'Incident'[state] IN {"Resolved", "Closed"}),
    COUNTROWS('Incident'),
    0
) * 100`,
    sql: `SELECT ROUND((COUNT(CASE WHEN reassignment_count = 0 AND state IN ('6', '7') THEN 1 END) * 100.0) / COUNT(*), 2) AS fcr_pct
FROM sn_incident;`
  }
};

let activeFormulaKey = 'mttr';

function openFormulaModal() {
  switchFormula('mttr');
  document.getElementById('formulaModalBackdrop')?.classList.remove('opacity-0', 'pointer-events-none');
}

function closeFormulaModal() {
  document.getElementById('formulaModalBackdrop')?.classList.add('opacity-0', 'pointer-events-none');
}

function switchFormula(key) {
  activeFormulaKey = key;
  ['mttr', 'sla', 'backlog', 'fcr'].forEach(k => {
    const btn = document.getElementById(`fTab-${k}`);
    if (btn) btn.className = k === key 
      ? "flex-1 py-2.5 text-center font-bold text-white border-b-2 border-brandIndigo bg-brandIndigo/10" 
      : "flex-1 py-2.5 text-center font-bold text-slate-400 hover:text-white border-b-2 border-transparent";
  });
  const d = FormulaCatalog[key];
  document.getElementById('fDefinition').textContent = d.def;
  document.getElementById('fDAX').textContent = d.dax;
  document.getElementById('fSQL').textContent = d.sql;
}

function copyFormula(type) {
  const d = FormulaCatalog[activeFormulaKey];
  copyToClipboard(type === 'dax' ? d.dax : d.sql, `${type.toUpperCase()} formula copied to clipboard!`);
}

// =========================================================================
// 11. TOAST, CLIPBOARD & GLOBAL LISTENERS
// =========================================================================
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  document.getElementById('toastMessage').textContent = msg;
  toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none'), 3200);
}

function copyToClipboard(text, msg) {
  navigator.clipboard.writeText(text).then(() => showToast(msg || "Copied to clipboard!")).catch(() => showToast("Failed to copy"));
}

function toggleMobileNav() {
  document.getElementById('mobileNavDropdown')?.classList.toggle('hidden');
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { 
    closeDrawer(); 
    closeFormulaModal(); 
  }
});

// =========================================================================
// 12. MERCK OPERATIONS CHARTS & BOOTSTRAPPER
// =========================================================================
function renderMerckCharts() {
  new Chart(document.getElementById('merck_feedbackChart'), {
    type: 'line',
    data: {
      labels: ['M1', 'M2', 'M3 (Trigger)', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
      datasets: [{
        label: 'Monthly Feedback Volume',
        data: [168, 172, 170, 220, 255, 280, 298, 308, 312],
        borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)', fill: true, tension: 0.38, borderWidth: 2.5,
        pointBackgroundColor: '#10b981', pointBorderColor: '#fff', pointRadius: [3, 3, 6, 4, 4, 4, 4, 4, 5]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, min: 140, max: 340 } } }
  });

  new Chart(document.getElementById('merck_domainChart'), {
    type: 'doughnut',
    data: {
      labels: ['IT Operations', 'HR Workflows', 'Procurement'],
      datasets: [{ data: [55, 25, 20], backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(56, 189, 248, 0.8)', 'rgba(168, 85, 247, 0.8)'], borderColor: '#090D16', borderWidth: 3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } } }, cutout: '68%' }
  });

  new Chart(document.getElementById('merck_backlogChart'), {
    type: 'bar',
    data: {
      labels: ['> 30 Days (Critical)', '15–30 Days', '7–14 Days', '< 7 Days (Fresh)'],
      datasets: [
        { label: 'Pre-Controls', data: [45, 68, 92, 110], backgroundColor: 'rgba(244, 63, 94, 0.65)', borderRadius: 4 },
        { label: 'Post-Matrix (-20%)', data: [36, 54, 105, 135], backgroundColor: 'rgba(16, 185, 129, 0.85)', borderRadius: 4 }
      ]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10 } } } }
  });

  new Chart(document.getElementById('merck_reportingChart'), {
    type: 'bar',
    data: {
      labels: ['Data Extract', 'Reconciliation', 'Deck Prep', 'Weekly Total'],
      datasets: [
        { label: 'Manual (Hours)', data: [2.5, 2.0, 1.7, 6.2], backgroundColor: 'rgba(148, 163, 184, 0.5)', borderRadius: 4 },
        { label: 'ServiceNow PA (Hours)', data: [0.2, 0.2, 0.5, 0.9], backgroundColor: 'rgba(234, 179, 8, 0.85)', borderRadius: 4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10 } } } }
  });

  new Chart(document.getElementById('merck_rcaChart'), {
    type: 'bar',
    data: {
      labels: ['Access / Permissions', 'Sync Drops', 'Process Approval', 'Knowledge Gaps'],
      datasets: [{ label: '% of 300+ Tickets', data: [38, 26, 21, 15], backgroundColor: ['rgba(168, 85, 247, 0.8)', 'rgba(56, 189, 248, 0.8)', 'rgba(168, 85, 247, 0.8)', 'rgba(251, 146, 60, 0.8)'], borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + '%' }, max: 50 } } }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  parseURLState();
  switchTab(currentTab);
  applyFilters();
  renderMerckCharts();
  lucide.createIcons();
});
