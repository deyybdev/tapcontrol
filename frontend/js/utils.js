/* ═══════════════════════════════════════════
   TapControl — Shared Utilities
   Loaded in <head> so functions are always
   available before any onclick fires.
   ═══════════════════════════════════════════ */
const API = 'http://localhost:3000/api';
// ── Modal ──────────────────────────────────
function openModal(id)  {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ── Toast ──────────────────────────────────
function toast(msg) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast-item';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

// ── Pill helpers ───────────────────────────

// Dynamic district map — populated from the DB on page load.
// Keys are district IDs (e.g. "D01") AND district names (e.g. "District A").
// Values: { name, cls }
const ZONE_CLASSES = ['zone-a', 'zone-b', 'zone-c', 'zone-d', 'zone-e'];
let DISTRICT_MAP = {};

// Call once per page on DOMContentLoaded (before rendering tables/pills).
async function initDistrictMap() {
  try {
    const res  = await fetch(`${API}/districts`);
    const data = await res.json();
    DISTRICT_MAP = {};
    data.forEach((d, i) => {
      const cls = ZONE_CLASSES[i % ZONE_CLASSES.length];
      DISTRICT_MAP[d.id]   = { name: d.name, cls }; // lookup by ID   e.g. "D01"
      DISTRICT_MAP[d.name] = { name: d.name, cls }; // lookup by name e.g. "District A"
    });
  } catch (e) {
    console.error('Could not load district map', e);
  }
}

function zonePill(z) {
  const d    = DISTRICT_MAP[z];
  const cls  = d ? d.cls  : 'zone-a';
  const name = d ? d.name : (z || '—');
  return `<span class="zone-pill ${cls}">${name}</span>`;
}

function statusPill(s) {
  const cls = s === 'Active'      ? 's-active'
            : s === 'Maintenance' ? 's-maintenance'
            :                       's-inactive';
  const col = s === 'Active'      ? '#1D9E75'
            : s === 'Maintenance' ? '#BA7517'
            :                       '#e74c3c';
  return `<span class="status-pill ${cls}"><span class="s-dot" style="background:${col}"></span>${s}</span>`;
}

function districtPill(d) {
  const entry = DISTRICT_MAP[d];
  const cls   = entry ? entry.cls : 'zone-a';
  const name  = entry ? entry.name : (d || '—');
  return `<span class="zone-pill ${cls}">${name}</span>`;
}

// ── Date helper ────────────────────────────
function today() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
