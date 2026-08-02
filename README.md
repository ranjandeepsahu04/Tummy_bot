# 🍔 TummyBot — WhatsApp Food Ordering System

An enterprise-grade, production-ready WhatsApp Food Ordering platform powered by Node.js, TypeScript, Express, Prisma ORM (SQLite), and Next.js (App Router, Tailwind CSS, Lucide Icons).

---

## 🚀 Key System Features

- **Direct Secondary Phone WhatsApp Engine (Baileys)**: Scan a QR code on your dashboard (`/dashboard/pair`) with any WhatsApp phone to turn it into your live automated food ordering chatbot — no Meta approval or Twilio credentials required!
- **Dynamic WhatsApp Conversation State Engine**: Handles full customer session state, menu navigation, cart commands (`1 x 2`, `3 x 4`, `cart`, `add`, `remove 1`, `clear`, `checkout`), pickup slot selection, coupon redemption, order tracking, and reorders.
- **Delayed Payment Flow & Visual PNG QR Code Generation**:
  1. Customer places order on WhatsApp ➔ Order created as `PENDING` (Awaiting Restaurant Acceptance).
  2. Restaurant manager reviews order on Dashboard & clicks **Accept Order** or **Ready For Payment**.
  3. System automatically generates a **Dynamic PNG UPI Payment QR Code Image** (`upi://pay?...`) and sends it directly to the customer on WhatsApp.
  4. Customer scans the QR code or pays to the UPI ID, then replies **PAID**.
  5. Status updates to `PAYMENT_RECEIVED` & `READY_FOR_PICKUP`.
  6. Order completed by staff.
- **Dashboard QR Pairing Page (`/dashboard/pair`)**: Real-time QR code display for 1-click scanning and pairing of your secondary WhatsApp phone.
- **Built-in WhatsApp Webhook Simulator (`/dashboard/simulator`)**: Live chat simulator in the admin dashboard for testing order flows without a physical phone.
- **Role-Based Access Control (RBAC)**: JWT authentication with refresh tokens and roles (`SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_STAFF`, `DELIVERY_STAFF`).
- **Live Order Board & Administration**: Real-time order monitoring dashboard, CRUD for Restaurants, Campus Zones & Blocks, Menu Categories, Food Items, Coupons, Pickup Slots, Staff Accounts, Analytics, and CSV Export.

---

## 🛠️ Tech Stack & Architecture

```
Customer WhatsApp  ──▶  Direct Baileys WhatsApp Engine  ──▶  Express API (Backend)  ──▶  Prisma ORM (SQLite)
                                                                    ▲
                                                                    │
                                                        Next.js Admin Dashboard
```

- **Backend**: Node.js, Express.js, TypeScript, `@whiskeysockets/baileys`, Prisma ORM
- **Database**: SQLite (`dev.db`)
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons
- **Security**: Helmet, Rate Limiting, CORS, JWT + Refresh Tokens, bcrypt
- **API Documentation**: Swagger UI (`http://localhost:5000/docs`)

---

## 💻 Running Locally

### 1. Backend Setup

```bash
cd backend
npm install

# Initialize Database Schema & Seed Data
npx prisma db push
npm run prisma:seed

# Start Backend API
npm run dev
```

Default Endpoints:
- **API Base URL**: `http://localhost:5000/api`
- **Swagger Docs**: `http://localhost:5000/docs`
- **Health Check**: `http://localhost:5000/health`

---

### 2. Frontend Admin Dashboard Setup

```bash
cd frontend
npm install

# Start Next.js Development Server
npm run dev
```

Open `http://localhost:3000` and log in with your configured Super Admin account (default local seed email: `admin@tummybot.com`).

---

## 📲 Pairing Your Secondary Phone as WhatsApp Bot

1. Open the Admin Dashboard at `http://localhost:3000`.
2. Click **`Pair Bot Phone (QR)`** on the left menu (or go to `http://localhost:3000/dashboard/pair`).
3. Open **WhatsApp** on your secondary phone ➔ **Settings** ➔ **Linked Devices** ➔ **Link a Device**.
4. Scan the QR code on your computer screen.
5. Text **`Hi`** from your primary phone to your secondary phone number to start ordering! 🍔🍕

---

## 📄 License
This project is licensed under the MIT License.
