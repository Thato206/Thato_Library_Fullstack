import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api.js";

function Layout({ children }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/"><span className="brand-mark">TL</span><span>Thato <b>Library</b></span></Link>
      <p className="nav-caption">WORKSPACE</p>
      <nav>
        <NavLink to="/" end> <span>Dashboard</span></NavLink>
        <NavLink to="/books"> <span>Book management</span></NavLink>
        <NavLink to="/transactions">⇄ <span>Transactions</span></NavLink>
        <NavLink to="/users"> <span>User management</span></NavLink>
      </nav>
      <div className="sidebar-bottom"><span className="status-dot"></span> Library system</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">COMMUNITY LIBRARY</span><h1>Library Management</h1></div><div className="topbar-user"><span className="avatar">TL</span><span><b>Thato Library</b><small>Administrator workspace</small></span></div></header>
      <div className="page-content">{children}</div>
      <footer>Thato Library · Book records, stock and borrowing history</footer>
    </main>
  </div>;
}

function useLoad(loader, deps = []) {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await loader()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, deps);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, error, loading, refresh };
}

function Notice({ error, success }) {
  return <>{error && <div className="notice error">{error}</div>}{success && <div className="notice success">{success}</div>}</>;
}

function Dashboard() {
  const { data: books, error, loading } = useLoad(api.getBooks, []);
  const { data: transactions } = useLoad(api.getTransactions, []);
  const totalCopies = books.reduce((sum, b) => sum + Number(b.quantity), 0);
  const lowStock = books.filter(b => Number(b.quantity) < 2);
  return <Layout>
    <div className="welcome-row"><div><span className="eyebrow">OVERVIEW</span><h2>Good day </h2><p>Here is what is happening in your library today.</p></div><Link className="button primary" to="/books">＋ Add a book</Link></div>
    <Notice error={error} />
    <section className="stats-grid">
      <Stat title="Book titles" value={loading ? "…" : books.length} note="Unique titles in catalogue" icon="▤" />
      <Stat title="Copies in stock" value={loading ? "…" : totalCopies} note="Available across all titles" icon="▣" />
      <Stat title="Low-stock titles" value={loading ? "…" : lowStock.length} note="Fewer than 2 copies" icon="!" warn />
      <Stat title="Transactions" value={transactions.length} note="Recorded stock activities" icon="⇄" />
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h3>Book availability</h3><p>Current stock across the collection</p></div><Link className="text-link" to="/books">Manage books →</Link></div>
      {loading ? <p className="muted pad">Loading books…</p> : books.length === 0 ? <Empty title="No books added yet" message="Add your first book to start building the catalogue." /> :
      <div className="table-wrap"><table><thead><tr><th>BOOK</th><th>AUTHOR</th><th>GENRE</th><th>ISBN</th><th>STOCK</th><th>STATUS</th></tr></thead><tbody>
      {books.map(book => <tr key={book.id}><td><b>{book.title}</b></td><td>{book.author}</td><td>{book.genre || "—"}</td><td>{book.isbn || "—"}</td><td>{book.quantity}</td><td><span className={`pill ${Number(book.quantity) < 2 ? "pill-warn" : "pill-good"}`}>{Number(book.quantity) < 2 ? "Low stock" : "Available"}</span></td></tr>)}
      </tbody></table></div>}
    </section>
    <section className="panel"><div className="panel-heading"><div><h3>Recent transactions</h3><p>Latest stock movements</p></div><Link className="text-link" to="/transactions">View history →</Link></div>
      {transactions.length === 0 ? <p className="muted pad">Transactions will appear here after stock is added or borrowed.</p> : <div className="table-wrap"><table><thead><tr><th>DATE</th><th>BOOK</th><th>TYPE</th><th>QUANTITY</th><th>USER</th></tr></thead><tbody>{transactions.slice(0,5).map(t => <tr key={t.id}><td>{new Date(t.created_at).toLocaleString()}</td><td>{t.book_title}</td><td>{t.type}</td><td>{t.quantity}</td><td>{t.user_name || "—"}</td></tr>)}</tbody></table></div>}
    </section>
  </Layout>;
}

function Stat({ title, value, note, icon, warn }) {
  return <div className="stat-card"><div className={`stat-icon ${warn ? "stat-icon-warn" : ""}`}>{icon}</div><p>{title}</p><strong>{value}</strong><small>{note}</small></div>;
}
function Empty({ title, message }) { return <div className="empty-state"><div className="empty-icon">▤</div><b>{title}</b><p>{message}</p></div>; }

const blankBook = { title: "", author: "", genre: "", isbn: "", quantity: "1" };
function BookManagement() {
  const { data: books, error, loading, refresh } = useLoad(api.getBooks, []);
  const [form, setForm] = useState(blankBook);
  const [editing, setEditing] = useState(null);
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");
  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function submit(e) {
    e.preventDefault(); setSuccess(""); setFormError("");
    if (!form.title.trim() || !form.author.trim()) return setFormError("Title and author are required.");
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0) return setFormError("Quantity must be a whole number of 0 or more.");
    try {
      const payload = { ...form, quantity: Number(form.quantity) };
      if (editing) await api.updateBook(editing, payload); else await api.addBook(payload);
      setForm(blankBook); setEditing(null); setSuccess(editing ? "Book updated successfully." : "Book added successfully."); await refresh();
    } catch (e) { setFormError(e.message); }
  }
  function edit(book) { setEditing(book.id); setForm({ title: book.title, author: book.author, genre: book.genre || "", isbn: book.isbn || "", quantity: String(book.quantity) }); setFormError(""); setSuccess(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function remove(book) {
    if (!window.confirm(`Delete "${book.title}"? Books with transaction history cannot be deleted.`)) return;
    setSuccess(""); setFormError("");
    try { await api.deleteBook(book.id); setSuccess("Book deleted."); await refresh(); } catch (e) { setFormError(e.message); }
  }
  return <Layout><PageIntro eyebrow="CATALOGUE" title="Book management" description="Add titles, update book details and manage the collection." />
    <Notice error={error || formError} success={success} />
    <section className="panel"><div className="panel-heading"><div><h3>{editing ? "Update book" : "Add a new book"}</h3><p>Fields marked * are required</p></div>{editing && <button className="button secondary" onClick={() => { setEditing(null); setForm(blankBook); }}>Cancel edit</button>}</div>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Book title *" name="title" value={form.title} onChange={change} required placeholder="e.g. Things Fall Apart" />
        <Field label="Author *" name="author" value={form.author} onChange={change} required placeholder="Author's full name" />
        <Field label="Genre" name="genre" value={form.genre} onChange={change} placeholder="e.g. Fiction" />
        <Field label="ISBN" name="isbn" value={form.isbn} onChange={change} placeholder="ISBN number" />
        <Field label="Initial quantity *" name="quantity" value={form.quantity} onChange={change} type="number" min="0" required />
        <div className="form-actions"><button className="button primary" type="submit">{editing ? "Save changes" : "＋ Add book"}</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><h3>Book catalogue</h3><p>{books.length} title(s) recorded</p></div></div>
      {loading ? <p className="muted pad">Loading books…</p> : books.length === 0 ? <Empty title="Your catalogue is empty" message="Use the form above to add a book." /> :
      <div className="table-wrap"><table><thead><tr><th>TITLE</th><th>AUTHOR</th><th>GENRE</th><th>ISBN</th><th>STOCK</th><th>ACTIONS</th></tr></thead><tbody>{books.map(b => <tr key={b.id}><td><b>{b.title}</b></td><td>{b.author}</td><td>{b.genre || "—"}</td><td>{b.isbn || "—"}</td><td><span className={`pill ${Number(b.quantity) < 2 ? "pill-warn" : "pill-good"}`}>{b.quantity}</span></td><td><div className="actions"><button className="button small secondary" onClick={() => edit(b)}>Update</button><button className="button small danger" onClick={() => remove(b)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
  </Layout>;
}

function Field({ label, name, value, onChange, type = "text", required, placeholder, min }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} min={min} /></label>;
}
function PageIntro({ eyebrow, title, description }) { return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>; }

function Transactions() {
  const { data: books, error: booksError } = useLoad(api.getBooks, []);
  const { data: transactions, error: txError, loading, refresh } = useLoad(api.getTransactions, []);
  const [form, setForm] = useState({ book_id: "", type: "BORROW", quantity: "1", user_name: "", note: "" });
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  async function submit(e) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!form.book_id) return setError("Please select a book.");
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) return setError("Quantity must be a whole number greater than 0.");
    try {
      await api.createTransaction({ ...form, book_id: Number(form.book_id), quantity: Number(form.quantity) });
      setSuccess("Transaction recorded and stock updated."); setForm({ ...form, quantity: "1", note: "" }); await refresh();
    } catch (e) { setError(e.message); }
  }
  return <Layout><PageIntro eyebrow="STOCK CONTROL" title="Transactions" description="Record incoming stock and book borrowing, and review the transaction history." />
    <Notice error={error || booksError || txError} success={success} />
    <section className="panel"><div className="panel-heading"><div><h3>Record a transaction</h3><p>Stock changes are saved to the database.</p></div></div>
      <form className="form-grid" onSubmit={submit}>
        <label className="field"><span>Book *</span><select required value={form.book_id} onChange={e => setForm({ ...form, book_id: e.target.value })}><option value="">Select a book</option>{books.map(b => <option key={b.id} value={b.id}>{b.title} (stock: {b.quantity})</option>)}</select></label>
        <label className="field"><span>Transaction type *</span><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="BORROW">Borrow (deduct stock)</option><option value="RETURN">Return (add stock)</option><option value="STOCK_IN">New stock (add stock)</option></select></label>
        <Field label="Quantity *" name="quantity" type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
        <Field label="User / member name" name="user_name" value={form.user_name} onChange={e => setForm({ ...form, user_name: e.target.value })} placeholder="Member name (optional)" />
        <label className="field field-wide"><span>Note</span><input name="note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Optional note" /></label>
        <div className="form-actions"><button className="button primary" type="submit">Save transaction</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><h3>Transaction history</h3><p>All recorded stock movements</p></div><button className="button secondary" onClick={refresh}>Refresh</button></div>
      {loading ? <p className="muted pad">Loading transactions…</p> : transactions.length === 0 ? <Empty title="No transactions yet" message="Your stock activity will appear here." /> :
      <div className="table-wrap"><table><thead><tr><th>DATE & TIME</th><th>BOOK</th><th>TYPE</th><th>QUANTITY</th><th>USER</th><th>NOTE</th></tr></thead><tbody>{transactions.map(t => <tr key={t.id}><td>{new Date(t.created_at).toLocaleString()}</td><td><b>{t.book_title}</b></td><td><span className={`pill ${t.type === "BORROW" ? "pill-warn" : "pill-good"}`}>{t.type}</span></td><td>{t.quantity}</td><td>{t.user_name || "—"}</td><td>{t.note || "—"}</td></tr>)}</tbody></table></div>}
    </section>
  </Layout>;
}

const blankUser = { name: "", membership_id: "", role: "MEMBER", email: "" };
function UserManagement() {
  const { data: users, error: loadError, loading, refresh } = useLoad(api.getUsers, []);
  const [form, setForm] = useState(blankUser); const [editing, setEditing] = useState(null);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const [login, setLogin] = useState({ membership_id: "", password: "" });
  const [loginMessage, setLoginMessage] = useState("");
  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function submit(e) {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      if (editing) await api.updateUser(editing, form); else await api.addUser(form);
      setSuccess(editing ? "User updated." : "User added."); setForm(blankUser); setEditing(null); await refresh();
    } catch (e) { setError(e.message); }
  }
  async function remove(user) {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try { await api.deleteUser(user.id); setSuccess("User deleted."); await refresh(); } catch (e) { setError(e.message); }
  }
  async function doLogin(e) {
    e.preventDefault(); setLoginMessage("");
    try { const result = await api.login(login); setLoginMessage(`Welcome, ${result.user.name}. Role: ${result.user.role}.`); }
    catch (e) { setLoginMessage(e.message); }
  }
  return <Layout><PageIntro eyebrow="PEOPLE" title="User management" description="Manage library members and administrator roles." />
    <Notice error={error || loadError} success={success} />
    <div className="two-column">
      <section className="panel"><div className="panel-heading"><div><h3>{editing ? "Update user" : "Add a user"}</h3><p>Create a membership record.</p></div></div>
        <form className="stack-form" onSubmit={submit}>
          <Field label="Full name *" name="name" value={form.name} onChange={change} required placeholder="Member's name" />
          <Field label="Membership ID *" name="membership_id" value={form.membership_id} onChange={change} required placeholder="e.g. MEM001" />
          <Field label="Email" name="email" type="email" value={form.email} onChange={change} placeholder="member@example.com" />
          <label className="field"><span>Role *</span><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></label>
          <div className="actions"><button className="button primary" type="submit">{editing ? "Save changes" : "Add user"}</button>{editing && <button className="button secondary" type="button" onClick={() => { setEditing(null); setForm(blankUser); }}>Cancel</button>}</div>
        </form>
      </section>
      <section className="panel login-panel"><div className="panel-heading"><div><h3>Member login</h3><p>Demo authentication form</p></div></div>
        <form className="stack-form" onSubmit={doLogin}><Field label="Membership ID *" name="membership_id" value={login.membership_id} onChange={e => setLogin({ ...login, membership_id: e.target.value })} required placeholder="Enter membership ID" /><Field label="Password *" name="password" type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required placeholder="Enter password" /><button className="button primary" type="submit">Log in</button></form>
        {loginMessage && <div className="notice info">{loginMessage}</div>}
        <p className="helper">For this starter project, the backend provides a demo login. Set up real password hashing and sessions before using it with real users.</p>
      </section>
    </div>
    <section className="panel"><div className="panel-heading"><div><h3>Registered users</h3><p>{users.length} user(s) recorded</p></div></div>
      {loading ? <p className="muted pad">Loading users…</p> : users.length === 0 ? <Empty title="No users yet" message="Add the first user using the form above." /> :
      <div className="table-wrap"><table><thead><tr><th>NAME</th><th>MEMBERSHIP ID</th><th>EMAIL</th><th>ROLE</th><th>ACTIONS</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td><b>{u.name}</b></td><td>{u.membership_id}</td><td>{u.email || "—"}</td><td><span className="pill pill-neutral">{u.role}</span></td><td><div className="actions"><button className="button small secondary" onClick={() => { setEditing(u.id); setForm({ name: u.name, membership_id: u.membership_id, email: u.email || "", role: u.role }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Update</button><button className="button small danger" onClick={() => remove(u)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
  </Layout>;
}

function NotFound() { return <Layout><Empty title="Page not found" message="Use the navigation menu to select a page." /><Link className="button primary" to="/">Back to dashboard</Link></Layout>; }

export default function App() {
  return <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/books" element={<BookManagement />} />
    <Route path="/transactions" element={<Transactions />} />
    <Route path="/users" element={<UserManagement />} />
    <Route path="*" element={<NotFound />} />
  </Routes>;
}