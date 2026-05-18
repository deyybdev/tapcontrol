/* =============================================
   staff.js
   CRUD logic for the Staff page
   ============================================= */

// Starts empty — data will come from the backend API later
let staffList = [];

async function loadStaffList() {
  const res = await fetch(`${API}/staff`);
  const data = await res.json();
  // Convert snake_case from backend to camelCase for frontend
  staffList = data.map(s => ({
    staffID: s.staff_id,
    name: s.name,
    role: s.role,
    district: s.district_id,
    contact: s.contact || '—',
    status: s.status,
    dateHired: s.date_hired,
  }));
  renderStaff();
}

// Fetch districts from DB and populate Add, Edit, and Filter dropdowns
async function loadStaffDistrictDropdowns() {
  try {
    const res  = await fetch(`${API}/districts`);
    const data = await res.json();
    const options = data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    const addDd = document.getElementById('inputStaffDistrict');
    if (addDd) addDd.innerHTML = options;
    const editDd = document.getElementById('editStaffDistrict');
    if (editDd) editDd.innerHTML = options;
    const filterDd = document.getElementById('staffDistrictFilter');
    if (filterDd) filterDd.innerHTML = '<option value="">All Districts</option>' + options;
  } catch (e) {
    console.error('Could not load districts for staff', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initDistrictMap();              // build zonePill map from DB
  await loadStaffDistrictDropdowns();
  await loadStaffList();
});

let pendingDeleteStaffId = null;

// ── READ ──────────────────────────────────────
function renderStaff() {
  const search     = document.getElementById('staffSearch').value.toLowerCase();
  const distFilter = document.getElementById('staffDistrictFilter').value;
  const tbody      = document.getElementById('staffTableBody');
  const emptyMsg   = document.getElementById('staffEmpty');

  const results = staffList.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search)
                     || s.role.toLowerCase().includes(search)
                     || s.staffID.toLowerCase().includes(search);
    const matchDist = !distFilter || s.district === distFilter;
    return matchSearch && matchDist;
  });

  if (!results.length) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  tbody.innerHTML = results.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code style="font-size:0.78rem; color:#4d80e4">${s.staffID}</code></td>
      <td><strong>${s.name}</strong></td>
      <td>${s.role}</td>
      <td>${zonePill(s.district)}</td>
      <td>${s.contact || '—'}</td>
      <td>${statusPill(s.status === 'On Leave' ? 'Maintenance' : s.status)}</td>
      <td style="color:#aaa; font-size:0.8rem">${s.dateHired}</td>
      <td>
        <button class="btn-edit-sm me-1" onclick="openEditStaffModal('${s.staffID}')">Edit</button>
        <button class="btn-del-sm" onclick="openDeleteStaffModal('${s.staffID}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── CREATE ────────────────────────────────────
async function saveStaff() {
  const name = document.getElementById('inputStaffName').value.trim();

  // Validate required field
  document.getElementById('fg-staffName').classList.toggle('has-error', !name);
  if (!name) return;

  const newID = 'ST-' + String(staffList.length + 1).padStart(3, '0');

  const fields = {
    name:        name,
    role:        document.getElementById('inputStaffRole').value,
    contact:     document.getElementById('inputStaffContact').value.trim() || null,
    status:      document.getElementById('inputStaffStatus').value,
  };

  try {
    const res = await fetch(`${API}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: newID, ...fields })
    });
    if (res.ok) {
      await loadStaffList(); // reload from DB
      closeModal('addStaffModal');
      toast('Staff member added!');
      // Clear the form
      document.getElementById('inputStaffName').value    = '';
      document.getElementById('inputStaffContact').value = '';
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to add staff member.'));
    }
  } catch (e) {
    toast('Failed to add staff member: ' + e.message);
  }
}

// ── UPDATE ────────────────────────────────────
function openEditStaffModal(id) {
  const s = staffList.find(x => x.staffID === id);
  if (!s) return;

  document.getElementById('editStaffId').value       = s.staffID;
  document.getElementById('editStaffName').value     = s.name;
  document.getElementById('editStaffRole').value     = s.role;
  document.getElementById('editStaffDistrict').value = s.district;
  document.getElementById('editStaffContact').value  = s.contact === '—' ? '' : s.contact;
  document.getElementById('editStaffStatus').value   = s.status;

  openModal('editStaffModal');
}

function updateStaff() {
  const id  = document.getElementById('editStaffId').value;

  const updateData = {
    name:        document.getElementById('editStaffName').value.trim(),
    role:        document.getElementById('editStaffRole').value,
    district_id: document.getElementById('editStaffDistrict').value,
    contact:     document.getElementById('editStaffContact').value.trim() || null,
    status:      document.getElementById('editStaffStatus').value,
  };

  (async () => {
    try {
      const res = await fetch(`${API}/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        await loadStaffList(); // Reload from database
        closeModal('editStaffModal');
        toast('Staff updated!');
      } else {
        toast('Failed to update staff.');
      }
    } catch (e) {
      toast('Error updating staff: ' + e.message);
    }
  })();
}

// ── DELETE ────────────────────────────────────
function openDeleteStaffModal(id) {
  const s = staffList.find(x => x.staffID === id);
  pendingDeleteStaffId = id;
  document.getElementById('deleteStaffMsg').textContent =
    `"${s?.name}" (${s?.staffID}) will be removed from the system.`;
  openModal('deleteStaffModal');
}

function confirmDeleteStaff() {
  (async () => {
    try {
      const res = await fetch(`${API}/staff/${pendingDeleteStaffId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadStaffList(); // Reload from database
        closeModal('deleteStaffModal');
        toast('Staff member removed!');
        pendingDeleteStaffId = null;
      } else {
        toast('Failed to delete staff.');
      }
    } catch (e) {
      toast('Error deleting staff: ' + e.message);
    }
  })();
}