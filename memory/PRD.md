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
- Partner product images are external hotlinks (brand CDNs); consider re-hosting for long-term robustness.

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
