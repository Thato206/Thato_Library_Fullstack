# Thato Library Management System

Full-stack coursework starter project built with React, Vite, Express.js, and MySQL.

## Features

- Dashboard with book counts and low-stock warning (fewer than 2 copies).
- Book CRUD: add, view, update, and delete.
- Stock transactions: borrow, return, and stock received.
- Transaction history with date/time.
- User CRUD with membership ID and role.
- Demo login endpoint.
- Responsive layout, React hooks, React Router, controlled forms, Fetch API.
- Express REST API with JSON parsing, CORS, input validation, and MySQL persistence.

## Requirements

Install Node.js (LTS) and MySQL Server. A MySQL client such as MySQL Workbench can be used to run the SQL file.

## 1. Create the database

1. Start MySQL.
2. Open MySQL Workbench or a MySQL terminal.
3. Run the complete contents of `backend/schema.sql`.

This creates the `thato_library` database and tables.

## 2. Configure and start the backend

Open a terminal in the `backend` folder and run:

```bash
npm install
```

Copy `.env.example` to a new file named `.env`, then set the database username and password for your own MySQL installation.

```bash
npm start
```

The API runs at `http://localhost:3000`. Check `http://localhost:3000/api/health` to confirm the database connection.

## 3. Start the frontend

Open a second terminal in the `frontend` folder and run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

## Demo login note

The SQL file includes a demonstration administrator record with membership ID `ADMIN001`. The example password hash in the SQL file is a placeholder and may not authenticate successfully. To avoid a misleading login, create a valid admin password hash with bcrypt and update that record, or add a proper registration/password setup flow. The app's login form is a demo UI, not a production authentication system.

For a quick valid hash, from the backend folder after `npm install`, run:

```bash
node --input-type=module -e "import bcrypt from 'bcryptjs'; console.log(await bcrypt.hash('Library123!', 10))"
```

Copy the printed hash and run this SQL in MySQL, replacing `PASTE_HASH_HERE`:

```sql
UPDATE users SET password_hash='PASTE_HASH_HERE' WHERE membership_id='ADMIN001';
```

Then log in with membership ID `ADMIN001` and password `Library123!`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/books` | List books |
| POST | `/api/books` | Add a book |
| PUT | `/api/books/:id` | Update a book |
| DELETE | `/api/books/:id` | Delete a book |
| GET | `/api/transactions` | List transaction history |
| POST | `/api/transactions` | Record borrow, return, or new stock |
| GET | `/api/users` | List users |
| POST | `/api/users` | Add a user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |
| POST | `/api/auth/login` | Demo login |

## Important coursework notes

- User-management API routes are not protected by administrator authentication yet. Add authorization middleware before using real data.
- The demo login returns user details but does not create a secure session.
- Newly created users receive a random placeholder password hash; add a password creation/reset flow if they must log in.
- Do not publish real database passwords in GitHub. Keep `.env` private.
- Test all CRUD routes and stock edge cases before submission.
