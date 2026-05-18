/* =============================================
   payments.js
   CRUD logic for the Payments page
   ============================================= */

// Starts empty — data will come from the backend API later
let payments = [];

async function loadPayments() {
  const res = await fetch(`${API}/payments`);
  const data = await res.json();
  // Convert field names from backend
  payments = data.map(p => ({
    id: p.id,
    consumer: p.consumer_name,
    consumerId: p.consumer_id,
    bill: p.bill_id,
    amount: p.amount,
    method: p.method,
    date: p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    received: p.received_by || '—',
  }));
  renderPayments();
}

document.addEventListener('DOMContentLoaded', loadPayments);

let pendingDeletePaymentId = null;

// Helper: payment method badge
function methodBadge(method) {
  const styles = {
    'Cash':          { cls: 's-active',      col: '#1D9E75' },
    'GCash':         { cls: 's-maintenance', col: '#BA7517' },
    'Bank Transfer': { cls: 's-inactive',    col: '#3B4FE4' },
  };
  const s = styles[method] || styles['Cash'];
  return `<span class="status-pill ${s.cls}"><span class="s-dot" style="background:${s.col}"></span>${method}</span>`;
}

// Update the stat counters above the table
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
      <td><code>${p.id}</code></td>
      <td>${p.consumer}</td>
      <td><code>${p.bill}</code></td>
      <td><strong>₱${p.amount.toFixed(2)}</strong></td>
      <td>${methodBadge(p.method)}</td>
      <td style="color:#aaa; font-size:0.82rem">${p.date}</td>
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
  const consumerId = document.getElementById('inputPayConsumer').value.trim();
  const billId     = document.getElementById('inputPayBill').value.trim();
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

  // Generate next PAY ID
  const lastNum = payments.length ? parseInt(payments[0].id.split('-')[1]) : 0;
  const newID = 'PAY-' + String(lastNum + 1).padStart(3, '0');

  // FIX: use snake_case field names to match what the backend expects
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newID, ...fields })
    });
    if (res.ok) {
      await loadPayments(); // reload from DB
      closeModal('addPaymentModal');
      toast('Payment recorded!');
      // Clear form
      ['inputPayConsumer', 'inputPayBill', 'inputPayAmount', 'inputPayReceived'].forEach(id => {
        document.getElementById(id).value = '';
      });
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to record payment.'));
    }
  } catch (e) {
    toast('Failed to record payment: ' + e.message);
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
      const res = await fetch(`${API}/payments/${pendingDeletePaymentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadPayments(); // Reload from database
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