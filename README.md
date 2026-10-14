# TiffinTrack 🍱📱

A full-stack, multi-tenant SaaS logistics and billing engine tailored for independent tiffin (meal) service providers and their recurring subscribers.

---

## 📌 Overview

Independent meal subscription businesses frequently suffer from food wastage due to late cancellations, payment disputes stemming from paper ledger tracking, and delivery miscommunication.

**TiffinTrack** bridges the gap between kitchen operators and daily meal subscribers. Built with **React Native (Expo)** and **Supabase (PostgreSQL)**, it enforces a strict time-locked scheduling engine, transparent two-way delivery handshakes, frictionless link-based delivery tracking, and automated 30-day postpaid billing.

---

## 🚀 Key Features

### 👤 Customer App

- **Kitchen Code Handshake:** Connects directly to a specific provider via a 6-character code (e.g., `SHARMA99`), dynamically provisioning the customer under that kitchen tenant.
- **Granular Meal Controls:** Manage Lunch and Dinner plans independently with dynamic combo pricing support.
- **Strict Buffer Pause:** Enforces a binary pause rule before kitchen cut-off (e.g., 10:00 AM) to prevent food waste. Locks UI and backend requests once raw materials are committed.
- **Vacation Mode:** Schedule date ranges (JSONB stored ranges) to freeze deliveries without daily manual updates.
- **Dynamic Khata (Postpaid):** Live audit trail of daily meals consumed across the 30-day billing cycle.
- **Support Hub & Notices:** Structured ticket-based support and read-only kitchen announcements to minimize kitchen distractions.

### 👨‍🍳 Admin Command Center

- **Live Dispatch Dashboard:** Real-time production counts (Active Users − Vacations − Morning Pauses) with zero manual math.
- **Double-Handshake Verification:** Requires Admin dispatch confirmation and customer receipt confirmation, backed by a 12-hour auto-approval fallback for forgetful users.
- **Anti-Fraud Override:** Manual status overrides trigger out-of-band notifications/SMS directly to the user to maintain billing integrity.
- **App-Free Live Tracking:** Generates a temporary 3-hour authenticated web link for delivery personnel. Runs `navigator.geolocation` in mobile browsers, streaming live GPS coordinates over WebSockets to the Admin map view — no native app installs required.
- **Automated Dunning & Billing:** Automated invoice generation on Day 30, payment reminders, and auto-suspension triggers for overdue ledgers.
- **Predictive Kitchen Analytics:** 7-day grocery procurement forecasting and menu item drop-off tracking (identifying dishes with higher pause rates).

---

## 🛠️ Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │                   React Native (Expo)                   │
   │  ┌───────────────────────┐     ┌─────────────────────┐  │
   │  │     Customer App      │     │      Admin App      │  │
   │  └───────────┬───────────┘     └──────────┬──────────┘  │
   └──────────────┼────────────────────────────┼─────────────┘
                  │ HTTPS / WSS                │ HTTPS / WSS
                  ▼                            ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  Supabase (BaaS)                        │
   │                                                         │
   │   • Supabase Auth (Phone OTP Authentication)            │
   │   • Supabase Realtime (PostgreSQL Changes / WebSockets) │
   │   • Row Level Security (Tenant Isolation by kitchen_id) │
   │                                                         │
   │   ┌─────────────────────────────────────────────────┐   │
   │   │             PostgreSQL Database                 │   │
   │   │  [kitchens] ──< [users] ──< [ledger_entries]   │   │
   │   │       │               │                         │   │
   │   │       ├──< [menus]    └──< [invoices]           │   │
   │   │       └──< [settings]                           │   │
   │   └─────────────────────────────────────────────────┘   │
   └─────────────────────────────────────────────────────────┘
```

| Layer               | Technology                                                 |
| ------------------- | ---------------------------------------------------------- |
| **Frontend**        | React Native, Expo, React Navigation, React Native Reanimated |
| **State Management**| React Context API / Redux Toolkit                          |
| **Backend**         | Supabase, PostgreSQL, Database Triggers & Stored Procedures |
| **Security**        | PostgreSQL Row Level Security (RLS) — strict multi-tenant isolation |
| **Realtime**        | WebSockets via Supabase Realtime API                       |
| **Third-Party**     | Firebase Cloud Messaging (FCM) / Expo Push, Google Maps Platform, Razorpay / UPI Deep-Linking |

---

## 🗄️ Database Design (Core Entities)

| Table              | Description                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `kitchens`         | Master tenant table (`kitchen_id`, `kitchen_code`, `owner_phone`, `name`)    |
| `users`            | Subscribers mapped via FK (`user_id`, `kitchen_id`, `vacation_periods`, `status`) |
| `rate_tiers`       | Dynamic pricing configurations assigned per customer                         |
| `daily_menus`      | Kitchen templates and daily menu overrides per meal period                    |
| `ledger_entries`   | Individual meal delivery logs tracking `admin_status`, `user_status`, `status: UNBILLED/BILLED` |
| `invoices`         | Postpaid cycle aggregates generated at cycle close                           |
| `global_settings`  | Key-value configuration scoped per tenant (`pause_buffer_hours`, `kitchen_active_today`) |

---

## 📂 Project Structure

```
TiffinTrack/
├── src/
│   ├── assets/              # Icons, illustrations, and typography
│   ├── components/          # Shared components (TiffinCard, StatusBadge, Buttons)
│   ├── context/             # Global Auth and App configuration contexts
│   ├── navigation/          # AppNavigator, AuthStack, CustomerStack, AdminStack
│   ├── screens/
│   │   ├── Auth/            # OTP Verification & Kitchen Code Handshake
│   │   ├── Customer/        # Dashboard, Khata Calendar, Vacation, Menu
│   │   └── Admin/           # Dispatch Board, Live Tracking Map, Customer Directory
│   ├── services/            # Supabase client, auth helpers, real-time listeners
│   └── utils/               # Timezone parsers, cut-off calculators, constants
├── supabase/                # Migration scripts and schema definitions
├── app.json
└── package.json
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Expo CLI**
- A **Supabase** account and project

### 1. Clone & Install

```bash
git clone https://github.com/BIPIN325/TiffinTrack.git
cd TiffinTrack
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
```

### 3. Database Setup

1. Open your **Supabase SQL Editor**.
2. Execute the migration scripts located in `/supabase/migrations` to provision tables, triggers, and RLS policies.
3. Enable **Phone Authentication** in the Supabase Auth settings.

### 4. Run the Application

```bash
# Start the Expo development server
npx expo start
```

Run on an iOS Simulator, Android Emulator, or scan the QR code via **Expo Go** on a physical device.

---

## 📄 License

This project is proprietary. All rights reserved.
