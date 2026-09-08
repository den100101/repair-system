# Tapalla's Electronic Repair — Full-Stack App

A repair-shop management system for **Tapalla's Electronic Repair**, built on the provided
Visily mockups and extended to cover all six required capabilities:

1. **Online Appointment Scheduling** — 4-step booking wizard with a real date + time-slot
   picker; slot capacity is enforced live and checked again server-side on submit.
2. **Real-Time Repair Tracking** — status timeline, shop updates, and photo uploads; the
   repair detail page auto-polls every 15s so both customer and staff see changes without
   a manual refresh.
3. **Service Management Page** — admin CRUD for the services offered (name, description,
   starting price, active/inactive). The public site and booking wizard pull this list live
   instead of a hardcoded array.
4. **Inventory Management System** — admin CRUD for spare parts (SKU, stock qty, reorder
   level, cost/price). Parts can be attached to a specific repair job, which deducts stock
   automatically and feeds a low-stock warning on the dashboard.
5. **Quotation Approval System** — staff build a line-item quote on a repair; the customer
   sees it on their tracking page and approves or declines it. Approval auto-advances the
   repair status; both actions are logged to the status timeline and notification history.
6. **Dashboard and Reporting** — admin dashboard (queue, filters, technician workload,
   pending quotes, low-stock count, activity feed) plus a dedicated Reports page with a
   date-range filter, status/category breakdowns, and CSV export.

**Stack:** React (Vite, plain CSS) · Flask · SQLAlchemy · MySQL · JWT auth

```
tapalla-repair/
├── backend/                Flask API (all .py files)
│   ├── app.py               app factory / entry point
│   ├── config.py            env-based configuration
│   ├── extensions.py        db / jwt / cors singletons
│   ├── models.py            SQLAlchemy models (users, repairs, services, parts,
│   │                        quotations, status history, messages, photos, notifications)
│   ├── seed.py               creates tables + demo data for every feature
│   ├── routes/
│   │   ├── auth.py          register / login / me
│   │   ├── repairs.py       customer booking, availability, tracking, quotation response
│   │   └── admin.py         dashboard stats, reports/export, repair queue, service &
│   │                        inventory CRUD, quotation creation
│   ├── requirements.txt
│   └── .env.example
└── frontend/                React app
    ├── src/
    │   ├── api/              axios client + AuthContext
    │   ├── components/       Navbar, Footer, Sidebar, badges, ProtectedRoute
    │   ├── pages/
    │   │   ├── Home.jsx              services pulled live from the API
    │   │   ├── BookRepair.jsx        4-step wizard incl. live slot picker
    │   │   ├── CustomerLogin.jsx / AdminLogin.jsx
    │   │   ├── CustomerDashboard.jsx
    │   │   ├── AdminDashboard.jsx    queue, workload, activity, low-stock/quote alerts
    │   │   ├── AdminServices.jsx     Service Management
    │   │   ├── AdminInventory.jsx    Inventory Management
    │   │   ├── AdminReports.jsx      Dashboard & Reporting (date range + CSV export)
    │   │   └── RepairDetail.jsx      tracking + quotation approval + parts-used, staff controls
    │   ├── assets/            logo, storefront photo, service photos
    │   ├── index.css          plain CSS design system (no framework)
    │   └── constants.js
    ├── package.json
    └── vite.config.js
```

## 1. Database (MySQL)

Create an empty database — the app creates all tables for you:

```sql
CREATE DATABASE tapalla_repair CHARACTER SET utf8mb4;
```

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then edit DB_USER / DB_PASSWORD / etc.

python seed.py                  # creates tables + demo data
python app.py                   # runs on http://localhost:5000
```

`seed.py` populates every feature so you can see them working immediately: 4 services,
4 inventory parts (one already below its reorder level), 2 repairs (one mid-repair with a
pending quotation and a part already attached, one completed so reports have revenue to
show), status history, a shop update, and notification history.

Demo accounts:

| Role     | Email                          | Password    |
|----------|---------------------------------|-------------|
| Admin    | admin@tapalla-repair.com        | admin123    |
| Customer | juan.dcruz@email.com            | customer123 |

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev                     # runs on http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` requests to `http://localhost:5000`
(see `vite.config.js`), so just run both servers side by side — no extra config needed.

## 4. Key flows

- **Book a repair:** `/book-repair` → Contact → Appliance (service pulled from
  `GET /api/repairs/services`) → Schedule (date + time slot, checked live against
  `GET /api/repairs/availability`) → Confirm → `POST /api/repairs` returns a tracking
  number like `TR-4821-2026`.
- **Customer tracking:** log in at `/login` → `/dashboard` lists repairs and any quotes
  awaiting a decision → click a repair to open `/repairs/<order_id>` for the live status
  timeline, shop updates, quotation approve/decline, and photo uploads.
- **Staff — day to day:** log in at `/admin-login` → `/admin` for the request queue,
  search/filters, technician workload, pending-quote and low-stock counts, activity feed
  → click a row to open `/repairs/<order_id>` with status controls, internal (customer-
  hidden) notes, parts-used (deducts inventory), and the quotation builder.
- **Staff — catalog & stock:** `/admin/services` to add/edit/retire services;
  `/admin/inventory` to manage parts and stock levels.
- **Staff — reporting:** `/admin/reports` for a date-range summary (totals, revenue,
  status/category breakdowns) and a CSV export button.

## Notes

- Passwords are hashed with Werkzeug; auth uses JWT bearer tokens (7-day expiry).
- Uploaded photos are stored on disk under `backend/uploads/` and served at `/uploads/<file>`.
- "Real-time" tracking is short-interval polling (15s), not websockets — simplest thing
  that satisfies the requirement without adding infrastructure. Swap in websockets/SSE if
  you need sub-second updates.
- `estimated_cost` on a repair feeds the "Mo. Revenue" card once a job's status is set to
  `Quality Check & Done`; the Reports page sums the same field over any date range.
- Deleting a service or part that's already referenced by a repair deactivates it instead
  of hard-deleting, so historical repairs keep their data intact.
