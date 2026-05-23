/* =============================================
   payments.js
   CRUD logic for the Payments page
   ============================================= */

let payments        = [];
let allPayConsumers = [];   // cache of all active consumers
let unpaidBills     = [];   // all unpaid + overdue bills
let allBillingStaff = [];   // cache of all active Billing Officers

// ── Loaders ───────────────────────────────────

async function loadPayDistrictDropdown() {
  try {
    const res  = await fetch(`${API}/districts`);
    const data = await res.json();
    const dd   = document.getElementById('inputPayDistrict');
    if (!dd) return;
    dd.innerHTML = '<option value="">— Select District —</option>'
      + data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  } catch (e) {
    console.error('Could not load districts for payments', e);
  }
}

async function loadPayConsumersCache() {
  try {
    const res       = await fetch(`${API}/consumers`);
    allPayConsumers = await res.json();
  } catch (e) {
    console.error('Could not load consumers for payments', e);
  }
}

async function loadUnpaidBills() {
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${API}/billing?status=Unpaid`),
      fetch(`${API}/billing?status=Overdue`),
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    unpaidBills = [...d1, ...d2];
  } catch (e) {
    console.error('Could not load unpaid bills', e);
  }
}

async function loadBillingStaffCache() {
  try {
    const res       = await fetch(`${API}/staff?role=Billing%20Officer`);
    const data      = await res.json();
    allBillingStaff = data.filter(s => s.status === 'Active');
  } catch (e) {
    console.error('Could not load billing officers', e);
  }
}

async function loadPayments() {
  const res  = await fetch(`${API}/payments`);
  const data = await res.json();
  payments = data.map(p => ({
    id:         p.id,
    consumer:   p.consumer_name,
    consumerId: p.consumer_id,
    bill:       p.bill_id,
    amount:     parseFloat(p.amount) || 0,
    method:     p.method,
    date:       p.payment_date
                  ? new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—',
    rawDate:    p.payment_date
                  ? new Date(p.payment_date).toISOString().split('T')[0]
                  : '',
    received:   p.received_by || '—',
  }));
  renderPayments();
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadPayDistrictDropdown(),
    loadPayConsumersCache(),
    loadUnpaidBills(),
    loadBillingStaffCache(),
    loadPayments(),
  ]);
});

let pendingDeletePaymentId = null;

// ── Chain Handlers ────────────────────────────

// Step 1: District selected → populate Consumer dropdown
function onPayDistrictSelect() {
  const districtId     = document.getElementById('inputPayDistrict').value;
  const consumerDD     = document.getElementById('inputPayConsumer');
  const billDD         = document.getElementById('inputPayBill');
  const receivedDD     = document.getElementById('inputPayReceived');

  // Reset downstream fields
  document.getElementById('inputPayAmount').value = '';
  billDD.innerHTML = '<option value="">— Select Consumer First —</option>';
  billDD.disabled  = true;

  if (!districtId) {
    consumerDD.innerHTML = '<option value="">— Select District First —</option>';
    consumerDD.disabled  = true;
    receivedDD.innerHTML = '<option value="">— Select District First —</option>';
    receivedDD.disabled  = true;
    return;
  }

  // Filter active consumers in this district
  const filtered = allPayConsumers.filter(c => c.district_id === districtId && c.status === 'Active');
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

  // Filter Billing Officers assigned to this district
  const officers = allBillingStaff.filter(s => s.district_id === districtId);
  if (!officers.length) {
    receivedDD.innerHTML = '<option value="">No Billing Officers in this district</option>';
    receivedDD.disabled  = true;
  } else {
    receivedDD.innerHTML = '<option value="">— Select Officer —</option>'
      + officers.map(s =>
          `<option value="${s.name}">${s.name} (${s.staff_id})</option>`
        ).join('');
    receivedDD.disabled = false;
  }
}

// Step 2: Consumer selected → populate unpaid bills
function onPayConsumerSelect() {
  const consumerId = document.getElementById('inputPayConsumer').value;
  const billDD     = document.getElementById('inputPayBill');
  document.getElementById('inputPayAmount').value = '';

  if (!consumerId) {
    billDD.innerHTML = '<option value="">— Select Consumer First —</option>';
    billDD.disabled  = true;
    return;
  }

  const consumerBills = unpaidBills.filter(b => b.consumer_id === consumerId);
  if (!consumerBills.length) {
    billDD.innerHTML = '<option value="">No unpaid bills for this consumer</option>';
    billDD.disabled  = true;
    return;
  }

  billDD.innerHTML = '<option value="">— Select Bill —</option>'
    + consumerBills.map(b =>
        `<option value="${b.id}" data-amount="${b.amount_due}">${b.id} — ₱${parseFloat(b.amount_due).toFixed(2)}</option>`
      ).join('');
  billDD.disabled = false;
}

// Step 3: Bill selected → auto-fill amount
function onPayBillSelect() {
  const dd  = document.getElementById('inputPayBill');
  const opt = dd.options[dd.selectedIndex];
  document.getElementById('inputPayAmount').value =
    opt && opt.dataset.amount ? parseFloat(opt.dataset.amount).toFixed(2) : '';
}

// ── Helpers ───────────────────────────────────

function methodBadge(method) {
  const styles = {
    'Cash':          { cls: 's-active',      col: '#1D9E75' },
    'GCash':         { cls: 's-maintenance', col: '#BA7517' },
    'Bank Transfer': { cls: 's-inactive',    col: '#3B4FE4' },
  };
  const s = styles[method] || styles['Cash'];
  return `<span class="status-pill ${s.cls}"><span class="s-dot" style="background:${s.col}"></span>${method}</span>`;
}

function updatePaymentStats() {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  document.getElementById('p-total').textContent = '₱' + total.toLocaleString('en-US', { minimumFractionDigits: 2 });
  document.getElementById('p-count').textContent = payments.length;
  document.getElementById('p-cash').textContent  = payments.filter(p => p.method === 'Cash').length;
  document.getElementById('p-gcash').textContent = payments.filter(p => p.method === 'GCash' || p.method === 'Bank Transfer').length;
}

// ── READ ──────────────────────────────────────
function renderPayments() {
  const search       = (document.getElementById('paymentSearch')?.value || '').toLowerCase();
  const methodFilter = document.getElementById('paymentMethodFilter')?.value || '';
  const tbody        = document.getElementById('paymentTableBody');
  const emptyMsg     = document.getElementById('paymentEmpty');

  const results = payments.filter(p => {
    const matchSearch = p.consumer.toLowerCase().includes(search)
                     || p.id.toLowerCase().includes(search)
                     || p.bill.toLowerCase().includes(search);
    const matchMethod = !methodFilter || p.method === methodFilter;
    return matchSearch && matchMethod;
  });

  updatePaymentStats();

  if (!results.length) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  tbody.innerHTML = results.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code style="font-size:.78rem;color:#4d80e4">${p.id}</code></td>
      <td><strong>${p.consumer}</strong></td>
      <td><code style="font-size:.78rem;color:#666">${p.bill}</code></td>
      <td><strong>₱${p.amount.toFixed(2)}</strong></td>
      <td>${methodBadge(p.method)}</td>
      <td style="color:#aaa;font-size:.82rem">${p.date}</td>
      <td>${p.received}</td>
      <td>
        <button class="btn-edit-sm me-1" onclick="openEditPaymentModal('${p.id}')">Edit</button>
        <button class="btn-del-sm" onclick="openDeletePaymentModal('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── CREATE ────────────────────────────────────
async function savePayment() {
  const districtId = document.getElementById('inputPayDistrict').value;
  const consumerId = document.getElementById('inputPayConsumer').value;
  const billId     = document.getElementById('inputPayBill').value;
  const amount     = parseFloat(document.getElementById('inputPayAmount').value);
  const received   = document.getElementById('inputPayReceived').value;

  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-payDistrict', districtId !== '');
  validate('fg-payConsumer', consumerId !== '');
  validate('fg-payBill',     billId     !== '');
  validate('fg-payAmount',   !isNaN(amount) && amount > 0);
  validate('fg-payReceived', received   !== '');
  if (!valid) return;

  const fields = {
    consumer_id:  consumerId,
    bill_id:      billId,
    amount:       amount,
    method:       document.getElementById('inputPayMethod').value,
    payment_date: document.getElementById('inputPayDate').value || new Date().toISOString().split('T')[0],
    received_by:  received || null,
  };

  try {
    const res = await fetch(`${API}/payments`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
    if (res.ok) {
      await Promise.all([loadUnpaidBills(), loadPayments()]);
      closeModal('addPaymentModal');
      toast('Payment recorded!');
      // Reset form
      document.getElementById('inputPayDistrict').value  = '';
      document.getElementById('inputPayConsumer').innerHTML = '<option value="">— Select District First —</option>';
      document.getElementById('inputPayConsumer').disabled  = true;
      document.getElementById('inputPayBill').innerHTML     = '<option value="">— Select Consumer First —</option>';
      document.getElementById('inputPayBill').disabled      = true;
      document.getElementById('inputPayAmount').value       = '';
      document.getElementById('inputPayReceived').innerHTML = '<option value="">— Select District First —</option>';
      document.getElementById('inputPayReceived').disabled  = true;
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to record payment.'));
    }
  } catch (e) {
    toast('Failed to record payment: ' + e.message);
  }
}

// ── UPDATE ────────────────────────────────────
function openEditPaymentModal(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editPayId').value       = p.id;
  document.getElementById('editPayConsumer').value = p.consumer;
  document.getElementById('editPayBill').value     = p.bill;
  document.getElementById('editPayAmount').value   = p.amount.toFixed(2);
  document.getElementById('editPayMethod').value   = p.method;
  document.getElementById('editPayDate').value     = p.rawDate;
  document.getElementById('editPayReceived').value = p.received === '—' ? '' : p.received;
  openModal('editPaymentModal');
}

async function updatePayment() {
  const id = document.getElementById('editPayId').value;
  const p  = payments.find(x => x.id === id);
  if (!p) return;

  const updateData = {
    consumer_id: p.consumerId,
    bill_id:     p.bill,
    amount:      parseFloat(document.getElementById('editPayAmount').value) || 0,
    method:      document.getElementById('editPayMethod').value,
    received_by: document.getElementById('editPayReceived').value.trim() || null,
  };

  try {
    const res = await fetch(`${API}/payments/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updateData),
    });
    if (res.ok) {
      await loadPayments();
      closeModal('editPaymentModal');
      toast('Payment updated!');
    } else {
      toast('Failed to update payment.');
    }
  } catch (e) {
    toast('Error updating payment: ' + e.message);
  }
}

// ── DELETE ────────────────────────────────────
function openDeletePaymentModal(id) {
  const p = payments.find(x => x.id === id);
  pendingDeletePaymentId = id;
  document.getElementById('deletePaymentMsg').textContent =
    `Payment ${p?.id} from "${p?.consumer}" will be permanently removed.`;
  openModal('deletePaymentModal');
}

function confirmDeletePayment() {
  (async () => {
    try {
      const res = await fetch(`${API}/payments/${pendingDeletePaymentId}`, { method: 'DELETE' });
      if (res.ok) {
        await Promise.all([loadUnpaidBills(), loadPayments()]);
        closeModal('deletePaymentModal');
        toast('Payment deleted!');
        pendingDeletePaymentId = null;
      } else {
        toast('Failed to delete payment.');
      }
    } catch (e) {
      toast('Error deleting payment: ' + e.message);
    }
  })();
}