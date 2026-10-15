# Requirements (Phase 1) — HSC English Last Hour

## R1 — Premium crystal-glass landing page
Mobile-first, light background with subtle colorful gradients, translucent glass surfaces, tasteful accents, restrained; only reader, minimal controls, return-to-order, order form+summary.

## R2 — Dual/single page reader
Desktop: realistic open-book two-page spread with subtle spine/gutter. Mobile: single page with swipe + tap controls. Keyboard navigation, progress, preserved reading position.

## R3 — Modes
"Book Mode" (page flip) and "PDF Mode"; compact selector when both available. Zoom/fit, pinch-to-zoom, back-to-order.

## R4 — Content loading
Graceful unavailable state when no real content; no fabricated book content or sample/dev labels publicly. Dev preview fixtures used only in development for mechanics.

## R5 — Order
Name, mobile (BD), address only. COD summary, server validation, server pricing, duplicate-submission protection, preserve values on error, clear success after persistence.

## R6 — Backend
Secure server endpoint, Supabase `orders` persistence, `isPublished` check, ignores client prices. Supabase service-role client server-only.

## R7 — Rules & structure
Supabase RLS deny-by-default; storage bucket private/admin-only. Schema ready for future Admin.

## Acceptance
Lint/typecheck/test/build pass; reader mechanics correct; order validation works; 503 when unconfigured (no fake success). Public UI has no sample/dev labels.
