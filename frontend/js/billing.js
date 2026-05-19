/* =============================================
   billing.js
   CRUD logic for the Billing Records page
   ============================================= */

// Starts empty — data will come from the backend API later
let bills = [];

async function loadBilling() {
  const res = await fetch(`${API}/billing`);
  const data = await res.json();
  // Convert field names from backend
  bills = data.map(b => ({
    id: b.id,
    consumer: b.consumer_name,
    consumerId: b.consumer_id,
    consumption: b.consumption,
    amount: b.amount_due,
    dueDate: b.due_date ? new Date(b.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    status: b.status,
    createdAt: b.created_at,
  }));
  renderBilling();
}

document.addEventListener('DOMContentLoaded', loadBilling);

let pendingDeleteBillId = null;

// Helper: colored status badge
function billStatusPill(s) {
  const cls = s === 'Paid' ? 's-active' : s === 'Overdue' ? 's-inactive' : 's-maintenance';
  const col = s === 'Paid' ? '#1D9E75' : s === 'Overdue' ? '#e74c3c' : '#BA7517';
  return `<span class="status-pill ${cls}"><span class="s-dot" style="background:${col}"></span>${s}</span>`;
}

// Auto-calculate amount when consumption is entered (₱0.76 per m³)
function calcBillAmount() {
  const consumption = parseFloat(document.getElementById('inputConsumption').value) || 0;
  document.getElementById('inputAmountDue').value = (consumption * 0.76).toFixed(2);
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
  const consumerId  = document.getElementById('inputBillConsumerId')?.value || document.getElementById('inputBillConsumer').value;
  const consumption = parseFloat(document.getElementById('inputConsumption').value);

  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-billConsumer', consumerId !== '');
  validate('fg-consumption',  !isNaN(consumption) && consumption >= 0);
  if (!valid) return;

  const newID = 'BL-' + String(bills.length + 1).padStart(3, '0');

  const fields = {
    consumer_id: consumerId,
    consumption: consumption,
    amount_due: parseFloat(document.getElementById('inputAmountDue').value) || consumption * 0.76,
    due_date: document.getElementById('inputDueDate').value || null,
    status: document.getElementById('inputBillStatus').value,
  };

  try {
    const res = await fetch(`${API}/billing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newID, ...fields })
    });
    if (res.ok) {
      await loadBilling(); // reload from DB
      closeModal('addBillingModal');
      toast('Billing record added!');
      document.getElementById('inputConsumption').value = '';
      document.getElementById('inputAmountDue').value = '';
    } else {
      toast('Failed to add billing record.');
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
  document.getElementById('editAmountDue').value    = b.amount;
  document.getElementById('editBillStatus').value   = b.status;

  openModal('editBillingModal');
}

function updateBill() {
  const id = document.getElementById('editBillId').value;

  const updateData = {
    consumption: parseFloat(document.getElementById('editConsumption').value) || 0,
    amount_due: parseFloat(document.getElementById('editAmountDue').value) || 0,
    status: document.getElementById('editBillStatus').value,
  };

  (async () => {
    try {
      const res = await fetch(`${API}/billing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        await loadBilling(); // Reload from database
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
      const res = await fetch(`${API}/billing/${pendingDeleteBillId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadBilling(); // Reload from database
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