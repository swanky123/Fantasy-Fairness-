# Fantasy Fairness — Preview Release

## Files (put them in your project exactly like this)
```
index.html        the app (~1,270 lines)
api/players.js    player-data endpoint (~610 lines) — must be inside a folder named "api"
README.md         this file
```
Delete any old copies such as `players (1).js` / `players (3).js`.

## Deploy
1. Replace `index.html` and add `api/players.js`. Push / redeploy on Vercel.
2. Open the site → Draft Room. The badge should say "Live NFL data · N players". If it says "Sample players (live feed unavailable)", open `/api/players?health=1` on your site to see why.

## 5-minute check before announcing
1. Draft Room: pick a player, refresh (pick must remain), undo it.
2. Leagues: create a league, find it under Join a League by its League ID.
3. Trade Review: submit a trade, vote from several teams; the two trading teams must not be in the voter list.
4. Integrity: "Record decision" must refuse without a written rationale.
5. Settings: save waiver rules and a manager name, refresh, confirm they persist.

## What this release is (say so publicly)
Everything is saved in the visitor's own browser. Leagues, drafts, trades, votes and reports are not shared between people or devices, and there are no accounts. Not included: live scoring, lineups, waiver processing, payments, notifications.

## How the code is organized
Both files keep your original code unchanged. New code sits in a clearly marked "LAUNCH ADDITIONS" block at the bottom of each file. In `index.html` it re-declares functions with the same names so the improved versions take effect; in `players.js` it wraps the original data builder. To revert any change, delete that part of the block.

## `/api/players` reference
With no parameters it returns the full list (what the app uses). Optional parameters:
`position=QB|RB|WR|TE|K|D/ST` · `team=KC` · `q=search text` · `limit=50` · `offset=100` · `defenses=0` · `health=1`

Behavior: retries a failed download 3 times, caches for 6 hours, serves older cached data if the source goes down, returns HTTP 503 with a small built-in sample if there is nothing cached (the app then shows "Sample players"), supports ETag/304, answers CORS preflight, rejects non-GET methods, and limits each IP to 120 requests per minute.
