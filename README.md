<div align="center">

<img src="./frontend/img/favicon.png" alt="TapControl Logo" width="90" />

# TapControl

### Water District Management System

*A full-stack web application for managing water districts, consumers, billing, payments, and service requests.*

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=flat-square&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)

---

*Web Systems and Technologies — Final Project*

</div>

---

## Team Members

| Name | Role |
|---|---|
| *Mark Dave Asaytuno* | *Project Lead & Database Administrator* |
| *Joshua Lopera* | *Frontend Designer & UI/UX Developer* |
| *Aldwin Jude Lunas* | *Backend Developer* |
| *Jayson Victor Sapin* | *Backend Developer and Documentation* |

---

## Installation

### Prerequisites

- **[Node.js](https://nodejs.org/) v18+** — runs the backend server. Download the LTS version from the official site and install it.
- **[XAMPP](https://www.apachefriends.org/)** — provides the MySQL database. After installing, open the XAMPP Control Panel and make sure the **MySQL** module is running before proceeding.
- **[VS Code](https://code.visualstudio.com/)** — recommended code editor. Install the **[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)** extension inside VS Code to serve the frontend properly (avoids browser CORS issues with local files).

---

### 1. Set Up the Database

1. Open **XAMPP Control Panel** and start **MySQL**.
2. Go to `http://localhost/phpmyadmin` in your browser.
3. Click **Import** → choose `backend/db/tapcontrol.sql` → click **Go**.
4. *(Optional)* Import `backend/db/seeddata.sql` to load sample data.

---

### 2. Configure the Environment

Open `backend/.env` and update your MySQL password if needed:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=        ← leave blank if using default XAMPP
DB_NAME=tapcontrol
PORT=3000
```

---

### 3. Install Dependencies & Start the Server

```bash
cd backend
npm install
npm start
```

You should see:

```
TapControl API → http://localhost:3000
```

> Keep this terminal open while using the app.

---

### 4. Open the Frontend

Right-click `frontend/index.html` in VS Code → **Open with Live Server**.

Your browser will open the app at `http://127.0.0.1:5500/frontend/index.html`.

> The frontend is already configured to call the API at `http://localhost:3000/api/...`

---

### Troubleshooting

| Problem | Fix |
|---|---|
| `connect ECONNREFUSED` | Start MySQL in XAMPP |
| `Unknown database 'tapcontrol'` | Re-run the SQL import in phpMyAdmin |
| Frontend shows no data | Make sure `npm start` is running |
| CORS error in browser | Open via Live Server, not by double-clicking the HTML file |
