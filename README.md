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
