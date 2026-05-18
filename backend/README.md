# TapControl — Water District Management System

Web Systems and Technologies Final Project

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | HTML, CSS, Bootstrap 5  |
| Backend  | Node.js + Express       |
| Database | MySQL (via XAMPP)       |

---

## Project Structure

```
tapcontrol/
├── frontend/          ← All HTML pages + CSS + JS
│   ├── index.html
│   ├── consumers.html
│   ├── meters.html
│   ├── districts.html
│   ├── staff.html
│   ├── billing.html
│   ├── payments.html
│   ├── servicerequest.html
│   ├── css/
│   └── js/
├── backend/
│   ├── server.js          ← Express entry point
│   ├── .env               ← DB credentials (edit this)
│   ├── db/
│   │   ├── connection.js  ← MySQL pool
│   │   └── tapcontrol.sql ← Schema + seed data
│   └── routes/
│       ├── dashboard.js
│       ├── districts.js
│       ├── consumers.js
│       ├── staff.js
│       ├── meters.js
│       ├── billing.js
│       ├── payments.js
│       └── serviceRequests.js
└── README.md
```

---

## Setup Instructions

### 1. Database (XAMPP / MySQL Workbench)

1. Start XAMPP and make sure **MySQL** is running.
2. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
3. Click **Import** → choose `backend/db/tapcontrol.sql` → click **Go**.

   This creates the `tapcontrol` database with all tables and sample data.

### 2. Backend (Node.js + Express)

Make sure you have **Node.js** installed. Then:

```bash
cd backend
npm install
```

Edit `.env` if your MySQL password is not blank:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=        ← put your XAMPP MySQL password here if any
DB_NAME=tapcontrol
PORT=3000
```

Start the server:

```bash
npm start
```

You should see:
```
TapControl API → http://localhost:3000
```

### 3. Frontend

No build step needed. Just open any HTML file directly in your browser, or use VS Code's **Live Server** extension.

The frontend JS files are already set up to call `http://localhost:3000/api/...`.

---

## API Endpoints

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/dashboard                  | Summary stats            |
| GET    | /api/districts                  | List all districts       |
| POST   | /api/districts                  | Add district             |
| PUT    | /api/districts/:id              | Update district          |
| DELETE | /api/districts/:id              | Delete district          |
| GET    | /api/consumers                  | List consumers           |
| POST   | /api/consumers                  | Add consumer             |
| PUT    | /api/consumers/:id              | Update consumer          |
| DELETE | /api/consumers/:id              | Delete consumer          |
| GET    | /api/staff                      | List staff               |
| POST   | /api/staff                      | Add staff                |
| PUT    | /api/staff/:id                  | Update staff             |
| DELETE | /api/staff/:id                  | Delete staff             |
| GET    | /api/meters                     | List meter readings      |
| POST   | /api/meters                     | Add meter reading        |
| DELETE | /api/meters/:id                 | Delete reading           |
| GET    | /api/billing                    | List billing records     |
| POST   | /api/billing                    | Add bill                 |
| PUT    | /api/billing/:id                | Update bill              |
| DELETE | /api/billing/:id                | Delete bill              |
| GET    | /api/payments                   | List payments            |
| POST   | /api/payments                   | Record payment           |
| PUT    | /api/payments/:id               | Update payment           |
| DELETE | /api/payments/:id               | Delete payment           |
| GET    | /api/service-requests           | List service requests    |
| POST   | /api/service-requests           | File service request     |
| PATCH  | /api/service-requests/:id/resolve | Mark as resolved       |
| DELETE | /api/service-requests/:id       | Delete request           |

---

## Notes

- Billing amount is auto-calculated at **₱0.76 per m³** if not provided.
- Recording a payment automatically marks the linked bill as **Paid**.
- Meter reading `consumption` is a computed column (`curr - prev`).
