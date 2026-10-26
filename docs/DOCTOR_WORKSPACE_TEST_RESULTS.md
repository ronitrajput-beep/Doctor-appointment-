# Doctor workspace verification — 26 October 2026

Actual validation on Linux with Python 3.12.14, Node 24.19.0 and Chromium. No new native Mac/Windows or public hosting claim is made.

| Check | Final outcome |
|---|---|
| Backend regression suite | **41 passed, 0 failed, 0 skipped** in 38.56 seconds; `doctor-workspace-test-results.xml`. Includes 26 prior tests and 15 new clinical/workspace tests. |
| Browser suite | **9 passed, 0 failed, 0 skipped** in 28.6 seconds; `browser-test-results.json`. Includes 4 existing workflows and 5 new clinical/doctor workflows. |
| TypeScript / production build | Passed after the medical-history label correction. |
| New doctor account checks | All six names map to distinct existing accounts/profiles; patient booking and global admin requests are denied. |
| Clinical privacy | Patient edits are self-scoped. Doctor history APIs and exports include only patients with a confirmed/completed consultation. A cancelled-only relationship does not grant access. Cancellation revocation, unauthorized edits, unknown IDs, cross-patient reads, and formula-safe exports checked. |
| Leave and slots | Public availability, API booking, slot publishing and workbook imports respect leave; existing confirmed appointments prevent conflicting leave; adjacent periods, overlaps, blocked-slot restoration and ownership checked. |
| Persistence and credentials | Restart preserves new history/leave and password hashes. Upgrading a database without the new tables preserves all original records. Private doctor login guide is generated with mode 0600 and never resets a password or prints an obsolete one. |
| Browser interactions | Patient history save/reload, doctor portal/portrait, medical-history view, direct XLSX download, role redirect, leave hide/restore, and new-booking alert without page reload verified. Existing patient booking/retry/reschedule/cancel, doctor profile/slots, and admin Excel/reports/accounts passed. |
| Mobile / visual review | Desktop doctor overview and mobile export layout inspected. Mobile history, doctor downloads and schedule overflow checks passed. New screenshots are in `screenshots/`. |

An initial browser check found that nested textarea default text interfered with exact label lookup after refresh. Fields now use explicit label/ID associations, and the save/reload check passed. Two initial API test expectations were corrected: workbook column lookup now uses its header and the leave/import test creates a new valid booking instead of being rejected earlier by the existing immutable-cancellation rule. Assertions were preserved and the complete suite passed afterward.

Pytest reports one upstream Starlette/AnyIO deprecation warning. Browser notifications are polled every 15 seconds; Excel downloads are fresh snapshots. The new medical history is separate from the existing seven-sheet administrator import schema; scoped doctor exports include it. No real patient data, installation passwords, private database or session tokens are published in these artifacts.
