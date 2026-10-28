import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool, testDatabase } from "./db.js";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try { await testDatabase(); res.json({ status: "ok", database: "connected" }); }
  catch (error) { res.status(503).json({ status: "error", error: "Database connection failed" }); }
});

function positiveId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
function validQuantity(value, allowZero = false) {
  const n = Number(value);
  return Number.isInteger(n) && (allowZero ? n >= 0 : n > 0);
}
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// BOOKS CRUD
app.get("/api/books", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM books ORDER BY title ASC");
  res.json(rows);
}));

app.post("/api/books", asyncRoute(async (req, res) => {
  const { title, author, genre = "", isbn = "", quantity = 0 } = req.body;
  if (!String(title || "").trim() || !String(author || "").trim())
    return res.status(400).json({ error: "Title and author are required." });
  if (!validQuantity(quantity, true))
    return res.status(400).json({ error: "Quantity must be a whole number of 0 or more." });
  const [result] = await pool.execute(
    "INSERT INTO books (title, author, genre, isbn, quantity) VALUES (?, ?, ?, ?, ?)",
    [String(title).trim(), String(author).trim(), genre, isbn, Number(quantity)]
  );
  const [rows] = await pool.execute("SELECT * FROM books WHERE id = ?", [result.insertId]);
  res.status(201).json(rows[0]);
}));

app.put("/api/books/:id", asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  const { title, author, genre = "", isbn = "", quantity } = req.body;
  if (!id) return res.status(400).json({ error: "Invalid book ID." });
  if (!String(title || "").trim() || !String(author || "").trim())
    return res.status(400).json({ error: "Title and author are required." });
  if (!validQuantity(quantity, true))
    return res.status(400).json({ error: "Quantity must be a whole number of 0 or more." });
  const [result] = await pool.execute(
    "UPDATE books SET title=?, author=?, genre=?, isbn=?, quantity=? WHERE id=?",
    [String(title).trim(), String(author).trim(), genre, isbn, Number(quantity), id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Book not found." });
  const [rows] = await pool.execute("SELECT * FROM books WHERE id=?", [id]);
  res.json(rows[0]);
}));

app.delete("/api/books/:id", asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid book ID." });
  try {
    const [result] = await pool.execute("DELETE FROM books WHERE id=?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Book not found." });
    res.json({ message: "Book deleted." });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(409).json({ error: "This book has transaction history and cannot be deleted." });
    throw error;
  }
}));

// TRANSACTIONS: BORROW deducts stock; RETURN and STOCK_IN add stock.
app.get("/api/transactions", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, b.title AS book_title FROM transactions t
     JOIN books b ON b.id=t.book_id ORDER BY t.created_at DESC, t.id DESC`
  );
  res.json(rows);
}));

app.post("/api/transactions", asyncRoute(async (req, res) => {
  const { book_id, type, quantity, user_name = "", note = "" } = req.body;
  const id = positiveId(book_id);
  const allowedTypes = ["BORROW", "RETURN", "STOCK_IN"];
  if (!id) return res.status(400).json({ error: "Please select a valid book." });
  if (!allowedTypes.includes(type)) return res.status(400).json({ error: "Invalid transaction type." });
  if (!validQuantity(quantity)) return res.status(400).json({ error: "Quantity must be a whole number greater than 0." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [books] = await connection.execute("SELECT * FROM books WHERE id=? FOR UPDATE", [id]);
    if (!books.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Book not found." });
    }
    const book = books[0];
    const qty = Number(quantity);
    const newStock = type === "BORROW" ? Number(book.quantity) - qty : Number(book.quantity) + qty;
    if (newStock < 0) {
      await connection.rollback();
      return res.status(409).json({ error: `Not enough stock. Only ${book.quantity} copy/copies available.` });
    }
    await connection.execute("UPDATE books SET quantity=? WHERE id=?", [newStock, id]);
    const [result] = await connection.execute(
      "INSERT INTO transactions (book_id, user_name, type, quantity, note) VALUES (?, ?, ?, ?, ?)",
      [id, String(user_name).trim(), type, qty, String(note).trim()]
    );
    await connection.commit();
    res.status(201).json({ id: result.insertId, book_id: id, type, quantity: qty, stock_after: newStock, message: "Transaction recorded." });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}));

// USERS CRUD
app.get("/api/users", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT id, name, membership_id, email, role, created_at FROM users ORDER BY name ASC");
  res.json(rows);
}));

app.post("/api/users", asyncRoute(async (req, res) => {
  const { name, membership_id, email = "", role = "MEMBER" } = req.body;
  if (!String(name || "").trim() || !String(membership_id || "").trim())
    return res.status(400).json({ error: "Name and membership ID are required." });
  if (!["MEMBER", "ADMIN"].includes(role)) return res.status(400).json({ error: "Role must be MEMBER or ADMIN." });
  // A random, unusable password hash is set until a real password/reset workflow is added.
  const passwordHash = await bcrypt.hash(`temporary-${Date.now()}-${Math.random()}`, 10);
  try {
    const [result] = await pool.execute(
      "INSERT INTO users (name, membership_id, email, role, password_hash) VALUES (?, ?, ?, ?, ?)",
      [String(name).trim(), String(membership_id).trim(), String(email).trim(), role, passwordHash]
    );
    const [rows] = await pool.execute("SELECT id, name, membership_id, email, role, created_at FROM users WHERE id=?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "That membership ID is already in use." });
    throw error;
  }
}));

app.put("/api/users/:id", asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  const { name, membership_id, email = "", role = "MEMBER" } = req.body;
  if (!id) return res.status(400).json({ error: "Invalid user ID." });
  if (!String(name || "").trim() || !String(membership_id || "").trim())
    return res.status(400).json({ error: "Name and membership ID are required." });
  if (!["MEMBER", "ADMIN"].includes(role)) return res.status(400).json({ error: "Role must be MEMBER or ADMIN." });
  try {
    const [result] = await pool.execute(
      "UPDATE users SET name=?, membership_id=?, email=?, role=? WHERE id=?",
      [String(name).trim(), String(membership_id).trim(), String(email).trim(), role, id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "User not found." });
    const [rows] = await pool.execute("SELECT id, name, membership_id, email, role, created_at FROM users WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "That membership ID is already in use." });
    throw error;
  }
}));

app.delete("/api/users/:id", asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid user ID." });
  const [result] = await pool.execute("DELETE FROM users WHERE id=?", [id]);
  if (!result.affectedRows) return res.status(404).json({ error: "User not found." });
  res.json({ message: "User deleted." });
}));

// Demo login endpoint. Real deployments should use secure sessions/JWT and rate limiting.
app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const { membership_id, password } = req.body;
  if (!membership_id || !password) return res.status(400).json({ error: "Membership ID and password are required." });
  const [rows] = await pool.execute(
    "SELECT id, name, membership_id, email, role, password_hash FROM users WHERE membership_id=?",
    [String(membership_id).trim()]
  );
  if (!rows.length || !(await bcrypt.compare(String(password), rows[0].password_hash)))
    return res.status(401).json({ error: "Incorrect membership ID or password." });
  const { password_hash, ...user } = rows[0];
  res.json({ message: "Login successful.", user });
}));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Server error. Check the backend terminal and database configuration." });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Thato Library API running at http://localhost:${port}`));
