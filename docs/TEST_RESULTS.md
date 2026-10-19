# Verification — 19 October 2026

The comedy clinic update was tested in the Linux cloud environment with Python 3.12.14, Node 24.19.0 and system Chromium.

| Check | Result |
|---|---|
| API/business/database suite | **20 passed, 0 failed, 0 skipped**, 14.11 seconds. `docs/test-results.xml`. |
| Browser workflows | **4 passed, 0 failed, 0 skipped**, 8.5 seconds. `docs/browser-test-results.json`. |
| TypeScript and production Vite build | Passed with all six bundled character portraits. |
| Existing database upgrade | All original demo profiles updated; existing bookings, slots, payments, patient records, notifications, sessions and credential fields matched before/after. |
| Cast migration regression tests | Original identities upgrade once; later profile edits and custom names survive; production/disabled demo mode is respected. |
| Visual review | Doctor listing, homepage and desktop screenshots inspected; automated mobile navigation and overflow checks passed. |

Browser checks verify each of the six character names and successful loading of its image, plus search/profile, simulated failed-payment retry, successful booking, confirmation, rescheduling, cancellation after refresh, mobile logout, doctor slot publication/removal/profile, and administrator Excel download/preview/import, reports and account search. Booking tests select future dates far enough ahead to exercise the two-hour change policy reliably on an existing installation.

The API suite additionally covers password hashing, cookies and logout, roles and ownership, past/unavailable slots, refunds, rescheduling atomicity, doctor schedule overlap/completion, eight concurrent requests for one slot (one winner), workbook integrity and safe formulas, inactive imported accounts, administrative controls, notifications, filtering and seed repeatability.

Updated screenshots are in `screenshots/`. The generated image assets are illustrated character fan art, documented in `docs/ASSETS.md`. The old realistic clinician contact sheet is removed.

The shared Bash launcher and cloud setup script were exercised during the 17 October rebuild and are unchanged by this update. Native Mac and Windows execution, a sustained 200-user workload, production uptime, real payments/email/SMS and a complete accessibility audit are not claimed. Pytest reports one upstream Starlette/AnyIO deprecation warning.
