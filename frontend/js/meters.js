/* =============================================
   meters.js
   CRUD logic for the Meter Readings page
   ============================================= */

let meterReadings = [];

// ── Dropdown loaders ──────────────────────────

async function loadMeterDistrictDropdowns() {
  try {
    const res  = await fetch(`${API}/districts`);
    const data = await res.json();
    const options = data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    const addDd = document.getElementById('inputMeterDistrict');
    if (addDd) addDd.innerHTML = options;
    const filterDd = document.getElementById('meterDistrictFilter');
    if (filterDd) filterDd.innerHTML = '<option value="">All Districts</option>' + options;
  } catch (e) {
    console.error('Could not load districts for meters', e);
  }
}

// Populate Consumer dropdown — value = consumer_id, data attrs carry meter_no & district_id
async function loadConsumerDropdown() {
  try {
    const res  = await fetch(`${API}/consumers`);
    const data = await res.json();
    const dd   = document.getElementById('inputConsumer');
    if (!dd) return;
    dd.innerHTML = '<option value="">— Select Consumer —</option>'
      + data.map(c =>
          `<option value="${c.consumer_id}"
                   data-meter="${c.meter_no || ''}"
                   data-district="${c.district_id || ''}">
            ${c.full_name}
          </option>`
        ).join('');
  } catch (e) {
    console.error('Could not load consumers', e);
  }
}

// When a consumer is selected, auto-fill Meter No. and District
function onConsumerSelect() {
  const dd      = document.getElementById('inputConsumer');
  const opt     = dd.options[dd.selectedIndex];
  const meterNo = opt ? opt.dataset.meter    : '';
  const distId  = opt ? opt.dataset.district : '';
  document.getElementById('inputMeterNo').value = meterNo;
  const distDd = document.getElementById('inputMeterDistrict');
  if (distDd && distId) distDd.value = distId;
}

// Populate Reader dropdown — only Active Meter Reader staff
async function loadMeterReaderDropdown() {
  try {
    const res  = await fetch(`${API}/staff?role=Meter%20Reader`);
    const data = await res.json();
    const dd   = document.getElementById('inputReader');
    if (!dd) return;
    const active = data.filter(s => s.status === 'Active');
    if (!active.length) {
      dd.innerHTML = '<option value="">No active meter readers</option>';
      return;
    }
    dd.innerHTML = '<option value="">— Select Meter Reader —</option>'
      + active.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  } catch (e) {
    console.error('Could not load meter readers', e);
  }
}

// ── Data loader ───────────────────────────────

async function loadMeters() {
  const res  = await fetch(`${API}/meters`);
  const data = await res.json();
  meterReadings = data.map(r => ({
    id:         r.id,
    meterNo:    r.meter_no,
    consumer:   r.consumer_name,
    consumerId: r.consumer_id,
    district:   r.district_id,
    prev:       r.prev_reading,
    curr:       r.curr_reading,
    date:       r.reading_date
                  ? new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—',
    reader:     r.reader_name || '—',
  }));
  renderMeters();
}

document.addEventListener('DOMContentLoaded', async () => {
  await initDistrictMap();
  await loadMeterDistrictDropdowns();
  await loadConsumerDropdown();
  await loadMeterReaderDropdown();
  await loadMeters();
});

let pendingDeleteMeterId = null;

// ── READ ──────────────────────────────────────
function renderMeters() {
  const search     = document.getElementById('meterSearch').value.toLowerCase();
  const distFilter = document.getElementById('meterDistrictFilter').value;
  const tbody      = document.getElementById('meterTableBody');
  const emptyMsg   = document.getElementById('meterEmpty');

  const results = meterReadings.filter(r => {
    const matchSearch = r.meterNo.toLowerCase().includes(search)
                     || r.consumer.toLowerCase().includes(search);
    const matchDist = !distFilter || r.district === distFilter;
    return matchSearch && matchDist;
  });

  if (!results.length) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  tbody.innerHTML = results.map((r, i) => {
    const consumption = r.curr - r.prev;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><code>${r.meterNo}</code></td>
        <td>${r.consumer}</td>
        <td>${zonePill(r.district)}</td>
        <td>${r.prev.toLocaleString()}</td>
        <td>${r.curr.toLocaleString()}</td>
        <td><strong>${consumption.toLocaleString()} m³</strong></td>
        <td style="color:#aaa; font-size:0.82rem">${r.date}</td>
        <td>${r.reader}</td>
        <td>
          <button class="btn-del-sm" onclick="openDeleteMeterModal('${r.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── CREATE ────────────────────────────────────
async function saveMeterReading() {
  const consumerId = document.getElementById('inputConsumer').value;
  const meterNo    = document.getElementById('inputMeterNo').value.trim();
  const prev       = parseFloat(document.getElementById('inputPrev').value);
  const curr       = parseFloat(document.getElementById('inputCurr').value);

  let valid = true;
  const validate = (fieldId, condition) => {
    document.getElementById(fieldId).classList.toggle('has-error', !condition);
    if (!condition) valid = false;
  };
  validate('fg-consumer', consumerId !== '');
  validate('fg-meterNo',  meterNo    !== '');
  validate('fg-prev',     !isNaN(prev) && prev >= 0);
  validate('fg-curr',     !isNaN(curr) && curr >= prev);
  if (!valid) return;

  // Generate safe ID from highest existing numeric suffix
  const idRes      = await fetch(`${API}/meters`);
  const allReadings = await idRes.json();
  let nextNum = 1;
  if (allReadings.length) {
    const maxNum = allReadings.reduce((max, r) => {
      const m = r.id && r.id.match(/MR-(\d+)/);
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    nextNum = maxNum + 1;
  }
  const newID = 'MR-' + String(nextNum).padStart(3, '0');

  const payload = {
    id:           newID,
    meter_no:     meterNo,
    consumer_id:  consumerId,
    district_id:  document.getElementById('inputMeterDistrict').value,
    prev_reading: prev,
    curr_reading: curr,
    reading_date: document.getElementById('inputMeterDate').value
                    || new Date().toISOString().split('T')[0],
    reader_name:  document.getElementById('inputReader').value || null,
  };

  try {
    const res = await fetch(`${API}/meters`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (res.ok) {
      await loadMeters();
      closeModal('addMeterModal');
      toast('Meter reading added!');
      // Reset form
      document.getElementById('inputConsumer').value = '';
      document.getElementById('inputMeterNo').value  = '';
      document.getElementById('inputPrev').value     = '';
      document.getElementById('inputCurr').value     = '';
    } else {
      const err = await res.json();
      toast('Error: ' + (err.error || 'Failed to add meter reading.'));
    }
  } catch (e) {
    toast('Failed to add meter reading: ' + e.message);
  }
}

// ── DELETE ────────────────────────────────────
function openDeleteMeterModal(id) {
  const r = meterReadings.find(x => x.id === id);
  pendingDeleteMeterId = id;
  document.getElementById('deleteMeterMsg').textContent =
    `Reading for ${r?.meterNo} (${r?.consumer}) will be removed.`;
  openModal('deleteMeterModal');
}

function confirmDeleteMeter() {
  (async () => {
    try {
      const res = await fetch(`${API}/meters/${pendingDeleteMeterId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadMeters();
        closeModal('deleteMeterModal');
        toast('Meter reading deleted!');
        pendingDeleteMeterId = null;
      } else {
        toast('Failed to delete meter reading.');
      }
    } catch (e) {
      toast('Error deleting meter reading: ' + e.message);
    }
  })();
}
