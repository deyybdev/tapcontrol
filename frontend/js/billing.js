/* =============================================
   billing.js
   CRUD logic for the Billing Records page
   ============================================= */

let bills = [];
let allBillConsumers = []; // cached for district filtering

// ── Dropdown loaders ──────────────────────────

async function loadBillingDistrictDropdown() {
  try {
    const res  = await fetch(`${API}/districts`);
    const data = await res.json();
    const dd   = document.getElementById('inputBillDistrict');
    if (!dd) return;
    dd.innerHTML = '<option value="">— Select District —</option>'
      + data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  } catch (e) {
    console.error('Could not load districts for billing', e);
  }
}

async function loadBillingConsumers() {
  try {
    const res = await fetch(`${API}/consumers`);
    allBillConsumers = await res.json();
  } catch (e) {
    console.error('Could not load consumers for billing', e);
  }
}

// When district is selected, filter consumer dropdown
function onBillDistrictSelect() {
  const distId = document.getElementById('inputBillDistrict').value;
  const dd     = document.getElementById('inputBillConsumer');
  document.getElementById('inputBillMeterNo').value = '';
  dd.value = '';

  if (!distId) {
    dd.innerHTML = '<option value="">— Select District First —</option>';
    dd.disabled  = true;
    return;
  }

  const filtered = allBillConsumers.filter(c => c.district_id === distId && c.status === 'Active');
  if (!filtered.length) {
    dd.innerHTML = '<option value="">No active consumers in this district</option>';
    dd.disabled  = true;
    return;
  }

  dd.innerHTML = '<option value="">— Select Consumer —</option>'
    + filtered.map(c =>
        `<option value="${c.consumer_id}" data-meter="${c.meter_no || ''}">${c.full_name}</option>`
      ).join('');
  dd.disabled = false;
}

// When consumer is selected, auto-fill Meter No.
function onBillConsumerSelect() {
  const dd  = document.getElementById('inputBillConsumer');
  const opt = dd.options[dd.selectedIndex];
  document.getElementById('inputBillMeterNo').value = opt ? (opt.dataset.meter || '—') : '';
}

async function loadBilling() {
  const res = await fetch(`${API}/billing`);
  const data = await res.json();
  bills = data.map(b => ({
    id:          b.id,
    consumer:    b.consumer_name,
    consumerId:  b.consumer_id,
    consumption: parseFloat(b.consumption)  || 0,
    amount:      parseFloat(b.amount_due)   || 0,
    dueDate:     b.due_date ? new Date(b.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    status:      b.status,
    createdAt:   b.created_at,
  }));
  renderBilling();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadBillingDistrictDropdown();
  await loadBillingConsumers();
  await loadBilling();
});

let pendingDeleteBillId = null;

// Helper: colored status badge
function billStatusPill(s) {
  const cls = s === 'Paid' ? 's-active' : s === 'Overdue' ? 's-inactive' : 's-maintenance';
  const col = s === 'Paid' ? '#1D9E75' : s === 'Overdue' ? '#e74c3c' : '#BA7517';
  return `<span class="status-pill ${cls}"><span class="s-dot" style="background:${col}"></span>${s}</span>`;
}

// Maynilad 2025 tiered rate — mirrors backend calcMayniladBill()
function calcMayniladBill(m3) {
  m3 = parseFloat(m3) || 0;
  if (m3 <= 0)  return 0;
  if (m3 <= 10) return 181.59;
  if (m3 <= 20) return 181.59 + (m3 - 10) * 50.09;
  if (m3 <= 30) return 682.66 + (m3 - 20) * 46.61;
  return 1148.73 + (m3 - 30) * 65.62;
}

// Auto-calculate amount when consumption is entered
function calcBillAmount() {
  const m3 = parseFloat(document.getElementById('inputConsumption').value) || 0;
  document.getElementById('inputAmountDue').value = calcMayniladBill(m3).toFixed(2);
}

// ── STATS ─────────────────────────────────────
function updateBillingStats() {
  const total       = bills.reduce((sum, b) => sum + b.amount, 0);
  const collected   = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.amount, 0);
  const unpaid      = bills.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + b.amount, 0);
  const unpaidCount = bills.filter(b => b.status !== 'Paid').length;
  const rate        = total > 0 ? ((collected / total) * 100).toFixed(1) : '0.0';

  document.getElementById('b-total').textContent       = '₱' + total.toLocaleString('en-US', { minimumFractionDigits: 2 });
  document.getElementById('b-collected').textContent   = '₱' + collected.toLocaleString('en-US', { minimumFractionDigits: 2 });
  document.getElementById('b-unpaid').textContent      = '₱' + unpaid.toLocaleString('en-US', { minimumFractionDigits: 2 });
  document.getElementById('b-rate').textContent        = rate + '%';
  document.getElementById('b-unpaid-count').textContent = unpaidCount;
}

// ── READ ──────────────────────────────────────
function renderBilling() {
  updateBillingStats();

  const search       = document.getElementById('billingSearch').value.toLowerCase();
  const statusFilter = document.getElementById('billingStatusFilter').value;
  const tbody        = document.getElementById('billingTableBody');
  const emptyMsg     = document.getElementById('billingEmpty');

  const results = bills.filter(b => {
    const matchSearch = b.consumer.toLowerCase().includes(search)
                     || b.id.toLowerCase().includes(search);
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!results.length) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  tbody.innerHTML = results.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code>${b.id}</code></td>
      <td>${b.consumer}</td>
      <td>${b.consumption} m³</td>
      <td><strong>₱${b.amount.toFixed(2)}</strong></td>
      <td>${b.dueDate}</td>
      <td>${billStatusPill(b.status)}</td>
      <td>
        <button class="btn-edit-sm me-1" onclick="openEditBillModal('${b.id}')">Edit</button>
        <button class="btn-del-sm" onclick="openDeleteBillModal('${b.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── CREATE ────────────────────────────────────
async function saveBill() {
  const consumerId  = document.getElementById('inputBillConsumer').value;
  const consumption = parseFloat(document.getElementById('inputConsumption').value);

  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-billDistrict', document.getElementById('inputBillDistrict').value !== '');
  validate('fg-billConsumer', consumerId !== '');
  validate('fg-consumption',  !isNaN(consumption) && consumption >= 0);
  if (!valid) return;

  // ID is now generated server-side
  const fields = {
    consumer_id: consumerId,
    consumption: consumption,
    amount_due:  parseFloat(document.getElementById('inputAmountDue').value) || calcMayniladBill(consumption),
    due_date:    document.getElementById('inputDueDate').value || null,
    status:      document.getElementById('inputBillStatus').value,
  };

  try {
    const res = await fetch(`${API}/billing`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
    if (res.ok) {
      await loadBilling();
      closeModal('addBillingModal');
      toast('Billing record added!');
      // Reset form
      document.getElementById('inputBillDistrict').value  = '';
      document.getElementById('inputBillConsumer').innerHTML = '<option value="">— Select District First —</option>';
      document.getElementById('inputBillConsumer').disabled  = true;
      document.getElementById('inputBillMeterNo').value   = '';
      document.getElementById('inputConsumption').value   = '';
      document.getElementById('inputAmountDue').value     = '';
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to add billing record.'));
    }
  } catch (e) {
    toast('Failed to add billing record: ' + e.message);
  }
}

// ── UPDATE ────────────────────────────────────
function openEditBillModal(id) {
  const b = bills.find(x => x.id === id);
  if (!b) return;

  document.getElementById('editBillId').value       = b.id;
  document.getElementById('editBillConsumer').value = b.consumer;
  document.getElementById('editConsumption').value  = b.consumption;
  document.getElementById('editAmountDue').value    = b.amount.toFixed(2);
  document.getElementById('editBillStatus').value   = b.status;

  openModal('editBillingModal');
}

function updateBill() {
  const id = document.getElementById('editBillId').value;
  const b  = bills.find(x => x.id === id);
  if (!b) return;

  const updateData = {
    consumer_id: b.consumerId,   // preserve existing consumer_id
    consumption: parseFloat(document.getElementById('editConsumption').value) || 0,
    amount_due:  parseFloat(document.getElementById('editAmountDue').value) || 0,
    status:      document.getElementById('editBillStatus').value,
  };

  (async () => {
    try {
      const res = await fetch(`${API}/billing/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updateData),
      });
      if (res.ok) {
        await loadBilling();
        closeModal('editBillingModal');
        toast('Billing record updated!');
      } else {
        toast('Failed to update billing record.');
      }
    } catch (e) {
      toast('Error updating billing record: ' + e.message);
    }
  })();
}

// ── DELETE ────────────────────────────────────
function openDeleteBillModal(id) {
  const b = bills.find(x => x.id === id);
  pendingDeleteBillId = id;
  document.getElementById('deleteBillMsg').textContent =
    `Bill ${b?.id} for "${b?.consumer}" will be permanently removed.`;
  openModal('deleteBillingModal');
}

function confirmDeleteBill() {
  (async () => {
    try {
      const res = await fetch(`${API}/billing/${pendingDeleteBillId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadBilling();
        closeModal('deleteBillingModal');
        toast('Bill deleted!');
        pendingDeleteBillId = null;
      } else {
        toast('Failed to delete bill.');
      }
    } catch (e) {
      toast('Error deleting bill: ' + e.message);
    }
  })();
}