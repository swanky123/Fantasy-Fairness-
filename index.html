function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"' && quoted && text[i + 1] === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);

  if (!rows.length) return [];

  const headers = rows.shift().map(header =>
    header.trim().replace(/^\uFEFF/, "")
  );

  return rows.map(cells => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (cells[index] || "").trim();
    });
    return item;
  });
}

const TEAMS = [
  ["ARI", "Arizona Cardinals"],
  ["ATL", "Atlanta Falcons"],
  ["BAL", "Baltimore Ravens"],
  ["BUF", "Buffalo Bills"],
  ["CAR", "Carolina Panthers"],
  ["CHI", "Chicago Bears"],
  ["CIN", "Cincinnati Bengals"],
  ["CLE", "Cleveland Browns"],
  ["DAL", "Dallas Cowboys"],
  ["DEN", "Denver Broncos"],
  ["DET", "Detroit Lions"],
  ["GB", "Green Bay Packers"],
  ["HOU", "Houston Texans"],
  ["IND", "Indianapolis Colts"],
  ["JAX", "Jacksonville Jaguars"],
  ["KC", "Kansas City Chiefs"],
  ["LAC", "Los Angeles Chargers"],
  ["LAR", "Los Angeles Rams"],
  ["LV", "Las Vegas Raiders"],
  ["MIA", "Miami Dolphins"],
  ["MIN", "Minnesota Vikings"],
  ["NE", "New England Patriots"],
  ["NO", "New Orleans Saints"],
  ["NYG", "New York Giants"],
  ["NYJ", "New York Jets"],
  ["PHI", "Philadelphia Eagles"],
  ["PIT", "Pittsburgh Steelers"],
  ["SEA", "Seattle Seahawks"],
  ["SF", "San Francisco 49ers"],
  ["TB", "Tampa Bay Buccaneers"],
  ["TEN", "Tennessee Titans"],
  ["WAS", "Washington Commanders"]
];

// nflverse sometimes uses older or alternate team codes
const TEAM_FIX = { LA: "LAR", STL: "LAR", OAK: "LV", SD: "LAC", WSH: "WAS", JAC: "JAX", ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU" };
const POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "FB"]);
const SOURCE_URL = "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";
const CACHE_MS = 6 * 60 * 60 * 1000;

let cache = { at: 0, body: null };

async function buildPayload() {
  const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("NFL player data source returned " + response.status);

  const records = parseCSV(await response.text());
  const now = new Date();
  const season = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();
  const seen = new Set();

  const players = [];
  for (const p of records) {
    const position = p.position === "FB" ? "RB" : p.position; // FBs draft as RBs
    const team = (TEAM_FIX[p.latest_team] || p.latest_team || p.team || "").toUpperCase();
    const id = p.gsis_id || (p.espn_id ? "espn-" + p.espn_id : "");
    const name = p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ");
    const lastSeason = Number(p.last_season || 0);

    if (!id || !name || !POSITIONS.has(p.position) || !team) continue;
    if (p.status === "RET") continue;                // retired
    if (lastSeason && lastSeason < season - 1) continue; // not seen recently
    if (seen.has(id)) continue;
    seen.add(id);

    players.push({
      id, name, position, team,
      status: p.status || "Unknown",
      headshot: p.headshot || p.headshot_url || "",
      type: "player"
    });
  }

  const defenses = TEAMS.map(([code, name]) => ({
    id: "DST-" + code, name: name + " Defense", position: "D/ST",
    team: code, teamName: name, status: "Active", headshot: "", type: "defense"
  }));

  const all = [...players, ...defenses];
  return {
    success: true, source: "nflverse", updatedAt: now.toISOString(),
    totalPlayers: all.length, playerCount: players.length, defenseCount: defenses.length,
    players: all
  };
}

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!cache.body || Date.now() - cache.at > CACHE_MS) {
      cache = { at: Date.now(), body: await buildPayload() };
    }
    res.status(200).json(cache.body);
  } catch (error) {
    // Serve stale data if we have it rather than breaking the draft room
    if (cache.body) return res.status(200).json({ ...cache.body, stale: true });
    res.status(500).json({ success: false, message: "Unable to import NFL players right now.", error: error.message });
  }
};

/* =====================================================================
   LAUNCH ADDITIONS
   Everything above this block is the original code, unchanged.
   The block below wraps the original data builder with retries,
   an offline fallback, query filtering, caching headers, a health
   check and basic abuse protection. The original handler is kept in
   `baseHandler` and the original builder (buildPayload) is reused.
   ===================================================================== */

const crypto = require("crypto");

/* ---------- settings ---------- */
const API_VERSION = 2;
const MAX_LIMIT = 5000;
const RATE_LIMIT_PER_MINUTE = 120;
const FETCH_ATTEMPTS = 3;
const VALID_POSITIONS = ["QB", "RB", "WR", "TE", "K", "D/ST"];

/* ---------- team metadata (added to every player so the app can group by division) ---------- */
const TEAM_INFO = {
  BUF: { conference: "AFC", division: "East" },
  MIA: { conference: "AFC", division: "East" },
  NE:  { conference: "AFC", division: "East" },
  NYJ: { conference: "AFC", division: "East" },
  BAL: { conference: "AFC", division: "North" },
  CIN: { conference: "AFC", division: "North" },
  CLE: { conference: "AFC", division: "North" },
  PIT: { conference: "AFC", division: "North" },
  HOU: { conference: "AFC", division: "South" },
  IND: { conference: "AFC", division: "South" },
  JAX: { conference: "AFC", division: "South" },
  TEN: { conference: "AFC", division: "South" },
  DEN: { conference: "AFC", division: "West" },
  KC:  { conference: "AFC", division: "West" },
  LAC: { conference: "AFC", division: "West" },
  LV:  { conference: "AFC", division: "West" },
  DAL: { conference: "NFC", division: "East" },
  NYG: { conference: "NFC", division: "East" },
  PHI: { conference: "NFC", division: "East" },
  WAS: { conference: "NFC", division: "East" },
  CHI: { conference: "NFC", division: "North" },
  DET: { conference: "NFC", division: "North" },
  GB:  { conference: "NFC", division: "North" },
  MIN: { conference: "NFC", division: "North" },
  ATL: { conference: "NFC", division: "South" },
  CAR: { conference: "NFC", division: "South" },
  NO:  { conference: "NFC", division: "South" },
  TB:  { conference: "NFC", division: "South" },
  ARI: { conference: "NFC", division: "West" },
  LAR: { conference: "NFC", division: "West" },
  SEA: { conference: "NFC", division: "West" },
  SF:  { conference: "NFC", division: "West" }
};

/* ---------- offline fallback: used only if nflverse is unreachable AND nothing is cached ---------- */
const FALLBACK_PLAYERS = [
  ["Josh Allen", "QB", "BUF"],
  ["Lamar Jackson", "QB", "BAL"],
  ["Jalen Hurts", "QB", "PHI"],
  ["Patrick Mahomes", "QB", "KC"],
  ["Joe Burrow", "QB", "CIN"],
  ["Jayden Daniels", "QB", "WAS"],
  ["Christian McCaffrey", "RB", "SF"],
  ["Bijan Robinson", "RB", "ATL"],
  ["Jahmyr Gibbs", "RB", "DET"],
  ["Saquon Barkley", "RB", "PHI"],
  ["Jonathan Taylor", "RB", "IND"],
  ["Derrick Henry", "RB", "BAL"],
  ["Breece Hall", "RB", "NYJ"],
  ["De'Von Achane", "RB", "MIA"],
  ["Ja'Marr Chase", "WR", "CIN"],
  ["Justin Jefferson", "WR", "MIN"],
  ["CeeDee Lamb", "WR", "DAL"],
  ["Amon-Ra St. Brown", "WR", "DET"],
  ["Tyreek Hill", "WR", "MIA"],
  ["Puka Nacua", "WR", "LAR"],
  ["A.J. Brown", "WR", "PHI"],
  ["Malik Nabers", "WR", "NYG"],
  ["Drake London", "WR", "ATL"],
  ["Garrett Wilson", "WR", "NYJ"],
  ["Travis Kelce", "TE", "KC"],
  ["Sam LaPorta", "TE", "DET"],
  ["Trey McBride", "TE", "ARI"],
  ["Mark Andrews", "TE", "BAL"],
  ["Harrison Butker", "K", "KC"],
  ["Justin Tucker", "K", "BAL"]
];

/* ---------- small helpers ---------- */

/** Structured one-line logging (shows up in Vercel's function logs). */
function log(level, message, extra) {
  try {
    console.log(JSON.stringify(Object.assign(
      { level: level, message: message, at: new Date().toISOString() },
      extra || {}
    )));
  } catch (e) {
    // logging must never break a request
  }
}

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/** "dst", "DEF", "d/st" -> "D/ST"; returns "" when the value is not a draftable position. */
function normalizePosition(value) {
  const v = String(value || "").trim().toUpperCase();
  if (v === "DST" || v === "DEF" || v === "D/ST") return "D/ST";
  if (v === "FB") return "RB";
  return VALID_POSITIONS.indexOf(v) >= 0 ? v : "";
}

/** "la", "WSH", "jac" -> current team code; returns "" when unknown. */
function normalizeTeamCode(value) {
  const v = String(value || "").trim().toUpperCase();
  const fixed = TEAM_FIX[v] || v;
  return TEAM_INFO[fixed] ? fixed : "";
}

/** A player is only served if it has everything the draft room needs. */
function isValidPlayer(player) {
  return !!(
    player &&
    player.id &&
    player.name &&
    VALID_POSITIONS.indexOf(player.position) >= 0 &&
    TEAM_INFO[player.team]
  );
}

/* ---------- data building: retry, decorate, fallback ---------- */

/** Calls the original buildPayload() with backoff, so one flaky download does not fail the request. */
async function buildPayloadWithRetry() {
  let lastError;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      return await buildPayload();
    } catch (error) {
      lastError = error;
      log("warn", "player source fetch failed", { attempt: attempt, message: error.message });
      if (attempt < FETCH_ATTEMPTS) await wait(300 * attempt * attempt);
    }
  }

  throw lastError;
}

/** Adds conference/division, drops anything invalid, and reports how many were dropped. */
function decoratePayload(payload) {
  const kept = [];
  let dropped = 0;

  payload.players.forEach(function (player) {
    if (!isValidPlayer(player)) {
      dropped++;
      return;
    }
    const info = TEAM_INFO[player.team];
    kept.push(Object.assign({}, player, {
      conference: info.conference,
      division: info.division
    }));
  });

  return Object.assign({}, payload, {
    apiVersion: API_VERSION,
    droppedInvalid: dropped,
    players: kept
  });
}

/** Small built-in list so the endpoint always returns something well-formed. */
function buildFallbackPayload() {
  const players = FALLBACK_PLAYERS.map(function (p, i) {
    return {
      id: "fallback-" + (i + 1),
      name: p[0],
      position: p[1],
      team: p[2],
      status: "Unknown",
      headshot: "",
      type: "player"
    };
  });

  const defenses = TEAMS.map(function (entry) {
    return {
      id: "DST-" + entry[0],
      name: entry[1] + " Defense",
      position: "D/ST",
      team: entry[0],
      teamName: entry[1],
      status: "Active",
      headshot: "",
      type: "defense"
    };
  });

  const all = players.concat(defenses);

  return {
    success: false,
    fallback: true,
    source: "built-in-sample",
    message: "Live NFL data is unavailable; this is a small built-in sample.",
    updatedAt: new Date().toISOString(),
    totalPlayers: all.length,
    playerCount: players.length,
    defenseCount: defenses.length,
    players: all
  };
}

let inflightRequest = null;

// After a failed download, wait this long before trying again so a source outage
// does not make every visitor wait through retries (and does not hammer the source).
const FAILURE_COOLDOWN_MS = 60 * 1000;
let lastFailureAt = 0;

/**
 * Returns { body, state } where state is one of:
 *   fresh     - served from cache
 *   refreshed - downloaded just now
 *   stale     - download failed, older cached data served
 *   fallback  - download failed and nothing cached, built-in sample served
 * Concurrent requests share one download instead of each starting their own.
 */
async function getPayload() {
  const isFresh = cache.body && Date.now() - cache.at <= CACHE_MS;
  if (isFresh) return { body: cache.body, state: "fresh" };

  const coolingDown = lastFailureAt && Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS;
  if (!inflightRequest && coolingDown) {
    if (cache.body) return { body: cache.body, state: "stale" };
    return { body: buildFallbackPayload(), state: "fallback" };
  }

  if (!inflightRequest) {
    inflightRequest = buildPayloadWithRetry()
      .then(function (body) {
        cache = { at: Date.now(), body: body };
        lastFailureAt = 0;
        return body;
      })
      .finally(function () {
        inflightRequest = null;
      });
  }

  try {
    const body = await inflightRequest;
    return { body: body, state: "refreshed" };
  } catch (error) {
    lastFailureAt = Date.now();
    log("error", "serving without live data", { message: error.message, hasCache: !!cache.body });
    if (cache.body) return { body: cache.body, state: "stale", error: error };
    return { body: buildFallbackPayload(), state: "fallback", error: error };
  }
}

/* ---------- query handling ---------- */

/**
 * Supported query parameters (all optional; with none, the full list is returned):
 *   position=QB|RB|WR|TE|K|D/ST   team=KC   q=search text
 *   limit=50   offset=100   defenses=0 (exclude D/ST)   health=1
 */
function parseQuery(req) {
  let query = req.query;

  if (!query || typeof query !== "object") {
    try {
      query = Object.fromEntries(new URL(req.url || "/", "http://localhost").searchParams);
    } catch (e) {
      query = {};
    }
  }

  function pick(key) {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  }

  const limitRaw = parseInt(pick("limit"), 10);
  const offsetRaw = parseInt(pick("offset"), 10);
  const defensesRaw = String(pick("defenses") || "").toLowerCase();
  const healthRaw = String(pick("health") || "").toLowerCase();

  return {
    position: normalizePosition(pick("position")),
    team: normalizeTeamCode(pick("team")),
    search: String(pick("q") || "").trim().toLowerCase().slice(0, 60),
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : 0,
    offset: Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0,
    includeDefenses: !(defensesRaw === "0" || defensesRaw === "false"),
    health: healthRaw === "1" || healthRaw === "true"
  };
}

function filterPlayers(players, options) {
  return players.filter(function (player) {
    if (!options.includeDefenses && player.position === "D/ST") return false;
    if (options.position && player.position !== options.position) return false;
    if (options.team && player.team !== options.team) return false;
    if (options.search) {
      const haystack = (player.name + " " + player.position + " " + player.team).toLowerCase();
      if (haystack.indexOf(options.search) < 0) return false;
    }
    return true;
  });
}

function summarize(players) {
  const byPosition = {};
  const byTeam = {};

  players.forEach(function (player) {
    byPosition[player.position] = (byPosition[player.position] || 0) + 1;
    byTeam[player.team] = (byTeam[player.team] || 0) + 1;
  });

  return { byPosition: byPosition, byTeam: byTeam };
}

/** Weak ETag so browsers/CDNs can revalidate cheaply with If-None-Match. */
function makeEtag(body, options, count) {
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify([body.updatedAt, body.totalPlayers, count, options]))
    .digest("hex")
    .slice(0, 16);
  return 'W/"' + hash + '"';
}

function healthReport(result) {
  const body = result.body;
  return {
    success: true,
    status: result.state === "fallback" ? "degraded" : "ok",
    state: result.state,
    apiVersion: API_VERSION,
    source: body.source,
    updatedAt: body.updatedAt,
    cacheAgeSeconds: cache.at ? Math.round((Date.now() - cache.at) / 1000) : null,
    totalPlayers: body.totalPlayers,
    playerCount: body.playerCount,
    defenseCount: body.defenseCount
  };
}

/* ---------- basic abuse protection (best-effort, per server instance) ---------- */
const rateBuckets = new Map();

function clientIp(req) {
  const forwarded = String((req.headers && req.headers["x-forwarded-for"]) || "").split(",")[0].trim();
  return forwarded || (req.socket && req.socket.remoteAddress) || "unknown";
}

function isRateLimited(req) {
  const minute = Math.floor(Date.now() / 60000);
  const ip = clientIp(req);
  const bucket = rateBuckets.get(ip);

  if (rateBuckets.size > 5000) rateBuckets.clear();

  if (!bucket || bucket.minute !== minute) {
    rateBuckets.set(ip, { minute: minute, count: 1 });
    return false;
  }

  bucket.count++;
  return bucket.count > RATE_LIMIT_PER_MINUTE;
}

/* ---------- the improved handler ---------- */
const baseHandler = module.exports; // the original handler, kept for reference

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, If-None-Match");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  if (isRateLimited(req)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ success: false, message: "Too many requests. Please wait a minute." });
  }

  try {
    const options = parseQuery(req);
    const result = await getPayload();

    if (options.health) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(healthReport(result));
    }

    // Built-in sample: tell clients clearly that this is not live data.
    if (result.state === "fallback") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Data-State", "fallback");
      return res.status(503).json(Object.assign({}, result.body, { state: "fallback" }));
    }

    const payload = decoratePayload(result.body);
    const matched = filterPlayers(payload.players, options);
    let page = matched;

    if (options.offset) page = page.slice(options.offset);
    if (options.limit) page = page.slice(0, options.limit);

    const etag = makeEtag(payload, options, page.length);
    res.setHeader("ETag", etag);
    res.setHeader("X-Data-State", result.state);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    if (req.headers && req.headers["if-none-match"] === etag) return res.status(304).end();

    const response = Object.assign({}, payload, {
      state: result.state,
      matched: matched.length,
      returned: page.length,
      offset: options.offset,
      limit: options.limit || null,
      summary: summarize(matched),
      players: page
    });

    if (result.state === "stale") response.stale = true;

    return res.status(200).json(response);
  } catch (error) {
    log("error", "unhandled error in players handler", { message: error.message });
    return res.status(500).json({
      success: false,
      message: "Unable to import NFL players right now.",
      error: error.message
    });
  }
};

// Exposed so the helpers can be unit-tested without starting a server.
module.exports._internals = {
  parseQuery: parseQuery,
  filterPlayers: filterPlayers,
  summarize: summarize,
  normalizePosition: normalizePosition,
  normalizeTeamCode: normalizeTeamCode,
  isValidPlayer: isValidPlayer,
  baseHandler: baseHandler
};
