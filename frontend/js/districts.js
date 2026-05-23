/* =============================================
   districts.js
   ============================================= */

let districts = [];

async function loadDistricts() {
  const res  = await fetch(`${API}/districts`);
  const data = await res.json();
  districts  = data;
  renderDistricts();
}

document.addEventListener('DOMContentLoaded', loadDistricts);

let pendingDeleteDistrictId = null;

function statusCls(status) {
  if (status === 'Critical')   return 'crit';
  if (status === 'Near Limit') return 'warn';
  return '';
}

function statusDot(status) {
  if (status === 'Critical')   return `<span style="color:#e74c3c">⚠ Critical</span>`;
  if (status === 'Near Limit') return `<span style="color:#BA7517">⚠ Near Limit</span>`;
  return `<span style="color:#1D9E75">● Operational</span>`;
}

function barColor(pct) {
  if (pct >= 90) return '#e74c3c';
  if (pct >= 75) return '#BA7517';
  return '#1D9E75';
}

// ── READ ──────────────────────────────────────
function renderDistricts() {
  const container = document.getElementById('districtCards');
  const emptyMsg  = document.getElementById('districtEmpty');

  if (!districts.length) {
    container.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  container.innerHTML = districts.map(d => {
    const uPct = d.usage_pct    ?? 0;
    const cPct = d.consumer_pct ?? 0;
    const uCol = barColor(uPct);
    const cCol = barColor(cPct);

    return `
    <div class="col-md-4">
      <div class="district-card ${statusCls(d.status)}">
        <div class="dc-name">${d.name}</div>
        <div class="dc-status">${statusDot(d.status)}</div>

        <div class="dc-stat-row">
          <span class="dc-stat-label">Water Usage</span>
          <span class="dc-stat-val" style="color:${uCol}">${uPct}%</span>
        </div>
        <div class="dc-progress-wrap">
          <div class="dc-progress-fill" style="width:${uPct}%;background:${uCol}"></div>
        </div>
        <div style="font-size:.7rem;color:#bbb;margin-bottom:10px">
          ${Number(d.actual_usage_m3).toLocaleString()} m³ of ${Number(d.max_capacity_m3).toLocaleString()} m³ max
        </div>

        <div class="dc-stat-row">
          <span class="dc-stat-label">Consumer Load</span>
          <span class="dc-stat-val" style="color:${cCol}">${cPct}%</span>
        </div>
        <div class="dc-progress-wrap">
          <div class="dc-progress-fill" style="width:${cPct}%;background:${cCol}"></div>
        </div>
        <div style="font-size:.7rem;color:#bbb;margin-bottom:4px">
          ${Number(d.actual_consumers).toLocaleString()} of ${Number(d.max_consumers).toLocaleString()} max consumers
        </div>

        <div class="dc-actions">
          <button class="btn-edit-sm" onclick="openEditDistrictModal('${d.id}')">Edit</button>
          <button class="btn-del-sm"  onclick="openDeleteDistrictModal('${d.id}')">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── CREATE ────────────────────────────────────
async function saveDistrict() {
  const name     = document.getElementById('inputDistName').value.trim();
  const capacity = parseFloat(document.getElementById('inputDistCapacity').value);
  const maxCons  = parseInt(document.getElementById('inputDistMaxConsumers').value);

  let valid = true;
  const validate = (id, cond) => {
    document.getElementById(id).classList.toggle('has-error', !cond);
    if (!cond) valid = false;
  };
  validate('fg-distName',         name !== '');
  validate('fg-distCapacity',     !isNaN(capacity) && capacity > 0);
  validate('fg-distMaxConsumers', !isNaN(maxCons)  && maxCons  > 0);
  if (!valid) return;

  try {
    const res = await fetch(`${API}/districts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, max_capacity_m3: capacity, max_consumers: maxCons }),
    });
    if (res.ok) {
      await loadDistricts();
      closeModal('addDistrictModal');
      toast('District added!');
      document.getElementById('inputDistName').value         = '';
      document.getElementById('inputDistCapacity').value     = '';
      document.getElementById('inputDistMaxConsumers').value = '';
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to add district.'));
    }
  } catch (e) {
    toast('Failed to add district: ' + e.message);
  }
}

// ── UPDATE ────────────────────────────────────
function openEditDistrictModal(id) {
  const d = districts.find(x => x.id === id);
  if (!d) return;
  document.getElementById('editDistId').value              = d.id;
  document.getElementById('editDistName').value            = d.name;
  document.getElementById('editDistCapacity').value        = d.max_capacity_m3;
  document.getElementById('editDistMaxConsumers').value    = d.max_consumers;
  openModal('editDistrictModal');
}

async function updateDistrict() {
  const id       = document.getElementById('editDistId').value;
  const name     = document.getElementById('editDistName').value.trim();
  const capacity = parseFloat(document.getElementById('editDistCapacity').value);
  const maxCons  = parseInt(document.getElementById('editDistMaxConsumers').value);

  try {
    const res = await fetch(`${API}/districts/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, max_capacity_m3: capacity, max_consumers: maxCons }),
    });
    if (res.ok) {
      await loadDistricts();
      closeModal('editDistrictModal');
      toast('District updated!');
    } else {
      toast('Failed to update district.');
    }
  } catch (e) {
    toast('Error: ' + e.message);
  }
}

// ── DELETE ────────────────────────────────────
function openDeleteDistrictModal(id) {
  const d = districts.find(x => x.id === id);
  pendingDeleteDistrictId = id;
  document.getElementById('deleteDistrictMsg').textContent =
    `"${d?.name}" and all its data will be permanently removed.`;
  openModal('deleteDistrictModal');
}

async function confirmDeleteDistrict() {
  try {
    const res = await fetch(`${API}/districts/${pendingDeleteDistrictId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadDistricts();
      closeModal('deleteDistrictModal');
      toast('District deleted!');
      pendingDeleteDistrictId = null;
    } else {
      toast('Failed to delete district.');
    }
  } catch (e) {
    toast('Error: ' + e.message);
  }
}
