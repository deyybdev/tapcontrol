/* =============================================
   districts.js
   CRUD logic for the Districts page
   ============================================= */

// Starts empty — data will come from the backend API later
let districts = [];

async function loadDistricts() {
  const res = await fetch(`${API}/districts`);
  const data = await res.json();
  // Convert field names from backend
  districts = data.map(d => ({
    id: d.id,
    name: d.name,
    usage: d.usage_pct,
    consumers: d.consumer_count,
    status: d.status,
  }));
  renderDistricts();
}

document.addEventListener('DOMContentLoaded', loadDistricts);

let pendingDeleteDistrictId = null;

// Helper: pick bar color based on usage %
function usageColor(usage) {
  if (usage >= 90) return '#e74c3c'; // critical
  if (usage >= 75) return '#BA7517'; // warning
  return '#1D9E75';                  // normal
}

// Helper: status label
function statusLabel(status) {
  if (status === 'Critical')   return `<span class="trend-neg">⚠ Critical</span>`;
  if (status === 'Near Limit') return `<span class="trend-neg">⚠ Near Limit</span>`;
  return `<span class="trend-pos">● Operational</span>`;
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

  container.innerHTML = districts.map(d => `
    <div class="col-md-4">
      <div class="stat-card" style="border-top: 3px solid ${usageColor(d.usage)}">
        <div class="stat-card-label">${d.name}</div>
        <div class="stat-card-value" style="color:${usageColor(d.usage)}">${d.usage}%</div>
        <div class="stat-card-trend">
          ${statusLabel(d.status)} · ${d.consumers.toLocaleString()} consumers
        </div>
        <div style="margin-top:14px; display:flex; gap:8px">
          <button class="btn-edit-sm" onclick="openEditDistrictModal('${d.id}')">Edit</button>
          <button class="btn-del-sm" onclick="openDeleteDistrictModal('${d.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── CREATE ────────────────────────────────────
async function saveDistrict() {
  const name      = document.getElementById('inputDistName').value.trim();
  const usage     = parseFloat(document.getElementById('inputDistUsage').value);
  const consumers = parseInt(document.getElementById('inputDistConsumers').value);

  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-distName',      name !== '');
  validate('fg-distUsage',     !isNaN(usage) && usage >= 0 && usage <= 100);
  validate('fg-distConsumers', !isNaN(consumers) && consumers >= 0);
  if (!valid) return;

  const newID = 'D' + String(districts.length + 1).padStart(2, '0');

  const fields = {
    name:           name,
    usage_pct:      usage,
    consumer_count: consumers,
    status:         document.getElementById('inputDistStatus').value,
  };

  try {
    const res = await fetch(`${API}/districts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newID, ...fields })
    });
    if (res.ok) {
      await loadDistricts(); // reload from DB
      closeModal('addDistrictModal');
      toast('District added!');
      // Clear inputs
      document.getElementById('inputDistName').value      = '';
      document.getElementById('inputDistUsage').value     = '';
      document.getElementById('inputDistConsumers').value = '';
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

  document.getElementById('editDistId').value        = d.id;
  document.getElementById('editDistName').value      = d.name;
  document.getElementById('editDistUsage').value     = d.usage;
  document.getElementById('editDistConsumers').value = d.consumers;
  document.getElementById('editDistStatus').value    = d.status;

  openModal('editDistrictModal');
}

function updateDistrict() {
  const id  = document.getElementById('editDistId').value;

  const updateData = {
    name:           document.getElementById('editDistName').value.trim(),
    usage_pct:      parseFloat(document.getElementById('editDistUsage').value) || 0,
    consumer_count: parseInt(document.getElementById('editDistConsumers').value) || 0,
    status:         document.getElementById('editDistStatus').value,
  };

  (async () => {
    try {
      const res = await fetch(`${API}/districts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        await loadDistricts(); // Reload from database
        closeModal('editDistrictModal');
        toast('District updated!');
      } else {
        toast('Failed to update district.');
      }
    } catch (e) {
      toast('Error updating district: ' + e.message);
    }
  })();
}

// ── DELETE ────────────────────────────────────
function openDeleteDistrictModal(id) {
  const d = districts.find(x => x.id === id);
  pendingDeleteDistrictId = id;
  document.getElementById('deleteDistrictMsg').textContent =
    `"${d?.name}" will be permanently removed.`;
  openModal('deleteDistrictModal');
}

function confirmDeleteDistrict() {
  (async () => {
    try {
      const res = await fetch(`${API}/districts/${pendingDeleteDistrictId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadDistricts(); // Reload from database
        closeModal('deleteDistrictModal');
        toast('District deleted!');
        pendingDeleteDistrictId = null;
      } else {
        toast('Failed to delete district.');
      }
    } catch (e) {
      toast('Error deleting district: ' + e.message);
    }
  })();
}