# Postgres Tool Usage Examples

## Execute SELECT Queries
Fetch data from the database.

```sql
-- Get all records from a table
SELECT * FROM users LIMIT 10;

-- Filter with WHERE clause
SELECT id, name, email FROM users WHERE active = true;

-- Join tables
SELECT u.name, o.total 
FROM users u 
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2024-01-01';

-- Aggregate functions
SELECT COUNT(*) as total_users FROM users;
SELECT AVG(price) as avg_price FROM products;
```

## Insert Data
Add new records to tables.

```sql
INSERT INTO users (name, email, active) 
VALUES ('John Doe', 'john@example.com', true);

-- Insert multiple rows
INSERT INTO products (name, price, stock) VALUES
  ('Product A', 29.99, 100),
  ('Product B', 49.99, 50);
```

## Update Records
Modify existing data.

```sql
UPDATE users 
SET active = false 
WHERE last_login < '2023-01-01';

UPDATE products 
SET price = price * 1.1 
WHERE category = 'electronics';
```

## Delete Records
Remove data from tables.

```sql
DELETE FROM logs WHERE created_at < '2023-01-01';
DELETE FROM temp_data WHERE processed = true;
```

## Schema Operations
Manage database structure.

```sql
-- Create a new table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add a column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Create an index
CREATE INDEX idx_users_email ON users(email);

-- Drop a table
DROP TABLE IF EXISTS old_table;
```

## Transactions
Execute multiple operations atomically.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

## Query Information Schema
Get metadata about the database.

```sql
-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Get column information
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
```
