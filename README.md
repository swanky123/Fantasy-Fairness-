Fantasy Fairness — Preview Release
This is a browser-based preview of Fantasy Fairness. It is suitable for testing the interface and local workflows, not for operating a real public fantasy league.
Project files
Keep this exact structure in your GitHub repository:
index.html
README.md
api/
  players.js
The players.js file must be inside the folder named api. Do not upload it to the repository root.
Deploy on Vercel
1. Replace the repository's index.html with the supplied index.html.
2. Create an api folder if it does not already exist, then add players.js inside it.
3. Replace README.md with this file.
4. Commit the changes to GitHub. Vercel should redeploy the connected project automatically.
5. Open the deployed site and visit Draft Room.
6. The player badge should show Live NFL data · N players. If it shows Sample players (live feed unavailable), open https://YOUR-SITE.vercel.app/api/players?health=1 and inspect the returned status.
Preview checks
- Draft Room: draft a player, refresh the page, confirm the pick remains, then undo it.
- Leagues: create a league and confirm its League ID appears in the directory and can be found in Join a League.
- Trade Review: submit a trade. The two teams in the trade are excluded from the voter dropdown. Each other team can cast one vote in this browser's demo.
- Integrity: file a report. Selecting Record decision requires a decision and a written rationale of at least 10 characters.
- Settings: save waiver rules and The Chosen One's name, refresh, and confirm the values remain.
What works in this preview
- Create and browse leagues saved in the current browser.
- Generate a League ID for a locally created league.
- Draft players from the player-data endpoint, including all 32 NFL D/ST entries.
- Save draft picks, trades, votes, reports, audit entries, waiver settings, and The Chosen One name in browser local storage.
- Exclude the two trading teams from the demo trade-voting list and prevent a team from voting twice on the same trade.
- Require a written rationale before an integrity report decision is recorded.
Important limitations — read before sharing publicly
- There are no user accounts, sign-in, identity verification, or server-side permissions.
- Data is stored in each visitor's own browser. Leagues, picks, votes, reports, and settings are not shared between different people, browsers, or devices.
- The Chosen One is a locally stored designation for this preview. It is not a secure role and does not prevent another visitor from changing their own browser data.
- Drafting, voting, reports, and audit history are client-side demonstrations, not tamper-proof league records.
- This preview does not include live fantasy scoring, lineup management, automated waiver processing, player transactions, schedule/matchup calculations, standings based on game results, playoff processing, payments, or notifications.
- The API supplies player/roster data from nflverse; it is not a live NFL statistics or fantasy-points feed. Data is cached for up to six hours when available.
- The API's in-memory cache and per-instance rate limit are best-effort protections. They are not a substitute for a shared database, distributed cache, or production abuse controls.
- Do not enter passwords, payment details, or sensitive personal information.
A real multi-user launch still requires authenticated accounts, a database with league-level access controls, server-side authorization for The Chosen One, reliable season/statistics data, server-side draft and waiver transactions, and production testing.
Player API
Endpoint: /api/players

Optional query parameters:
- position=QB|RB|WR|TE|K|D/ST
- team=KC
- q=search%20text
- limit=50
- offset=100
- defenses=0 to omit D/ST
- health=1 for a health/status response
The endpoint retries a failed source download three times, caches successful data for six hours, serves stale cached data when the source is unavailable, and returns HTTP 503 with a small sample list when no cached/live data is available. It also supports ETag/304 responses, CORS preflight, GET/HEAD only, and a best-effort per-instance limit of 120 requests per minute per IP
