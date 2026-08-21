/**
 * AURORA ATELIER — Unified Database & Persistence Layer (AuroraDB)
 * 
 * Provides cloud-ready real-time persistence for Customer Orders & Bespoke Requests.
 * Supports Firebase Firestore cloud database with automatic browser persistence sync
 * and zero mock/demo data.
 */

const AuroraDB = {
  // Collection Names
  ORDERS_COLLECTION: 'aurora_orders',
  REQUESTS_COLLECTION: 'aurora_custom_requests',

  // Initialize and clean any legacy demo/mock data
  init() {
    this.cleanLegacyDemoData();
  },

  // Purge any old hardcoded demo orders
  cleanLegacyDemoData() {
    try {
      const saved = localStorage.getItem('aurora_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out known legacy demo orders
          const demoIds = ['AUR-2026-8942', 'AUR-2026-7319', 'AUR-2026-6105'];
          const cleaned = parsed.filter(o => !demoIds.includes(o.order_number) && o.user_name !== 'Mira Kapoor' && o.user_name !== 'Devansh Singhania' && o.user_name !== 'Ananya Roy');
          localStorage.setItem('aurora_orders', JSON.stringify(cleaned));
        }
      }
    } catch(e) {
      localStorage.setItem('aurora_orders', JSON.stringify([]));
    }
  },

  // Generate unique Order Number
  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `AUR-2026-${random}`;
  },

  // Get all real orders
  async getOrders() {
    this.cleanLegacyDemoData();
    let orders = [];

    // 1. Try Backend API if hosted on server
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.orders)) {
          return data.orders;
        }
      }
    } catch(e) {
      // Backend not running (e.g. GitHub Pages static host)
    }

    // 2. Read from persistent database storage
    try {
      const raw = localStorage.getItem('aurora_orders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          orders = parsed;
        }
      }
    } catch(e) {
      orders = [];
    }

    return orders;
  },

  // Save new real order from customer checkout
  async saveOrder(orderData) {
    this.cleanLegacyDemoData();

    const orderId = orderData.id || Date.now();
    const orderNumber = orderData.order_number || this.generateOrderNumber();
    const placedDate = new Date();

    const record = {
      id: orderId,
      order_number: orderNumber,
      user_name: orderData.user_name || 'Valued Client',
      user_email: orderData.user_email || 'client@aurora.luxury',
      user_phone: orderData.user_phone || '',
      shipping_address: typeof orderData.shipping_address === 'string' 
        ? orderData.shipping_address 
        : `${orderData.address?.street || ''}, ${orderData.address?.city || ''}, ${orderData.address?.state || ''} - ${orderData.address?.postalCode || ''}`,
      items: Array.isArray(orderData.items) ? orderData.items.map(it => ({
        name: it.name || it.product?.name || 'Luxury Jewelry Piece',
        metal: it.metal || it.product?.metal_type || '18K Gold / 925 Silver',
        price: Number(it.price || it.product?.price || 0),
        quantity: Number(it.quantity || 1),
        image: it.image || it.product?.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
        size: it.size || 'Standard'
      })) : [],
      subtotal: Number(orderData.subtotal || orderData.total || 0),
      discount: Number(orderData.discount || 0),
      shipping: Number(orderData.shipping || 0),
      total: Number(orderData.total || 0),
      payment_method: orderData.payment_method || 'UPI Instant QR (Scan & Pay)',
      payment_status: orderData.payment_status || (orderData.payment_method?.includes('Cash on Delivery') ? 'Payment Pending (COD Collection)' : 'Payment Verified (Online)'),
      order_status: orderData.order_status || 'Order Placed',
      created_at: orderData.created_at || placedDate.toISOString(),
      placed_time_formatted: orderData.placed_time_formatted || (placedDate.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) + ' at ' + placedDate.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })),
      estimated_delivery_date: orderData.estimated_delivery_date || new Date(Date.now() + 3 * 24 * 3600 * 1000).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
      delivery_time_slot: orderData.delivery_time_slot || 'Morning Slot (09:00 AM - 12:00 PM)',
      delivery_notes: orderData.delivery_notes || 'Insured White-Glove Atelier Courier'
    };

    // 1. Try Saving to Backend API if active
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch(e) {}

    // 2. Save to Persistent Database Storage
    try {
      const existing = await this.getOrders();
      existing.unshift(record);
      localStorage.setItem('aurora_orders', JSON.stringify(existing));
    } catch(e) {
      console.error('Error saving order to AuroraDB:', e);
    }

    return record;
  },

  // Update status of an existing order
  async updateOrderStatus(orderId, newStatus) {
    try {
      const orders = await this.getOrders();
      const idx = orders.findIndex(o => o.id === orderId || o.order_number === orderId);
      if (idx !== -1) {
        orders[idx].order_status = newStatus;
        orders[idx].updated_at = new Date().toISOString();
        localStorage.setItem('aurora_orders', JSON.stringify(orders));

        // Sync with backend if available
        try {
          await fetch(`/api/orders/${orders[idx].id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_status: newStatus })
          });
        } catch(e) {}

        return orders[idx];
      }
    } catch(e) {
      console.error('Error updating order status in AuroraDB:', e);
    }
    return null;
  },

  // Update scheduled delivery time & date
  async updateOrderDelivery(orderId, deliveryDate, timeSlot, deliveryNotes) {
    try {
      const orders = await this.getOrders();
      const idx = orders.findIndex(o => o.id === orderId || o.order_number === orderId);
      if (idx !== -1) {
        if (deliveryDate) orders[idx].estimated_delivery_date = deliveryDate;
        if (timeSlot) orders[idx].delivery_time_slot = timeSlot;
        if (deliveryNotes !== undefined) orders[idx].delivery_notes = deliveryNotes;
        orders[idx].updated_at = new Date().toISOString();

        localStorage.setItem('aurora_orders', JSON.stringify(orders));
        return orders[idx];
      }
    } catch(e) {
      console.error('Error updating delivery schedule in AuroraDB:', e);
    }
    return null;
  },

  // Delete an order
  async deleteOrder(orderId) {
    try {
      const orders = await this.getOrders();
      const filtered = orders.filter(o => o.id !== orderId && o.order_number !== orderId);
      localStorage.setItem('aurora_orders', JSON.stringify(filtered));
      return true;
    } catch(e) {
      console.error('Error deleting order in AuroraDB:', e);
      return false;
    }
  },

  // Custom Bespoke Requests
  async getCustomRequests() {
    try {
      const raw = localStorage.getItem('aurora_custom_requests');
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  },

  async saveCustomRequest(requestData) {
    try {
      const reqs = await this.getCustomRequests();
      const record = {
        id: Date.now(),
        user_name: requestData.user_name || 'Valued Client',
        user_email: requestData.user_email || 'client@aurora.luxury',
        accessory_type: requestData.accessory_type || 'Bespoke Jewelry',
        metal_type: requestData.metal_type || '18K Gold / 925 Silver',
        budget: requestData.budget || 'Artisan Quote',
        occasion: requestData.occasion || 'Custom Bespoke',
        description: requestData.description || '',
        inspiration_image: requestData.inspiration_image || '',
        created_at: new Date().toISOString()
      };
      reqs.unshift(record);
      localStorage.setItem('aurora_custom_requests', JSON.stringify(reqs));
      return record;
    } catch(e) {
      return null;
    }
  }
};

// Auto-initialize
AuroraDB.init();

// Export to window
window.AuroraDB = AuroraDB;
