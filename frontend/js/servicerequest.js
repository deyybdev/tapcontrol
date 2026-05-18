/* =============================================
   servicerequest.js
   CRUD logic for the Service Requests page
   ============================================= */

// Starts empty — data will come from the backend API later
let serviceRequests = [];

async function loadServiceRequests() {
  const res = await fetch(`${API}/service-requests`);
  const data = await res.json();
  // Convert field names from backend
  serviceRequests = data.map(sr => ({
    id: sr.id,
    consumer: sr.consumer_name,
    consumerId: sr.consumer_id,
    type: sr.type,
    priority: sr.priority,
    assigned: sr.assigned_to || '—',
    status: sr.status,
    filed: sr.filed_date ? new Date(sr.filed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
  }));
  renderRequests();
}

document.addEventListener('DOMContentLoaded', loadServiceRequests);

let pendingDeleteSRId = null;

// Helper: priority badge
function priorityPill(p) {
  const styles = {
    'High':   { cls: 's-inactive',    col: '#e74c3c' },
    'Medium': { cls: 's-maintenance', col: '#BA7517' },
    'Low':    { cls: 's-active',      col: '#1D9E75' },
  };
  const s = styles[p] || styles['Low'];
  return `<span class="status-pill ${s.cls}"><span class="s-dot" style="background:${s.col}"></span>${p}</span>`;
}

// Helper: status badge
function srStatusPill(s) {
  const styles = {
    'Resolved':    { cls: 's-active',      col: '#1D9E75' },
    'In Progress': { cls: 's-maintenance', col: '#BA7517' },
    'Open':        { cls: 's-maintenance', col: '#BA7517' },
  };
  const st = styles[s] || styles['Open'];
  return `<span class="status-pill ${st.cls}"><span class="s-dot" style="background:${st.col}"></span>${s}</span>`;
}

// Update the stat counters above the table
function updateSRStats() {
  document.getElementById('sr-open').textContent       = serviceRequests.filter(r => r.status === 'Open').length;
  document.getElementById('sr-inprogress').textContent = serviceRequests.filter(r => r.status === 'In Progress').length;
  document.getElementById('sr-resolved').textContent   = serviceRequests.filter(r => r.status === 'Resolved').length;
  document.getElementById('sr-high').textContent       = serviceRequests.filter(r => r.priority === 'High').length;
}

// ── READ ──────────────────────────────────────
function renderRequests() {
  const search       = document.getElementById('srSearch').value.toLowerCase();
  const statusFilter = document.getElementById('srStatusFilter').value;
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
  const consumerId = document.getElementById('inputSRConsumer').value.trim();

  document.getElementById('fg-srConsumer').classList.toggle('has-error', !consumerId);
  if (!consumerId) return;

  const newID = 'SR-' + String(serviceRequests.length + 1).padStart(3, '0');

  const fields = {
    consumer_id: consumerId,
    type:        document.getElementById('inputSRType').value,
    priority:    document.getElementById('inputSRPriority').value,
    assigned_to: document.getElementById('inputSRAssigned').value.trim() || null,
  };

  try {
    const res = await fetch(`${API}/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newID, ...fields })
    });
    if (res.ok) {
      await loadServiceRequests(); // reload from DB
      closeModal('addSRModal');
      toast('Service request filed!');
      document.getElementById('inputSRConsumer').value = '';
      document.getElementById('inputSRAssigned').value = '';
    } else {
      toast('Failed to file service request.');
    }
  } catch (e) {
    toast('Failed to file service request: ' + e.message);
  }
}

// Quick-resolve directly from the table row
function resolveRequest(id) {
  (async () => {
    try {
      const res = await fetch(`${API}/service-requests/${id}/resolve`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await loadServiceRequests(); // Reload from database
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
      const res = await fetch(`${API}/service-requests/${pendingDeleteSRId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadServiceRequests(); // Reload from database
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