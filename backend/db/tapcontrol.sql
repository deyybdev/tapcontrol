-- ============================================================
--  TapControl — MySQL Database Schema + Seed Data
--  Run this in MySQL Workbench or via XAMPP phpMyAdmin
-- ============================================================

CREATE DATABASE IF NOT EXISTS tapcontrol;
USE tapcontrol;

-- ── 1. Districts ─────────────────────────────────────────────
CREATE TABLE districts (
  id           VARCHAR(10)  PRIMARY KEY,          -- e.g. D01
  name         VARCHAR(100) NOT NULL,
  usage_pct    DECIMAL(5,2) DEFAULT 0.00,          -- 0-100%
  consumer_count INT        DEFAULT 0,
  status       ENUM('Operational','Near Limit','Critical') DEFAULT 'Operational',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. Consumers ─────────────────────────────────────────────
CREATE TABLE consumers (
  consumer_id    VARCHAR(10)  PRIMARY KEY,          -- e.g. C-001
  district_id    VARCHAR(10)  NOT NULL,
  full_name      VARCHAR(150) NOT NULL,
  address        VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20)  NOT NULL,
  meter_no       VARCHAR(30)  UNIQUE,               -- auto-assigned on creation, e.g. MTR-00001
  account_type   ENUM('Residential','Commercial','Industrial') DEFAULT 'Residential',
  status         ENUM('Active','Inactive','Maintenance') DEFAULT 'Active',
  date_created   DATE         DEFAULT (CURRENT_DATE),
  FOREIGN KEY (district_id) REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ── 3. Staff ─────────────────────────────────────────────────
CREATE TABLE staff (
  staff_id    VARCHAR(10)  PRIMARY KEY,             -- e.g. ST-001
  name        VARCHAR(150) NOT NULL,
  role        ENUM('Meter Reader','Technician','Billing Officer','Supervisor','Admin') DEFAULT 'Meter Reader',
  district_id VARCHAR(10),
  contact     VARCHAR(20),
  status      ENUM('Active','Inactive','On Leave') DEFAULT 'Active',
  date_hired  DATE         DEFAULT (CURRENT_DATE),
  FOREIGN KEY (district_id) REFERENCES districts(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- ── 4. Meter Readings ────────────────────────────────────────
CREATE TABLE meter_readings (
  id          VARCHAR(10)  PRIMARY KEY,             -- e.g. MR-001
  meter_no    VARCHAR(30)  NOT NULL,
  consumer_id VARCHAR(10)  NOT NULL,
  district_id VARCHAR(10)  NOT NULL,
  prev_reading DECIMAL(10,2) NOT NULL DEFAULT 0,
  curr_reading DECIMAL(10,2) NOT NULL DEFAULT 0,
  consumption  DECIMAL(10,2) GENERATED ALWAYS AS (curr_reading - prev_reading) STORED,
  reading_date DATE         DEFAULT (CURRENT_DATE),
  reader_name  VARCHAR(150),
  FOREIGN KEY (consumer_id) REFERENCES consumers(consumer_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (district_id) REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ── 5. Billing Records ───────────────────────────────────────
CREATE TABLE billing_records (
  id          VARCHAR(10)  PRIMARY KEY,             -- e.g. BL-001
  consumer_id VARCHAR(10)  NOT NULL,
  consumption DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_due  DECIMAL(10,2) NOT NULL DEFAULT 0,     -- consumption * 0.76
  due_date    DATE,
  status      ENUM('Unpaid','Paid','Overdue') DEFAULT 'Unpaid',
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consumer_id) REFERENCES consumers(consumer_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ── 6. Payments ──────────────────────────────────────────────
CREATE TABLE payments (
  id           VARCHAR(10)  PRIMARY KEY,            -- e.g. PAY-001
  consumer_id  VARCHAR(10)  NOT NULL,
  bill_id      VARCHAR(10)  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  method       ENUM('Cash','GCash','Bank Transfer') DEFAULT 'Cash',
  payment_date DATE         DEFAULT (CURRENT_DATE),
  received_by  VARCHAR(150),
  FOREIGN KEY (consumer_id) REFERENCES consumers(consumer_id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (bill_id)     REFERENCES billing_records(id)   ON UPDATE CASCADE ON DELETE CASCADE
);

-- ── 7. Service Requests ──────────────────────────────────────
CREATE TABLE service_requests (
  id           VARCHAR(10)  PRIMARY KEY,            -- e.g. SR-001
  consumer_id  VARCHAR(10)  NOT NULL,
  type         ENUM('Leak Repair','Meter Issue','New Connection','Disconnection','Other') DEFAULT 'Other',
  priority     ENUM('Low','Medium','High') DEFAULT 'Low',
  assigned_to  VARCHAR(150),
  status       ENUM('Open','In Progress','Resolved') DEFAULT 'Open',
  filed_date   DATE         DEFAULT (CURRENT_DATE),
  FOREIGN KEY (consumer_id) REFERENCES consumers(consumer_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO districts VALUES
  ('D01', 'District A', 72.00, 3, 'Operational', NOW()),
  ('D02', 'District B', 88.00, 2, 'Near Limit',  NOW()),
  ('D03', 'District C', 45.00, 1, 'Operational', NOW()),
  ('D04', 'District D', 95.00, 1, 'Critical',    NOW());

INSERT INTO consumers (consumer_id, district_id, full_name, address, contact_number, meter_no, account_type, status, date_created) VALUES
  ('C-001', 'D01', 'Barangay Northside',     'Northside Ave, District A', '09171234567', 'MTR-00001', 'Residential',  'Active',      '2024-01-10'),
  ('C-002', 'D02', 'Eastgate Complex',        '14 East Road, District B',  '09281234567', 'MTR-00002', 'Commercial',   'Active',      '2024-02-15'),
  ('C-003', 'D03', 'Central Market',          'Market St, District C',     '09391234567', 'MTR-00003', 'Commercial',   'Maintenance', '2024-03-01'),
  ('C-004', 'D01', 'San Miguel Residences',   'SM Blvd, District A',       '09451234567', 'MTR-00004', 'Residential',  'Active',      '2024-03-20'),
  ('C-005', 'D02', 'Eastgate Food Court',     '22 East Road, District B',  '09561234567', 'MTR-00005', 'Commercial',   'Inactive',    '2024-04-05'),
  ('C-006', 'D04', 'Riverside Industrial',    'River Rd, District D',      '09671234567', 'MTR-00006', 'Industrial',   'Active',      '2024-04-18');

INSERT INTO staff VALUES
  ('ST-001', 'Juan dela Cruz',  'Meter Reader',    'D01', '09111111111', 'Active',   '2023-06-01'),
  ('ST-002', 'Maria Santos',    'Billing Officer', 'D02', '09222222222', 'Active',   '2023-07-15'),
  ('ST-003', 'Pedro Reyes',     'Technician',      'D03', '09333333333', 'On Leave', '2023-08-20'),
  ('ST-004', 'Ana Gonzales',    'Supervisor',      'D01', '09444444444', 'Active',   '2022-01-10'),
  ('ST-005', 'Carlos Bautista', 'Meter Reader',    'D04', '09555555555', 'Active',   '2024-01-05');

INSERT INTO meter_readings (id, meter_no, consumer_id, district_id, prev_reading, curr_reading, reading_date, reader_name) VALUES
  ('MR-001', 'MTR-00142', 'C-001', 'D01', 1200.00, 1318.00, '2025-05-01', 'Juan dela Cruz'),
  ('MR-002', 'MTR-00289', 'C-002', 'D02', 3400.00, 3604.00, '2025-05-02', 'Juan dela Cruz'),
  ('MR-003', 'MTR-00310', 'C-003', 'D03',  890.00,  940.00, '2025-05-03', 'Carlos Bautista'),
  ('MR-004', 'MTR-00401', 'C-004', 'D01', 2100.00, 2243.00, '2025-05-04', 'Juan dela Cruz'),
  ('MR-005', 'MTR-00512', 'C-006', 'D04', 5000.00, 5380.00, '2025-05-05', 'Carlos Bautista');

INSERT INTO billing_records VALUES
  ('BL-001', 'C-001', 118.00,  89.68, '2025-05-31', 'Unpaid',  NOW()),
  ('BL-002', 'C-002', 204.00, 155.04, '2025-05-31', 'Paid',    NOW()),
  ('BL-003', 'C-003',  50.00,  38.00, '2025-04-30', 'Overdue', NOW()),
  ('BL-004', 'C-004', 143.00, 108.68, '2025-05-31', 'Unpaid',  NOW()),
  ('BL-005', 'C-006', 380.00, 288.80, '2025-05-31', 'Unpaid',  NOW());

INSERT INTO payments VALUES
  ('PAY-001', 'C-002', 'BL-002', 155.04, 'GCash',         '2025-05-10', 'Maria Santos'),
  ('PAY-002', 'C-003', 'BL-003',  38.00, 'Cash',          '2025-04-28', 'Maria Santos'),
  ('PAY-003', 'C-001', 'BL-001',  89.68, 'Bank Transfer', '2025-05-14', 'Ana Gonzales');

INSERT INTO service_requests VALUES
  ('SR-001', 'C-003', 'Leak Repair',     'High',   'Pedro Reyes',     'In Progress', '2025-05-08'),
  ('SR-002', 'C-005', 'Disconnection',   'Low',    'Juan dela Cruz',  'Open',        '2025-05-10'),
  ('SR-003', 'C-001', 'Meter Issue',     'Medium', 'Carlos Bautista', 'Open',        '2025-05-12'),
  ('SR-004', 'C-006', 'New Connection',  'Medium', 'Ana Gonzales',    'Resolved',    '2025-04-20');
