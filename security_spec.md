# Security Specification — Gazi Jute Enterprises

## 1. Core Data & Access Invariants
1. **Strict Public/Private Split**: Public visitors (`request.auth == null`) may only read `publicProducts` (where `status == 'ACTIVE'`), `categories` (`active == true`), `companySettings/public`, and `whatsappNumbers` (`isActive == true`). They can never read `products`, `purchases`, `sales`, `stockTransactions`, `suppliers`, `customers`, `enquiries`, `users`, or `userInvites`.
2. **Stock Visibility Isolation**: When `showStockPublicly == false` on a product, `publicProducts/{productId}.publicAvailableStock` is stored as `0` and hidden, preventing even raw API reads of inventory counts.
3. **Non-Negative Stock Invariant**: `products/{productId}.availableStock >= 0`, `currentStockValue >= 0`, `totalPurchaseQty >= 0`, `totalSalesQty >= 0`, `totalPurchaseAmount >= 0`, `totalSalesAmount >= 0`.
4. **Immutable Ledger Integrity**: `stockTransactions` are append-only by verified Admins; edits or deletions by non-admins or tampering with `createdBy` / `createdAt` are rejected.
5. **No Self-Privilege Escalation**: Users cannot assign themselves `ADMIN` or `VIEWER` roles in `users/{uid}` unless their verified email is a bootstrapped admin or matches an active `userInvites/{email}` document created by an Admin.
6. **Public Enquiry Safety**: Unauthenticated buyers can `create` an enquiry in `enquiries` ONLY with `status == 'NEW'` and bounded field sizes; they cannot read, list, update, or delete any enquiries.
7. **WhatsApp Number Integrity**: All `whatsappNumbers` must match international E.164 pattern `^\+[1-9][0-9]{6,14}$` and inactive numbers cannot be queried by public visitors.
8. **Email Verification Gate**: All authenticated write operations require `request.auth.token.email_verified == true`.
9. **Immutable Audit Trail**: `auditLogs` can only be read or created by verified Admins with `actorUid == request.auth.uid` and `createdAt == request.time`; updates and deletions are permanently blocked.
10. **Historical Product Archival**: Products with purchase, sale, or stock transaction history must be transitioned to `status == 'ARCHIVED'` (with `publicAvailableStock == 0`) rather than deleted, preserving ledger integrity while hiding archived items from public visitors.
11. **Controlled Purchase Reversals & Financial Immutability**: Purchase quantities, rates, expenses, discounts, taxes, and `totalAmount` on `purchases` are strictly immutable after creation (only `paymentStatus` and `notes` may be updated by verified Admins); edits and cancellations must post controlled `CANCELLATION_REVERSAL` entries linked via `referencePurchaseId` and atomically adjust inventory and weighted average cost.

## 2. Adversarial "Dirty Dozen" Test Payloads
1. **Unauthenticated Private Inventory Read**: `GET /products/prod_1` with `auth: null` -> `PERMISSION_DENIED`.
2. **Unauthenticated Sales/Purchase Read**: `LIST /sales` or `LIST /purchases` with `auth: null` -> `PERMISSION_DENIED`.
3. **Buyer Role Self-Escalation**: Signed-in user creating `users/{uid}` with `role: 'ADMIN'` without bootstrap or invite -> `PERMISSION_DENIED`.
4. **Unverified Email Spoofing**: User with matching admin email string but `token.email_verified == false` attempting product write -> `PERMISSION_DENIED`.
5. **Viewer Mutation Attempt**: Authenticated `VIEWER` attempting `CREATE` or `UPDATE` on `products`, `purchases`, `sales`, or `whatsappNumbers` -> `PERMISSION_DENIED`.
6. **Negative Stock Injection**: Admin or malicious payload sending `availableStock: -10` on `products/{id}` -> `PERMISSION_DENIED`.
7. **Shadow / Ghost Field Injection**: Sending extra unexpected field `isBypassed: true` on `enquiries` or `products` -> `PERMISSION_DENIED` via `keys().hasOnly(...)`.
8. **Enquiry Status Shortcutting**: Public buyer creating an enquiry with `status: 'COMPLETED'` instead of `'NEW'` -> `PERMISSION_DENIED`.
9. **Resource Exhaustion / Oversized String**: Sending 50KB description or 2KB document ID on `enquiries/{id}` -> `PERMISSION_DENIED` via `isValidId` and `.size()` limits.
10. **Immutable Timestamp Tampering**: Updating a product with modified `createdAt` or client-forged `updatedAt != request.time` -> `PERMISSION_DENIED`.
11. **Invalid WhatsApp Format**: Creating a WhatsApp number without `+` country code (e.g., `7585841977`) -> `PERMISSION_DENIED`.
12. **Public Enquiry Scraping**: Signed-in `BUYER` attempting `LIST /enquiries` to read other buyers' phone numbers and locations -> `PERMISSION_DENIED`.
