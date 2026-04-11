# 🚆 IRCTC Tatkal Booking Simulator

### A Full Stack High-Concurrency Inventory Management System

> **Hackathon Submission — ACM MPSTME | Full Stack Track**
> _Demonstrating real-world solutions to the high-concurrency race condition problem in ticket booking systems_

### Link Deployed via Railway and Vercel:
>https://irctc-tatkal-simulation-git-master-rukminipandits-projects.vercel.app?_vercel_share=o5HOD1frIYtVIr4itt11q6OPSkLQuCeq
---

## 📋 Table of Contents

1. [The Problem](#the-problem)
2. [Our Solution](#our-solution)
3. [Why IRCTC Tatkal?](#why-irctc-tatkal)
4. [Live Demo Flow](#live-demo-flow)
5. [Tech Stack](#tech-stack)
6. [System Architecture](#system-architecture)
7. [Backend — Deep Dive](#backend--deep-dive)
8. [Frontend — Deep Dive](#frontend--deep-dive)
9. [The Race Condition Simulator](#the-race-condition-simulator)
10. [The Live System Log](#the-live-system-log)
11. [How It Meets the Judging Criteria](#how-it-meets-the-judging-criteria)
12. [Team Members](#team-members)
13. [Prerequisites](#prerequisites)
14. [Deployment Guide](#deployment-guide)
15. [Running from GitHub](#running-from-github)
16. [API Reference](#api-reference)
17. [Future Integrations & Scope of Improvement](#future-integrations--scope-of-improvement)

---

## 🔴 The Problem

Every day at **10:00 AM**, when IRCTC Tatkal booking opens, hundreds of thousands of users simultaneously attempt to book a limited number of seats. This creates one of the most challenging problems in web engineering — the **Race Condition**.

### What is a Race Condition?

Imagine only **1 seat** is left on a train. At the exact same millisecond:

- User A reads: `available_seats = 1` → proceeds to book
- User B reads: `available_seats = 1` → proceeds to book
- User A decrements: `available_seats = 0`
- User B decrements: `available_seats = -1` ❌

**Both users get a confirmed ticket for the same seat.** This is a race condition — and it's a real problem that costs railway systems millions in refunds, legal disputes, and broken user trust.

Standard application-level checks (`if seats > 0`) **cannot** solve this because multiple server threads execute simultaneously and the check-then-act sequence is not atomic.

---

## ✅ Our Solution

We implement a **database-level atomic locking strategy** that makes it physically impossible for two users to book the same seat, regardless of how many simultaneous requests hit the server.

### Core Mechanism — MySQL Row-Level Lock

```sql
BEGIN TRANSACTION;

SELECT * FROM trains
WHERE id = ? AND available_seats > 0
FOR UPDATE;  -- ← This locks the row exclusively

UPDATE trains
SET available_seats = available_seats - 1
WHERE id = ?;

INSERT INTO bookings (...) VALUES (...);

COMMIT;
```

The `FOR UPDATE` clause acquires an **exclusive row-level lock**. While one transaction holds this lock:

- Every other request attempting to access the same row is **queued and forced to wait**
- Once the first transaction commits, the next request runs — but now sees the updated seat count
- If seats = 0, the `WHERE available_seats > 0` condition fails, the booking is rejected, and the transaction rolls back

**The database becomes the single gatekeeper.** No application logic, no Redis, no distributed systems needed — just the database doing what it was designed to do.

---

## 🚂 Why IRCTC Tatkal?

IRCTC Tatkal is the **perfect real-world demonstration** of the high-concurrency inventory problem because:

- **Time-bound surge**: All demand hits at exactly 10:00 AM — a perfectly simulated spike
- **Finite inventory**: Each train has a fixed number of seats — classic inventory management
- **High stakes**: Duplicate bookings or lost inventory directly impact real people
- **National scale**: IRCTC serves over 1.4 billion people — the concurrency problem is at maximum scale
- **Familiarity**: Every judge, every developer, every Indian has experienced the frustration of IRCTC going down during Tatkal — making this problem instantly relatable

We chose IRCTC not just because it's a well-known platform, but because it perfectly encapsulates every challenge in high-concurrency systems — traffic spikes, inventory management, payment processing under load, and user experience during failure.

---

## 🎬 Live Demo Flow

Here is the complete user journey through our simulator:

```
1. Open irctc-auth.html
   └── Sign Up with name, email, phone, Aadhaar (simulated verification)
   └── Log In → JWT token issued and stored

2. Search Trains
   └── Select source and destination from 21 major Indian cities
   └── System fetches live data from MySQL database
   └── Filtered results displayed dynamically

3. Select Train → Tatkal Dashboard Opens
   └── 15-second countdown simulates the 10:00 AM window opening
   └── Live activity feed shows other users booking simultaneously
   └── Seat count drops in real time
   └── System log shows backend operations as they happen

4. Booking Opens → Select Preferences
   └── Choose class, berth type, quota
   └── Enter passenger details (auto-filled from login)
   └── Click Book Ticket

5. Payment Modal (30-second seat hold)
   └── UPI (with real QR code generation)
   └── Credit/Debit Card
   └── Net Banking
   └── Wallet
   └── Payment processing simulation with step-by-step feedback

6. Ticket Confirmed
   └── PNR generated
   └── Coach and seat assigned
   └── PDF download available
   └── WhatsApp share

7. My Bookings
   └── All past bookings fetched from MySQL
   └── Real booking IDs, seat numbers, train details
```

---

## 🛠 Tech Stack

| Layer                 | Technology                       | Purpose                            |
| --------------------- | -------------------------------- | ---------------------------------- |
| **Database**          | MySQL 9.6                        | Persistent storage, atomic locking |
| **Backend Server**    | Node.js + Express                | REST API, business logic           |
| **Authentication**    | JWT (jsonwebtoken)               | Stateless session management       |
| **Password Security** | bcryptjs                         | Password hashing with salt         |
| **Real Time**         | Socket.io                        | Live seat updates                  |
| **Frontend**          | HTML5 + CSS3 + Vanilla JS        | UI, no framework overhead          |
| **Fonts**             | Plus Jakarta Sans (Google Fonts) | Typography                         |
| **PDF Generation**    | html2canvas + jsPDF              | Ticket download                    |
| **QR Code**           | qrcodejs                         | UPI payment QR                     |
| **Environment**       | dotenv                           | Secret management                  |
| **CORS**              | cors                             | Cross-origin requests              |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Browser)                   │
│                                                          │
│  irctc-auth.html ──── Login/Signup UI                   │
│  irctc-tatkal.html ── Main Booking UI                   │
│  irctc-app.js ─────── All JS Logic + API Calls          │
│  irctc-style.css ──── Styling                           │
│  irctc-auth.css ───── Auth Page Styling                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / fetch() API calls
                       │ Bearer JWT Token
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)             │
│                                                          │
│  server.js ─────────── Entry point, Socket.io setup     │
│  routes/                                                 │
│    authRoutes.js ────── POST /api/auth/signup            │
│                         POST /api/auth/login             │
│    trainRoutes.js ───── GET  /api/trains/all             │
│                         GET  /api/trains/search          │
│    bookingRoutes.js ─── POST /api/bookings/book          │
│                         GET  /api/bookings/my            │
│  controllers/ ──────── Business logic                   │
│  middleware/ ───────── JWT verification                 │
│  config/db.js ──────── MySQL connection pool            │
└──────────────────────┬──────────────────────────────────┘
                       │ mysql2 driver
                       │ Connection Pool (10 connections)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    MySQL Database                        │
│                                                          │
│  users ──────── id, full_name, email, password, phone   │
│  trains ─────── id, number, name, source, dest, seats   │
│  bookings ───── id, user_id, train_id, seat, status     │
│  queue ──────── id, user_id, train_id, status           │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Backend — Deep Dive

### File Structure

```
irctc-backend/
├── config/
│   └── db.js                 ← MySQL connection pool
├── controllers/
│   ├── authController.js     ← Signup & login logic
│   ├── trainController.js    ← Train search & fetch
│   └── bookingController.js  ← Atomic seat booking
├── routes/
│   ├── authRoutes.js         ← Auth endpoints
│   ├── trainRoutes.js        ← Train endpoints
│   └── bookingRoutes.js      ← Booking endpoints
├── middleware/
│   └── authMiddleware.js     ← JWT verification
├── socket/
│   └── socket.js             ← Real time connections
├── .env                      ← Environment secrets
└── server.js                 ← Main server file
```

### Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- bcrypt hash
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trains Table
CREATE TABLE trains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    train_number VARCHAR(20) NOT NULL,
    train_name VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    total_seats INT NOT NULL,
    available_seats INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    journey_date DATE NOT NULL
);

-- Bookings Table
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    train_id INT NOT NULL,
    seat_number INT NOT NULL,
    status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (train_id) REFERENCES trains(id)
);
```

### Authentication Flow

```
User submits email + password
         │
         ▼
authController.signup()
  → Validate input
  → Check if email exists (SELECT)
  → bcrypt.hash(password, 10)  ← 10 salt rounds
  → INSERT into users
  → Return success

authController.login()
  → Find user by email (SELECT)
  → bcrypt.compare(password, hash)
  → jwt.sign({ id, email }, SECRET, { expiresIn: '7d' })
  → Return token + user object

Every protected request:
  → authMiddleware checks Authorization header
  → jwt.verify(token, SECRET)
  → Attaches user to req.user
  → Passes to next handler
```

### The Atomic Booking — Core of the System

```javascript
// bookingController.js
exports.bookSeat = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: Lock the row — no other transaction can read/write this row
    const [trains] = await connection.query(
      "SELECT * FROM trains WHERE id = ? AND available_seats > 0 FOR UPDATE",
      [train_id],
    );

    // Step 2: If no rows returned, seat is gone — reject immediately
    if (trains.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "No seats available" });
    }

    // Step 3: Atomically decrement — this cannot produce negative values
    await connection.query(
      "UPDATE trains SET available_seats = available_seats - 1 WHERE id = ?",
      [train_id],
    );

    // Step 4: Create confirmed booking record
    const [result] = await connection.query(
      "INSERT INTO bookings (user_id, train_id, seat_number, status) VALUES (?, ?, ?, ?)",
      [user_id, train_id, seatNumber, "confirmed"],
    );

    // Step 5: Commit — release lock, make changes permanent
    await connection.commit();

    res.status(201).json({ booking_id: result.insertId });
  } catch (err) {
    await connection.rollback(); // Something went wrong — undo everything
    res.status(500).json({ error: err.message });
  } finally {
    connection.release(); // Return connection to pool
  }
};
```

**Why this is bulletproof:**

- The `FOR UPDATE` lock means Thread B cannot even read the row while Thread A holds it
- The `WHERE available_seats > 0` check happens inside the lock — so if Thread A just decremented to 0, Thread B's query returns empty and is rejected
- The entire operation is wrapped in a transaction — if anything fails, everything rolls back
- It is **physically impossible** for `available_seats` to go below 0

### Security Implementation

- **Passwords**: bcrypt with 10 salt rounds — even if the database is compromised, passwords cannot be reversed
- **JWT**: Tokens expire after 7 days, signed with a secret key stored in `.env`
- **Route Protection**: All booking and train routes require a valid JWT — unauthenticated requests return 401
- **SQL Injection Prevention**: All queries use parameterized placeholders (`?`) — user input is never interpolated directly into SQL
- **CORS**: Configured to accept requests from the frontend origin only
- **Environment Variables**: Database credentials, JWT secret, and port are never hardcoded

---

## 🎨 Frontend — Deep Dive

### File Structure

```
frontend/
├── irctc-auth.html    ← Login & Signup page
├── irctc-tatkal.html  ← Main booking application
├── irctc-app.js       ← All JavaScript logic
├── irctc-style.css    ← Main app styling
└── irctc-auth.css     ← Auth page styling
```

### Key Frontend Features

**Authentication Page (`irctc-auth.html`)**

- Real-time username availability check (debounced 600ms)
- Email format validation
- Phone number validation (Indian mobile format)
- Simulated Aadhaar verification with visual feedback
- Password strength meter (5 levels)
- Confirm password match check
- Connected to real backend via `fetch()` API
- JWT token stored in `localStorage` on successful login

**Search System**

- 21 major Indian railway stations in autocomplete
- Partial match on city name, state, or station code
- Swap stations button
- Fetches live data from MySQL via `/api/trains/all`
- Client-side filter by source and destination
- Dynamic train card rendering — no hardcoded HTML

**Tatkal Dashboard**

- 15-second simulated countdown (represents 10:00 AM window)
- Live activity feed — real users booking alongside you
- Seat count updates in real time as bookings happen
- Class, berth, quota, boarding station selector
- High traffic alert banner
- Sold out state management

**Payment Modal**

- 30-second seat reservation timer with visual countdown bar
- 4 payment methods: UPI (with real QR code), Card, Net Banking, Wallet
- Real UPI deep link (`upi://pay?pa=...`) for mobile
- Card number formatting, expiry formatting
- Wallet balance simulation
- Step-by-step payment processing animation
- Connected to real backend booking API

**Ticket Confirmation**

- Populated with real passenger name from logged-in user
- PNR generation
- Coach and seat assignment
- PDF download (html2canvas + jsPDF)
- WhatsApp share with booking details
- Station QR code

**My Bookings**

- Fetches all bookings for the logged-in user from MySQL
- Shows train name, route, travel date, seat number, booking ID
- Real data — persists across sessions

---

## 🔬 The Race Condition Simulator

The Race Condition Simulator is an **interactive educational panel** that visually explains the core problem and solution.

### How It Works

**Without Protection (Bad Path — shown in red):**

```
Thread A reads: available_seats = 1  ✓
Thread B reads: available_seats = 1  ✓  ← Both read before either writes
Thread A writes: available_seats = 0 ✓
Thread B writes: available_seats = -1 ❌ ← RACE CONDITION
Result: Two tickets issued for one seat
```

**With Our Protection (Good Path — shown in green):**

```
Thread A: SELECT FOR UPDATE → acquires lock
Thread B: SELECT FOR UPDATE → BLOCKED, waiting
Thread A: UPDATE seats = seats - 1 → seats = 0
Thread A: COMMIT → releases lock
Thread B: SELECT FOR UPDATE → lock acquired
Thread B: WHERE available_seats > 0 → NO ROWS RETURNED
Thread B: ROLLBACK → "No seats available"
Result: Only one ticket issued ✓
```

The simulator runs these two paths side by side with animated step highlighting so judges can see exactly where the divergence happens and why the lock-based approach is correct.

---

## 📊 The Live System Log

The Live System Log is a **real-time terminal-style panel** that shows backend operations as they happen.

### What It Shows

Every event is logged with:

- **Timestamp** — exact time of the event
- **Tag** — category of the event (LOCK, DECR, GATE, DENY, WAIT, PAY)
- **Message** — what happened

### Sample Log Output

```
10:00:01  LOCK   Thread #4721 acquired inventory lock
10:00:01  DECR   Inventory: 40 → 39 — Arjun Mehta confirmed
10:00:01  LOCK   Thread #4721 released
10:00:02  LOCK   Thread #8834 acquired inventory lock
10:00:02  DECR   Inventory: 39 → 38 — Sneha Iyer confirmed
10:00:02  LOCK   Thread #8834 released
10:00:03  GATE   Thread #2291 — inventory = 0 at check
10:00:03  DENY   Divya Nair rejected — no inventory
10:00:04  WAIT   Priya M. waitlisted — inventory exhausted
10:00:04  PAY    Payment window opened — seat held for 30s
10:00:05  LOCK   Thread #YOU acquired inventory lock
10:00:05  DECR   Inventory: 35 → 34 — Sara confirmed
10:00:05  LOCK   Thread #YOU released
```

This log demonstrates to judges that:

1. Locks are being acquired and released correctly
2. The inventory counter never goes below 0
3. Rejected users are handled gracefully
4. The system processes requests sequentially despite concurrent input

---

## 🏆 How It Meets the Judging Criteria

### 1. Ease of Deployment ✅

The entire project runs with **3 commands**:

```bash
# 1. Set up database (one time)
mysql -u root -p < setup.sql

# 2. Install dependencies
npm install

# 3. Start server
node server.js
```

- No Docker required
- No cloud services required
- No build step for frontend (plain HTML/CSS/JS)
- Single `.env` file for all configuration
- MySQL is the only external dependency

### 2. Security of the Code ✅

| Vulnerability       | Our Protection                                      |
| ------------------- | --------------------------------------------------- |
| SQL Injection       | Parameterized queries (`?` placeholders) throughout |
| Password Exposure   | bcrypt hashing with 10 salt rounds — irreversible   |
| Unauthorized Access | JWT middleware on all sensitive routes              |
| Token Theft         | Tokens expire after 7 days                          |
| Credential Exposure | All secrets in `.env`, never in source code         |
| Race Condition      | MySQL row-level locking — database-enforced         |
| Negative Inventory  | `WHERE available_seats > 0` inside the lock         |
| Double Booking      | Transaction rollback on any failure                 |

### 3. Documentation Quality ✅

- This README provides a complete technical and functional overview
- Code is commented at every critical section
- API endpoints are fully documented with request/response formats
- Database schema is clearly defined with relationships
- Architecture diagram shows the complete data flow
- The Race Condition Simulator serves as living documentation of the core algorithm
- The Live System Log makes the backend transparent and observable in real time

---

## 👥 Team Members

| Name        | Role             | Responsibility | Tools used                                                     |
| ----------- | ---------------- | -------------- | -------------------------------------------------------------- |
| **Rukmini** | **Backend Lead** |  Backend       | MySQL schema, Express API, atomic booking, JWT auth, Socket.io |
| **Sara**    | **Fronted Lead** |  Frontend      | HTML/CSS UI, booking flow, payment modal, ticket design        |
| **Krupa**   |**Assist on both**|  Both          |                                                                |
---

## 📦 Prerequisites

Before running the project, ensure you have the following installed:

| Tool    | Version    | Download                               |
| ------- | ---------- | -------------------------------------- |
| Node.js | v18+ (LTS) | https://nodejs.org                     |
| MySQL   | v8.0+      | https://dev.mysql.com/downloads/mysql/ |
| npm     | v9+        | Comes with Node.js                     |

---

## 🚀 Deployment Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/irctc-tatkal-simulator.git
cd irctc-tatkal-simulator
```

### Step 2: Set Up the Database

Open MySQL shell:

```bash
mysql -u root -p
```

Run the following SQL:

```sql
CREATE DATABASE irctc_db;
USE irctc_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    train_number VARCHAR(20) NOT NULL,
    train_name VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    total_seats INT NOT NULL,
    available_seats INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    journey_date DATE NOT NULL
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    train_id INT NOT NULL,
    seat_number INT NOT NULL,
    status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (train_id) REFERENCES trains(id)
);

CREATE TABLE queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    train_id INT NOT NULL,
    status ENUM('waiting', 'processing', 'done', 'failed') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (train_id) REFERENCES trains(id)
);
```

### Step 3: Seed Train Data

```sql
USE irctc_db;
INSERT INTO trains (train_number, train_name, source, destination, departure_time, arrival_time, total_seats, available_seats, price, journey_date) VALUES
('12951', 'Mumbai Rajdhani', 'Mumbai', 'Delhi', '16:00:00', '08:00:00', 100, 100, 1500.00, '2026-03-20'),
('12952', 'Delhi Rajdhani', 'Delhi', 'Mumbai', '17:00:00', '09:00:00', 100, 100, 1500.00, '2026-03-20'),
('12009', 'Shatabdi Express', 'Mumbai', 'Ahmedabad', '06:25:00', '13:10:00', 150, 150, 700.00, '2026-03-20'),
('12010', 'Shatabdi Express', 'Ahmedabad', 'Mumbai', '14:05:00', '20:40:00', 150, 150, 700.00, '2026-03-20'),
('11001', 'Chennai Express', 'Mumbai', 'Chennai', '06:00:00', '23:00:00', 150, 150, 800.00, '2026-03-20'),
('11002', 'Chennai Express', 'Chennai', 'Mumbai', '21:00:00', '13:00:00', 150, 150, 800.00, '2026-03-20'),
('12137', 'Punjab Mail', 'Mumbai', 'Amritsar', '19:30:00', '13:00:00', 150, 150, 1050.00, '2026-03-20'),
('12138', 'Punjab Mail', 'Amritsar', 'Mumbai', '11:00:00', '05:00:00', 150, 150, 1050.00, '2026-03-20'),
('12903', 'Golden Temple Mail', 'Mumbai', 'Amritsar', '21:00:00', '15:00:00', 150, 150, 1100.00, '2026-03-20'),
('12904', 'Golden Temple Mail', 'Amritsar', 'Mumbai', '17:00:00', '11:00:00', 150, 150, 1100.00, '2026-03-20'),
('12127', 'Intercity Express', 'Mumbai', 'Pune', '06:05:00', '08:35:00', 200, 200, 250.00, '2026-03-20'),
('12128', 'Intercity Express', 'Pune', 'Mumbai', '07:15:00', '09:45:00', 200, 200, 250.00, '2026-03-20'),
('12123', 'Deccan Queen', 'Mumbai', 'Pune', '07:15:00', '10:25:00', 200, 200, 280.00, '2026-03-20'),
('12124', 'Deccan Queen', 'Pune', 'Mumbai', '17:15:00', '20:25:00', 200, 200, 280.00, '2026-03-20'),
('12109', 'Panchavati Express', 'Mumbai', 'Nashik', '06:20:00', '09:45:00', 180, 180, 200.00, '2026-03-20'),
('12110', 'Panchavati Express', 'Nashik', 'Mumbai', '14:30:00', '17:55:00', 180, 180, 200.00, '2026-03-20'),
('12263', 'Pune Rajdhani', 'Pune', 'Delhi', '17:00:00', '10:00:00', 100, 100, 1400.00, '2026-03-20'),
('12264', 'Pune Rajdhani', 'Delhi', 'Pune', '22:00:00', '15:00:00', 100, 100, 1400.00, '2026-03-20'),
('12215', 'Bangalore Rajdhani', 'Bangalore', 'Delhi', '20:00:00', '06:00:00', 100, 100, 1800.00, '2026-03-20'),
('12216', 'Bangalore Rajdhani', 'Delhi', 'Bangalore', '21:30:00', '07:30:00', 100, 100, 1800.00, '2026-03-20'),
('12627', 'Karnataka Express', 'Bangalore', 'Delhi', '19:45:00', '06:00:00', 120, 120, 1200.00, '2026-03-20'),
('12628', 'Karnataka Express', 'Delhi', 'Bangalore', '22:30:00', '09:00:00', 120, 120, 1200.00, '2026-03-20'),
('22691', 'Rajdhani Express', 'Bangalore', 'Mumbai', '09:00:00', '20:00:00', 120, 120, 850.00, '2026-03-20'),
('22692', 'Rajdhani Express', 'Mumbai', 'Bangalore', '08:00:00', '19:00:00', 120, 120, 850.00, '2026-03-20'),
('12027', 'Shatabdi Express', 'Bangalore', 'Chennai', '06:00:00', '11:00:00', 150, 150, 500.00, '2026-03-20'),
('12028', 'Shatabdi Express', 'Chennai', 'Bangalore', '15:00:00', '20:00:00', 150, 150, 500.00, '2026-03-20'),
('12079', 'Janshatabdi', 'Bangalore', 'Hyderabad', '06:15:00', '14:30:00', 180, 180, 450.00, '2026-03-20'),
('12080', 'Janshatabdi', 'Hyderabad', 'Bangalore', '15:30:00', '23:45:00', 180, 180, 450.00, '2026-03-20'),
('12433', 'Rajdhani Express', 'Chennai', 'Delhi', '06:00:00', '10:00:00', 120, 120, 1600.00, '2026-03-20'),
('12434', 'Rajdhani Express', 'Delhi', 'Chennai', '22:00:00', '06:00:00', 120, 120, 1600.00, '2026-03-20'),
('12657', 'Chennai Mail', 'Chennai', 'Hyderabad', '22:45:00', '08:00:00', 150, 150, 550.00, '2026-03-20'),
('12658', 'Chennai Mail', 'Hyderabad', 'Chennai', '08:00:00', '17:15:00', 150, 150, 550.00, '2026-03-20'),
('12163', 'Chennai Express', 'Chennai', 'Pune', '06:00:00', '22:00:00', 150, 150, 750.00, '2026-03-20'),
('12164', 'Chennai Express', 'Pune', 'Chennai', '08:00:00', '23:00:00', 150, 150, 750.00, '2026-03-20'),
('12301', 'Howrah Rajdhani', 'Kolkata', 'Delhi', '14:00:00', '10:00:00', 120, 120, 1200.00, '2026-03-20'),
('12302', 'Howrah Rajdhani', 'Delhi', 'Kolkata', '17:00:00', '13:00:00', 120, 120, 1200.00, '2026-03-20'),
('12471', 'Swaraj Express', 'Kolkata', 'Mumbai', '08:00:00', '18:00:00', 150, 150, 900.00, '2026-03-20'),
('12472', 'Swaraj Express', 'Mumbai', 'Kolkata', '09:00:00', '19:00:00', 150, 150, 900.00, '2026-03-20'),
('12303', 'Poorva Express', 'Kolkata', 'Delhi', '08:00:00', '06:00:00', 150, 150, 950.00, '2026-03-20'),
('12304', 'Poorva Express', 'Delhi', 'Kolkata', '10:00:00', '08:00:00', 150, 150, 950.00, '2026-03-20'),
('12557', 'Sapt Kranti', 'Patna', 'Delhi', '19:00:00', '06:00:00', 120, 120, 750.00, '2026-03-20'),
('12558', 'Sapt Kranti', 'Delhi', 'Patna', '19:30:00', '06:30:00', 120, 120, 750.00, '2026-03-20'),
('12311', 'Kalka Mail', 'Kolkata', 'Delhi', '19:30:00', '08:00:00', 150, 150, 850.00, '2026-03-20'),
('12312', 'Kalka Mail', 'Delhi', 'Kolkata', '07:30:00', '20:00:00', 150, 150, 850.00, '2026-03-20'),
('12001', 'Bhopal Shatabdi', 'Delhi', 'Bhopal', '06:00:00', '13:55:00', 150, 150, 900.00, '2026-03-20'),
('12002', 'Bhopal Shatabdi', 'Bhopal', 'Delhi', '14:30:00', '22:25:00', 150, 150, 900.00, '2026-03-20'),
('12015', 'Ajmer Shatabdi', 'Delhi', 'Ajmer', '06:05:00', '12:30:00', 150, 150, 700.00, '2026-03-20'),
('12016', 'Ajmer Shatabdi', 'Ajmer', 'Delhi', '14:00:00', '20:25:00', 150, 150, 700.00, '2026-03-20'),
('12029', 'Amritsar Shatabdi', 'Delhi', 'Amritsar', '07:20:00', '13:10:00', 150, 150, 750.00, '2026-03-20'),
('12030', 'Amritsar Shatabdi', 'Amritsar', 'Delhi', '16:30:00', '22:20:00', 150, 150, 750.00, '2026-03-20'),
('12229', 'Lucknow Rajdhani', 'Delhi', 'Lucknow', '18:00:00', '22:30:00', 100, 100, 600.00, '2026-03-20'),
('12230', 'Lucknow Rajdhani', 'Lucknow', 'Delhi', '06:00:00', '10:30:00', 100, 100, 600.00, '2026-03-20'),
('12915', 'Ashram Express', 'Delhi', 'Ahmedabad', '15:00:00', '06:00:00', 150, 150, 950.00, '2026-03-20'),
('12916', 'Ashram Express', 'Ahmedabad', 'Delhi', '17:40:00', '08:40:00', 150, 150, 950.00, '2026-03-20'),
('12559', 'Shiv Ganga Express', 'Delhi', 'Varanasi', '18:00:00', '06:00:00', 150, 150, 700.00, '2026-03-20'),
('12560', 'Shiv Ganga Express', 'Varanasi', 'Delhi', '17:00:00', '05:00:00', 150, 150, 700.00, '2026-03-20'),
('12317', 'Akal Takht Express', 'Delhi', 'Amritsar', '21:30:00', '05:30:00', 150, 150, 650.00, '2026-03-20'),
('12318', 'Akal Takht Express', 'Amritsar', 'Delhi', '22:00:00', '06:00:00', 150, 150, 650.00, '2026-03-20'),
('12259', 'Sealdah Duronto', 'Delhi', 'Kolkata', '08:10:00', '06:00:00', 120, 120, 1300.00, '2026-03-20'),
('12260', 'Sealdah Duronto', 'Kolkata', 'Delhi', '08:05:00', '06:00:00', 120, 120, 1300.00, '2026-03-20'),
('12267', 'Mumbai Duronto', 'Mumbai', 'Delhi', '23:00:00', '16:00:00', 120, 120, 1600.00, '2026-03-20'),
('12268', 'Mumbai Duronto', 'Delhi', 'Mumbai', '23:25:00', '16:25:00', 120, 120, 1600.00, '2026-03-20'),
('12239', 'Mumbai Rajdhani', 'Mumbai', 'Delhi', '14:00:00', '08:00:00', 100, 100, 1550.00, '2026-03-20'),
('12240', 'Mumbai Rajdhani', 'Delhi', 'Mumbai', '14:05:00', '08:05:00', 100, 100, 1550.00, '2026-03-20'),
('12431', 'Trivandrum Rajdhani', 'Delhi', 'Thiruvananthapuram', '10:55:00', '18:00:00', 100, 100, 2200.00, '2026-03-20'),
('12432', 'Trivandrum Rajdhani', 'Thiruvananthapuram', 'Delhi', '19:00:00', '06:00:00', 100, 100, 2200.00, '2026-03-20'),
('12617', 'Mangala Express', 'Delhi', 'Kochi', '22:00:00', '06:00:00', 150, 150, 2000.00, '2026-03-20'),
('12618', 'Mangala Express', 'Kochi', 'Delhi', '19:00:00', '06:00:00', 150, 150, 2000.00, '2026-03-20'),
('12283', 'Duronto Express', 'Delhi', 'Pune', '22:30:00', '18:00:00', 120, 120, 1500.00, '2026-03-20'),
('12284', 'Duronto Express', 'Pune', 'Delhi', '22:00:00', '17:30:00', 120, 120, 1500.00, '2026-03-20'),
('12621', 'Tamil Nadu Express', 'Delhi', 'Chennai', '22:30:00', '07:00:00', 150, 150, 1400.00, '2026-03-20'),
('12622', 'Tamil Nadu Express', 'Chennai', 'Delhi', '22:00:00', '07:30:00', 150, 150, 1400.00, '2026-03-20'),
('12613', 'Coromandel Express', 'Kolkata', 'Chennai', '14:30:00', '05:30:00', 150, 150, 1100.00, '2026-03-20'),
('12614', 'Coromandel Express', 'Chennai', 'Kolkata', '08:45:00', '23:45:00', 150, 150, 1100.00, '2026-03-20'),
('12839', 'Howrah Express', 'Chennai', 'Kolkata', '23:00:00', '20:00:00', 150, 150, 1000.00, '2026-03-20'),
('12840', 'Howrah Express', 'Kolkata', 'Chennai', '23:10:00', '20:10:00', 150, 150, 1000.00, '2026-03-20'),
('12875', 'Neelachal Express', 'Hyderabad', 'Kolkata', '06:00:00', '06:00:00', 150, 150, 1050.00, '2026-03-20'),
('12876', 'Neelachal Express', 'Kolkata', 'Hyderabad', '23:00:00', '23:00:00', 150, 150, 1050.00, '2026-03-20'),
('12723', 'Telangana Express', 'Hyderabad', 'Delhi', '06:00:00', '06:00:00', 150, 150, 1300.00, '2026-03-20'),
('12724', 'Telangana Express', 'Delhi', 'Hyderabad', '22:45:00', '22:45:00', 150, 150, 1300.00, '2026-03-20'),
('12693', 'Pearl City Express', 'Chennai', 'Hyderabad', '06:50:00', '15:00:00', 150, 150, 500.00, '2026-03-20'),
('12694', 'Pearl City Express', 'Hyderabad', 'Chennai', '17:10:00', '05:20:00', 150, 150, 500.00, '2026-03-20'),
('12591', 'Gorakhpur Express', 'Delhi', 'Gorakhpur', '21:00:00', '07:00:00', 150, 150, 600.00, '2026-03-20'),
('12592', 'Gorakhpur Express', 'Gorakhpur', 'Delhi', '20:30:00', '06:30:00', 150, 150, 600.00, '2026-03-20'),
('12461', 'Mandore Express', 'Delhi', 'Jodhpur', '23:00:00', '06:45:00', 150, 150, 700.00, '2026-03-20'),
('12462', 'Mandore Express', 'Jodhpur', 'Delhi', '17:30:00', '06:00:00', 150, 150, 700.00, '2026-03-20'),
('12985', 'Jaipur Express', 'Delhi', 'Jaipur', '06:00:00', '10:30:00', 150, 150, 400.00, '2026-03-20'),
('12986', 'Jaipur Express', 'Jaipur', 'Delhi', '17:00:00', '21:30:00', 150, 150, 400.00, '2026-03-20'),
('12617', 'Guwahati Express', 'Delhi', 'Guwahati', '10:00:00', '06:00:00', 150, 150, 1800.00, '2026-03-20'),
('12618', 'Guwahati Express', 'Guwahati', 'Delhi', '08:00:00', '06:00:00', 150, 150, 1800.00, '2026-03-20'),
('12505', 'North East Express', 'Kolkata', 'Guwahati', '07:00:00', '15:30:00', 150, 150, 600.00, '2026-03-20'),
('12506', 'North East Express', 'Guwahati', 'Kolkata', '06:00:00', '14:30:00', 150, 150, 600.00, '2026-03-20'),
('12669', 'Gangakaveri Express', 'Chennai', 'Bangalore', '22:00:00', '05:30:00', 150, 150, 450.00, '2026-03-20'),
('12670', 'Gangakaveri Express', 'Bangalore', 'Chennai', '22:30:00', '06:00:00', 150, 150, 450.00, '2026-03-20'),
('16527', 'Kannur Express', 'Bangalore', 'Kochi', '21:00:00', '07:00:00', 150, 150, 600.00, '2026-03-20'),
('16528', 'Kannur Express', 'Kochi', 'Bangalore', '08:00:00', '18:00:00', 150, 150, 600.00, '2026-03-20'),
('12977', 'Ajmer Express', 'Ajmer', 'Mumbai', '05:45:00', '07:00:00', 150, 150, 900.00, '2026-03-20'),
('12978', 'Ajmer Express', 'Mumbai', 'Ajmer', '19:00:00', '20:15:00', 150, 150, 900.00, '2026-03-20'),
('12909', 'Bandra Garib Rath', 'Mumbai', 'Delhi', '15:35:00', '07:25:00', 200, 200, 900.00, '2026-03-20'),
('12910', 'Bandra Garib Rath', 'Delhi', 'Mumbai', '15:40:00', '07:30:00', 200, 200, 900.00, '2026-03-20');
```

### Step 4: Configure Environment

Navigate to the backend folder and create a `.env` file:

```bash
cd irctc-backend
```

Create `.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=irctc_db
JWT_SECRET=irctcsupersecretkey123!
PORT=3000
```

### Step 5: Install Dependencies

```bash
npm install
```

### Step 6: Start the Backend Server

```bash
node server.js
```

You should see:

```
Server running on http://localhost:3000
```

### Step 7: Open the Frontend

Open `irctc-auth.html` in your browser. No build step needed.

---

## 🔧 Running from GitHub

If you are a judge running this project from GitHub:

```bash
# 1. Clone
git clone <repo-url>
cd irctc-tatkal-simulator

# 2. Install Node dependencies
cd irctc-backend
npm install

# 3. Set up MySQL (must have MySQL installed)
mysql -u root -p
# Then paste the CREATE TABLE statements from Step 2 above

# 4. Create .env file in irctc-backend/ folder
# Copy the template from .env.example and fill in your MySQL password

# 5. Start server
node server.js

# 6. Open frontend
# Open irctc-tatkal-simulator/frontend/irctc-auth.html in any browser
```

> **Note**: The frontend is plain HTML — no `npm install`, no `build` command, no webpack. Just open the HTML file directly in a browser.

> **Note**: Make sure MySQL service is running before starting the Node server.

---

## 📡 API Reference

### Authentication

| Method | Endpoint           | Body                                    | Response          |
| ------ | ------------------ | --------------------------------------- | ----------------- |
| POST   | `/api/auth/signup` | `{ full_name, email, password, phone }` | `{ message }`     |
| POST   | `/api/auth/login`  | `{ email, password }`                   | `{ token, user }` |

### Trains

| Method | Endpoint                                           | Headers                         | Response                            |
| ------ | -------------------------------------------------- | ------------------------------- | ----------------------------------- |
| GET    | `/api/trains/all`                                  | `Authorization: Bearer <token>` | `[{ id, train_name, source, ... }]` |
| GET    | `/api/trains/search?source=X&destination=Y&date=Z` | `Authorization: Bearer <token>` | `[{ ... }]`                         |

### Bookings

| Method | Endpoint             | Headers                         | Body           | Response                             |
| ------ | -------------------- | ------------------------------- | -------------- | ------------------------------------ |
| POST   | `/api/bookings/book` | `Authorization: Bearer <token>` | `{ train_id }` | `{ booking_id, seat_number, train }` |
| GET    | `/api/bookings/my`   | `Authorization: Bearer <token>` | —              | `[{ id, train_name, source, ... }]`  |

---

## 🔮 Future Integrations & Scope of Improvement

### Short Term

- **Redis Integration**: Replace MySQL queue with Redis for sub-millisecond seat holds — handles 10x more concurrent users
- **Real Payment Gateway**: Integrate Razorpay or PayU for actual payment processing
- **Email Notifications**: Send booking confirmation and PNR to user's email via Nodemailer
- **OTP Verification**: Add SMS-based OTP during signup using Twilio or MSG91

### Medium Term

- **Waitlist System**: Automatically confirm waitlisted tickets when cancellations happen
- **Cancellation & Refunds**: Full booking cancellation flow with refund tracking
- **Passenger Management**: Support multiple passengers per booking (family bookings)
- **Seat Map**: Visual seat selection with berth/coach layout

### Long Term

- **Microservices Architecture**: Split booking, payment, and notification into separate services
- **Load Balancer**: Deploy multiple Node.js instances behind Nginx for horizontal scaling
- **Message Queue (RabbitMQ/Kafka)**: Decouple booking intent from confirmation for extreme traffic
- **Real-Time Seat Map**: WebSocket-powered live seat availability across all connected clients
- **Mobile App**: React Native wrapper for iOS and Android
- **PNR Status Tracking**: Real-time booking status updates
- **Dynamic Pricing**: Surge pricing algorithm based on demand and time to departure

### Infrastructure Improvements

- **Docker Containerization**: Package entire stack in Docker Compose for one-command deployment
- **CI/CD Pipeline**: Automated testing and deployment via GitHub Actions
- **Monitoring**: Prometheus + Grafana dashboard for request rates, error rates, booking throughput
- **Database Replication**: MySQL read replicas for search queries, primary only for writes

---

## 📄 License

This project was built for the ACM MPSTME Hackathon. All code is original work by the team.

---

_Built with ❤️ for ACM MPSTME Hackathon 2026_
