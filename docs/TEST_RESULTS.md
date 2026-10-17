# Rebuild verification — 17 October 2026

Actual checks executed in the Linux cloud environment with Python 3.12.14, Node 24.19.0 and system Chromium.

| Check | Result |
|---|---|
| API/business/database suite | **18 passed, 0 failed, 0 skipped** in 12.32 seconds. `docs/test-results.xml`. |
| Browser workflows | **4 passed, 0 failed, 0 skipped**; final run 7.0 seconds. `docs/browser-test-results.json`. |
| TypeScript and production Vite build | Passed. Local fonts, images and compiled React served by FastAPI. |
| Exact `start.sh` launcher | Passed dependency installation, frozen npm install, build, initialization, server start and HTTP health/SPAs on alternate port 8001. |
| Shell syntax | `bash -n` for the Mac wrapper, launcher and cloud setup script passed. |
| Data initialization | Seed and slot refresh repeatability tested; existing bookings survive database initialization and a new authenticated client. |
| Concurrent booking | Eight requests for one slot: exactly one 201 response and seven 409 conflicts. |

API tests cover auth/duplicate registration/hash/cookie/logout, role and origin restrictions, booking persistence, unavailable/past slots, failed payments, cancellation/refund/rebooking, atomic reschedule conflicts, ownership/two-hour cutoff, doctor schedule overlap/remove/reactivate/completion, concurrent booking, Excel round-trip and booking synchronization, dry-run updates, new inactive accounts, invalid FK/duplicate/formula/role/overlap/payment rollback, upload limits, formula-safe export, admin management/session revocation, profiles, notifications, filtering and seed repeatability.

Browser tests cover desktop home/search/profile; mobile navigation and overflow; patient payment failure/retry, confirmation, reschedule, cancellation after refresh and mobile logout; doctor slot publication/removal/profile; administrator workbook download/validation/preview/import, reports and account search. Screenshots are in `screenshots/`.

The first browser run detected mobile dashboard overflow and existing-user workbook import failure. Both were fixed and all four workflows passed afterward. The final screenshots use reduced motion to avoid capturing an animation halfway through.

One upstream Starlette/AnyIO deprecation warning was reported by pytest. The first sandboxed pytest attempt stalled before test completion; it was terminated and the complete suite was rerun successfully with the environment's supported execution permission. No test assertions were removed or skipped.

Mac-specific and Windows-specific OS behavior were not executed on this Linux host. The shared Bash launcher was exercised. No live external payment, email or SMS integration, production deployment, sustained 200-user workload, uptime SLA, complete accessibility audit, or restoration into a fresh cloud task is claimed. Source publication/download verification is recorded separately at delivery time.
