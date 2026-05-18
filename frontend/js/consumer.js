/* =============================================
   consumer.js
   CRUD logic for the Consumers page
   ============================================= */

let consumers = [];

// Fetch districts from DB and populate Add, Edit, and Filter dropdowns
async function loadDistrictDropdowns() {
  try {
    const res  = await fetch(`${API}/districts`);
    const data = await res.json();
    const options = data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    document.getElementById('inputDistrict').innerHTML = options;
    const editDd = document.getElementById('editDistrict');
    if (editDd) editDd.innerHTML = options;
    // Also populate the filter dropdown so IDs match what's stored in consumers
    const filterDd = document.getElementById('consumerDistrictFilter');
    if (filterDd) {
      filterDd.innerHTML = '<option value="">All Districts</option>' + options;
    }
  } catch (e) {
    console.error('Could not load districts', e);
  }
}

async function loadConsumers() {
  const res  = await fetch(`${API}/consumers`);
  const data = await res.json();
  consumers  = data.map(c => ({
    consumerID:    c.consumer_id,
    districtID:    c.district_id,
    fullName:      c.full_name,
    address:       c.address,
    contactNumber: c.contact_number,
    meterNo:       c.meter_no,
    accountType:   c.account_type,
    status:        c.status,
    dateCreated:   c.date_created,
  }));
  renderConsumers();
}

document.addEventListener('DOMContentLoaded', async () => {
  await initDistrictMap();          // build zonePill map from DB
  await loadDistrictDropdowns();    // populate dropdowns
  await loadConsumers();
});

let pendingDeleteConsumerId = null;

// ── READ ──────────────────────────────────────
function renderConsumers() {
  const search       = document.getElementById('consumerSearch').value.toLowerCase();
  const distFilter   = document.getElementById('consumerDistrictFilter').value;
  const typeFilter   = document.getElementById('consumerTypeFilter').value;
  const tbody        = document.getElementById('consumerTableBody');
  const emptyMsg     = document.getElementById('consumerEmpty');

  // Filter based on search input and dropdowns
  const results = consumers.filter(c => {
    const matchSearch = c.fullName.toLowerCase().includes(search)
                     || c.consumerID.toLowerCase().includes(search)
                     || c.address.toLowerCase().includes(search)
                     || c.contactNumber.includes(search);
    const matchDist = !distFilter || c.districtID === distFilter;
    const matchType = !typeFilter || c.accountType === typeFilter;
    return matchSearch && matchDist && matchType;
  });

  // Show empty state if no results
  if (!results.length) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  // Build table rows
  tbody.innerHTML = results.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code style="font-size:0.78rem; color:#4d80e4">${c.consumerID}</code></td>
      <td><strong>${c.fullName}</strong></td>
      <td><code style="font-size:0.78rem; color:#666">${c.meterNo || '—'}</code></td>
      <td>${zonePill(c.districtID)}</td>
      <td style="color:#666; font-size:0.82rem">${c.address}</td>
      <td>${c.contactNumber}</td>
      <td><span style="font-size:0.8rem">${c.accountType}</span></td>
      <td>${statusPill(c.status)}</td>
      <td style="color:#aaa; font-size:0.8rem">${c.dateCreated}</td>
      <td>
        <button class="btn-edit-sm me-1" onclick="openEditConsumerModal('${c.consumerID}')">Edit</button>
        <button class="btn-del-sm" onclick="openDeleteConsumerModal('${c.consumerID}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── CREATE ────────────────────────────────────
async function saveConsumer() {
  const fullName = document.getElementById('inputFullName').value.trim();
  const contact  = document.getElementById('inputContact').value.trim();
  const address  = document.getElementById('inputAddress').value.trim();

  // Validate required fields
  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-fullName', fullName !== '');
  validate('fg-contact',  contact  !== '');
  validate('fg-address',  address  !== '');
  if (!valid) return;

  // ID is now generated server-side to avoid duplicates after deletions
  const fields = {
    district_id:    document.getElementById('inputDistrict').value,
    full_name:      fullName,
    address:        address,
    contact_number: contact,
    account_type:   document.getElementById('inputAccountType').value,
    status:         document.getElementById('inputStatus').value,
  };

  try {
    const res = await fetch(`${API}/consumers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    if (res.ok) {
      await loadConsumers(); // reload from DB
      closeModal('addConsumerModal');
      toast('Consumer added!');
      // Clear the form fields
      document.getElementById('inputFullName').value = '';
      document.getElementById('inputContact').value  = '';
      document.getElementById('inputAddress').value  = '';
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to add consumer.'));
    }
  } catch (e) {
    toast('Failed to add consumer: ' + e.message);
  }
}

// ── UPDATE ────────────────────────────────────
function openEditConsumerModal(id) {
  const c = consumers.find(x => x.consumerID === id);
  if (!c) return;

  document.getElementById('editConsumerId').value    = c.consumerID;
  document.getElementById('editMeterNo').value       = c.meterNo || '—';
  document.getElementById('editFullName').value      = c.fullName;
  document.getElementById('editContact').value       = c.contactNumber;
  document.getElementById('editAddress').value       = c.address;
  document.getElementById('editDistrict').value      = c.districtID;
  document.getElementById('editAccountType').value   = c.accountType;
  document.getElementById('editStatus').value        = c.status;

  openModal('editConsumerModal');
}

async function updateConsumer() {
  const id = document.getElementById('editConsumerId').value;
  const idx = consumers.findIndex(x => x.consumerID === id);
  if (idx === -1) return;

  const updateData = {
    full_name:      document.getElementById('editFullName').value.trim(),
    contact_number: document.getElementById('editContact').value.trim(),
    address:        document.getElementById('editAddress').value.trim(),
    district_id:    document.getElementById('editDistrict').value,
    account_type:   document.getElementById('editAccountType').value,
    status:         document.getElementById('editStatus').value,
  };

  try {
    const res = await fetch(`${API}/consumers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    if (res.ok) {
      await loadConsumers(); // Reload from database
      closeModal('editConsumerModal');
      toast('Consumer updated!');
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to update consumer.'));
    }
  } catch (e) {
    toast('Error updating consumer: ' + e.message);
  }
}

// ── DELETE ────────────────────────────────────
function openDeleteConsumerModal(id) {
  const c = consumers.find(x => x.consumerID === id);
  pendingDeleteConsumerId = id;
  document.getElementById('deleteConsumerMsg').textContent =
    `"${c?.fullName}" (${c?.consumerID}) will be permanently removed.`;
  openModal('deleteConsumerModal');
}

async function confirmDeleteConsumer() {
  try {
    const res = await fetch(`${API}/consumers/${pendingDeleteConsumerId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await loadConsumers(); // Reload from database
      closeModal('deleteConsumerModal');
      toast('Consumer deleted!');
      pendingDeleteConsumerId = null;
    } else {
      toast('Failed to delete consumer.');
    }
  } catch (e) {
    toast('Error deleting consumer: ' + e.message);
  }
}