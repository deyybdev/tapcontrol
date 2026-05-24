-- ============================================================
--  TapControl — MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS tapcontrol;
USE tapcontrol;

-- ── 1. Districts ─────────────────────────────────────────────
CREATE TABLE districts (
  id                VARCHAR(10)  PRIMARY KEY,          -- e.g. D01
  name              VARCHAR(100) NOT NULL,
  usage_pct         DECIMAL(5,2) DEFAULT 0.00,         -- 0-100%
  consumer_count    INT DEFAULT 0,
  max_capacity_m3   DECIMAL(10,2) DEFAULT 5000.00,
  max_consumers     INT DEFAULT 500,
  status            ENUM('Operational','Near Limit','Critical') DEFAULT 'Operational',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
