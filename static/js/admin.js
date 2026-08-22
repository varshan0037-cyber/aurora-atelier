// ==========================================================================
// AURORA ATELIER â€” STANDALONE ADMIN OPERATIONS SCRIPT
// Features: Order Tracking, Product Picture Display, Delivery Scheduling
// ==========================================================================

const ADMIN_PASSKEY = 'AURORA2026';
let allAdminOrders = [];
let allBespokeRequests = [];

const DEFAULT_ADMIN_ORDERS = [
  {
    id: 101,
    order_id: 'AUR-2026-8942',
    customer_name: 'Ananya Sharma',
    email: 'ananya.sharma@luxury.in',
    phone: '+91 98201 44321',
    full_address: 'Flat 14B, Sea Face Towers, Worli, Mumbai, Maharashtra - 400018',
    items: [
      {
        name: 'Aurora Solstice Choker',
        metal: '18K Solid Gold',
        size: '16 Inch (Standard)',
        price: 12499,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'
      }
    ],
    total_amount: 12499,
    payment_method: 'UPI / Instant QR (Google Pay)',
    payment_status: 'Paid (Verified)',
    order_status: 'Dispatched with White-Glove Courier',
    order_date: '22 Aug 2026',
    order_time: '11:30 AM',
    scheduled_delivery_date: '24 Aug 2026',
    delivery_time_slot: 'Morning Slot (09:00 AM - 12:00 PM)'
  },
  {
    id: 102,
    order_id: 'AUR-2026-7319',
    customer_name: 'Rohan Mehta',
    email: 'rohan.mehta@studio.com',
    phone: '+91 98112 39012',
    full_address: 'Villa 7, Palm Avenue, Indiranagar, Bangalore, Karnataka - 560038',
    items: [
      {
        name: 'Liquid Silver Statement Cuff',
        metal: '925 Sterling Silver',
        size: 'Medium (60mm)',
        price: 4899,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Celestial Star Solitaire Signet',
        metal: '18K Gold Vermeil',
        size: 'US 8',
        price: 3499,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80'
      }
    ],
    total_amount: 8398,
    payment_method: 'Credit Card (3D Secure)',
    payment_status: 'Paid (Verified)',
    order_status: 'Artisan Hand-Forging',
    order_date: '22 Aug 2026',
    order_time: '02:15 PM',
    scheduled_delivery_date: '25 Aug 2026',
    delivery_time_slot: 'Evening Slot (04:00 PM - 07:00 PM)'
  },
  {
    id: 103,
    order_id: 'AUR-2026-6105',
    customer_name: 'Priyanka Kapoor',
    email: 'priyanka.k@delhiclub.org',
    phone: '+91 99580 12876',
    full_address: '42 Golf Links, New Delhi, Delhi - 110003',
    items: [
      {
        name: 'Ã‰toile Diamond Pave Huggies',
        metal: '18K Yellow Gold',
        size: 'Standard',
        price: 8999,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80'
      }
    ],
    total_amount: 8999,
    payment_method: 'Cash on Delivery',
    payment_status: 'COD / Pending',
    order_status: 'Order Placed',
    order_date: '22 Aug 2026',
    order_time: '05:45 PM',
    scheduled_delivery_date: '26 Aug 2026',
    delivery_time_slot: 'Afternoon Slot (01:00 PM - 04:00 PM)'
  }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('aurora_admin_authed') === 'true') {
    showDashboard();
  }
});

function handleAdminPasskeySubmit(e) {
  if (e) e.preventDefault();
  const input = document.querySelector('#adminPasskeyInput')?.value.trim();
  if (input === ADMIN_PASSKEY) {
    sessionStorage.setItem('aurora_admin_authed', 'true');
    showDashboard();
  } else {
    alert('âŒ Invalid Administrative Passkey. Please try again.');
  }
}

function quickUnlockDemo() {
  document.querySelector('#adminPasskeyInput').value = ADMIN_PASSKEY;
  sessionStorage.setItem('aurora_admin_authed', 'true');
  showDashboard();
}

function showDashboard() {
  document.querySelector('#adminGateScreen').style.display = 'none';
  document.querySelector('#adminDashboardLayout').style.display = 'flex';
  loadAdminOrders();
  loadAdminBespokeRequests();
}

function logoutAdmin() {
  sessionStorage.removeItem('aurora_admin_authed');
  document.querySelector('#adminDashboardLayout').style.display = 'none';
  document.querySelector('#adminGateScreen').style.display = 'flex';
  document.querySelector('#adminPasskeyInput').value = '';
}

function loadAdminOrders() {
  let stored = [];
  try {
    const raw = localStorage.getItem('aurora_orders') || localStorage.getItem('aurora_atelier_orders_db_v1');
    if (raw) stored = JSON.parse(raw);
  } catch(e) {}

  // Merge stored customer orders with default sample orders (without duplicate order IDs)
  const existingIds = new Set(stored.map(o => o.order_id || o.id));
  const mergedDefaults = DEFAULT_ADMIN_ORDERS.filter(o => !existingIds.has(o.order_id));
  allAdminOrders = [...stored, ...mergedDefaults];

  updateMetrics();
  renderAdminOrdersTable(allAdminOrders);
}

function updateMetrics() {
  let totalRev = 0;
  let activeCount = 0;
  let deliveredCount = 0;

  allAdminOrders.forEach(o => {
    const amt = Number(o.total_amount || o.total || 0);
    totalRev += amt;
    const st = (o.order_status || '').toLowerCase();
    if (st.includes('delivered')) {
      deliveredCount++;
    } else {
      activeCount++;
    }
  });

  document.querySelector('#metricTotalRevenue').innerText = `â‚¹${totalRev.toLocaleString()}`;
  document.querySelector('#metricTotalOrders').innerText = allAdminOrders.length;
  document.querySelector('#metricActiveOrders').innerText = activeCount;
  document.querySelector('#metricDeliveredOrders').innerText = deliveredCount;
}

function renderAdminOrdersTable(orders) {
  const tbody = document.querySelector('#adminOrdersTableBody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-orders-view">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">ðŸ“­</div>
          <div style="font-weight: 700; font-size: 1.1rem;">No matching client orders found</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map((order, idx) => {
    const orderId = order.order_id || order.id || `AUR-2026-${idx+1}`;
    const custName = order.customer_name || order.user_name || 'Valued Collector';
    const email = order.email || order.user_email || 'client@aurora.luxury';
    const phone = order.phone || order.user_phone || '+91 98000 00000';
    const addr = order.full_address || order.shipping_address || 'Address on file';
    const total = Number(order.total_amount || order.total || 0);
    const dateStr = order.order_date || 'Today';
    const timeStr = order.order_time || 'Recent';
    const status = order.order_status || 'Order Placed';
    const payMethod = order.payment_method || 'UPI / Instant QR';
    const payStatus = order.payment_status || 'Paid';
    const delDate = order.scheduled_delivery_date || order.estimated_delivery_date || 'In 3 Days';
    const delSlot = order.delivery_time_slot || 'Morning Slot (09:00 AM - 12:00 PM)';

    const items = order.items && order.items.length > 0 ? order.items : [
      {
        name: 'Aurora Bespoke Fine Jewelry Piece',
        metal: '18K Solid Gold / 925 Silver',
        size: 'Standard',
        price: total,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'
      }
    ];

    const productsHtml = items.map(it => `
      <div class="order-product-item">
        <img src="${it.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'}" alt="${it.name}" class="product-thumb-img" onerror="this.src='https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80'">
        <div class="product-info-col">
          <div class="product-item-title" title="${it.name}">${it.name}</div>
          <div class="product-item-meta">${it.metal || 'Pure Metal'} &bull; Size: ${it.size || 'Standard'} &bull; Qty: <strong>${it.quantity || 1}</strong></div>
          <div class="product-item-pricing">â‚¹${((it.price || 0) * (it.quantity || 1)).toLocaleString()}</div>
        </div>
      </div>
    `).join('');

    const isPaid = payStatus.toLowerCase().includes('paid');
    const isCod = payMethod.toLowerCase().includes('cash');
    const badgeClass = isPaid ? 'badge-paid' : (isCod ? 'badge-cod' : 'badge-pending');

    return `
      <tr>
        <td>
          <div class="order-id-badge">${orderId}</div>
          <div class="order-date-text">Placed: <strong>${dateStr}</strong></div>
          <div class="order-date-text">Time: ${timeStr}</div>
        </td>

        <td>
          <div class="customer-info-box">
            <div class="customer-name">${custName}</div>
            <div class="customer-contact">âœ‰ ${email}</div>
            <div class="customer-contact">ðŸ“ž ${phone}</div>
            <div class="customer-address">ðŸ“ ${addr}</div>
          </div>
        </td>

        <td>
          <div class="order-products-gallery">
            ${productsHtml}
          </div>
        </td>

        <td>
          <div class="amount-display">â‚¹${total.toLocaleString()}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.35rem;">${payMethod}</div>
          <span class="payment-badge ${badgeClass}">${payStatus}</span>
        </td>

        <td>
          <div class="delivery-schedule-box">
            <div>Target Delivery: <span class="delivery-date-highlight">${delDate}</span></div>
            <div class="delivery-slot-pill">${delSlot}</div>
          </div>

          <select class="order-status-dropdown" onchange="updateOrderStatus('${orderId}', this.value)">
            <option value="Order Placed" ${status==='Order Placed'?'selected':''}>Order Placed</option>
            <option value="In Hallmarking Vault" ${status==='In Hallmarking Vault'?'selected':''}>In Hallmarking Vault</option>
            <option value="Artisan Hand-Forging" ${status==='Artisan Hand-Forging'?'selected':''}>Artisan Hand-Forging</option>
            <option value="Dispatched with White-Glove Courier" ${status==='Dispatched with White-Glove Courier'?'selected':''}>Dispatched (Courier)</option>
            <option value="Delivered" ${status==='Delivered'?'selected':''}>Delivered âœ“</option>
          </select>
        </td>

        <td>
          <div class="action-btn-row">
            <button class="btn-action-slip" onclick="openPackingSlip('${orderId}')">
              ðŸ“„ Packing Slip
            </button>
            <button class="btn-action-del" onclick="deleteAdminOrder('${orderId}')">
              ðŸ—‘ Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminOrders() {
  const query = (document.querySelector('#adminSearchInput')?.value || '').toLowerCase();
  const statusFilter = document.querySelector('#adminStatusFilter')?.value || 'ALL';

  const filtered = allAdminOrders.filter(order => {
    const matchQuery = 
      (order.order_id || '').toLowerCase().includes(query) ||
      (order.customer_name || '').toLowerCase().includes(query) ||
      (order.email || '').toLowerCase().includes(query) ||
      (order.phone || '').toLowerCase().includes(query) ||
      (order.full_address || '').toLowerCase().includes(query);

    const matchStatus = (statusFilter === 'ALL') || (order.order_status === statusFilter);

    return matchQuery && matchStatus;
  });

  renderAdminOrdersTable(filtered);
}

function updateOrderStatus(orderId, newStatus) {
  const order = allAdminOrders.find(o => (o.order_id || o.id) === orderId);
  if (order) {
    order.order_status = newStatus;
    saveOrdersToStorage();
    updateMetrics();
  }
}

function deleteAdminOrder(orderId) {
  if (!confirm(`Are you sure you want to remove order ${orderId}?`)) return;
  allAdminOrders = allAdminOrders.filter(o => (o.order_id || o.id) !== orderId);
  saveOrdersToStorage();
  updateMetrics();
  renderAdminOrdersTable(allAdminOrders);
}

function saveOrdersToStorage() {
  localStorage.setItem('aurora_orders', JSON.stringify(allAdminOrders));
}

function openPackingSlip(orderId) {
  const order = allAdminOrders.find(o => (o.order_id || o.id) === orderId);
  if (!order) return;

  const total = Number(order.total_amount || order.total || 0);
  const items = order.items || [];

  const modal = document.querySelector('#slipModalBackdrop');
  const card = document.querySelector('#printableSlipContent');
  if (!modal || !card) return;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #C9A227; padding-bottom:1.2rem; margin-bottom:1.5rem;">
      <div>
        <h2 style="font-family:'Cormorant Garamond', serif; font-size:2rem; font-weight:700; color:#0F172A; letter-spacing:0.1em;">AURORA ATELIER</h2>
        <div style="font-size:0.8rem; text-transform:uppercase; color:#9A7B1C; font-weight:700; letter-spacing:0.08em;">White-Glove Insured Manifest</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:monospace; font-weight:800; font-size:1.1rem; color:#C9A227;">${order.order_id || orderId}</div>
        <div style="font-size:0.8rem; color:#64748B;">Date: ${order.order_date || 'Today'}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem; font-size:0.85rem;">
      <div>
        <div style="font-weight:700; text-transform:uppercase; font-size:0.75rem; color:#64748B; margin-bottom:0.25rem;">Ship To:</div>
        <div style="font-weight:700; font-size:0.95rem; color:#0F172A;">${order.customer_name || 'Client'}</div>
        <div>${order.phone || ''}</div>
        <div>${order.email || ''}</div>
        <div style="margin-top:0.4rem; color:#334155;">${order.full_address || ''}</div>
      </div>
      <div>
        <div style="font-weight:700; text-transform:uppercase; font-size:0.75rem; color:#64748B; margin-bottom:0.25rem;">Delivery Dispatch:</div>
        <div>Scheduled Date: <strong>${order.scheduled_delivery_date || 'In 3 Days'}</strong></div>
        <div>Time Slot: <strong>${order.delivery_time_slot || 'Standard'}</strong></div>
        <div>Status: <span style="font-weight:700; color:#15803D;">${order.order_status || 'Order Placed'}</span></div>
        <div>Payment: <strong>${order.payment_method || 'Verified'}</strong> (${order.payment_status || 'Paid'})</div>
      </div>
    </div>

    <div style="border-top:1px solid #E2E8F0; padding-top:1rem; margin-bottom:1.5rem;">
      <div style="font-weight:700; font-size:0.85rem; text-transform:uppercase; color:#64748B; margin-bottom:0.75rem;">Verified Heirlooms & Pictures:</div>
      ${items.map(it => `
        <div style="display:flex; align-items:center; gap:0.9rem; margin-bottom:0.75rem; background:#FAF8F5; padding:0.5rem 0.75rem; border-radius:8px;">
          <img src="${it.image}" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid #CBD5E1;">
          <div style="flex:1;">
            <div style="font-weight:700; font-size:0.9rem;">${it.name}</div>
            <div style="font-size:0.78rem; color:#64748B;">${it.metal || ''} &bull; Size: ${it.size || 'Standard'} &bull; Qty: ${it.quantity || 1}</div>
          </div>
          <div style="font-weight:700; font-size:0.9rem; color:#9A7B1C;">â‚¹${((it.price || 0) * (it.quantity || 1)).toLocaleString()}</div>
        </div>
      `).join('')}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; border-top:2px solid #E2E8F0; padding-top:1rem; margin-bottom:2rem;">
      <div style="font-size:1.1rem; font-weight:700;">Grand Total:</div>
      <div style="font-size:1.4rem; font-weight:800; color:#C9A227;">â‚¹${total.toLocaleString()}</div>
    </div>

    <div style="display:flex; justify-content:space-between; gap:1rem;">
      <button onclick="closeSlipModal()" style="padding:0.6rem 1.2rem; border-radius:6px; border:1px solid #CBD5E1; background:#F8FAFC; cursor:pointer; font-weight:600;">Close</button>
      <button onclick="window.print()" style="padding:0.6rem 1.5rem; border-radius:6px; border:none; background:linear-gradient(135deg, #C9A227, #A8841B); color:#FFF; font-weight:700; cursor:pointer;">ðŸ–¨ Print Packing Slip</button>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeSlipModal() {
  const modal = document.querySelector('#slipModalBackdrop');
  if (modal) modal.style.display = 'none';
}

function loadAdminBespokeRequests() {
  let reqs = [];
  try {
    const raw = localStorage.getItem('aurora_custom_requests');
    if (raw) reqs = JSON.parse(raw);
  } catch(e) {}

  const tbody = document.querySelector('#adminBespokeTableBody');
  const countEl = document.querySelector('#bespokeRequestsCount');
  if (countEl) countEl.innerText = `${reqs.length} Commissions`;
  if (!tbody) return;

  if (reqs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-orders-view">
          <div style="font-size: 2rem; margin-bottom: 0.3rem;">âœï¸</div>
          <div>No bespoke client commissions received yet</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reqs.map(r => `
    <tr>
      <td><span class="order-id-badge">${r.request_number || r.id}</span></td>
      <td>
        <div style="font-weight:700;">${r.customer_name || 'Anonymous Client'}</div>
        <div style="font-size:0.8rem; color:#64748B;">${r.email || ''}</div>
        <div style="font-size:0.8rem; color:#64748B;">${r.phone || ''}</div>
      </td>
      <td>
        <div style="font-size:0.85rem; max-width:320px; line-height:1.4;">${r.prompt || r.concept_description || 'Custom Bespoke Inquiry'}</div>
      </td>
      <td>
        ${r.image_url ? `<img src="${r.image_url}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #CBD5E1;">` : '<span style="color:#94A3B8; font-size:0.8rem;">No Photo Attached</span>'}
      </td>
      <td>
        <div style="font-weight:700; color:#9A7B1C;">${r.metal_choice || '18K Gold'}</div>
        <div style="font-size:0.78rem; color:#64748B;">Budget: ${r.budget_range || 'Flexible'}</div>
      </td>
      <td style="font-size:0.8rem; color:#64748B;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</td>
    </tr>
  `).join('');
}

// Window exports
window.handleAdminPasskeySubmit = handleAdminPasskeySubmit;
window.quickUnlockDemo = quickUnlockDemo;
window.logoutAdmin = logoutAdmin;
window.loadAdminOrders = loadAdminOrders;
window.filterAdminOrders = filterAdminOrders;
window.updateOrderStatus = updateOrderStatus;
window.deleteAdminOrder = deleteAdminOrder;
window.openPackingSlip = openPackingSlip;
window.closeSlipModal = closeSlipModal;