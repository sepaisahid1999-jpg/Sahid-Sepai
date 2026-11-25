# Gazi Jute Enterprises — Wholesale Catalogue, Inventory & WhatsApp Quotation Portal

Production-ready wholesale jute e-commerce catalogue, weighted-average inventory accounting system, WhatsApp Click-to-Chat enquiry desk, and multi-role RBAC portal backed by Firebase Firestore, Firebase Authentication, and Firebase Storage.

---

## 1. Key Capabilities

- **Public Wholesale Catalogue (`/`, `/products`, `/products/:id`, `/about`, `/contact`)**:
  - White and deep heritage green corporate design with responsive desktop and mobile layouts.
  - Live product search by name, SKU, and category filter tabs.
  - Multi-image product gallery, optional public stock visibility toggle, and zero exposure of purchase prices, profit margins, or supplier details.
  - Pre-filled WhatsApp Click-to-Chat quotation forms saving every enquiry to Firestore.
- **Admin Dashboard (`/admin`)**:
  - Protected Google Sign-In (`ADMIN` role verified via Firestore Security Rules).
  - Products & Categories CRUD with Firebase Storage multi-image uploads.
  - Atomic **Stock In / Purchases** (`Total = Qty × Rate + Expenses`) with weighted-average purchase cost recalculation.
  - Atomic **Stock Out / Sales** with non-negative stock enforcement, COGS, weighted-average sale price, and realized gross profit.
  - Compensating ledger entries for **Returns, Cancellations, and Corrections** (`stockTransactions` immutable ledger).
  - **Settings → WhatsApp Management**: Add, edit, activate/deactivate, set default, configure product/general enquiry routing, and confirm before delete, with automatic active-number fallback.
  - **Settings → Company & Footer**: Live editing of company name, logo, phone numbers, email, address, About Us copy, and footer copyright.
  - **Settings → Users & Viewers**: Email allowlist (`userInvites`) and role management (`ADMIN`, `VIEWER`, `BUYER`).
  - **Buyer Enquiries**: Filter and update status (`NEW`, `PENDING`, `CONTACTED`, `COMPLETED`, `CANCELLED`).
  - **Reports & Backup**: Downloadable CSV, Excel (`.xlsx`), and full JSON database snapshot exports.
- **Viewer Dashboard (`/viewer`)**:
  - Strictly read-only portal for `VIEWER` accounts to inspect stock valuation, analytics, purchase/sales histories, and download non-PII reports.

---

## 2. Accounting Method

1. **Weighted Average Purchase Price**:
   $$\text{Average Purchase Price} = \frac{\text{Total Purchase Value}}{\text{Total Purchased Quantity}}$$
   Updated atomically on every Stock In purchase (`Quantity × Purchase Rate + Additional Expenses`).
2. **Realized Gross Profit vs. Revenue vs. Inventory Value**:
   - **Sales Revenue** = $\sum (\text{Qty} \times \text{Sale Rate} - \text{Discount} + \text{Additional Charges})$.
   - **Cost of Goods Sold (COGS)** = $\text{Sold Qty} \times \text{Weighted Avg Purchase Price at time of sale}$.
   - **Realized Gross Profit** = $\text{Sales Revenue} - \text{COGS}$.
   - **Estimated Current Stock Value** = $\text{Available Stock} \times \text{Weighted Avg Purchase Price}$.
3. **Returns, Cancellations & Corrections**:
   - Customer returns restore `availableStock` and subtract reversed revenue/COGS/profit via a compensating `SALE_RETURN` ledger record without deleting historical transactions.
   - Supplier returns reduce `availableStock` (guarded against negative stock) and adjust purchase totals via `PURCHASE_CORRECTION`.

---

## 3. First Admin Setup Instructions

1. Open `/admin/login`.
2. Sign in with the primary administrator Google account (`sepaisahid1999@gmail.com` or `gazijute91@gmail.com`).
3. Bootstrapped admin recognition automatically provisions your `users/{uid}` profile with `role: "ADMIN"`.
4. On first load of `/admin`, click **Initialize Defaults in Firestore** to seed Gazi Jute Enterprises contact details (`7585841977`, `7074340808`, `gazijute91@gmail.com`), active WhatsApp numbers (`+917585841977`, `+917074340808`), and initial categories.
5. Add additional Admins or read-only Viewers under **Settings → Users & Viewers**.

---

## 4. Firebase Configuration Checklist

- [x] `firebase-applet-config.json` configured with named Firestore database ID.
- [x] `firestore.rules` enforces strict public/private split (`publicProducts` vs `products`), non-negative stock, immutable ledgers, and email-verified RBAC.
- [x] `firestore.indexes.json` defines composite indexes for `publicProducts`, `purchases`, `sales`, `stockTransactions`, and `enquiries`.
- [x] `storage.rules` restricts image uploads (`< 5MB`, `image/*`) to verified authenticated staff while permitting public image reads.
- [ ] In Firebase Console → **Authentication → Settings → Authorized domains**, ensure your production Vercel domain and custom domain are added.
- [ ] In Firebase Console → **Storage**, ensure Firebase Storage is initialized in your project if uploading files directly from the Admin Panel.

---

## 5. Vercel Deployment & Custom Domain Guide

1. Push this repository to GitHub (never commit `.env` or private service account keys).
2. Import the repository in **Vercel** (`vercel.json` is preconfigured with `npm run build` -> `dist/` and SPA rewrites).
3. Add your custom domain in **Vercel → Project Settings → Domains** (e.g., `gazijute.com` and `www.gazijute.com`).
4. Update DNS records at your domain registrar (`A` record to `76.76.21.21` and `CNAME` for `www` to `cname.vercel-dns.com`).
5. Add the custom domain to **Firebase Console → Authentication → Settings → Authorized domains** so Google Sign-In popups work on the live domain.
6. Update `/public/sitemap.xml` and `/public/robots.txt` URLs if using a different domain name.
