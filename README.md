# Fantasy Fairness MVP

This is a browser-run interactive prototype for a 12-team, full-PPR, snake-draft public fantasy football product.

## Run it
Open `index.html` in a modern browser. No build step is required.

## Included demo workflows
- League dashboard and 12-team directory
- Snake draft simulator with player pool, draft board, and undo
- Trade submission and sample owner voting
- Integrity report submission and review status
- Basic audit/activity log
- Default PPR scoring preview

## Important limitations
This is a front-end MVP, not a production fantasy service. Data is held in browser memory and is not shared between users or persisted securely. The player list is illustrative, not an authoritative current NFL roster. The prototype does not include real authentication, public league discovery/join codes, cloud database, real-time scoring, NFL data licensing/feed, waiver processing, lineup validation, injury/news feeds, secure voting, notifications, payments, or production audit controls.

## Production architecture to build next
- Frontend: React / Next.js
- Backend API: Node.js / TypeScript
- Database: PostgreSQL
- Authentication: verified email + secure sessions, roles and league membership
- Live stats: licensed NFL data provider with stat corrections and scoring reconciliation
- Jobs/realtime: queue + WebSockets
- Security: league-level authorization, immutable audit events, rate limits, backups, abuse reporting, privacy controls
- Fairness: transparent review workflow with evidence, owner response, conflict-of-interest recusal, quorum, written decisions, and appeal path

Before launch, finalize roster slots, bench/IR, scoring, waiver rules, trade deadlines, voting quorum, playoff format, tie-breakers, public league moderation, and commissioner limits.
