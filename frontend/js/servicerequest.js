/* =============================================
   servicerequest.js
   CRUD logic for the Service Requests page
   ============================================= */

let serviceRequests  = [];
let allSRConsumers   = [];   // cache: all active consumers
let allTechnicians   = [];   // cache: all active Technicians

// ── Loaders ───────────────────────────────────

async function loadSRDistrictDropdown() {
  try {
    const res  = await fetch(`${API}/districts`);
    const data = await res.json();
    const dd   = document.getElementById('inputSRDistrict');
    if (!dd) return;
    dd.innerHTML = '<option value="">— Select District —</option>'
      + data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  } catch (e) {
    console.error('Could not load districts for service requests', e);
  }
}

async function loadSRConsumersCache() {
  try {
    const res    = await fetch(`${API}/consumers`);
    allSRConsumers = await res.json();
  } catch (e) {
    console.error('Could not load consumers for service requests', e);
  }
}

async function loadTechniciansCache() {
  try {
    const res  = await fetch(`${API}/staff?role=Technician`);
    const data = await res.json();
    allTechnicians = data.filter(s => s.status === 'Active');
  } catch (e) {
    console.error('Could not load technicians', e);
  }
}

async function loadServiceRequests() {
  const res  = await fetch(`${API}/service-requests`);
  const data = await res.json();
  serviceRequests = data.map(sr => ({
    id:         sr.id,
    consumer:   sr.consumer_name,
    consumerId: sr.consumer_id,
    type:       sr.type,
    priority:   sr.priority,
    assigned:   sr.assigned_to || '—',
    status:     sr.status,
    filed:      sr.filed_date
                  ? new Date(sr.filed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—',
  }));
  renderRequests();
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadSRDistrictDropdown(),
    loadSRConsumersCache(),
    loadTechniciansCache(),
    loadServiceRequests(),
  ]);
});

let pendingDeleteSRId = null;

// ── Chain Handlers ────────────────────────────

// Step 1: District selected → populate Consumer + Technician dropdowns
function onSRDistrictSelect() {
  const districtId  = document.getElementById('inputSRDistrict').value;
  const consumerDD  = document.getElementById('inputSRConsumer');
  const assignedDD  = document.getElementById('inputSRAssigned');

  if (!districtId) {
    consumerDD.innerHTML = '<option value="">— Select District First —</option>';
    consumerDD.disabled  = true;
    assignedDD.innerHTML = '<option value="">— Select District First —</option>';
    assignedDD.disabled  = true;
    return;
  }

  // Filter active consumers in this district
  const filtered = allSRConsumers.filter(c => c.district_id === districtId && c.status === 'Active');
  if (!filtered.length) {
    consumerDD.innerHTML = '<option value="">No active consumers in this district</option>';
    consumerDD.disabled  = true;
  } else {
    consumerDD.innerHTML = '<option value="">— Select Consumer —</option>'
      + filtered.map(c =>
          `<option value="${c.consumer_id}">${c.full_name} (${c.consumer_id})</option>`
        ).join('');
    consumerDD.disabled = false;
  }

  // Filter Technicians assigned to this district
  const techs = allTechnicians.filter(s => s.district_id === districtId);
  if (!techs.length) {
    assignedDD.innerHTML = '<option value="">No Technicians in this district</option>';
    assignedDD.disabled  = true;
  } else {
    assignedDD.innerHTML = '<option value="">— Select Technician —</option>'
      + techs.map(s =>
          `<option value="${s.name}">${s.name} (${s.staff_id})</option>`
        ).join('');
    assignedDD.disabled = false;
  }
}

// ── Helpers ───────────────────────────────────

function priorityPill(p) {
  const styles = {
    'High':   { cls: 's-inactive',    col: '#e74c3c' },
    'Medium': { cls: 's-maintenance', col: '#BA7517' },
    'Low':    { cls: 's-active',      col: '#1D9E75' },
  };
  const s = styles[p] || styles['Low'];
  return `<span class="status-pill ${s.cls}"><span class="s-dot" style="background:${s.col}"></span>${p}</span>`;
}

function srStatusPill(s) {
  const styles = {
    'Resolved':    { cls: 's-active',      col: '#1D9E75' },
    'In Progress': { cls: 's-maintenance', col: '#BA7517' },
    'Open':        { cls: 's-maintenance', col: '#BA7517' },
  };
  const st = styles[s] || styles['Open'];
  return `<span class="status-pill ${st.cls}"><span class="s-dot" style="background:${st.col}"></span>${s}</span>`;
}

function updateSRStats() {
  document.getElementById('sr-open').textContent       = serviceRequests.filter(r => r.status === 'Open').length;
  document.getElementById('sr-inprogress').textContent = serviceRequests.filter(r => r.status === 'In Progress').length;
  document.getElementById('sr-resolved').textContent   = serviceRequests.filter(r => r.status === 'Resolved').length;
  document.getElementById('sr-high').textContent       = serviceRequests.filter(r => r.priority === 'High').length;
}

// ── READ ──────────────────────────────────────
function renderRequests() {
  const search       = (document.getElementById('srSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('srStatusFilter')?.value || '';
  const tbody        = document.getElementById('srTableBody');
  const emptyMsg     = document.getElementById('srEmpty');

  const results = serviceRequests.filter(r => {
    const matchSearch = r.consumer.toLowerCase().includes(search)
                     || r.type.toLowerCase().includes(search)
                     || r.id.toLowerCase().includes(search);
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  updateSRStats();

  if (!results.length) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  tbody.innerHTML = results.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code>${r.id}</code></td>
      <td>${r.consumer}</td>
      <td>${r.type}</td>
      <td>${priorityPill(r.priority)}</td>
      <td>${r.assigned}</td>
      <td>${srStatusPill(r.status)}</td>
      <td style="color:#aaa; font-size:0.82rem">${r.filed}</td>
      <td>
        ${r.status !== 'Resolved'
          ? `<button class="btn-edit-sm me-1" onclick="resolveRequest('${r.id}')">Resolve</button>`
          : ''}
        <button class="btn-del-sm" onclick="openDeleteSRModal('${r.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── CREATE ────────────────────────────────────
async function saveRequest() {
  const districtId = document.getElementById('inputSRDistrict').value;
  const consumerId = document.getElementById('inputSRConsumer').value;
  const assigned   = document.getElementById('inputSRAssigned').value;

  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-srDistrict', districtId !== '');
  validate('fg-srConsumer', consumerId !== '');
  validate('fg-srAssigned', assigned   !== '');
  if (!valid) return;

  const fields = {
    consumer_id: consumerId,
    district_id: districtId,
    type:        document.getElementById('inputSRType').value,
    priority:    document.getElementById('inputSRPriority').value,
    assigned_to: assigned || null,
  };

  try {
    const res = await fetch(`${API}/service-requests`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
    if (res.ok) {
      await loadServiceRequests();
      closeModal('addSRModal');
      toast('Service request filed!');
      // Reset form
      document.getElementById('inputSRDistrict').value    = '';
      document.getElementById('inputSRConsumer').innerHTML = '<option value="">— Select District First —</option>';
      document.getElementById('inputSRConsumer').disabled  = true;
      document.getElementById('inputSRAssigned').innerHTML = '<option value="">— Select District First —</option>';
      document.getElementById('inputSRAssigned').disabled  = true;
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to file service request.'));
    }
  } catch (e) {
    toast('Failed to file service request: ' + e.message);
  }
}

// Quick-resolve from table row
function resolveRequest(id) {
  (async () => {
    try {
      const res = await fetch(`${API}/service-requests/${id}/resolve`, { method: 'PATCH' });
      if (res.ok) {
        await loadServiceRequests();
        toast('Service request marked as resolved!');
      } else {
        toast('Failed to resolve request.');
      }
    } catch (e) {
      toast('Error resolving request: ' + e.message);
    }
  })();
}

// ── DELETE ────────────────────────────────────
function openDeleteSRModal(id) {
  const r = serviceRequests.find(x => x.id === id);
  pendingDeleteSRId = id;
  document.getElementById('deleteSRMsg').textContent =
    `Request ${r?.id} from "${r?.consumer}" will be permanently removed.`;
  openModal('deleteSRModal');
}

function confirmDeleteSR() {
  (async () => {
    try {
      const res = await fetch(`${API}/service-requests/${pendingDeleteSRId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadServiceRequests();
        closeModal('deleteSRModal');
        toast('Request deleted!');
        pendingDeleteSRId = null;
      } else {
        toast('Failed to delete request.');
      }
    } catch (e) {
      toast('Error deleting request: ' + e.message);
    }
  })();
}