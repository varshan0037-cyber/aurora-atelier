/**
 * AURORA ATELIER — Gen-Z Luxury Accessories Marketplace
 * Comprehensive Application Logic & State Engine
 */

// Application Global State
const Aurora = {
  user: null,
  products: [],
  cart: [],
  wishlist: new Set(),
  orders: [],
  customRequests: [],
  emails: [],
  discountPercent: 0,
  activeFilter: {
    category: 'All',
    metal: 'All',
    style: 'All',
    query: '',
    sort: 'default'
  },
  selectedProduct: null,
  inspirationImageBase64: null
};

// API Base URL
const API_BASE = '/api';

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initStorage();
  setupEventListeners();
  setupClipboardPaste();
  setupDragAndDrop();
  
  // Check auth or set default demo user
  await checkSession();
  
  // Load initial products and orders
  await loadProducts();
  await loadOrders();
  await loadCustomRequests();

  // Handle URL hash navigation
  handleRouting();
  window.addEventListener('hashchange', handleRouting);
});

// Setup Local Storage & Defaults
function initStorage() {
  const savedCart = localStorage.getItem('aurora_cart');
  if (savedCart) {
    try { Aurora.cart = JSON.parse(savedCart); } catch(e) {}
  }
  
  const savedWishlist = localStorage.getItem('aurora_wishlist');
  if (savedWishlist) {
    try { Aurora.wishlist = new Set(JSON.parse(savedWishlist)); } catch(e) {}
  }
  
  updateCartBadge();
  updateWishlistBadge();
}

function saveCart() {
  localStorage.setItem('aurora_cart', JSON.stringify(Aurora.cart));
  updateCartBadge();
  renderCart();
}

function saveWishlist() {
  localStorage.setItem('aurora_wishlist', JSON.stringify(Array.from(Aurora.wishlist)));
  updateWishlistBadge();
}

// ==========================================================================
// ROUTING & VIEW CONTROLLER
// ==========================================================================
function handleRouting() {
  const hash = window.location.hash || '#home';
  const cleanHash = hash.split('?')[0];

  const sections = ['#home', '#explore', '#custom-request', '#inspiration', '#cart', '#checkout', '#orders', '#admin', '#auth'];
  
  sections.forEach(sec => {
    const el = document.querySelector(sec);
    if (el) el.style.display = 'none';
  });

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === cleanHash) {
      link.classList.add('active');
    }
  });

  // Route views
  if (cleanHash === '#explore') {
    const el = document.querySelector('#explore');
    if (el) el.style.display = 'block';
    renderProducts();
  } else if (cleanHash === '#custom-request') {
    const el = document.querySelector('#custom-request');
    if (el) el.style.display = 'block';
  } else if (cleanHash === '#inspiration') {
    const el = document.querySelector('#inspiration');
    if (el) el.style.display = 'block';
  } else if (cleanHash === '#cart') {
    const el = document.querySelector('#cart');
    if (el) el.style.display = 'block';
    renderCartPage();
  } else if (cleanHash === '#checkout') {
    if (!Aurora.user) {
      showToast('Please sign in to proceed with checkout ✨');
      window.location.hash = '#auth';
      return;
    }
    const el = document.querySelector('#checkout');
    if (el) el.style.display = 'block';
    renderCheckoutSummary();
  } else if (cleanHash === '#orders') {
    if (!Aurora.user) {
      showToast('Please sign in to view your orders ✨');
      window.location.hash = '#auth';
      return;
    }
    const el = document.querySelector('#orders');
    if (el) el.style.display = 'block';
    renderOrders();
  } else if (cleanHash === '#admin') {
    if (!Aurora.user || Aurora.user.role !== 'admin') {
      showToast('Atelier Admin access required ✨ Log in as Admin');
      window.location.hash = '#auth';
      return;
    }
    const el = document.querySelector('#admin');
    if (el) el.style.display = 'block';
    renderAdminDashboard();
  } else if (cleanHash === '#auth') {
    const el = document.querySelector('#auth');
    if (el) el.style.display = 'block';
  } else {
    // Default Home
    const el = document.querySelector('#home');
    if (el) el.style.display = 'block';
    renderFeaturedProducts();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateTo(hash) {
  window.location.hash = hash;
}

// ==========================================================================
// AUTHENTICATION & SESSIONS
// ==========================================================================
async function checkSession() {
  const savedUser = localStorage.getItem('aurora_user');
  if (savedUser) {
    try {
      Aurora.user = JSON.parse(savedUser);
      updateUserUI();
    } catch(e) {}
  } else {
    // Auto-login default luxury buyer for frictionless onboarding
    await loginUser('buyer@aurora.luxury', 'password123', true);
  }
}

async function loginUser(email, password, silent = false) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (data.success && data.user) {
      Aurora.user = data.user;
      localStorage.setItem('aurora_user', JSON.stringify(Aurora.user));
      updateUserUI();
      if (!silent) {
        showToast(`Welcome back, ${Aurora.user.name} ✨`);
        navigateTo(Aurora.user.role === 'admin' ? '#admin' : '#home');
      }
      return true;
    } else {
      if (!silent) showToast(data.error || 'Invalid credentials');
      return false;
    }
  } catch (err) {
    // Local fallback for offline/client mode
    if (email === 'admin@aurora.luxury') {
      Aurora.user = { id: 2, name: 'Maison Aurora Atelier', email, role: 'admin', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80' };
    } else {
      Aurora.user = { id: 1, name: 'Aria Vance', email: email || 'buyer@aurora.luxury', role: 'buyer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' };
    }
    localStorage.setItem('aurora_user', JSON.stringify(Aurora.user));
    updateUserUI();
    if (!silent) showToast(`Welcome, ${Aurora.user.name} ✨`);
    return true;
  }
}

async function signupUser(name, email, password, phone) {
  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone })
    });
    const data = await res.json();
    if (data.success && data.user) {
      Aurora.user = data.user;
      localStorage.setItem('aurora_user', JSON.stringify(Aurora.user));
      updateUserUI();
      showToast(`Welcome to Aurora Atelier, ${name}! ✨`);
      navigateTo('#home');
      return true;
    } else {
      showToast(data.error || 'Signup failed');
      return false;
    }
  } catch (err) {
    Aurora.user = { id: Date.now(), name, email, role: 'buyer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' };
    localStorage.setItem('aurora_user', JSON.stringify(Aurora.user));
    updateUserUI();
    showToast(`Welcome to Aurora Atelier, ${name}! ✨`);
    navigateTo('#home');
    return true;
  }
}

function logoutUser() {
  Aurora.user = null;
  localStorage.removeItem('aurora_user');
  updateUserUI();
  showToast('You have signed out of Aurora Atelier ✨');
  navigateTo('#home');
}

function updateUserUI() {
  const profileContainer = document.querySelector('#navUserProfile');
  const adminNavTab = document.querySelector('#navAdminTab');

  if (Aurora.user) {
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="user-profile-btn" onclick="toggleUserMenu()">
          <img src="${Aurora.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}" class="user-avatar" alt="Avatar">
          <span class="user-name-label">${Aurora.user.name.split(' ')[0]}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      `;
    }
    if (adminNavTab) {
      adminNavTab.style.display = Aurora.user.role === 'admin' ? 'block' : 'none';
    }
  } else {
    if (profileContainer) {
      profileContainer.innerHTML = `
        <button class="btn btn-outline-gold btn-sm" onclick="navigateTo('#auth')">
          Sign In
        </button>
      `;
    }
    if (adminNavTab) adminNavTab.style.display = 'none';
  }
}

function toggleUserMenu() {
  if (!Aurora.user) return;
  const isBuyer = Aurora.user.role === 'buyer';
  const nextRole = isBuyer ? 'Atelier Admin' : 'Luxury Buyer';
  
  const modalHtml = `
    <div style="text-align:center; padding: 1rem;">
      <img src="${Aurora.user.avatar}" style="width:72px; height:72px; border-radius:50%; margin: 0 auto 1rem auto; border: 2px solid var(--gold-primary); object-fit:cover;">
      <h3 style="font-size:1.3rem; margin-bottom: 2px;">${Aurora.user.name}</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom: 1.5rem;">${Aurora.user.email} &bull; <strong style="color:var(--gold-dark); text-transform:uppercase;">${Aurora.user.role}</strong></p>
      
      <div style="display:flex; flex-direction:column; gap:0.6rem; max-width:280px; margin:0 auto;">
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('#orders'); closeModal();">My Orders & Tracking</button>
        ${Aurora.user.role === 'admin' ? '<button class="btn btn-secondary btn-sm" onclick="navigateTo(\'#admin\'); closeModal();">Atelier Admin Dashboard</button>' : ''}
        <button class="btn btn-outline-gold btn-sm" onclick="switchDemoRole(); closeModal();">Switch to ${nextRole}</button>
        <button class="btn btn-primary btn-sm" onclick="logoutUser(); closeModal();" style="background:#DC2626;">Sign Out</button>
      </div>
    </div>
  `;
  openCustomModal('Account Profile', modalHtml);
}

async function switchDemoRole() {
  if (Aurora.user && Aurora.user.role === 'admin') {
    await loginUser('buyer@aurora.luxury', 'password123');
  } else {
    await loginUser('admin@aurora.luxury', 'admin123');
  }
}

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Aurora Solstice Choker",
    category: "Necklace",
    metal_type: "Gold",
    purity: "18K Solid Gold",
    price: 12499.00,
    original_price: 15999.00,
    rating: 4.95,
    reviews_count: 34,
    stock: 8,
    description: "An ethereal 18K solid yellow gold choker featuring a handcrafted celestial medallion with subtle brilliant-cut moissanite accents.",
    image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611591475152-478311382490?auto=format&fit=crop&w=800&q=80"
    ],
    style_tags: "Gold,Necklace,Minimalist,Luxury,Everyday",
    specs: {"Hallmark": "BIS 750 (18K)", "Weight": "6.8 grams", "Chain Length": "16-18 in adjustable", "Closure": "Signature Lobster Clasp", "Finish": "High Polish Mirror"},
    featured: 1
  },
  {
    id: 2,
    name: "Liquid Silver Ribbed Cuff",
    category: "Bracelet",
    metal_type: "Silver",
    purity: "925 Sterling Silver",
    price: 4899.00,
    original_price: 5999.00,
    rating: 4.90,
    reviews_count: 28,
    stock: 12,
    description: "Sculptural 925 sterling silver statement cuff with fluid wave contours that hug the wrist with effortless modern elegance.",
    image_url: "https://images.unsplash.com/photo-1611591475152-478311382490?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1611591475152-478311382490?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80"
    ],
    style_tags: "Silver,Bracelet,Minimalist,Everyday,Modern",
    specs: {"Hallmark": "925 Pure Silver", "Weight": "14.2 grams", "Diameter": "6.2 cm (Adjustable)", "Finish": "Rhodium-Plated Liquid Sheen"},
    featured: 1
  },
  {
    id: 3,
    name: "Étoile Diamond Signet Ring",
    category: "Ring",
    metal_type: "Gold",
    purity: "18K Yellow Gold",
    price: 8999.00,
    original_price: 10500.00,
    rating: 4.98,
    reviews_count: 42,
    stock: 5,
    description: "A modern reimagining of the heritage signet ring, cast in heavy 18K gold and star-set with a conflict-free lab solitaire diamond.",
    image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80"
    ],
    style_tags: "Gold,Ring,Luxury,Everyday,Minimalist",
    specs: {"Hallmark": "BIS 750 (18K)", "Weight": "5.4 grams", "Stone": "0.08ct VVS1 Lab Diamond", "Sizes Available": "US 5, 6, 7, 8, 9"},
    featured: 1
  },
  {
    id: 4,
    name: "Cascade Pearl Drop Earrings",
    category: "Earrings",
    metal_type: "Gold",
    purity: "14K Gold Vermeil",
    price: 3499.00,
    original_price: 4200.00,
    rating: 4.88,
    reviews_count: 19,
    stock: 15,
    description: "Natural organic baroque freshwater pearls suspended from delicate 14K gold vermeil geometric studs. Lightweight and dreamy.",
    image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80"
    ],
    style_tags: "Gold,Earrings,Formal,Luxury,Minimalist",
    specs: {"Base Metal": "925 Sterling Silver + 2.5 Micron 14K Gold", "Pearls": "AAA Grade Freshwater Baroque", "Drop Length": "38 mm"},
    featured: 1
  },
  {
    id: 5,
    name: "Serpentine Liquid Silver Herringbone",
    category: "Necklace",
    metal_type: "Silver",
    purity: "925 Sterling Silver",
    price: 3999.00,
    original_price: 4800.00,
    rating: 4.92,
    reviews_count: 51,
    stock: 20,
    description: "Silky Italian herringbone chain in high-grade 925 silver that drapes fluidly like liquid mirror across your collarbone.",
    image_url: "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80"],
    style_tags: "Silver,Necklace,Everyday,Minimalist,Modern",
    specs: {"Hallmark": "925 Italy", "Width": "4.5 mm", "Length": "18 in with 2 in extender", "Anti-Tarnish": "Rhodium Shield"},
    featured: 1
  },
  {
    id: 6,
    name: "L’Aura Chunky Croissant Hoops",
    category: "Earrings",
    metal_type: "Gold",
    purity: "18K Gold Vermeil",
    price: 4299.00,
    original_price: 5500.00,
    rating: 4.96,
    reviews_count: 67,
    stock: 14,
    description: "The iconic Gen-Z croissant rib textured hoop earrings. Ultra lightweight hollow-cast design for day-to-night statement wear.",
    image_url: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80"],
    style_tags: "Gold,Earrings,Everyday,Luxury,Modern",
    specs: {"Diameter": "25 mm", "Thickness": "7 mm", "Weight": "4.1 grams per earring", "Hypoallergenic": "100% Nickel-Free"},
    featured: 1
  },
  {
    id: 7,
    name: "Minimalist Silver Eternity Band",
    category: "Ring",
    metal_type: "Silver",
    purity: "925 Sterling Silver",
    price: 2799.00,
    original_price: 3400.00,
    rating: 4.85,
    reviews_count: 24,
    stock: 18,
    description: "Pave-set shimmering micro-zirconias wrapped around a slender 925 sterling silver band. Perfect for stacking.",
    image_url: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80"],
    style_tags: "Silver,Ring,Minimalist,Everyday,Stacking",
    specs: {"Hallmark": "925 Pure Silver", "Band Width": "1.8 mm", "Stones": "5A Flawless Cubic Zirconia"},
    featured: 0
  },
  {
    id: 8,
    name: "Celestial Soleil Paperclip Bracelet",
    category: "Bracelet",
    metal_type: "Gold",
    purity: "18K Solid Gold",
    price: 9499.00,
    original_price: 11999.00,
    rating: 4.94,
    reviews_count: 38,
    stock: 6,
    description: "Modern elongated paperclip chain crafted in 18K yellow gold, adorned with an engraved sunburst charm.",
    image_url: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80"],
    style_tags: "Gold,Bracelet,Everyday,Luxury,Modern",
    specs: {"Hallmark": "BIS 750 (18K)", "Length": "7.5 inches", "Weight": "5.2 grams"},
    featured: 0
  },
  {
    id: 9,
    name: "Nocturne Silver Snake Ring",
    category: "Ring",
    metal_type: "Silver",
    purity: "925 Sterling Silver",
    price: 3199.00,
    original_price: 3900.00,
    rating: 4.89,
    reviews_count: 15,
    stock: 10,
    description: "Sensual coiled serpent ring in oxidized 925 silver featuring emerald-green crystal eyes. Subtle rebellion with refined luxury.",
    image_url: "https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=800&q=80"],
    style_tags: "Silver,Ring,Statement,Luxury,Modern",
    specs: {"Hallmark": "925 Silver", "Stones": "Lab Synthetic Emeralds", "Size": "Adjustable (Fits US 6-9)"},
    featured: 0
  },
  {
    id: 10,
    name: "Lumière Dual Tone Lock Pendant",
    category: "Necklace",
    metal_type: "Gold",
    purity: "18K Gold & 925 Silver",
    price: 7499.00,
    original_price: 8900.00,
    rating: 4.97,
    reviews_count: 44,
    stock: 7,
    description: "A bespoke fusion of solid 18K gold and chilled 925 silver interlocking padlock design on a dual layered curb chain.",
    image_url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    gallery: ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80"],
    style_tags: "Gold,Silver,Necklace,Statement,Luxury,Modern",
    specs: {"Metal": "18K Gold Plated + 925 Solid Silver", "Length": "20 inches", "Pendant Size": "18mm x 12mm"},
    featured: 1
  }
];

// ==========================================================================
// PRODUCTS ENGINE & CATALOG
// ==========================================================================
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();
    if (data.success && data.products && data.products.length > 0) {
      Aurora.products = data.products;
    } else {
      Aurora.products = DEFAULT_PRODUCTS;
    }
  } catch (e) {
    Aurora.products = DEFAULT_PRODUCTS;
  }
}

function renderFeaturedProducts() {
  const container = document.querySelector('#featuredProductsGrid');
  if (!container) return;

  const featured = Aurora.products.slice(0, 4);
  container.innerHTML = featured.map(p => createProductCardHTML(p)).join('');
}

function renderProducts() {
  const container = document.querySelector('#catalogProductsGrid');
  if (!container) return;

  let filtered = [...Aurora.products];

  // Category filter
  if (Aurora.activeFilter.category !== 'All') {
    filtered = filtered.filter(p => p.category === Aurora.activeFilter.category);
  }

  // Metal filter
  if (Aurora.activeFilter.metal !== 'All') {
    filtered = filtered.filter(p => p.metal_type === Aurora.activeFilter.metal || p.purity.includes(Aurora.activeFilter.metal));
  }

  // Style filter
  if (Aurora.activeFilter.style !== 'All') {
    filtered = filtered.filter(p => (p.style_tags || '').includes(Aurora.activeFilter.style));
  }

  // Search query
  if (Aurora.activeFilter.query.trim()) {
    const q = Aurora.activeFilter.query.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) || 
      (p.style_tags || '').toLowerCase().includes(q)
    );
  }

  // Sort
  if (Aurora.activeFilter.sort === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (Aurora.activeFilter.sort === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (Aurora.activeFilter.sort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 4rem 1rem;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">✨</div>
        <h3 style="font-size: 1.4rem; margin-bottom: 0.5rem;">No matching accessories found</h3>
        <p style="color:var(--text-muted); margin-bottom: 1.5rem;">Try adjusting your filters, or request a bespoke custom piece crafted to your exact imagination.</p>
        <button class="btn btn-gold" onclick="navigateTo('#custom-request')">Request Bespoke Creation</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => createProductCardHTML(p)).join('');
}

function createProductCardHTML(product) {
  const isWishlisted = Aurora.wishlist.has(product.id);
  const badgeClass = product.metal_type === 'Silver' ? 'badge-silver' : 'badge-gold';
  const originalPriceHtml = product.original_price ? `<span class="product-original-price">₹${product.original_price.toLocaleString()}</span>` : '';

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-media">
        <span class="product-badge-metal ${badgeClass}">${product.purity || product.metal_type}</span>
        <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${product.id}, event)" title="Add to Wishlist">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <img src="${product.image_url}" alt="${product.name}" loading="lazy" onclick="openProductDetails(${product.id})">
      </div>
      <div class="product-details">
        <div class="product-category-text">${product.category} &bull; ${product.metal_type}</div>
        <h4 class="product-name" onclick="openProductDetails(${product.id})">${product.name}</h4>
        <p class="product-description-short">${product.description}</p>
        <div class="product-footer">
          <div class="product-price-box">
            <span class="product-price">₹${product.price.toLocaleString()}</span>
            ${originalPriceHtml}
          </div>
          <button class="btn-card-add" onclick="quickAddToCart(${product.id}, event)">
            + Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// PRODUCT DETAILS MODAL
// ==========================================================================
async function openProductDetails(productId) {
  let product = Aurora.products.find(p => p.id === productId);
  
  try {
    const res = await fetch(`${API_BASE}/products/${productId}`);
    const data = await res.json();
    if (data.success && data.product) {
      product = data.product;
    }
  } catch(e) {}

  if (!product) return;
  Aurora.selectedProduct = product;

  const gallery = product.gallery || [product.image_url];
  const specs = product.specs || { "Metal": product.purity || product.metal_type, "Finish": "Mirror Polish" };
  const reviews = product.reviews || [];

  const thumbsHtml = gallery.map((img, idx) => `
    <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="switchDetailImage('${img}', this)">
      <img src="${img}" alt="Thumbnail">
    </div>
  `).join('');

  const specsHtml = Object.entries(specs).map(([k, v]) => `
    <div class="spec-item">
      <span class="spec-key">${k}</span>
      <span class="spec-val">${v}</span>
    </div>
  `).join('');

  const reviewsHtml = reviews.length ? reviews.map(r => `
    <div style="border-bottom:1px solid var(--border-light); padding:0.8rem 0;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <strong style="font-size:0.9rem;">${r.author_name} ${r.verified ? '✨ (Verified Buyer)' : ''}</strong>
        <span style="color:var(--gold-dark); font-size:0.85rem;">★ ${r.rating}.0</span>
      </div>
      <div style="font-weight:600; font-size:0.88rem; margin-bottom:2px;">${r.title || ''}</div>
      <p style="font-size:0.82rem; color:var(--text-muted);">${r.comment}</p>
    </div>
  `).join('') : '<p style="font-size:0.85rem; color:var(--text-muted);">No reviews yet. Be the first to review this atelier piece!</p>';

  const modalBody = `
    <div class="product-detail-layout">
      <!-- Gallery -->
      <div class="detail-gallery">
        <div class="detail-main-img">
          <img id="detailMainImg" src="${gallery[0]}" alt="${product.name}">
        </div>
        <div class="detail-thumbs">
          ${thumbsHtml}
        </div>
      </div>

      <!-- Info & Actions -->
      <div class="detail-info">
        <div class="eyebrow">${product.category} &bull; ${product.metal_type}</div>
        <h2 class="detail-title">${product.name}</h2>
        <div class="detail-rating">
          ★ ${product.rating || 4.9} <span style="color:var(--text-muted); font-size:0.82rem;">(${product.reviews_count || 12} customer reviews)</span>
        </div>
        <div class="detail-price-row">
          <span class="detail-price">₹${product.price.toLocaleString()}</span>
          ${product.original_price ? `<span class="product-original-price" style="font-size:1.1rem;">₹${product.original_price.toLocaleString()}</span>` : ''}
          <span class="stock-pill stock-in">In Atelier Stock</span>
        </div>

        <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin-bottom:1.5rem;">
          ${product.description}
        </p>

        <!-- Metal/Purity Selection -->
        <div class="variant-selector-group">
          <div class="variant-label">Metal Selection:</div>
          <div class="variant-options">
            <button class="variant-btn ${product.metal_type === 'Gold' ? 'active' : ''}" onclick="selectVariant(this, '18K Yellow Gold')">18K Solid Gold</button>
            <button class="variant-btn ${product.metal_type === 'Silver' ? 'active' : ''}" onclick="selectVariant(this, '925 Sterling Silver')">925 Sterling Silver</button>
            <button class="variant-btn" onclick="selectVariant(this, '14K Rose Gold')">14K Rose Gold</button>
          </div>
        </div>

        <!-- Size Selection -->
        <div class="variant-selector-group">
          <div class="variant-label">${product.category === 'Ring' ? 'Ring Size (US):' : (product.category === 'Necklace' ? 'Chain Length:' : 'Size:')}</div>
          <div class="variant-options">
            ${product.category === 'Ring' 
              ? '<button class="variant-btn active" onclick="selectSize(this, \'US 6\')">US 6</button><button class="variant-btn" onclick="selectSize(this, \'US 7\')">US 7</button><button class="variant-btn" onclick="selectSize(this, \'US 8\')">US 8</button>' 
              : '<button class="variant-btn active" onclick="selectSize(this, \'16 inch\')">16"</button><button class="variant-btn" onclick="selectSize(this, \'18 inch\')">18"</button><button class="variant-btn" onclick="selectSize(this, \'20 inch\')">20"</button>'}
          </div>
        </div>

        <!-- Actions -->
        <div class="detail-actions">
          <button class="btn btn-secondary btn-lg" onclick="addToCartFromDetail(${product.id})">
            + Add to Cart
          </button>
          <button class="btn btn-gold btn-lg" onclick="buyNowFromDetail(${product.id})">
            Buy Now ✨
          </button>
        </div>

        <!-- Specs -->
        <div class="specs-list">
          ${specsHtml}
        </div>

        <!-- Reviews Section -->
        <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border-subtle);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h4 style="font-size:1.1rem;">Customer Reviews</h4>
            <button class="btn btn-outline-gold btn-sm" onclick="showReviewForm(${product.id})">+ Write Review</button>
          </div>
          <div id="productReviewsContainer">
            ${reviewsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  openCustomModal(product.name, modalBody, true);
}

function switchDetailImage(imgUrl, thumbEl) {
  const main = document.querySelector('#detailMainImg');
  if (main) main.src = imgUrl;
  document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
}

function selectVariant(btn, name) {
  btn.parentElement.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function selectSize(btn, size) {
  btn.parentElement.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function addToCartFromDetail(productId) {
  const product = Aurora.products.find(p => p.id === productId);
  if (!product) return;

  const selectedMetal = document.querySelector('.variant-selector-group .variant-btn.active')?.innerText || product.purity;
  const selectedSize = document.querySelectorAll('.variant-selector-group')[1]?.querySelector('.variant-btn.active')?.innerText || 'Standard';

  addToCart(product, selectedMetal, selectedSize);
  closeModal();
  openCartDrawer();
}

function buyNowFromDetail(productId) {
  addToCartFromDetail(productId);
  closeCartDrawer();
  navigateTo('#checkout');
}

// Review Submission Modal
function showReviewForm(productId) {
  const formHtml = `
    <form onsubmit="submitReview(event, ${productId})" style="display:flex; flex-direction:column; gap:1rem; padding:1rem;">
      <div class="form-group">
        <label class="form-label">Your Name</label>
        <input type="text" id="reviewAuthor" class="form-input" value="${Aurora.user ? Aurora.user.name : ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Rating</label>
        <select id="reviewRating" class="form-input">
          <option value="5">★★★★★ (5/5) Masterpiece</option>
          <option value="4">★★★★☆ (4/5) Very Good</option>
          <option value="3">★★★☆☆ (3/5) Average</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Review Title</label>
        <input type="text" id="reviewTitle" class="form-input" placeholder="e.g. Gorgeous brilliance & high quality" required>
      </div>
      <div class="form-group">
        <label class="form-label">Your Feedback</label>
        <textarea id="reviewComment" class="form-input" style="height:100px; resize:vertical;" placeholder="Share your experience with the craftsmanship, packaging, and wear..." required></textarea>
      </div>
      <button type="submit" class="btn btn-gold" style="width:100%;">Submit Verified Review</button>
    </form>
  `;
  openCustomModal('Review Piece', formHtml);
}

async function submitReview(e, productId) {
  e.preventDefault();
  const author_name = document.querySelector('#reviewAuthor').value;
  const rating = parseInt(document.querySelector('#reviewRating').value);
  const title = document.querySelector('#reviewTitle').value;
  const comment = document.querySelector('#reviewComment').value;

  try {
    await fetch(`${API_BASE}/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name, rating, title, comment })
    });
  } catch(e) {}

  showToast('Thank you! Your review has been published ✨');
  closeModal();
  openProductDetails(productId);
}

// ==========================================================================
// WISHLIST
// ==========================================================================
function toggleWishlist(productId, e) {
  if (e) e.stopPropagation();
  if (Aurora.wishlist.has(productId)) {
    Aurora.wishlist.delete(productId);
    showToast('Removed from Wishlist');
  } else {
    Aurora.wishlist.add(productId);
    showToast('Saved to Wishlist ♡ ✨');
  }
  saveWishlist();
  renderProducts();
  renderFeaturedProducts();
}

function updateWishlistBadge() {
  const badge = document.querySelector('#wishlistBadge');
  if (badge) {
    badge.innerText = Aurora.wishlist.size;
    badge.style.display = Aurora.wishlist.size > 0 ? 'flex' : 'none';
  }
}

// ==========================================================================
// CART ENGINE & SLIDE-OVER DRAWER
// ==========================================================================
function quickAddToCart(productId, e) {
  if (e) e.stopPropagation();
  const product = Aurora.products.find(p => p.id === productId);
  if (!product) return;
  addToCart(product, product.purity || product.metal_type, 'Standard');
  showToast(`Added "${product.name}" to cart ✨`);
}

function addToCart(product, metal, size) {
  const cartKey = `${product.id}-${metal}-${size}`;
  const existing = Aurora.cart.find(item => item.cartKey === cartKey);

  if (existing) {
    existing.quantity += 1;
  } else {
    Aurora.cart.push({
      cartKey,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      metal: metal || product.metal_type,
      size: size || 'Standard',
      quantity: 1
    });
  }
  saveCart();
}

function updateCartItemQty(cartKey, delta) {
  const item = Aurora.cart.find(i => i.cartKey === cartKey);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    Aurora.cart = Aurora.cart.filter(i => i.cartKey !== cartKey);
  }
  saveCart();
}

function removeCartItem(cartKey) {
  Aurora.cart = Aurora.cart.filter(i => i.cartKey !== cartKey);
  saveCart();
  showToast('Item removed from cart');
}

function updateCartBadge() {
  const badge = document.querySelector('#cartBadge');
  const count = Aurora.cart.reduce((sum, i) => sum + i.quantity, 0);
  if (badge) {
    badge.innerText = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function calculateCartTotals() {
  const subtotal = Aurora.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal * (Aurora.discountPercent / 100);
  const shipping = subtotal > 0 && subtotal < 2999 ? 250 : 0;
  const total = Math.max(0, subtotal - discount + shipping);
  return { subtotal, discount, shipping, total };
}

function renderCart() {
  const container = document.querySelector('#cartDrawerItems');
  const footerContainer = document.querySelector('#cartDrawerFooter');
  if (!container || !footerContainer) return;

  if (Aurora.cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 4rem 1rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.8rem;">🛍️</div>
        <h4 style="font-size: 1.2rem; margin-bottom: 0.4rem;">Your atelier cart is empty</h4>
        <p style="color:var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">Explore our curated pure gold and liquid silver edits.</p>
        <button class="btn btn-gold btn-sm" onclick="closeCartDrawer(); navigateTo('#explore');">Explore Collection</button>
      </div>
    `;
    footerContainer.style.display = 'none';
    return;
  }

  footerContainer.style.display = 'block';

  container.innerHTML = Aurora.cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" class="cart-item-img" alt="${item.name}">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-meta">${item.metal} &bull; Size: ${item.size}</div>
        <div class="cart-item-row">
          <div class="quantity-control">
            <button class="qty-btn" onclick="updateCartItemQty('${item.cartKey}', -1)">-</button>
            <span class="qty-number">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartItemQty('${item.cartKey}', 1)">+</button>
          </div>
          <div class="cart-item-price">₹${(item.price * item.quantity).toLocaleString()}</div>
        </div>
        <button class="cart-remove-btn" onclick="removeCartItem('${item.cartKey}')">Remove</button>
      </div>
    </div>
  `).join('');

  const { subtotal, discount, shipping, total } = calculateCartTotals();

  document.querySelector('#cartSubtotal').innerText = `₹${subtotal.toLocaleString()}`;
  document.querySelector('#cartShipping').innerText = shipping === 0 ? 'FREE' : `₹${shipping}`;
  document.querySelector('#cartDiscountRow').style.display = discount > 0 ? 'flex' : 'none';
  document.querySelector('#cartDiscount').innerText = `-₹${discount.toLocaleString()}`;
  document.querySelector('#cartTotal').innerText = `₹${total.toLocaleString()}`;
}

function renderCartPage() {
  renderCart();
  const pageContainer = document.querySelector('#cartPageContainer');
  if (pageContainer) {
    const { subtotal, total } = calculateCartTotals();
    // Synchronize page view
  }
}

function openCartDrawer() {
  renderCart();
  document.querySelector('#cartDrawerOverlay')?.classList.add('active');
  document.querySelector('#cartDrawer')?.classList.add('active');
}

function closeCartDrawer() {
  document.querySelector('#cartDrawerOverlay')?.classList.remove('active');
  document.querySelector('#cartDrawer')?.classList.remove('active');
}

function applyPromoCode() {
  const input = document.querySelector('#promoInput');
  const code = input?.value.trim().toUpperCase();

  if (code === 'AURORA10') {
    Aurora.discountPercent = 10;
    showToast('✨ Coupon AURORA10 applied: 10% Off VIP Atelier Discount!');
  } else if (code === 'GOLD20') {
    Aurora.discountPercent = 20;
    showToast('✨ Coupon GOLD20 applied: 20% Off Festive Gold Discount!');
  } else {
    showToast('Invalid promo code. Try "AURORA10"');
    return;
  }
  renderCart();
}

// ==========================================================================
// DESCRIBE WHAT YOU WANT — SMART MATCHER & BESPOKE COMMISSION
// ==========================================================================
function handlePromptInput() {
  const query = document.querySelector('#bespokePromptInput').value.trim().toLowerCase();
  
  if (!query) {
    document.querySelector('#bespokeMatchesContainer').style.display = 'none';
    return;
  }

  // Real-time catalog matcher
  const matches = Aurora.products.filter(p => {
    const text = `${p.name} ${p.description} ${p.category} ${p.metal_type} ${p.purity} ${p.style_tags}`.toLowerCase();
    const words = query.split(/\s+/).filter(w => w.length > 2);
    return words.some(w => text.includes(w));
  });

  const container = document.querySelector('#bespokeMatchesGrid');
  const wrapper = document.querySelector('#bespokeMatchesContainer');
  
  if (matches.length > 0) {
    wrapper.style.display = 'block';
    container.innerHTML = matches.slice(0, 3).map(p => createProductCardHTML(p)).join('');
  } else {
    wrapper.style.display = 'block';
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background:var(--bg-card-subtle); padding:2rem; border-radius:var(--radius-md); text-align:center; border:1px dashed var(--gold-border);">
        <p style="font-size:0.95rem; color:var(--text-dark); margin-bottom:0.5rem;">No exact ready-to-ship match for "<em>${query}</em>".</p>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Our master jewelers can custom-forge this exact piece for you.</p>
        <button class="btn btn-gold btn-sm" onclick="submitBespokeRequest()">Request Custom Bespoke Commission</button>
      </div>
    `;
  }
}

function quickSelectPrompt(tag) {
  const input = document.querySelector('#bespokePromptInput');
  if (input) {
    if (!input.value.includes(tag)) {
      input.value = input.value ? `${input.value}, ${tag}` : tag;
    }
    handlePromptInput();
  }
}

async function submitBespokeRequest() {
  const desc = document.querySelector('#bespokePromptInput')?.value.trim();
  const accessory_type = document.querySelector('#bespokeTypeSelect')?.value || 'Necklace';
  const metal_type = document.querySelector('#bespokeMetalSelect')?.value || 'Gold';
  const budget = document.querySelector('#bespokeBudgetSelect')?.value || '₹5,000 - ₹15,000';
  const occasion = document.querySelector('#bespokeOccasionSelect')?.value || 'Everyday Luxury';

  if (!desc && !Aurora.inspirationImageBase64) {
    showToast('Please describe your accessory or upload an inspiration image ✨');
    return;
  }

  const payload = {
    user_name: Aurora.user ? Aurora.user.name : 'Valued Client',
    user_email: Aurora.user ? Aurora.user.email : 'client@aurora.luxury',
    accessory_type,
    metal_type,
    budget,
    occasion,
    description: desc || 'Custom accessory created via inspiration studio',
    inspiration_image: Aurora.inspirationImageBase64 || ''
  };

  try {
    const res = await fetch(`${API_BASE}/custom-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast('✨ Bespoke request submitted! Our artisans will review within 24h.');
      document.querySelector('#bespokePromptInput').value = '';
      Aurora.inspirationImageBase64 = null;
      resetInspirationPreview();
      await loadCustomRequests();
      openCustomModal('Bespoke Commission Received ✨', `
        <div style="text-align:center; padding:1.5rem;">
          <div style="font-size:3rem; margin-bottom:1rem;">💍</div>
          <h3 style="font-size:1.4rem; margin-bottom:0.6rem;">Your Request has Reached Our Atelier</h3>
          <p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin-bottom:1.5rem;">
            Our head artisan is reviewing your specifications for <strong>${metal_type} ${accessory_type}</strong>. You will receive a quotation and digital 3D rendering in your registered inbox.
          </p>
          <button class="btn btn-gold" onclick="closeModal(); navigateTo('#explore');">Continue Exploring</button>
        </div>
      `);
    }
  } catch (err) {
    showToast('✨ Bespoke request saved to your atelier account!');
    closeModal();
  }
}

async function loadCustomRequests() {
  try {
    const email = Aurora.user ? Aurora.user.email : '';
    const res = await fetch(`${API_BASE}/custom-requests?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.success) {
      Aurora.customRequests = data.requests;
    }
  } catch(e) {}
}

// ==========================================================================
// UPLOAD / PASTE INSPIRATION IMAGE ENGINE
// ==========================================================================
function setupDragAndDrop() {
  const dropzone = document.querySelector('#inspirationDropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
  });
}

function setupClipboardPaste() {
  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file' && item.type.includes('image/')) {
        const blob = item.getAsFile();
        handleImageFile(blob);
        showToast('✨ Inspiration image pasted from clipboard!');
        break;
      }
    }
  });
}

function handleImageFileInput(event) {
  if (event.target.files && event.target.files[0]) {
    handleImageFile(event.target.files[0]);
  }
}

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file (PNG, JPG, WEBP)');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    Aurora.inspirationImageBase64 = e.target.result;
    displayInspirationPreview(e.target.result, file.name);
  };
  reader.readAsDataURL(file);
}

function addImageByUrl() {
  const url = prompt("Paste the image URL of your jewelry inspiration:");
  if (url && url.trim()) {
    Aurora.inspirationImageBase64 = url.trim();
    displayInspirationPreview(url.trim(), 'Web Image');
    showToast('✨ Web image loaded as inspiration');
  }
}

function displayInspirationPreview(src, filename) {
  const container = document.querySelector('#inspirationPreviewContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="position:relative; width:100%; height:100%;">
      <img src="${src}" alt="Inspiration" style="width:100%; height:100%; object-fit:contain; border-radius:var(--radius-md);">
      <button onclick="resetInspirationPreview()" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.7); color:#FFF; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;">✕</button>
    </div>
  `;
  document.querySelector('#inspirationSubmitCard')?.style.setProperty('display', 'flex');
}

function resetInspirationPreview() {
  Aurora.inspirationImageBase64 = null;
  const container = document.querySelector('#inspirationPreviewContainer');
  if (container) {
    container.innerHTML = `
      <div class="preview-placeholder">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.5rem; color:var(--gold-primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <div>Uploaded or pasted inspiration image preview will appear here</div>
      </div>
    `;
  }
}

// ==========================================================================
// CHECKOUT & PURCHASE PROCESS
// ==========================================================================
function renderCheckoutSummary() {
  const container = document.querySelector('#checkoutItemsSummary');
  if (!container) return;

  const { subtotal, discount, shipping, total } = calculateCartTotals();

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem;">
      ${Aurora.cart.map(item => `
        <div style="display:flex; gap:0.8rem; align-items:center;">
          <img src="${item.image}" style="width:48px; height:48px; border-radius:6px; object-fit:cover; border:1px solid var(--border-subtle);">
          <div style="flex:1;">
            <div style="font-weight:600; font-size:0.88rem;">${item.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${item.metal} &bull; Qty: ${item.quantity}</div>
          </div>
          <div style="font-weight:600; font-size:0.88rem;">₹${(item.price * item.quantity).toLocaleString()}</div>
        </div>
      `).join('')}
    </div>

    <div style="border-top:1px solid var(--border-subtle); padding-top:1rem; font-size:0.88rem;">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:var(--text-muted);">
        <span>Subtotal</span>
        <span>₹${subtotal.toLocaleString()}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:var(--text-muted);">
        <span>Insured Atelier Delivery</span>
        <span style="color:var(--success); font-weight:600;">${shipping === 0 ? 'COMPLIMENTARY' : `₹${shipping}`}</span>
      </div>
      ${discount > 0 ? `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:var(--gold-dark); font-weight:600;">
          <span>VIP Atelier Discount</span>
          <span>-₹${discount.toLocaleString()}</span>
        </div>
      ` : ''}
      <div style="display:flex; justify-content:space-between; margin-top:0.8rem; padding-top:0.8rem; border-top:1px solid var(--border-subtle); font-size:1.2rem; font-weight:700;">
        <span>Total Payable</span>
        <span style="color:var(--gold-dark);">₹${total.toLocaleString()}</span>
      </div>
    </div>
  `;
}

async function processOrderCheckout(e) {
  e.preventDefault();

  if (Aurora.cart.length === 0) {
    showToast('Your cart is empty');
    navigateTo('#explore');
    return;
  }

  const fullName = document.querySelector('#checkoutName').value.trim();
  const email = document.querySelector('#checkoutEmail').value.trim();
  const phone = document.querySelector('#checkoutPhone').value.trim();
  const street = document.querySelector('#checkoutStreet').value.trim();
  const city = document.querySelector('#checkoutCity').value.trim();
  const state = document.querySelector('#checkoutState').value.trim();
  const postalCode = document.querySelector('#checkoutZip').value.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'UPI / Instant QR';

  const address = { fullName, street, city, state, postalCode, phone };
  const { subtotal, discount, shipping, total } = calculateCartTotals();

  const payload = {
    user_id: Aurora.user ? Aurora.user.id : null,
    user_name: fullName,
    user_email: email,
    user_phone: phone,
    address,
    items: Aurora.cart,
    subtotal,
    shipping,
    discount,
    total,
    payment_method: paymentMethod
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      // Clear Cart
      const orderNumber = data.order_number;
      const orderTotal = data.total;
      const eta = data.estimated_delivery;
      
      Aurora.cart = [];
      saveCart();

      // Show Order Confirmation Screen
      displayOrderSuccessScreen(orderNumber, orderTotal, eta, address, paymentMethod);
      await loadOrders();
    } else {
      showToast(data.error || 'Failed to place order');
    }
  } catch (err) {
    // Offline simulation
    const randNum = `AUR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    Aurora.cart = [];
    saveCart();
    displayOrderSuccessScreen(randNum, total, '4 business days', address, paymentMethod);
  }
}

function displayOrderSuccessScreen(orderNumber, total, eta, address, paymentMethod) {
  const container = document.querySelector('#orderConfirmationView');
  const checkoutContainer = document.querySelector('#checkout');
  if (checkoutContainer) checkoutContainer.style.display = 'none';

  if (container) {
    container.style.display = 'block';
    container.innerHTML = `
      <div class="confirmation-container">
        <div class="success-check-circle">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="eyebrow">ORDER CONFIRMED</div>
        <h2 style="font-size:2.2rem; margin-bottom:0.5rem;">Your Order is Confirmed ✨</h2>
        <p style="color:var(--text-muted); font-size:1rem; margin-bottom:1.5rem;">
          Thank you for choosing Aurora Atelier. A bespoke confirmation email has been dispatched to <strong>${address.fullName}</strong>.
        </p>

        <div class="order-receipt-summary">
          <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--border-subtle); font-size:0.9rem;">
            <span>Order Number:</span>
            <strong style="color:var(--gold-dark);">${orderNumber}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--border-subtle); font-size:0.9rem;">
            <span>Estimated Atelier Delivery:</span>
            <strong>${eta}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--border-subtle); font-size:0.9rem;">
            <span>Payment Method:</span>
            <span>${paymentMethod} (Verified)</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.6rem 0 0 0; font-size:1.1rem; font-weight:700;">
            <span>Total Paid:</span>
            <span style="color:var(--gold-dark);">₹${total.toLocaleString()}</span>
          </div>
        </div>

        <div style="display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; margin-top:2rem;">
          <button class="btn btn-gold btn-lg" onclick="openConfirmationEmailModal('${orderNumber}')">
            📧 View In-App Confirmation Email
          </button>
          <button class="btn btn-secondary btn-lg" onclick="navigateTo('#orders')">
            Track Order Live
          </button>
        </div>
      </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ==========================================================================
// CONFIRMATION EMAIL VIEWER
// ==========================================================================
async function openConfirmationEmailModal(orderNumber) {
  let emailHtml = '';
  try {
    const res = await fetch(`${API_BASE}/emails?order_number=${orderNumber}`);
    const data = await res.json();
    if (data.success && data.emails && data.emails.length > 0) {
      emailHtml = data.emails[0].html_content;
    }
  } catch(e) {}

  if (!emailHtml) {
    emailHtml = `
      <div style="padding:2rem; text-align:center; font-family:var(--font-sans);">
        <div style="font-size:2rem; color:var(--gold-primary);">✉️</div>
        <h3>Order Confirmation Email</h3>
        <p>Order ${orderNumber} has been verified and emailed to your registered address.</p>
      </div>
    `;
  }

  const modalWrapper = `
    <div style="max-height:75vh; overflow-y:auto; border-radius:12px; background:#FAF7F0; padding:10px;">
      <iframe srcdoc="${emailHtml.replace(/"/g, '&quot;')}" style="width:100%; height:620px; border:none; border-radius:8px; background:#FFF;"></iframe>
    </div>
  `;

  openCustomModal(`Order Confirmation Email &bull; ${orderNumber}`, modalWrapper, true);
}

// ==========================================================================
// MY ORDERS & LIVE TRACKER
// ==========================================================================
async function loadOrders() {
  try {
    const email = Aurora.user ? Aurora.user.email : '';
    const res = await fetch(`${API_BASE}/orders?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.success) {
      Aurora.orders = data.orders;
    }
  } catch(e) {}
}

function renderOrders() {
  const container = document.querySelector('#ordersListContainer');
  if (!container) return;

  if (Aurora.orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 4rem 1rem; background:#FFF; border-radius:var(--radius-lg); border:1px solid var(--border-subtle);">
        <div style="font-size: 2.5rem; margin-bottom: 0.8rem;">📦</div>
        <h3 style="font-size: 1.4rem; margin-bottom: 0.4rem;">No orders yet</h3>
        <p style="color:var(--text-muted); margin-bottom: 1.5rem;">Explore our handcrafted gold & silver accessories to place your first order.</p>
        <button class="btn btn-gold" onclick="navigateTo('#explore')">Explore Accessories</button>
      </div>
    `;
    return;
  }

  container.innerHTML = Aurora.orders.map(order => createOrderCardHTML(order)).join('');
}

function createOrderCardHTML(order) {
  const tracking = order.tracking_history || [
    { status: 'Order Placed', completed: true },
    { status: 'Confirmed', completed: order.order_status !== 'Order Placed' },
    { status: 'Preparing', completed: ['Preparing', 'Shipped', 'Delivered'].includes(order.order_status) },
    { status: 'Shipped', completed: ['Shipped', 'Delivered'].includes(order.order_status) },
    { status: 'Delivered', completed: order.order_status === 'Delivered' }
  ];

  const steps = ['Order Placed', 'Confirmed', 'Preparing', 'Shipped', 'Delivered'];
  const currentIdx = steps.indexOf(order.order_status);
  const progressPercent = Math.max(0, (currentIdx / (steps.length - 1)) * 100);

  const trackerStepsHtml = steps.map((stepName, idx) => {
    const isCompleted = idx <= currentIdx;
    const isCurrent = idx === currentIdx;
    return `
      <div class="tracker-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
        <div class="step-dot">${isCompleted ? '✓' : idx + 1}</div>
        <span class="step-label">${stepName}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="eyebrow">ORDER REF</div>
          <h3 style="font-size:1.3rem; margin:0;">${order.order_number}</h3>
          <span style="font-size:0.8rem; color:var(--text-muted);">Placed on ${order.created_at ? order.created_at.split('T')[0] : 'Today'}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.3rem; font-weight:700; color:var(--gold-dark);">₹${order.total.toLocaleString()}</div>
          <button class="btn btn-outline-gold btn-sm" style="margin-top:4px;" onclick="openConfirmationEmailModal('${order.order_number}')">
            📧 View Email Receipt
          </button>
        </div>
      </div>

      <!-- Live Tracker Timeline -->
      <div class="tracker-timeline">
        <div class="tracker-progress-bar" style="width: ${progressPercent}%;"></div>
        ${trackerStepsHtml}
      </div>

      <!-- Items in Order -->
      <div style="background:var(--bg-card-subtle); padding:1rem 1.2rem; border-radius:var(--radius-md); margin-top:1.5rem;">
        <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.6rem;">Purchased Items</div>
        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          ${(order.items || []).map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem;">
              <div style="display:flex; align-items:center; gap:0.6rem;">
                <img src="${item.image}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;">
                <span><strong>${item.name}</strong> (${item.metal} &bull; Qty: ${item.quantity})</span>
              </div>
              <span style="font-weight:600;">₹${(item.price * item.quantity).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// ADMIN / SELLER ATELIER STUDIO
// ==========================================================================
async function renderAdminDashboard() {
  await loadAdminStats();
  await loadAdminProducts();
  await loadAdminOrders();
  await loadAdminRequests();
}

async function loadAdminStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    if (data.success) {
      document.querySelector('#adminStatRevenue').innerText = `₹${data.stats.total_revenue.toLocaleString()}`;
      document.querySelector('#adminStatOrders').innerText = data.stats.total_orders;
      document.querySelector('#adminStatProducts').innerText = data.stats.total_products;
      document.querySelector('#adminStatRequests').innerText = data.stats.total_requests;
    }
  } catch(e) {}
}

async function loadAdminProducts() {
  const container = document.querySelector('#adminProductsTableBody');
  if (!container) return;

  container.innerHTML = Aurora.products.map(p => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <img src="${p.image_url}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${p.category}</div>
          </div>
        </div>
      </td>
      <td><span class="stock-pill ${p.metal_type === 'Gold' ? 'badge-gold' : 'badge-silver'}">${p.purity || p.metal_type}</span></td>
      <td><strong>₹${p.price.toLocaleString()}</strong></td>
      <td>${p.stock} units</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editProductAdmin(${p.id})">Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="deleteProductAdmin(${p.id})" style="color:var(--danger);">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function loadAdminOrders() {
  const container = document.querySelector('#adminOrdersTableBody');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/orders`);
    const data = await res.json();
    const orders = data.success ? data.orders : Aurora.orders;

    container.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.order_number}</strong></td>
        <td>${o.user_name}<br><small style="color:var(--text-muted);">${o.user_email}</small></td>
        <td><strong>₹${o.total.toLocaleString()}</strong></td>
        <td>${o.payment_method}</td>
        <td>
          <select class="status-select" onchange="updateOrderStatusAdmin(${o.id}, this.value)">
            <option value="Order Placed" ${o.order_status === 'Order Placed' ? 'selected' : ''}>Order Placed</option>
            <option value="Confirmed" ${o.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Preparing" ${o.order_status === 'Preparing' ? 'selected' : ''}>Preparing</option>
            <option value="Shipped" ${o.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch(e) {}
}

async function updateOrderStatusAdmin(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`✨ Order status updated to "${newStatus}"!`);
      await loadOrders();
    }
  } catch(e) {
    showToast(`Order status updated to "${newStatus}"`);
  }
}

async function loadAdminRequests() {
  const container = document.querySelector('#adminRequestsContainer');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/custom-requests`);
    const data = await res.json();
    const requests = data.success ? data.requests : Aurora.customRequests;

    if (requests.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);">No custom commission requests yet.</p>';
      return;
    }

    container.innerHTML = requests.map(r => `
      <div style="background:var(--bg-card-subtle); padding:1.2rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle); margin-bottom:1rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
          <strong>${r.user_name} (${r.user_email})</strong>
          <span class="stock-pill stock-in">${r.status}</span>
        </div>
        <p style="font-size:0.9rem; color:var(--text-dark); margin-bottom:0.8rem;">${r.description}</p>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.8rem;">
          Type: <strong>${r.accessory_type}</strong> &bull; Metal: <strong>${r.metal_type}</strong> &bull; Budget: <strong>${r.budget}</strong> &bull; Occasion: <strong>${r.occasion}</strong>
        </div>
        ${r.inspiration_image ? `<div style="margin-top:0.5rem;"><img src="${r.inspiration_image}" style="max-height:140px; border-radius:8px; object-fit:contain; border:1px solid var(--border-subtle);"></div>` : ''}
      </div>
    `).join('');
  } catch(e) {}
}

function openAddProductModal() {
  const modalHtml = `
    <form onsubmit="submitAddProduct(event)" style="display:flex; flex-direction:column; gap:1rem; padding:1rem;">
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Product Name</label>
          <input type="text" id="adminNewName" class="form-input" placeholder="e.g. Celestial Gold Amulet" required>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="adminNewCategory" class="form-input">
            <option value="Necklace">Necklace</option>
            <option value="Bracelet">Bracelet</option>
            <option value="Ring">Ring</option>
            <option value="Earrings">Earrings</option>
          </select>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Metal Type</label>
          <select id="adminNewMetal" class="form-input">
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Purity / Hallmark</label>
          <input type="text" id="adminNewPurity" class="form-input" placeholder="e.g. 18K Solid Gold / 925 Silver" required>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Price (₹ INR)</label>
          <input type="number" id="adminNewPrice" class="form-input" placeholder="7499" required>
        </div>
        <div class="form-group">
          <label class="form-label">Atelier Stock</label>
          <input type="number" id="adminNewStock" class="form-input" value="10" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Image URL (Unsplash or direct link)</label>
        <input type="url" id="adminNewImg" class="form-input" placeholder="https://images.unsplash.com/..." required>
      </div>
      <div class="form-group">
        <label class="form-label">Artisan Description</label>
        <textarea id="adminNewDesc" class="form-input" style="height:80px;" placeholder="Crafted with exquisite brilliance..." required></textarea>
      </div>
      <button type="submit" class="btn btn-gold" style="width:100%;">Add Piece to Catalog</button>
    </form>
  `;
  openCustomModal('Add New Atelier Piece', modalHtml);
}

async function submitAddProduct(e) {
  e.preventDefault();
  const name = document.querySelector('#adminNewName').value;
  const category = document.querySelector('#adminNewCategory').value;
  const metal_type = document.querySelector('#adminNewMetal').value;
  const purity = document.querySelector('#adminNewPurity').value;
  const price = parseFloat(document.querySelector('#adminNewPrice').value);
  const stock = parseInt(document.querySelector('#adminNewStock').value);
  const image_url = document.querySelector('#adminNewImg').value;
  const description = document.querySelector('#adminNewDesc').value;

  const payload = { name, category, metal_type, purity, price, stock, image_url, description };

  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(`✨ Added "${name}" to atelier catalog!`);
      closeModal();
      await loadProducts();
      renderAdminDashboard();
    }
  } catch(e) {
    showToast(`Added "${name}" to catalog!`);
    closeModal();
  }
}

async function deleteProductAdmin(productId) {
  if (!confirm('Are you sure you want to delete this piece from catalog?')) return;
  try {
    await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE' });
    showToast('Product removed from catalog');
    await loadProducts();
    renderAdminDashboard();
  } catch(e) {}
}

// ==========================================================================
// MODAL & TOAST CONTROLLERS
// ==========================================================================
function openCustomModal(title, bodyHtml, isLarge = false) {
  const overlay = document.querySelector('#globalModalOverlay');
  const content = document.querySelector('#globalModalContent');
  if (!overlay || !content) return;

  content.style.maxWidth = isLarge ? '940px' : '520px';
  content.innerHTML = `
    <button class="modal-close-btn" onclick="closeModal()">✕</button>
    <div style="padding:1.5rem 2rem 0.5rem 2rem; border-bottom:1px solid var(--border-subtle);">
      <h3 style="font-family:var(--font-serif); font-size:1.4rem; margin:0;">${title}</h3>
    </div>
    <div style="padding:1.5rem 2rem 2rem 2rem;">
      ${bodyHtml}
    </div>
  `;
  overlay.classList.add('active');
}

function closeModal() {
  document.querySelector('#globalModalOverlay')?.classList.remove('active');
}

function showToast(message) {
  const container = document.querySelector('#toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// UI EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
  // Global modal overlay click
  document.querySelector('#globalModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'globalModalOverlay') closeModal();
  });

  // Cart drawer overlay click
  document.querySelector('#cartDrawerOverlay')?.addEventListener('click', closeCartDrawer);

  // Filter chips in Catalog
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      const type = this.getAttribute('data-filter-type');
      const val = this.getAttribute('data-filter-val');
      
      this.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      if (type === 'metal') Aurora.activeFilter.metal = val;
      if (type === 'category') Aurora.activeFilter.category = val;
      renderProducts();
    });
  });

  // Search input
  document.querySelector('#catalogSearchInput')?.addEventListener('input', (e) => {
    Aurora.activeFilter.query = e.target.value;
    renderProducts();
  });

  // Sort dropdown
  document.querySelector('#catalogSortSelect')?.addEventListener('change', (e) => {
    Aurora.activeFilter.sort = e.target.value;
    renderProducts();
  });
}
