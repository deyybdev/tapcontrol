/* =============================================
   payments.js
   CRUD logic for the Payments page
   ============================================= */

let payments = [];
let allPayConsumers = [];  // for consumer dropdown
let unpaidBills     = [];  // all unpaid bills, filtered per consumer

// ── Loaders ───────────────────────────────────

async function loadPayConsumerDropdown() {
  try {
    const res  = await fetch(`${API}/consumers`);
    allPayConsumers = await res.json();
    const dd = document.getElementById('inputPayConsumer');
    if (!dd) return;
    dd.innerHTML = '<option value="">— Select Consumer —</option>'
      + allPayConsumers
          .filter(c => c.status === 'Active')
          .map(c => `<option value="${c.consumer_id}">${c.full_name} (${c.consumer_id})</option>`)
          .join('');
  } catch (e) {
    console.error('Could not load consumers for payments', e);
  }
}

async function loadUnpaidBills() {
  try {
    const res = await fetch(`${API}/billing?status=Unpaid`);
    const data = await res.json();
    // Also grab Overdue bills
    const res2 = await fetch(`${API}/billing?status=Overdue`);
    const data2 = await res2.json();
    unpaidBills = [...data, ...data2];
  } catch (e) {
    console.error('Could not load unpaid bills', e);
  }
}

// When consumer selected → populate their unpaid bills
function onPayConsumerSelect() {
  const consumerId = document.getElementById('inputPayConsumer').value;
  const dd         = document.getElementById('inputPayBill');
  document.getElementById('inputPayAmount').value = '';

  if (!consumerId) {
    dd.innerHTML = '<option value="">— Select Consumer First —</option>';
    dd.disabled  = true;
    return;
  }

  const consumerBills = unpaidBills.filter(b => b.consumer_id === consumerId);
  if (!consumerBills.length) {
    dd.innerHTML = '<option value="">No unpaid bills for this consumer</option>';
    dd.disabled  = true;
    return;
  }

  dd.innerHTML = '<option value="">— Select Bill —</option>'
    + consumerBills.map(b =>
        `<option value="${b.id}" data-amount="${b.amount_due}">${b.id} — ₱${parseFloat(b.amount_due).toFixed(2)}</option>`
      ).join('');
  dd.disabled = false;
}

// When bill selected → auto-fill amount
function onPayBillSelect() {
  const dd  = document.getElementById('inputPayBill');
  const opt = dd.options[dd.selectedIndex];
  document.getElementById('inputPayAmount').value =
    opt && opt.dataset.amount ? parseFloat(opt.dataset.amount).toFixed(2) : '';
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
  await loadPayConsumerDropdown();
  await loadUnpaidBills();
  await loadPayments();
});

let pendingDeletePaymentId = null;

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
  const search       = document.getElementById('paymentSearch').value.toLowerCase();
  const methodFilter = document.getElementById('paymentMethodFilter').value;
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
  const consumerId = document.getElementById('inputPayConsumer').value;
  const billId     = document.getElementById('inputPayBill').value;
  const amount     = parseFloat(document.getElementById('inputPayAmount').value);

  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-payConsumer', consumerId !== '');
  validate('fg-payBill',     billId     !== '');
  validate('fg-payAmount',   !isNaN(amount) && amount > 0);
  if (!valid) return;

  const fields = {
    consumer_id:  consumerId,
    bill_id:      billId,
    amount:       amount,
    method:       document.getElementById('inputPayMethod').value,
    payment_date: document.getElementById('inputPayDate').value || new Date().toISOString().split('T')[0],
    received_by:  document.getElementById('inputPayReceived').value.trim() || null,
  };

  try {
    const res = await fetch(`${API}/payments`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
    if (res.ok) {
      // Reload both payments and unpaid bills so paid bill disappears from dropdown
      await Promise.all([loadUnpaidBills(), loadPayments()]);
      closeModal('addPaymentModal');
      toast('Payment recorded!');
      // Reset form
      document.getElementById('inputPayConsumer').value  = '';
      document.getElementById('inputPayBill').innerHTML  = '<option value="">— Select Consumer First —</option>';
      document.getElementById('inputPayBill').disabled   = true;
      document.getElementById('inputPayAmount').value    = '';
      document.getElementById('inputPayReceived').value  = '';
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