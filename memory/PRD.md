# Cosmos Cannabis Cure — PRD

## Original Problem Statement
Cannabis dispensary in Bangalore — India's first — called "Cosmos Cannabis Cure". Palette: white, black, red. Products: Moon Impact, Trost, Cannoza, Rasta gummies.

## User Choices
- Full e-commerce store + admin panel + marketing landing
- Buy online enabled
- 21+ age verification gate
- Products + blog/education + about/brand story + store location & hours
- Design: clean & premium (designer-led), white/black/red

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT Bearer admin auth (bcrypt). Seeds admin + 4 products + 3 blog posts idempotently on startup.
- Frontend: React 19 + Tailwind + framer-motion + lenis (smooth scroll) + react-fast-marquee. Bodoni Moda (display) + Manrope (UI) + JetBrains Mono (labels).
- Cart persisted in localStorage; admin token in localStorage.

## Implemented (2026-06)
- 21+ age gate (slides up on accept)
- Kinetic hero with masked line reveal + parallax gummy image
- **Dark "cosmos" theme**: near-black backdrop with animated starfield + red/violet nebula glow, cosmic hero image (floating red gummy cubes in space)
- **Partner-brand model**: products carry a `brand` field. Real products pulled from official brand sites — Moon Impact (trymoonimpact.com: Stellardust, Mission Brief, Drift), Trost (thetrost.com: Mello & Kosha gummies), Cannazo (cannazoindia.com: Uplift Vatis gummies), plus a house Rasta. Product images are hotlinked from brand CDNs.
- Partner Brands strip on home; Shop filters by brand; product detail shows brand attribution
- Domain updated to cosmoscannabis.in (contact hello@cosmoscannabis.in)
- Editorial marquee, product showcase (10 products), numbered manifesto, store location, journal
- Shop, product detail, cart, COD checkout, order confirmation, journal articles
- Admin: login, dashboard stats, orders table w/ status, product CRUD

## Notes
- "Cannoza" in original brief = real brand "Cannazo India" — used Cannazo to match real products.

## Implemented (2026-07)
- **Fixed homepage crash**: `hovered` state was undefined in Home.js "Anatomy of the Plant" section → whole site was a blank screen. Declared the useState; site restored.
- **Legal & Compliance page** (`/legal`): plain-language guide to Indian cannabis law (NDPS Act leaf/seed exemption), Vijaya as Ayurvedic medicine, AYUSH licensing + lab testing, prescription/medical guidance, and who can purchase (21+). Compliance badges + disclaimer. Linked from footer + checkout.
- **Prescription flow at checkout**: optional prescription file upload (PDF/jpg/png/webp, ≤10MB) to Emergent Object Storage; a REQUIRED declaration checkbox gates the Place Order button. Order stores `prescription_file_id` + `prescription_declared`.
- **Admin Rx visibility**: orders table has an "Rx" column — "View" (blob-fetch popup, admin-auth) for uploaded scripts, "Declared" for checkbox-only, "—" otherwise.
- **Fresh green-leaf emblem** (AI-generated): circular red ring + "COSMOS CANNABIS CURE / BANGALORE · EST 2026" text + emerald-green cannabis fan leaf. Background knocked out to transparent (PIL). Powers navbar, footer, and favicon (leaf-on-dark).
- **Footer compliance strip**: AYUSH-Licensed / Drugs & Cosmetics Act / Lab-Tested / 21+ badges.
- **Homepage products reduced** to 4 curated cards + "View All N Products" button → /shop.

### Backend additions (server.py)
- Emergent Object Storage helpers (init_storage/put_object/get_object) using EMERGENT_LLM_KEY.
- POST /api/prescriptions/upload (public, validates ext + size), GET /api/prescriptions/{id}/download (admin only).
- OrderCreate/Order models extended with prescription_file_id + prescription_declared.

## Implemented (2026-07, session 2)
- **Cinematic homepage** ("What If?" celestial): drifting parallax nebulae, floating rotating emblem with orbit rings, shooting stars, scroll parallax on hero text (Home.js + index.css keyframes).
- **Logo revised**: user preferred the previous celestial seal; regenerated it in site-red (#DF0000) with an emerald-green cannabis leaf among the moon/orbit/stars. Transparent PNG → navbar/footer/favicon.
- **COSMOS Passport** (standalone, no login): /passport create (name/phone/email/practitioner/issue-date/validity + prescription upload) → sealed passport card with QR seal; /passport/verify/:code PUBLIC verify page (bypasses age gate) showing holder, dates, Valid/Expiring/Expired status + sealed Rx image. Admin Passports tab + email reminder action.
- **Consultation-first order flow** (real business process): checkout no longer uploads a prescription; instead captures alternate number + Google Maps location (required for first orders / changed address, via /orders/precheck) + a required consultation-consent checkbox. Order → status `awaiting_consultation` + order-received email. Doctor (admin) opens Consult dialog, uploads prescription + notes → auto-issues the customer's COSMOS Passport, sets order `confirmed`, sends confirmation email.
- **Transactional emails** via Emergent-managed Resend: order-received, order-confirmed (with passport), passport-created, passport-reminder.
- **Admin readability fix** (dashboard now dark text on white).
- CRM = this admin panel (per user). Razorpay & WhatsApp deferred by user.

### Backend additions (server.py, session 2)
- Object storage + email helpers; POST/GET prescriptions; passports (create/verify/prescription-by-code/list/remind); _issue_passport shared helper.
- Orders: /orders/precheck, create_order → awaiting_consultation + is_first_order + email, POST /orders/{id}/consult (issues passport + confirms + email).

### Doctor Queue + Passport Renewals (2026-07)
- **Doctor Consult Queue**: default admin tab listing all `awaiting_consultation` orders as cards (oldest first) with one-tap **Call** (tel:), alt-number, map pin, FIRST badge, and **Consult & Confirm** (opens the consult dialog → issues passport + confirms order). "Pending Consults" stat added.
- **Passport Renewals**: backend background loop (`_renewal_reminder_loop`, every 12h, 60s after startup) + admin **Run Renewal Reminders** button (`POST /api/passports/run-reminders`). Emails holders whose passport expires within 7 days or is expired; idempotent per expiry via `renewal_reminded_for`.

### Regulatory logo (2026-07)
- Added the **official Ministry of AYUSH / Government of India emblem** (user-provided) on the Legal page ("Regulatory Framework" section) and footer, shown in a white badge with compliant wording: "Manufactured under the AYUSH regulatory framework … not an endorsement." Asset at /brand-assets/certifications/ministry-of-ayush.png.

### Design decision (resolved)
- Used tasteful **compliance badges** (icon + text) rather than reproducing official Ministry of AYUSH / Govt of India emblems, to avoid misuse of government insignia. User can request the actual emblem if they hold rights/permission.

## Notes (legacy)
- Partner product images are external hotlinks (brand CDNs); consider re-hosting for long-term robustness.
- Real Rasta products sourced from rastafariwellness.com (5 Relax & Reset gummies).
- Brand story pages at /brand/:slug (moon-impact, trost, cannazo, rasta) with ethos + full range.
- Razorpay online payments wired (create-order → checkout.js → verify signature). INACTIVE until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set in backend/.env — checkout shows COD + "Pay Online (coming soon)" until then. COD fully working.

## API Endpoints
- GET /api/products, GET /api/products/{slug}
- POST/PUT/DELETE /api/products (admin)
- POST /api/orders, GET /api/orders (admin), PATCH /api/orders/{id} (admin)
- GET /api/blog, GET /api/blog/{slug}
- POST /api/auth/login, GET /api/auth/me

## Admin Credentials
admin@cosmoscure.in / Cosmos@2026 (also in /app/memory/test_credentials.md)

## Backlog
- P1: Online payment (Razorpay/Stripe), customer accounts + order history, email confirmations (Resend)
- P1: Product image upload in admin (object storage)
- P2: Inventory decrement on order, discount codes, search
- P2: Blog authoring in admin, wishlists

## Update (2026-07) — Storefront Facade Image
- Replaced homepage "Visit us in Bangalore" storefront image (/brand-assets/store/storefront.jpg) with a new AI-generated facade based on user's OKKIO reference: kept deep-red organic architecture + capsule-arched windows, replaced OKKIO signage with clean premium "COSMOS" sign + green cannabis-leaf accent, removed central red column, cinematic cosmos night ambiance. Old asset backed up as storefront-okkio-backup.jpg. Verified via screenshot.

## Update (2026-07) — Location Interactivity
- Homepage Location section: address is now a Google Maps link, email a mailto: link, phone a tel: link (data-testids: location-address-link / location-email-link / location-phone-link).
- Storefront image now has a hover effect: subtle zoom (scale-105) + warm radial glow around the COSMOS seal + red glow ring/shadow.
