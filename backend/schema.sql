CREATE DATABASE IF NOT EXISTS thato_library
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE thato_library;

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(160) NOT NULL,
  genre VARCHAR(100) DEFAULT '',
  isbn VARCHAR(40) DEFAULT '',
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_book_quantity CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  membership_id VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(200) DEFAULT '',
  role ENUM('MEMBER','ADMIN') NOT NULL DEFAULT 'MEMBER',
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  user_name VARCHAR(160) DEFAULT '',
  type ENUM('BORROW','RETURN','STOCK_IN') NOT NULL,
  quantity INT NOT NULL,
  note VARCHAR(500) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_book FOREIGN KEY (book_id) REFERENCES books(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_transaction_quantity CHECK (quantity > 0)
);

-- Demo login account. Membership ID: ADMIN001, password: Library123!
-- This bcrypt hash is for demonstration only. Change it before deployment.
INSERT IGNORE INTO users (name, membership_id, email, role, password_hash)
VALUES ('Library Administrator', 'ADMIN001', 'admin@example.com', 'ADMIN',
'$2a$10$2b2Xy2h1VnUj8uB4HkPj5uLrY5nT3c0c4Qx0x8K8Q4zM8r3m7sQ7K');
