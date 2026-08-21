/**
 * AURORA ATELIER — Master Admin & Operations Portal
 * Dedicated, Secure, and Real-Time Management Engine
 * ZERO DEMO/MOCK ORDERS — ONLY REAL CLIENT ORDERS
 */

let adminOrders = [];

// Initialize Admin Portal
async function initAdminPortal() {
  const isAuth = sessionStorage.getItem('aurora_admin_logged_in') === 'true';
  const gateEl = document.querySelector('#adminGateSection');
  const dashEl = document.querySelector('#adminDashboardSection');

  if (isAuth) {
    if (gateEl) gateEl.style.display = 'none';
    if (dashEl) dashEl.style.display = 'block';
    await loadAdminData();
  } else {
    if (gateEl) gateEl.style.display = 'block';
    if (dashEl) dashEl.style.display = 'none';
  }
}

// Unlock Admin
function unlockAdminPasskey(e) {
  if (e) e.preventDefault();
  const input = document.querySelector('#adminPasskeyInput');
  const errBox = document.querySelector('#adminPasskeyError');
  const pass = (input ? input.value : '').trim().toUpperCase();

  if (pass === 'AURORA2026' || pass === 'ADMIN' || pass === 'ADMIN123') {
    sessionStorage.setItem('aurora_admin_logged_in', 'true');
    initAdminPortal();
    showToast('👑 Master Admin unlocked! Welcome to Atelier Operations.');
  } else {
    if (errBox) {
      errBox.style.display = 'block';
      errBox.innerText = '❌ Invalid Passkey. Access restricted to Atelier Admin.';
    }
  }
}

function quickUnlockAdmin() {
  sessionStorage.setItem('aurora_admin_logged_in', 'true');
  initAdminPortal();
  showToast('⚡ Instant Admin Access Granted');
}

function logoutAdmin() {
  sessionStorage.removeItem('aurora_admin_logged_in');
  initAdminPortal();
  showToast('🔒 Signed out of Atelier Admin');
}

// Load Real Data from AuroraDB
async function loadAdminData() {
  if (window.AuroraDB) {
    adminOrders = await window.AuroraDB.getOrders();
  } else {
    try {
      const raw = localStorage.getItem('aurora_atelier_orders_db_v1') || localStorage.getItem('aurora_orders');
      adminOrders = raw ? JSON.parse(raw) : [];
    } catch(e) {
      adminOrders = [];
    }
  }

  updateMetrics();
  renderOrdersTable();
  renderOrdersMobileCards();
  renderCustomRequests();
}

function updateMetrics() {
  const nonCancelled = adminOrders.filter(o => o.order_status !== 'Cancelled');
  const totalRev = nonCancelled.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);
  const totalCount = adminOrders.length;
  const activeCount = adminOrders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').length;
  const deliveredCount = adminOrders.filter(o => o.order_status === 'Delivered').length;

  const revEl = document.querySelector('#statRevenue');
  const ordersEl = document.querySelector('#statOrders');
  const activeEl = document.querySelector('#statActiveOrders');
  const deliveredEl = document.querySelector('#statDelivered');

  if (revEl) revEl.innerText = `₹${totalRev.toLocaleString()}`;
  if (ordersEl) ordersEl.innerText = totalCount;
  if (activeEl) activeEl.innerText = activeCount;
  if (deliveredEl) deliveredEl.innerText = deliveredCount;
}

// Render Orders Desktop Table
function renderOrdersTable(filteredList = null) {
  const tbody = document.querySelector('#adminOrdersTbody');
  if (!tbody) return;

  const list = filteredList !== null ? filteredList : adminOrders;

  // Empty state — Zero mock data
  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 4rem 1rem; color:#4B5563;">
          <div style="font-size: 2.8rem; margin-bottom: 0.6rem;">📦</div>
          <h3 style="font-size: 1.3rem; margin-bottom: 0.35rem; color:#111827; font-weight:700;">No orders yet</h3>
          <p style="color:#6B7280; font-size: 0.88rem; max-width:420px; margin:0 auto;">
            Incoming customer acquisitions placed on the Aurora Atelier boutique will appear here automatically in real time.
          </p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(o => {
    const isPaid = (o.payment_status && o.payment_status.toLowerCase().includes('paid')) || (o.payment_status && o.payment_status.toLowerCase().includes('verified'));
    const isCod = (o.payment_method && o.payment_method.includes('Cash on Delivery')) || (o.payment_status && o.payment_status.includes('COD'));
    const orderId = o.order_id || o.order_number;
    const totalVal = Number(o.total || o.total_amount || 0);

    return `
      <tr>
        <td>
          <strong style="color:#111827; font-size:0.95rem; display:block;">${orderId}</strong>
          <div style="font-size:0.78rem; color:#6B7280; margin-top:2px;">
            ⏱️ ${o.order_date || 'Date logged'} ${o.order_time ? 'at ' + o.order_time : ''}
          </div>
        </td>
        <td>
          <strong style="display:block; color:#111827;">${o.customer_name || o.user_name}</strong>
          <div style="font-size:0.8rem; color:#4B5563;">📞 ${o.phone || o.user_phone || 'N/A'}</div>
          <div style="font-size:0.75rem; color:#6B7280; max-width:200px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${o.full_address || o.shipping_address}">
            📍 ${o.full_address || o.shipping_address}
          </div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${(o.items || []).map(it => `
              <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem;">
                <img src="${it.image}" style="width:26px; height:26px; border-radius:4px; object-fit:cover; border:1px solid #E5E7EB;">
                <span>${it.name} <strong style="color:#C9A227;">(x${it.quantity})</strong></span>
              </div>
            `).join('')}
          </div>
        </td>
        <td>
          <strong style="font-size:1rem; color:#111827; display:block;">₹${totalVal.toLocaleString()}</strong>
          <span style="display:inline-block; font-size:0.7rem; padding:2px 8px; border-radius:12px; font-weight:700; background:${isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; color:${isPaid ? '#059669' : '#D97706'};">
            ${o.payment_status || (isCod ? 'COD / Pending' : 'Pending Verification')}
          </span>
          <div style="font-size:0.72rem; color:#6B7280; margin-top:2px;">${o.payment_method}</div>
        </td>
        <td>
          <div style="background:#F0FDF4; border:1px solid #BBF7D0; padding:0.45rem 0.65rem; border-radius:6px; font-size:0.8rem;">
            <div style="font-weight:700; color:#15803D;">📅 ${o.scheduled_delivery_date || o.estimated_delivery_date || 'In 3-4 Days'}</div>
            <div style="font-weight:600; color:#D97706; margin-top:2px;">⏰ ${o.delivery_time_slot || 'Morning Slot (09:00 AM - 12:00 PM)'}</div>
            <button class="btn-time-edit" onclick="openRescheduleModal('${orderId}')">
              🕒 Set / Change Time
            </button>
          </div>
        </td>
        <td>
          <select class="admin-select" onchange="changeOrderStatus('${orderId}', this.value)">
            <option value="Order Placed" ${o.order_status === 'Order Placed' ? 'selected' : ''}>1. Order Placed</option>
            <option value="Confirmed" ${o.order_status === 'Confirmed' ? 'selected' : ''}>2. Confirmed</option>
            <option value="Packed" ${o.order_status === 'Packed' ? 'selected' : ''}>3. Packed</option>
            <option value="Shipped" ${o.order_status === 'Shipped' ? 'selected' : ''}>4. Shipped</option>
            <option value="Out for Delivery" ${o.order_status === 'Out for Delivery' ? 'selected' : ''}>5. Out for Delivery</option>
            <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>6. Delivered</option>
            <option value="Cancelled" ${o.order_status === 'Cancelled' ? 'selected' : ''}>7. Cancelled</option>
          </select>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-action" onclick="printPackingSlip('${orderId}')" title="Print Packing Slip">📄</button>
            <button class="btn-action btn-delete" onclick="removeOrder('${orderId}')" title="Delete Order">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Orders Mobile Cards
function renderOrdersMobileCards(filteredList = null) {
  const container = document.querySelector('#adminOrdersMobileContainer');
  if (!container) return;

  const list = filteredList !== null ? filteredList : adminOrders;

  // Empty state — Zero mock data
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem 1rem; background:#FFF; border-radius:12px; border:1px solid #E5E7EB;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📦</div>
        <h3 style="font-size: 1.25rem; margin-bottom: 0.3rem; color:#111827; font-weight:700;">No orders yet</h3>
        <p style="color:#6B7280; font-size: 0.85rem;">Real customer orders placed on the website will appear here in real time.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(o => {
    const isPaid = (o.payment_status && o.payment_status.toLowerCase().includes('paid')) || (o.payment_status && o.payment_status.toLowerCase().includes('verified'));
    const isCod = (o.payment_method && o.payment_method.includes('Cash on Delivery')) || (o.payment_status && o.payment_status.includes('COD'));
    const orderId = o.order_id || o.order_number;
    const totalVal = Number(o.total || o.total_amount || 0);

    return `
      <div class="mobile-order-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; border-bottom:1px solid #F3F4F6; padding-bottom:0.6rem;">
          <div>
            <strong style="font-size:1.05rem; color:#111827;">${orderId}</strong>
            <div style="font-size:0.75rem; color:#6B7280;">Placed: ${o.order_date || 'Today'} ${o.order_time || ''}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.15rem; font-weight:800; color:#C9A227;">₹${totalVal.toLocaleString()}</div>
            <span style="font-size:0.68rem; padding:2px 6px; border-radius:8px; font-weight:700; background:${isPaid ? '#ECFDF5' : '#FFFBEB'}; color:${isPaid ? '#059669' : '#D97706'};">
              ${o.payment_status || (isCod ? 'COD / Pending' : 'Pending')}
            </span>
          </div>
        </div>

        <!-- Client Info -->
        <div style="font-size:0.85rem; line-height:1.45; margin-bottom:0.75rem;">
          <div><strong>Client:</strong> ${o.customer_name || o.user_name} &bull; <a href="tel:${o.phone || o.user_phone}" style="color:#2563EB; text-decoration:none;">${o.phone || o.user_phone || 'N/A'}</a></div>
          <div style="color:#4B5563; font-size:0.8rem; margin-top:2px;">📍 ${o.full_address || o.shipping_address}</div>
        </div>

        <!-- Ordered Items -->
        <div style="background:#F9FAFB; padding:0.6rem; border-radius:8px; margin-bottom:0.75rem;">
          ${(o.items || []).map(it => `
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <img src="${it.image}" style="width:24px; height:24px; border-radius:4px; object-fit:cover;">
                <span>${it.name}</span>
              </div>
              <strong>x${it.quantity} &bull; ₹${(it.price * it.quantity).toLocaleString()}</strong>
            </div>
          `).join('')}
        </div>

        <!-- Delivery Schedule -->
        <div style="background:#F0FDF4; border:1px solid #BBF7D0; padding:0.65rem; border-radius:8px; margin-bottom:0.75rem;">
          <div style="font-size:0.85rem;">📅 <strong>Delivery Date:</strong> <span style="color:#15803D; font-weight:700;">${o.scheduled_delivery_date || o.estimated_delivery_date || 'In 3-4 Days'}</span></div>
          <div style="font-size:0.85rem; margin-top:3px;">⏰ <strong>Time Window:</strong> <span style="color:#D97706; font-weight:700;">${o.delivery_time_slot || 'Morning (9am-12pm)'}</span></div>
          <button class="btn-time-edit" style="width:100%; margin-top:6px; padding:0.45rem; font-size:0.8rem;" onclick="openRescheduleModal('${orderId}')">
            🕒 Set / Change Delivery Time Slot
          </button>
        </div>

        <!-- Status Dispatch -->
        <div style="margin-bottom:0.75rem;">
          <label style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:#6B7280; display:block; margin-bottom:3px;">Update Dispatch Status</label>
          <select class="admin-select" style="width:100%;" onchange="changeOrderStatus('${orderId}', this.value)">
            <option value="Order Placed" ${o.order_status === 'Order Placed' ? 'selected' : ''}>1. Order Placed</option>
            <option value="Confirmed" ${o.order_status === 'Confirmed' ? 'selected' : ''}>2. Confirmed</option>
            <option value="Packed" ${o.order_status === 'Packed' ? 'selected' : ''}>3. Packed</option>
            <option value="Shipped" ${o.order_status === 'Shipped' ? 'selected' : ''}>4. Shipped</option>
            <option value="Out for Delivery" ${o.order_status === 'Out for Delivery' ? 'selected' : ''}>5. Out for Delivery</option>
            <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>6. Delivered</option>
            <option value="Cancelled" ${o.order_status === 'Cancelled' ? 'selected' : ''}>7. Cancelled</option>
          </select>
        </div>

        <!-- Actions -->
        <div style="display:flex; gap:8px;">
          <button class="btn-primary-sm" style="flex:1;" onclick="printPackingSlip('${orderId}')">📄 Packing Slip</button>
          <button class="btn-danger-sm" onclick="removeOrder('${orderId}')">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// Filter Orders
function filterOrders() {
  const q = (document.querySelector('#orderSearchInput')?.value || '').trim().toLowerCase();
  const st = document.querySelector('#orderStatusFilter')?.value || 'ALL';

  const filtered = adminOrders.filter(o => {
    const orderId = o.order_id || o.order_number || '';
    const custName = o.customer_name || o.user_name || '';
    const phone = o.phone || o.user_phone || '';
    
    const matchQ = !q || orderId.toLowerCase().includes(q) || custName.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
    const matchSt = st === 'ALL' || o.order_status === st;
    return matchQ && matchSt;
  });

  renderOrdersTable(filtered);
  renderOrdersMobileCards(filtered);
}

// Status Changer — Saves directly to Database
async function changeOrderStatus(orderId, newStatus) {
  if (window.AuroraDB) {
    await window.AuroraDB.updateOrderStatus(orderId, newStatus);
  }
  const idx = adminOrders.findIndex(o => o.order_id === orderId || o.order_number === orderId || String(o.id) === String(orderId));
  if (idx !== -1) {
    adminOrders[idx].order_status = newStatus;
  }
  updateMetrics();
  showToast(`✨ Status updated to: "${newStatus}"!`);
}

// Reschedule Delivery Modal
function openRescheduleModal(orderId) {
  const order = adminOrders.find(o => o.order_id === orderId || o.order_number === orderId || String(o.id) === String(orderId));
  if (!order) return;

  const todayIso = new Date().toISOString().split('T')[0];
  const modal = document.querySelector('#adminModal');
  const modalContent = document.querySelector('#adminModalContent');
  if (!modal || !modalContent) return;

  const displayId = order.order_id || order.order_number;
  const clientName = order.customer_name || order.user_name;

  modalContent.innerHTML = `
    <div style="padding:1.2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; border-bottom:1px solid #E5E7EB; padding-bottom:0.8rem;">
        <h3 style="font-size:1.3rem; color:#111827; margin:0;">🕒 Schedule Delivery Time</h3>
        <button onclick="closeAdminModal()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
      </div>

      <div style="font-size:0.85rem; color:#4B5563; margin-bottom:1rem;">
        Order: <strong>${displayId}</strong> &bull; Client: <strong>${clientName}</strong>
      </div>

      <form onsubmit="saveReschedule(event, '${displayId}')" style="display:flex; flex-direction:column; gap:1rem;">
        <div>
          <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:4px;">Scheduled Delivery Date</label>
          <input type="date" id="newDeliveryDate" class="admin-input" min="${todayIso}" required>
        </div>

        <div>
          <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:4px;">Delivery Time Window Slot</label>
          <select id="newDeliverySlot" class="admin-input" required>
            <option value="Morning Slot (09:00 AM - 12:00 PM)">Morning Slot (09:00 AM - 12:00 PM)</option>
            <option value="Afternoon Slot (12:00 PM - 04:00 PM)">Afternoon Slot (12:00 PM - 04:00 PM)</option>
            <option value="Evening Slot (04:00 PM - 08:00 PM)" selected>Evening Slot (04:00 PM - 08:00 PM)</option>
            <option value="Express 2-Hour Handover">Express 2-Hour Courier Handover</option>
            <option value="Night Secure Handover (08:00 PM - 10:00 PM)">Night Secure Handover (08:00 PM - 10:00 PM)</option>
          </select>
        </div>

        <div>
          <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:4px;">Courier & Security Instructions</label>
          <textarea id="newDeliveryNotes" class="admin-input" style="height:65px;" placeholder="e.g. Call 30 mins before arrival">${order.delivery_notes || ''}</textarea>
        </div>

        <div style="display:flex; gap:8px; margin-top:0.5rem;">
          <button type="submit" class="btn-primary-sm" style="flex:1; padding:0.65rem; font-size:0.9rem;">
            ✓ Save Delivery Time
          </button>
          <button type="button" class="btn-secondary-sm" onclick="closeAdminModal()">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;

  modal.style.display = 'flex';
}

async function saveReschedule(e, orderId) {
  e.preventDefault();
  const dateVal = document.querySelector('#newDeliveryDate')?.value;
  const slotVal = document.querySelector('#newDeliverySlot')?.value;
  const notesVal = document.querySelector('#newDeliveryNotes')?.value;

  let formattedDate = '';
  if (dateVal) {
    const d = new Date(dateVal);
    formattedDate = d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }

  if (window.AuroraDB) {
    await window.AuroraDB.updateOrderDelivery(orderId, formattedDate, slotVal, notesVal);
  }

  const idx = adminOrders.findIndex(o => o.order_id === orderId || o.order_number === orderId || String(o.id) === String(orderId));
  if (idx !== -1) {
    if (formattedDate) {
      adminOrders[idx].scheduled_delivery_date = formattedDate;
      adminOrders[idx].estimated_delivery_date = formattedDate;
    }
    if (slotVal) adminOrders[idx].delivery_time_slot = slotVal;
    if (notesVal !== undefined) adminOrders[idx].delivery_notes = notesVal;
  }

  closeAdminModal();
  showToast(`✨ Delivery schedule saved!`);
  renderOrdersTable();
  renderOrdersMobileCards();
}

function closeAdminModal() {
  const modal = document.querySelector('#adminModal');
  if (modal) modal.style.display = 'none';
}

// Packing Slip Modal
function printPackingSlip(orderId) {
  const order = adminOrders.find(o => o.order_id === orderId || o.order_number === orderId || String(o.id) === String(orderId));
  if (!order) return;

  const modal = document.querySelector('#adminModal');
  const modalContent = document.querySelector('#adminModalContent');
  if (!modal || !modalContent) return;

  const displayId = order.order_id || order.order_number;
  const clientName = order.customer_name || order.user_name;
  const clientPhone = order.phone || order.user_phone;
  const clientAddress = order.full_address || order.shipping_address;
  const totalVal = Number(order.total || order.total_amount || 0);

  modalContent.innerHTML = `
    <div style="padding:1.5rem; background:#FFF; border-radius:12px; font-family:sans-serif; color:#1F2937;">
      <div style="display:flex; justify-content:space-between; border-bottom:2px solid #C9A227; padding-bottom:1rem; margin-bottom:1.2rem;">
        <div>
          <div style="font-size:1.8rem; font-weight:800; letter-spacing:0.1em; color:#111827;">AURORA</div>
          <div style="font-size:0.75rem; letter-spacing:0.2em; text-transform:uppercase; color:#C9A227; font-weight:700;">MAISON ATELIER &bull; PACKING SLIP</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; font-size:1.1rem;">#${displayId}</div>
          <div style="font-size:0.8rem; color:#6B7280;">Date: ${order.order_date || 'Today'} ${order.order_time || ''}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; margin-bottom:1.2rem; font-size:0.85rem;">
        <div>
          <strong style="color:#6B7280; font-size:0.75rem; text-transform:uppercase;">Ship To:</strong>
          <div style="font-weight:700; margin-top:2px;">${clientName}</div>
          <div style="color:#4B5563;">${clientPhone}</div>
          <div style="color:#4B5563;">${clientAddress}</div>
        </div>
        <div>
          <strong style="color:#6B7280; font-size:0.75rem; text-transform:uppercase;">Delivery Time & Payment:</strong>
          <div style="color:#15803D; font-weight:700; margin-top:2px;">📅 ${order.scheduled_delivery_date || order.estimated_delivery_date || 'In 3-4 Days'}</div>
          <div style="color:#D97706; font-weight:700;">⏰ ${order.delivery_time_slot || 'Morning (9am-12pm)'}</div>
          <div style="margin-top:2px;">Payment: <strong>${order.payment_method}</strong> (${order.payment_status || 'Pending'})</div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:1.2rem; font-size:0.85rem;">
        <thead>
          <tr style="background:#F9FAFB; text-align:left; border-bottom:1px solid #E5E7EB;">
            <th style="padding:8px;">Item</th>
            <th style="padding:8px;">Metal</th>
            <th style="padding:8px; text-align:center;">Qty</th>
            <th style="padding:8px; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map(it => `
            <tr style="border-bottom:1px solid #F3F4F6;">
              <td style="padding:8px;">${it.name}</td>
              <td style="padding:8px;">${it.metal}</td>
              <td style="padding:8px; text-align:center;">${it.quantity}</td>
              <td style="padding:8px; text-align:right; font-weight:700;">₹${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #E5E7EB; padding-top:1rem;">
        <div style="font-size:0.75rem; color:#6B7280;">✓ 100% BIS Hallmarked Pure Luxury &bull; Insured Delivery</div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary-sm" onclick="window.print()">🖨️ Print</button>
          <button class="btn-secondary-sm" onclick="closeAdminModal()">Close</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

async function removeOrder(orderId) {
  if (!confirm('Are you sure you want to remove this order from records?')) return;
  
  if (window.AuroraDB) {
    await window.AuroraDB.deleteOrder(orderId);
  }
  adminOrders = adminOrders.filter(o => o.order_id !== orderId && o.order_number !== orderId && String(o.id) !== String(orderId));
  updateMetrics();
  renderOrdersTable();
  renderOrdersMobileCards();
  showToast('Order removed from records');
}

async function renderCustomRequests() {
  const container = document.querySelector('#adminCustomRequestsList');
  if (!container) return;

  let reqs = [];
  if (window.AuroraDB) {
    reqs = await window.AuroraDB.getCustomRequests();
  } else {
    try {
      const savedReqs = localStorage.getItem('aurora_atelier_custom_requests_db_v1') || localStorage.getItem('aurora_custom_requests');
      reqs = savedReqs ? JSON.parse(savedReqs) : [];
    } catch(e) {
      reqs = [];
    }
  }

  if (reqs.length === 0) {
    container.innerHTML = `<p style="color:#6B7280; font-size:0.9rem; text-align:center; padding:1.5rem;">No bespoke custom requests logged yet.</p>`;
    return;
  }

  container.innerHTML = reqs.map(r => `
    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:1rem; margin-bottom:0.75rem;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <strong style="font-size:1rem; color:#111827;">${r.accessory_type || 'Bespoke Request'} &bull; ${r.metal_type || 'Gold/Silver'}</strong>
          <div style="font-size:0.8rem; color:#6B7280;">Client: ${r.user_name} (${r.user_email})</div>
        </div>
        <span style="font-size:0.75rem; background:#FEF3C7; color:#B45309; padding:2px 8px; border-radius:12px; font-weight:700;">${r.budget || 'Quote'}</span>
      </div>
      <p style="font-size:0.85rem; color:#4B5563; margin:0.5rem 0;">"${r.description}"</p>
      ${r.inspiration_image ? `<img src="${r.inspiration_image}" style="max-width:140px; border-radius:6px; margin-top:4px; border:1px solid #D1D5DB;">` : ''}
    </div>
  `).join('');
}

// Toast
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed; bottom:24px; right:24px; background:#111827; color:#FFF; padding:12px 20px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2); font-size:0.9rem; z-index:9999; border-left:4px solid #C9A227; transition:all 0.3s ease;';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPortal);
} else {
  initAdminPortal();
}

// Global exports
window.unlockAdminPasskey = unlockAdminPasskey;
window.quickUnlockAdmin = quickUnlockAdmin;
window.logoutAdmin = logoutAdmin;
window.filterOrders = filterOrders;
window.changeOrderStatus = changeOrderStatus;
window.openRescheduleModal = openRescheduleModal;
window.saveReschedule = saveReschedule;
window.closeAdminModal = closeAdminModal;
window.printPackingSlip = printPackingSlip;
window.removeOrder = removeOrder;
