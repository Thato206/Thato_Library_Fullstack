const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  getBooks: () => request("/books"),
  addBook: (book) => request("/books", { method: "POST", body: JSON.stringify(book) }),
  updateBook: (id, book) => request(`/books/${id}`, { method: "PUT", body: JSON.stringify(book) }),
  deleteBook: (id) => request(`/books/${id}`, { method: "DELETE" }),
  getTransactions: () => request("/transactions"),
  createTransaction: (transaction) => request("/transactions", { method: "POST", body: JSON.stringify(transaction) }),
  getUsers: () => request("/users"),
  addUser: (user) => request("/users", { method: "POST", body: JSON.stringify(user) }),
  updateUser: (id, user) => request(`/users/${id}`, { method: "PUT", body: JSON.stringify(user) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) })
};