"""
Aurora Atelier - Luxury Accessories Marketplace Backend
Built with Python 3 standard library (http.server, sqlite3, json, urllib)
Zero external dependencies required - 100% self-contained & robust.
"""

import os
import sys
import json
import sqlite3
import hashlib
import mimetypes
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Configuration
PORT = int(os.environ.get("PORT", 5000))
HOST = "0.0.0.0"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "aurora_atelier.db")

# Helper for hashing passwords
def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'buyer',
            phone TEXT,
            avatar TEXT,
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Products table
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            metal_type TEXT NOT NULL,
            purity TEXT NOT NULL,
            price REAL NOT NULL,
            original_price REAL,
            rating REAL DEFAULT 4.9,
            reviews_count INTEGER DEFAULT 12,
            stock INTEGER DEFAULT 10,
            description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            gallery_json TEXT,
            style_tags TEXT,
            specs_json TEXT,
            featured INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Custom Commission Requests table
    c.execute('''
        CREATE TABLE IF NOT EXISTS custom_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name TEXT NOT NULL,
            user_email TEXT NOT NULL,
            accessory_type TEXT,
            metal_type TEXT,
            budget TEXT,
            occasion TEXT,
            style_tags TEXT,
            description TEXT NOT NULL,
            inspiration_image TEXT,
            status TEXT DEFAULT 'Under Review',
            quote_amount REAL DEFAULT 0,
            artisan_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Orders table
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            user_name TEXT NOT NULL,
            user_email TEXT NOT NULL,
            user_phone TEXT,
            address_json TEXT NOT NULL,
            items_json TEXT NOT NULL,
            subtotal REAL NOT NULL,
            shipping REAL DEFAULT 0,
            discount REAL DEFAULT 0,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            payment_status TEXT DEFAULT 'Completed',
            order_status TEXT DEFAULT 'Order Placed',
            estimated_delivery TEXT,
            tracking_history_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Dispatched Emails table (for in-app email viewer)
    c.execute('''
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            order_number TEXT NOT NULL,
            recipient_email TEXT NOT NULL,
            recipient_name TEXT NOT NULL,
            subject TEXT NOT NULL,
            html_content TEXT NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Reviews table
    c.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            author_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            title TEXT,
            comment TEXT NOT NULL,
            verified INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()

    # Seed Default Data if empty
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        seed_users(c)

    c.execute("SELECT COUNT(*) FROM products")
    if c.fetchone()[0] == 0:
        seed_products(c)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def seed_users(c):
    demo_users = [
        ("Aria Vance", "buyer@aurora.luxury", hash_password("password123"), "buyer", "+91 98765 43210", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80", "124 Marine Drive, Nariman Point, Mumbai 400021"),
        ("Maison Aurora Atelier", "admin@aurora.luxury", hash_password("admin123"), "admin", "+91 98200 11223", "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80", "Atelier 4B, Luxury Boulevard, Mumbai")
    ]
    c.executemany("INSERT INTO users (name, email, password_hash, role, phone, avatar, address) VALUES (?, ?, ?, ?, ?, ?, ?)", demo_users)

def seed_products(c):
    products = [
        (
            "Aurora Solstice Choker",
            "Necklace",
            "Gold",
            "18K Solid Gold",
            12499.00,
            15999.00,
            4.95,
            34,
            8,
            "An ethereal 18K solid yellow gold choker featuring a handcrafted celestial medallion with subtle brilliant-cut moissanite accents.",
            "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1611591475152-478311382490?auto=format&fit=crop&w=800&q=80"
            ]),
            "Gold,Necklace,Minimalist,Luxury,Everyday",
            json.dumps({"Hallmark": "BIS 750 (18K)", "Weight": "6.8 grams", "Chain Length": "16-18 in adjustable", "Closure": "Signature Lobster Clasp", "Finish": "High Polish Mirror"}),
            1
        ),
        (
            "Liquid Silver Ribbed Cuff",
            "Bracelet",
            "Silver",
            "925 Sterling Silver",
            4899.00,
            5999.00,
            4.90,
            28,
            12,
            "Sculptural 925 sterling silver statement cuff with fluid wave contours that hug the wrist with effortless modern elegance.",
            "https://images.unsplash.com/photo-1611591475152-478311382490?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1611591475152-478311382490?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80"
            ]),
            "Silver,Bracelet,Minimalist,Everyday,Modern",
            json.dumps({"Hallmark": "925 Pure Silver", "Weight": "14.2 grams", "Diameter": "6.2 cm (Adjustable)", "Finish": "Rhodium-Plated Liquid Sheen"}),
            1
        ),
        (
            "Étoile Diamond Signet Ring",
            "Ring",
            "Gold",
            "18K Yellow Gold",
            8999.00,
            10500.00,
            4.98,
            42,
            5,
            "A modern reimagining of the heritage signet ring, cast in heavy 18K gold and star-set with a conflict-free lab solitaire diamond.",
            "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80"
            ]),
            "Gold,Ring,Luxury,Everyday,Minimalist",
            json.dumps({"Hallmark": "BIS 750 (18K)", "Weight": "5.4 grams", "Stone": "0.08ct VVS1 Lab Diamond", "Sizes Available": "US 5, 6, 7, 8, 9"}),
            1
        ),
        (
            "Cascade Pearl Drop Earrings",
            "Earrings",
            "Gold",
            "14K Gold Vermeil",
            3499.00,
            4200.00,
            4.88,
            19,
            15,
            "Natural organic baroque freshwater pearls suspended from delicate 14K gold vermeil geometric studs. Lightweight and dreamy.",
            "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80"
            ]),
            "Gold,Earrings,Formal,Luxury,Minimalist",
            json.dumps({"Base Metal": "925 Sterling Silver + 2.5 Micron 14K Gold", "Pearls": "AAA Grade Freshwater Baroque", "Drop Length": "38 mm"}),
            1
        ),
        (
            "Serpentine Liquid Silver Herringbone",
            "Necklace",
            "Silver",
            "925 Sterling Silver",
            3999.00,
            4800.00,
            4.92,
            51,
            20,
            "Silky Italian herringbone chain in high-grade 925 silver that drapes fluidly like liquid mirror across your collarbone.",
            "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80"
            ]),
            "Silver,Necklace,Everyday,Minimalist,Modern",
            json.dumps({"Hallmark": "925 Italy", "Width": "4.5 mm", "Length": "18 in with 2 in extender", "Anti-Tarnish": "Rhodium Shield"}),
            1
        ),
        (
            "L’Aura Chunky Croissant Hoops",
            "Earrings",
            "Gold",
            "18K Gold Vermeil",
            4299.00,
            5500.00,
            4.96,
            67,
            14,
            "The iconic Gen-Z croissant rib textured hoop earrings. Ultra lightweight hollow-cast design for day-to-night statement wear.",
            "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80"
            ]),
            "Gold,Earrings,Everyday,Luxury,Modern",
            json.dumps({"Diameter": "25 mm", "Thickness": "7 mm", "Weight": "4.1 grams per earring", "Hypoallergenic": "100% Nickel-Free"}),
            1
        ),
        (
            "Minimalist Silver Eternity Band",
            "Ring",
            "Silver",
            "925 Sterling Silver",
            2799.00,
            3400.00,
            4.85,
            24,
            18,
            "Pave-set shimmering micro-zirconias wrapped around a slender 925 sterling silver band. Perfect for stacking.",
            "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80"
            ]),
            "Silver,Ring,Minimalist,Everyday,Stacking",
            json.dumps({"Hallmark": "925 Pure Silver", "Band Width": "1.8 mm", "Stones": "5A Flawless Cubic Zirconia"}),
            0
        ),
        (
            "Celestial Soleil Paperclip Bracelet",
            "Bracelet",
            "Gold",
            "18K Solid Gold",
            9499.00,
            11999.00,
            4.94,
            38,
            6,
            "Modern elongated paperclip chain crafted in 18K yellow gold, adorned with an engraved sunburst charm.",
            "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80"
            ]),
            "Gold,Bracelet,Everyday,Luxury,Modern",
            json.dumps({"Hallmark": "BIS 750 (18K)", "Length": "7.5 inches", "Weight": "5.2 grams"}),
            0
        ),
        (
            "Nocturne Silver Snake Ring",
            "Ring",
            "Silver",
            "925 Sterling Silver",
            3199.00,
            3900.00,
            4.89,
            15,
            10,
            "Sensual coiled serpent ring in oxidized 925 silver featuring emerald-green crystal eyes. Subtle rebellion with refined luxury.",
            "https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=800&q=80"
            ]),
            "Silver,Ring,Statement,Luxury,Modern",
            json.dumps({"Hallmark": "925 Silver", "Stones": "Lab Synthetic Emeralds", "Size": "Adjustable (Fits US 6-9)"}),
            0
        ),
        (
            "Lumière Dual Tone Lock Pendant",
            "Necklace",
            "Gold",
            "18K Gold & 925 Silver",
            7499.00,
            8900.00,
            4.97,
            44,
            7,
            "A bespoke fusion of solid 18K gold and chilled 925 silver interlocking padlock design on a dual layered curb chain.",
            "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80"
            ]),
            "Gold,Silver,Necklace,Statement,Luxury,Modern",
            json.dumps({"Metal": "18K Gold Plated + 925 Solid Silver", "Length": "20 inches", "Pendant Size": "18mm x 12mm"}),
            1
        ),
        (
            "Astraea Silver Pavé Huggies",
            "Earrings",
            "Silver",
            "925 Sterling Silver",
            2499.00,
            3100.00,
            4.91,
            29,
            22,
            "Petite luxury huggie earrings sparkling with rows of micro pavé stones in solid sterling silver. Ultra comfortable for 24/7 wear.",
            "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=800&q=80"
            ]),
            "Silver,Earrings,Minimalist,Everyday,Stacking",
            json.dumps({"Inner Diameter": "9 mm", "Material": "925 Sterling Silver + Rhodium", "Closure": "Clicker Hinge"}),
            0
        ),
        (
            "Imperial Byzantine Gold Chain",
            "Necklace",
            "Gold",
            "22K Gold Vermeil",
            14999.00,
            18500.00,
            4.99,
            18,
            4,
            "Intricate royal Byzantine weave chain in heavyweight 22K gold vermeil over sterling silver. An heirloom statement piece.",
            "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=80",
            json.dumps([
                "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=80"
            ]),
            "Gold,Necklace,Luxury,Formal,Statement",
            json.dumps({"Gold Layer": "22K Solid Gold 3.0 Microns", "Length": "22 in", "Weight": "26 grams"}),
            0
        )
    ]

    c.executemany("""
        INSERT INTO products (name, category, metal_type, purity, price, original_price, rating, reviews_count, stock, description, image_url, gallery_json, style_tags, specs_json, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, products)

# HTML Email Template Generator
def generate_order_email_html(order_number, customer_name, items, total, address, payment_method, eta):
    items_html = ""
    for it in items:
        price_val = it.get('price', 0) * it.get('quantity', 1)
        metal_badge = f"<span style='background:#FAF7F0; color:#C9A227; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; text-transform:uppercase;'>{it.get('metal', 'Gold')}</span>"
        items_html += f"""
        <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #EDE5D5;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 70px; vertical-align: top;">
                            <img src="{it.get('image', '')}" alt="{it.get('name', 'Jewelry')}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #EDE5D5;" />
                        </td>
                        <td style="vertical-align: top; padding-left: 12px;">
                            <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 600; color: #252525;">{it.get('name', 'Aurora Piece')}</div>
                            <div style="font-size: 12px; color: #737373; margin-top: 4px;">{metal_badge} | Qty: {it.get('quantity', 1)} | Size: {it.get('size', 'Standard')}</div>
                        </td>
                        <td style="text-align: right; vertical-align: top; font-weight: 600; color: #252525; font-size: 14px;">
                            ₹{price_val:,.2f}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        """

    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Order Confirmation - Aurora Atelier</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #FAF7F0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #252525;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #EDE5D5;">
            <!-- Header with Gold Accent -->
            <tr>
                <td style="background: linear-gradient(135deg, #1F1E1C 0%, #2D2B28 100%); padding: 36px 40px; text-align: center;">
                    <div style="letter-spacing: 4px; font-size: 11px; text-transform: uppercase; color: #C9A227; font-weight: 700; margin-bottom: 8px;">Maison de Haute Joaillerie</div>
                    <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #FAF7F0; margin: 0; font-size: 28px; font-weight: 400; letter-spacing: 2px;">AURORA ATELIER</h1>
                    <div style="width: 50px; height: 1px; background: #C9A227; margin: 16px auto 0 auto;"></div>
                </td>
            </tr>

            <!-- Welcome Message -->
            <tr>
                <td style="padding: 40px 40px 24px 40px;">
                    <div style="font-size: 24px; color: #C9A227; margin-bottom: 8px;">✨</div>
                    <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; color: #252525; margin: 0 0 12px 0;">Your Order is Confirmed</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #555555; margin: 0 0 20px 0;">
                        Dear <strong>{customer_name}</strong>,<br><br>
                        Thank you for shopping with us. Your bespoke order has been successfully placed with our master jewelers. We truly appreciate your trust and hope you love your new piece.
                    </p>

                    <!-- Order Meta Card -->
                    <div style="background-color: #FAF7F0; border: 1px solid #EDE5D5; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                        <table style="width: 100%; font-size: 13px; color: #555555;">
                            <tr>
                                <td style="padding: 4px 0;"><strong>Order Number:</strong></td>
                                <td style="text-align: right; color: #C9A227; font-weight: 700;">{order_number}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Estimated Atelier Delivery:</strong></td>
                                <td style="text-align: right; color: #252525; font-weight: 600;">{eta}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Payment Method:</strong></td>
                                <td style="text-align: right; color: #252525;">{payment_method} (Verified)</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Items Table -->
                    <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 17px; margin: 24px 0 12px 0; color: #252525; border-bottom: 2px solid #FAF7F0; padding-bottom: 8px;">Selected Accessories</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        {items_html}
                    </table>

                    <!-- Pricing Summary -->
                    <div style="margin-top: 20px; padding: 16px 0; border-bottom: 1px solid #EDE5D5;">
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="color: #666666; padding: 4px 0;">Insured Atelier Shipping</td>
                                <td style="text-align: right; color: #16A34A; font-weight: 600;">COMPLIMENTARY</td>
                            </tr>
                            <tr>
                                <td style="color: #252525; font-size: 16px; font-weight: 700; padding: 10px 0 0 0;">Total Amount Paid</td>
                                <td style="text-align: right; color: #C9A227; font-size: 18px; font-weight: 700; padding: 10px 0 0 0;">₹{total:,.2f}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Shipping Details -->
                    <div style="margin-top: 24px;">
                        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #888888; margin: 0 0 8px 0;">Delivery Destination</h4>
                        <div style="font-size: 13px; line-height: 1.5; color: #444444; background: #FAFAFA; padding: 12px 16px; border-radius: 8px; border: 1px solid #EEEEEE;">
                            <strong>{address.get('fullName', customer_name)}</strong><br>
                            {address.get('street', '')}, {address.get('city', '')} {address.get('state', '')} - {address.get('postalCode', '')}<br>
                            Phone: {address.get('phone', 'Registered Contact')}
                        </div>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
                        <a href="#orders" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C9A227 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(201, 162, 39, 0.35);">
                            Live Track Order
                        </a>
                    </div>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="background-color: #FAF7F0; padding: 24px 40px; text-align: center; border-top: 1px solid #EDE5D5; font-size: 12px; color: #8C7355;">
                    <div style="font-weight: 600; color: #252525; margin-bottom: 4px;">Aurora Atelier Concierge</div>
                    <div>Questions about your pieces? Reach us at concierge@aurora.luxury or +91 98200 11223</div>
                    <div style="margin-top: 12px; font-size: 11px; color: #A08C75;">© 2026 Aurora Atelier Fine Jewelry. All rights reserved. 100% Certified Gold & Silver.</div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return full_html


class AuroraRequestHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        sys.stderr.write(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {format % args}\n")

    def _set_json_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _read_body_json(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(body)
        except Exception:
            return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # REST API Routes
        if path.startswith('/api/'):
            self._handle_api_get(path, query)
            return

        # Serve static files
        self._serve_static_file(path)

    def _handle_api_get(self, path, query):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            # GET /api/products
            if path == '/api/products':
                sql = "SELECT * FROM products WHERE 1=1"
                params = []

                if 'category' in query and query['category'][0] and query['category'][0] != 'All':
                    sql += " AND category = ?"
                    params.append(query['category'][0])

                if 'metal' in query and query['metal'][0] and query['metal'][0] != 'All':
                    sql += " AND (metal_type = ? OR purity LIKE ?)"
                    params.append(query['metal'][0])
                    params.append(f"%{query['metal'][0]}%")

                if 'q' in query and query['q'][0]:
                    q_term = f"%{query['q'][0]}%"
                    sql += " AND (name LIKE ? OR description LIKE ? OR style_tags LIKE ?)"
                    params.extend([q_term, q_term, q_term])

                if 'featured' in query and query['featured'][0] == '1':
                    sql += " AND featured = 1"

                # Sorting
                sort = query.get('sort', ['default'])[0]
                if sort == 'price_asc':
                    sql += " ORDER BY price ASC"
                elif sort == 'price_desc':
                    sql += " ORDER BY price DESC"
                elif sort == 'rating':
                    sql += " ORDER BY rating DESC"
                else:
                    sql += " ORDER BY id DESC"

                c.execute(sql, params)
                rows = [dict(row) for row in c.fetchall()]
                for r in rows:
                    if r.get('gallery_json'):
                        r['gallery'] = json.loads(r['gallery_json'])
                    if r.get('specs_json'):
                        r['specs'] = json.loads(r['specs_json'])

                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'products': rows}).encode('utf-8'))
                return

            # GET /api/products/<id>
            elif path.startswith('/api/products/'):
                product_id = path.split('/')[-1]
                c.execute("SELECT * FROM products WHERE id = ?", (product_id,))
                row = c.fetchone()
                if not row:
                    self._set_json_headers(404)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Product not found'}).encode('utf-8'))
                    return

                product = dict(row)
                if product.get('gallery_json'):
                    product['gallery'] = json.loads(product['gallery_json'])
                if product.get('specs_json'):
                    product['specs'] = json.loads(product['specs_json'])

                # Fetch reviews
                c.execute("SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC", (product_id,))
                reviews = [dict(r) for r in c.fetchall()]
                product['reviews'] = reviews

                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'product': product}).encode('utf-8'))
                return

            # GET /api/custom-requests
            elif path == '/api/custom-requests':
                email = query.get('email', [None])[0]
                if email and email != 'admin@aurora.luxury':
                    c.execute("SELECT * FROM custom_requests WHERE user_email = ? ORDER BY id DESC", (email,))
                else:
                    c.execute("SELECT * FROM custom_requests ORDER BY id DESC")
                requests = [dict(r) for r in c.fetchall()]
                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'requests': requests}).encode('utf-8'))
                return

            # GET /api/orders
            elif path == '/api/orders':
                email = query.get('email', [None])[0]
                if email and email != 'admin@aurora.luxury':
                    c.execute("SELECT * FROM orders WHERE user_email = ? ORDER BY id DESC", (email,))
                else:
                    c.execute("SELECT * FROM orders ORDER BY id DESC")

                orders = [dict(r) for r in c.fetchall()]
                for o in orders:
                    if o.get('address_json'):
                        o['address'] = json.loads(o['address_json'])
                    if o.get('items_json'):
                        o['items'] = json.loads(o['items_json'])
                    if o.get('tracking_history_json'):
                        o['tracking_history'] = json.loads(o['tracking_history_json'])

                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'orders': orders}).encode('utf-8'))
                return

            # GET /api/emails
            elif path == '/api/emails':
                order_num = query.get('order_number', [None])[0]
                if order_num:
                    c.execute("SELECT * FROM emails WHERE order_number = ? ORDER BY id DESC", (order_num,))
                else:
                    c.execute("SELECT * FROM emails ORDER BY id DESC")
                emails = [dict(r) for r in c.fetchall()]
                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'emails': emails}).encode('utf-8'))
                return

            # GET /api/stats
            elif path == '/api/stats':
                c.execute("SELECT COUNT(*) FROM orders")
                total_orders = c.fetchone()[0]
                c.execute("SELECT SUM(total) FROM orders")
                total_revenue = c.fetchone()[0] or 0.0
                c.execute("SELECT COUNT(*) FROM products")
                total_products = c.fetchone()[0]
                c.execute("SELECT COUNT(*) FROM custom_requests")
                total_requests = c.fetchone()[0]

                self._set_json_headers(200)
                self.wfile.write(json.dumps({
                    'success': True,
                    'stats': {
                        'total_orders': total_orders,
                        'total_revenue': total_revenue,
                        'total_products': total_products,
                        'total_requests': total_requests
                    }
                }).encode('utf-8'))
                return

            else:
                self._set_json_headers(404)
                self.wfile.write(json.dumps({'success': False, 'error': 'Endpoint not found'}).encode('utf-8'))

        finally:
            conn.close()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_body_json()

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            # POST /api/auth/login
            if path == '/api/auth/login':
                email = body.get('email', '').strip().lower()
                password = body.get('password', '')
                pw_hash = hash_password(password)

                c.execute("SELECT * FROM users WHERE LOWER(email) = ? AND password_hash = ?", (email, pw_hash))
                user = c.fetchone()
                if user:
                    user_dict = dict(user)
                    del user_dict['password_hash']
                    self._set_json_headers(200)
                    self.wfile.write(json.dumps({'success': True, 'user': user_dict}).encode('utf-8'))
                else:
                    self._set_json_headers(401)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Invalid email or password'}).encode('utf-8'))
                return

            # POST /api/auth/signup
            elif path == '/api/auth/signup':
                name = body.get('name', '').strip()
                email = body.get('email', '').strip().lower()
                password = body.get('password', '')
                phone = body.get('phone', '')

                if not name or not email or not password:
                    self._set_json_headers(400)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Name, email, and password required'}).encode('utf-8'))
                    return

                pw_hash = hash_password(password)
                avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                try:
                    c.execute("INSERT INTO users (name, email, password_hash, role, phone, avatar) VALUES (?, ?, ?, 'buyer', ?, ?)",
                              (name, email, pw_hash, phone, avatar))
                    conn.commit()
                    user_id = c.lastrowid
                    user_dict = {'id': user_id, 'name': name, 'email': email, 'role': 'buyer', 'phone': phone, 'avatar': avatar}
                    self._set_json_headers(201)
                    self.wfile.write(json.dumps({'success': True, 'user': user_dict}).encode('utf-8'))
                except sqlite3.IntegrityError:
                    self._set_json_headers(400)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Account with this email already exists'}).encode('utf-8'))
                return

            # POST /api/custom-requests
            elif path == '/api/custom-requests':
                user_name = body.get('user_name', 'Valued Client')
                user_email = body.get('user_email', 'client@aurora.luxury')
                accessory_type = body.get('accessory_type', 'Jewelry')
                metal_type = body.get('metal_type', 'Gold')
                budget = body.get('budget', 'Flexible')
                occasion = body.get('occasion', 'Everyday Luxury')
                style_tags = body.get('style_tags', '')
                description = body.get('description', '')
                inspiration_image = body.get('inspiration_image', '')

                if not description and not inspiration_image:
                    self._set_json_headers(400)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Please provide a description or an inspiration image'}).encode('utf-8'))
                    return

                c.execute("""
                    INSERT INTO custom_requests (user_name, user_email, accessory_type, metal_type, budget, occasion, style_tags, description, inspiration_image, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Under Review')
                """, (user_name, user_email, accessory_type, metal_type, budget, occasion, style_tags, description, inspiration_image))
                conn.commit()
                request_id = c.lastrowid

                self._set_json_headers(201)
                self.wfile.write(json.dumps({
                    'success': True,
                    'message': 'Custom request submitted to our master artisans',
                    'request_id': request_id
                }).encode('utf-8'))
                return

            # POST /api/orders
            elif path == '/api/orders':
                user_id = body.get('user_id')
                user_name = body.get('user_name', 'Aurora Patron')
                user_email = body.get('user_email', 'patron@aurora.luxury')
                user_phone = body.get('user_phone', '')
                address = body.get('address', {})
                items = body.get('items', [])
                subtotal = float(body.get('subtotal', 0))
                shipping = float(body.get('shipping', 0))
                discount = float(body.get('discount', 0))
                total = float(body.get('total', 0))
                payment_method = body.get('payment_method', 'Card Payment')

                if not items:
                    self._set_json_headers(400)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Order must contain at least one item'}).encode('utf-8'))
                    return

                rand_suffix = datetime.datetime.now().strftime('%f')[:4]
                order_number = f"AUR-2026-{rand_suffix}"
                eta = (datetime.date.today() + datetime.timedelta(days=4)).strftime('%B %d, %Y')

                initial_tracking = [
                    {"status": "Order Placed", "time": datetime.datetime.now().strftime('%d %b %Y, %I:%M %p'), "completed": True, "note": "Order received and verified by Atelier concierge."},
                    {"status": "Confirmed", "time": "Pending atelier confirmation", "completed": False, "note": "Gems and metals selected for crafting."},
                    {"status": "Preparing", "time": "Pending artisan bench", "completed": False, "note": "Hallmark inspection & velvet gift-packaging."},
                    {"status": "Shipped", "time": "Pending dispatch", "completed": False, "note": "Handed to insured luxury express courier."},
                    {"status": "Delivered", "time": eta, "completed": False, "note": "Signature required upon delivery."}
                ]

                c.execute("""
                    INSERT INTO orders (order_number, user_id, user_name, user_email, user_phone, address_json, items_json, subtotal, shipping, discount, total, payment_method, payment_status, order_status, estimated_delivery, tracking_history_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', 'Order Placed', ?, ?)
                """, (order_number, user_id, user_name, user_email, user_phone, json.dumps(address), json.dumps(items), subtotal, shipping, discount, total, payment_method, eta, json.dumps(initial_tracking)))
                order_id = c.lastrowid

                # Generate and Store Thank-You Email
                email_html = generate_order_email_html(order_number, user_name, items, total, address, payment_method, eta)
                subject = f"Your Order {order_number} is Confirmed ✨ — Aurora Atelier"
                c.execute("""
                    INSERT INTO emails (order_id, order_number, recipient_email, recipient_name, subject, html_content)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (order_id, order_number, user_email, user_name, subject, email_html))

                conn.commit()

                print(f"\n=======================================================")
                print(f"[EMAIL DISPATCHED] To: {user_email} | Subject: {subject}")
                print(f"Order: {order_number} | Amount: ₹{total:,.2f} | Method: {payment_method}")
                print(f"=======================================================\n")

                self._set_json_headers(201)
                self.wfile.write(json.dumps({
                    'success': True,
                    'order_id': order_id,
                    'order_number': order_number,
                    'total': total,
                    'estimated_delivery': eta,
                    'email_dispatched': True,
                    'message': 'Order successfully placed & confirmation email generated.'
                }).encode('utf-8'))
                return

            # POST /api/products
            elif path == '/api/products':
                name = body.get('name', '').strip()
                category = body.get('category', 'Necklace')
                metal_type = body.get('metal_type', 'Gold')
                purity = body.get('purity', '18K Solid Gold')
                price = float(body.get('price', 0))
                original_price = float(body.get('original_price', price * 1.2))
                stock = int(body.get('stock', 10))
                description = body.get('description', '')
                image_url = body.get('image_url', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80')
                style_tags = body.get('style_tags', f"{metal_type},{category},Luxury")
                specs = body.get('specs', {"Hallmark": purity, "Finish": "High Polish"})

                if not name or price <= 0:
                    self._set_json_headers(400)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Product name and valid price required'}).encode('utf-8'))
                    return

                gallery = [image_url]
                c.execute("""
                    INSERT INTO products (name, category, metal_type, purity, price, original_price, rating, reviews_count, stock, description, image_url, gallery_json, style_tags, specs_json, featured)
                    VALUES (?, ?, ?, ?, ?, ?, 5.0, 1, ?, ?, ?, ?, ?, ?, 1)
                """, (name, category, metal_type, purity, price, original_price, stock, description, image_url, json.dumps(gallery), style_tags, json.dumps(specs)))
                conn.commit()
                new_id = c.lastrowid

                self._set_json_headers(201)
                self.wfile.write(json.dumps({'success': True, 'product_id': new_id, 'message': 'Product added to atelier catalog'}).encode('utf-8'))
                return

            # POST /api/products/<id>/reviews
            elif '/reviews' in path:
                product_id = path.split('/')[3]
                author_name = body.get('author_name', 'Verified Buyer')
                rating = int(body.get('rating', 5))
                title = body.get('title', 'Exquisite craftsmanship')
                comment = body.get('comment', '')

                if not comment:
                    self._set_json_headers(400)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Review comment required'}).encode('utf-8'))
                    return

                c.execute("""
                    INSERT INTO reviews (product_id, author_name, rating, title, comment, verified)
                    VALUES (?, ?, ?, ?, ?, 1)
                """, (product_id, author_name, rating, title, comment))

                c.execute("SELECT AVG(rating), COUNT(*) FROM reviews WHERE product_id = ?", (product_id,))
                avg_r, count_r = c.fetchone()
                c.execute("UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?", (round(avg_r, 2), count_r, product_id))
                conn.commit()

                self._set_json_headers(201)
                self.wfile.write(json.dumps({'success': True, 'message': 'Review posted successfully'}).encode('utf-8'))
                return

            else:
                self._set_json_headers(404)
                self.wfile.write(json.dumps({'success': False, 'error': 'Endpoint not found'}).encode('utf-8'))

        finally:
            conn.close()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_body_json()

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            # PUT /api/orders/<id>/status
            if path.startswith('/api/orders/') and path.endswith('/status'):
                order_id = path.split('/')[3]
                new_status = body.get('status', 'Confirmed')

                c.execute("SELECT * FROM orders WHERE id = ? OR order_number = ?", (order_id, order_id))
                order = c.fetchone()
                if not order:
                    self._set_json_headers(404)
                    self.wfile.write(json.dumps({'success': False, 'error': 'Order not found'}).encode('utf-8'))
                    return

                order_dict = dict(order)
                tracking = json.loads(order_dict.get('tracking_history_json') or '[]')
                now_str = datetime.datetime.now().strftime('%d %b %Y, %I:%M %p')

                status_levels = ['Order Placed', 'Confirmed', 'Preparing', 'Shipped', 'Delivered']
                target_idx = status_levels.index(new_status) if new_status in status_levels else 1

                for idx, t in enumerate(tracking):
                    if idx <= target_idx:
                        t['completed'] = True
                        if idx == target_idx and 'Pending' in t.get('time', ''):
                            t['time'] = now_str

                c.execute("UPDATE orders SET order_status = ?, tracking_history_json = ? WHERE id = ?", (new_status, json.dumps(tracking), order_dict['id']))
                conn.commit()

                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'message': f'Order status updated to {new_status}'}).encode('utf-8'))
                return

            # PUT /api/products/<id>
            elif path.startswith('/api/products/'):
                product_id = path.split('/')[-1]
                name = body.get('name')
                price = body.get('price')
                stock = body.get('stock')
                metal_type = body.get('metal_type')
                category = body.get('category')
                description = body.get('description')

                c.execute("""
                    UPDATE products
                    SET name = COALESCE(?, name),
                        price = COALESCE(?, price),
                        stock = COALESCE(?, stock),
                        metal_type = COALESCE(?, metal_type),
                        category = COALESCE(?, category),
                        description = COALESCE(?, description)
                    WHERE id = ?
                """, (name, price, stock, metal_type, category, description, product_id))
                conn.commit()

                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'message': 'Product updated successfully'}).encode('utf-8'))
                return

            # PUT /api/custom-requests/<id>
            elif path.startswith('/api/custom-requests/'):
                req_id = path.split('/')[-1]
                status = body.get('status')
                quote = body.get('quote_amount')
                notes = body.get('artisan_notes')

                c.execute("""
                    UPDATE custom_requests
                    SET status = COALESCE(?, status),
                        quote_amount = COALESCE(?, quote_amount),
                        artisan_notes = COALESCE(?, artisan_notes)
                    WHERE id = ?
                """, (status, quote, notes, req_id))
                conn.commit()

                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'message': 'Custom request updated'}).encode('utf-8'))
                return

            else:
                self._set_json_headers(404)
                self.wfile.write(json.dumps({'success': False, 'error': 'Endpoint not found'}).encode('utf-8'))

        finally:
            conn.close()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        try:
            # DELETE /api/products/<id>
            if path.startswith('/api/products/'):
                product_id = path.split('/')[-1]
                c.execute("DELETE FROM products WHERE id = ?", (product_id,))
                conn.commit()
                self._set_json_headers(200)
                self.wfile.write(json.dumps({'success': True, 'message': 'Product deleted'}).encode('utf-8'))
                return
            else:
                self._set_json_headers(404)
                self.wfile.write(json.dumps({'success': False, 'error': 'Endpoint not found'}).encode('utf-8'))
        finally:
            conn.close()

    def _serve_static_file(self, path):
        if path == '/' or path == '':
            file_path = os.path.join(BASE_DIR, 'index.html')
        else:
            clean_path = path.lstrip('/')
            file_path = os.path.join(BASE_DIR, clean_path)

        # Fallback to index.html for SPA routes
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(BASE_DIR, 'index.html')

        if not os.path.exists(file_path):
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'File Not Found')
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        try:
            with open(file_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', f'{mime_type}; charset=utf-8' if 'text' in mime_type or 'json' in mime_type or 'javascript' in mime_type else mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Server Error: {str(e)}'.encode('utf-8'))


def run_server():
    init_db()
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, AuroraRequestHandler)
    print(f"\n=======================================================")
    print(f" ✨ AURORA ATELIER LUXURY MARKETPLACE RUNNING ✨")
    print(f" URL: http://localhost:{PORT}")
    print(f" Database: SQLite ({DB_FILE})")
    print(f" Gen-Z Luxury Aesthetic: Gold + Silver Fine Accessories")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Aurora Atelier server...")
        httpd.server_close()


if __name__ == '__main__':
    run_server()
