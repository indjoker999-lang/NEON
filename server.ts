import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("neonx.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    specs TEXT,
    stock INTEGER DEFAULT 10
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_email TEXT,
    total REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed data if empty
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productCount.count === 0) {
  const seedProducts = [
    {
      name: "NEON-X Phantom 17",
      description: "Ultra-thin gaming laptop with RTX 5090 and OLED display.",
      price: 3499.99,
      category: "Laptops",
      image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80",
      specs: JSON.stringify({ gpu: "RTX 5090", ram: "64GB", storage: "4TB NVMe", screen: "17.3\" 4K OLED 240Hz" })
    },
    {
      name: "NEON-X Titan Desktop",
      description: "The ultimate gaming beast. Liquid cooled, overclocked.",
      price: 4999.99,
      category: "Desktops",
      image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80",
      specs: JSON.stringify({ gpu: "Dual RTX 5090", ram: "128GB", storage: "8TB NVMe", cpu: "Intel i9-15900KS" })
    },
    {
      name: "CyberStrike Mechanical Keyboard",
      description: "Optical switches with per-key RGB and carbon fiber frame.",
      price: 249.99,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=800&q=80",
      specs: JSON.stringify({ switches: "Optical Linear", layout: "100%", connectivity: "Wired/Wireless" })
    },
    {
      name: "ApexVision 32\" Pro",
      description: "4K 240Hz Mini-LED gaming monitor with HDR 1000.",
      price: 1299.99,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
      specs: JSON.stringify({ resolution: "4K", refresh: "240Hz", panel: "Mini-LED" })
    }
  ];

  const insert = db.prepare("INSERT INTO products (name, description, price, category, image, specs) VALUES (?, ?, ?, ?, ?, ?)");
  seedProducts.forEach(p => insert.run(p.name, p.description, p.price, p.category, p.image, p.specs));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products.map((p: any) => ({ ...p, specs: JSON.parse(p.specs) })));
  });

  app.get("/api/products/:id", (req, res) => {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) as any;
    if (product) {
      res.json({ ...product, specs: JSON.parse(product.specs) });
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  });

  app.post("/api/orders", (req, res) => {
    const { customer_name, customer_email, total, items } = req.body;
    const info = db.prepare("INSERT INTO orders (customer_name, customer_email, total) VALUES (?, ?, ?)").run(customer_name, customer_email, total);
    res.json({ success: true, orderId: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
