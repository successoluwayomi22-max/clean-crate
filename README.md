# Clean Crate — Food Essentials E-Commerce & Crate Booking Web App

> *"At Clean Crate, we are committed to bringing you quality food essentials, thoughtfully sourced and neatly packaged."*

## Key Features
- **Interactive 180-Frame Scroll & Cursor Canvas Stage**: Progressive WebP preloading (keyframes first, background streaming) with `requestAnimationFrame` lerp smoothing, cursor depth parallax, auto-play film toggle, and synced glassmorphism ingredient & brand narrative overlays.
- **Full E-Commerce & Scheduled Slot Booking**: Catalogue for Ijebu & Yellow Garri, Kuli-Kuli, Fermented Iru, Washed Smoked Ponmo, Kiln-Dried Catfish, and curated Crates with multi-weight variants, persistent Crate basket drawer, 14-day capacity-managed booking calendar, and WhatsApp concierge (`+234 902 842 1436`).
- **Atomic Server-Side Integrity & Security**: Built-in SQLite (`node:sqlite`) transactional inventory and slot reservation (`BEGIN IMMEDIATE`), server-authoritative pricing, `scrypt` password hashing, HMAC-signed `HttpOnly` admin sessions, same-origin CSRF guards, sliding-window rate limiting, Zod validation, and strict CSP/HSTS/anti-clickjacking headers.
- **SEO & Legal Compliance**: Dynamic `robots.txt` and `sitemap.xml`, Open Graph + JSON-LD (`GroceryStore` and `Product` schema), Privacy Policy, Refund & Perishables Policy, Terms of Service, Cookie Policy, and interactive granular Cookie Consent banner.

## Local Development

```bash
npm install
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

### Admin Portal (`/admin`)
- On first startup/seed without `ADMIN_SEED_PASSWORD` set, a random one-time local admin credential is generated safely into `data/.admin-bootstrap.txt` (gitignored).
- Set `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, and `SESSION_SECRET` in `.env.local` for production.

### Regenerating or Swapping Video Frames
- Regenerate the built-in 180-frame Garri preparation sequence:
  ```bash
  npm run frames:build
  ```
- Or extract frames directly from any external `.mp4` / Veo clip (`ffmpeg` required on `PATH`):
  ```bash
  npm run frames:extract -- path/to/video.mp4
  ```

