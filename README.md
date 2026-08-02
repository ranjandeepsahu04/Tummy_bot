# WhatsApp Food Ordering System (Swiggy / Zomato style via WhatsApp)

An enterprise-grade, production-ready WhatsApp Food Ordering platform powered by Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, and Next.js (Shadcn UI).

---

## 🚀 Key System Features

- **Official WhatsApp Cloud API & Twilio Support**: Direct integration with Meta WhatsApp Cloud API and Twilio with provider abstraction.
- **Dynamic WhatsApp Conversation State Engine**: Handles full customer session state, menu navigation, cart commands (`1 x 2`, `3 x 4`, `cart`, `add`, `remove 1`, `clear`, `checkout`), pickup slot selection, coupon redemption, track order, and reorders.
- **Delayed Payment Flow (Crucial Workflow)**:
  1. Customer places order on WhatsApp -> Order created as `PENDING`.
  2. Admin reviews order on Dashboard & clicks **Accept Order** -> Kitchen starts preparing.
  3. Kitchen clicks **Ready For Payment** -> System dispatches WhatsApp message with Order summary & **Dynamic UPI QR Code** (`upi://pay?...`).
  4. Customer replies **PAID** or payment gateway webhook triggers -> Status updates to `PAYMENT_RECEIVED` & `READY_FOR_PICKUP`.
  5. Order completed by staff.
- **Restaurant Default Image Fallback**: Food items do not require individual photos. Each restaurant maintains a single default cover image. If a food item has no custom photo, the system automatically falls back to the restaurant default image.
- **Dynamic UPI QR Code Generator**: Generates standard UPI string (`upi://pay?pa=...&pn=...&am=...&tn=...&tr=...`) with order number and exact amount.
- **Role-Based Access Control (RBAC)**: JWT authentication with refresh tokens and roles (`SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_STAFF`, `DELIVERY_STAFF`).
- **Live Order Board & Catalog Administration**: Real-time order monitoring dashboard, CRUD for Restaurants, Zones, Blocks, Menu Categories, Food Items, Coupons, Pickup Slots, Staff Accounts, Analytics, and CSV Export.

---

## 🛠️ Architecture & Tech Stack

```
Customer WhatsApp  ──▶  Meta Cloud API  ──▶  Express API (Backend)  ──▶  PostgreSQL (Prisma ORM)
                                                    ▲
                                                    │
                                         Next.js Admin Dashboard
```

- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons
- **Security**: Helmet, Rate Limiting, CORS, JWT + Refresh Tokens, bcrypt
- **API Docs**: Swagger UI (`http://localhost:5000/docs`)

---

## 📋 Environment Setup & Configuration

1. Copy `.env.example` to `backend/.env`:
   ```bash
   cp .env.example backend/.env
   ```

2. Configure Meta WhatsApp Credentials in `backend/.env`:
   ```env
   WHATSAPP_PROVIDER=meta
   META_PHONE_NUMBER_ID=your_phone_number_id
   META_WHATSAPP_TOKEN=your_meta_system_user_token
   META_WEBHOOK_VERIFY_TOKEN=tummy_bot_verify_token_12345
   ```

---

## 💻 Running Locally

### 1. Database Setup & Migration

Ensure PostgreSQL is running locally on port `5432` with database `tummy_bot`, or update `DATABASE_URL`.

```bash
cd backend
npm install

# Run database migrations
npx prisma migrate dev --name init

# Seed database with Super Admin, Restaurants, Menu Items, Pickup Slots, and Coupons
npm run prisma:seed
```

Default Super Admin Credentials:
- **Email**: `admin@tummybot.com`
- **Password**: `Admin@12345`

### 2. Start Backend API

```bash
cd backend
npm run dev
```
- API Base URL: `http://localhost:5000/api`
- Swagger API Docs: `http://localhost:5000/docs`
- Health Check: `http://localhost:5000/health`

### 3. Start Next.js Admin Dashboard

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` and sign in with default credentials.

---

## 📲 Meta WhatsApp Cloud API Webhook Setup

1. Expose your backend port `5000` via ngrok or production domain:
   ```bash
   ngrok http 5000
   ```
2. In Meta App Dashboard -> **WhatsApp** -> **Configuration**:
   - **Callback URL**: `https://your-domain.ngrok-free.app/api/webhook/whatsapp`
   - **Verify Token**: `tummy_bot_verify_token_12345` (matches `META_WEBHOOK_VERIFY_TOKEN` in `.env`)
3. Click **Verify and Save**.
4. Subscribe to webhook field: `messages`.

---

## 🐳 Production Deployment with Docker Compose

Run the entire production stack (PostgreSQL + Backend API + Next.js Admin Dashboard) with a single command:

```bash
docker-compose up -d --build
```

Services exposed:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api`
- **PostgreSQL**: Port `5432`

---

## 📊 Live Order Workflow Diagram

```
[Customer WhatsApp] "Hi" -> Select Zone & Block -> Choose Restaurant -> Browse Menu -> Add Items ("2 x 1") -> Checkout -> Select Pickup Time -> Confirm Order
                                                                  │
                                                                  ▼
                                                      [Admin Dashboard] (Pending)
                                                                  │
                                                        Admin clicks ACCEPT
                                                                  │
                                                        Kitchen starts PREPARING
                                                                  │
                                                      Admin clicks READY FOR PAYMENT
                                                                  │
                                                                  ▼
[Customer WhatsApp] Received Order Summary + Dynamic UPI QR (`upi://pay?...`) -> Replies "PAID"
                                                                  │
                                                                  ▼
                                                   [Admin Dashboard] PAYMENT_RECEIVED
                                                                  │
                                                         READY FOR PICKUP -> COMPLETED
```
