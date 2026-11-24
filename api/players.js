
"use strict";

const crypto = require("crypto");

const SOURCE_URL = "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";
const CACHE_MS = 6 * 60 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 60 * 1000;
const FETCH_ATTEMPTS = 3;
const RATE_LIMIT_PER_MINUTE = 120;
const MAX_LIMIT = 5000;

const TEAMS = [
  ["ARI", "Arizona Cardinals"], ["ATL", "Atlanta Falcons"], ["BAL", "Baltimore Ravens"], ["BUF", "Buffalo Bills"],
  ["CAR", "Carolina Panthers"], ["CHI", "Chicago Bears"], ["CIN", "Cincinnati Bengals"], ["CLE", "Cleveland Browns"],
  ["DAL", "Dallas Cowboys"], ["DEN", "Denver Broncos"], ["DET", "Detroit Lions"], ["GB", "Green Bay Packers"],
  ["HOU", "Houston Texans"], ["IND", "Indianapolis Colts"], ["JAX", "Jacksonville Jaguars"], ["KC", "Kansas City Chiefs"],
  ["LAC", "Los Angeles Chargers"], ["LAR", "Los Angeles Rams"], ["LV", "Las Vegas Raiders"], ["MIA", "Miami Dolphins"],
  ["MIN", "Minnesota Vikings"], ["NE", "New England Patriots"], ["NO", "New Orleans Saints"], ["NYG", "New York Giants"],
  ["NYJ", "New York Jets"], ["PHI", "Philadelphia Eagles"], ["PIT", "Pittsburgh Steelers"], ["SEA", "Seattle Seahawks"],
  ["SF", "San Francisco 49ers"], ["TB", "Tampa Bay Buccaneers"], ["TEN", "Tennessee Titans"], ["WAS", "Washington Commanders"]
];

const TEAM_FIX = {
  LA: "LAR", STL: "LAR", OAK: "LV", SD: "LAC", WSH: "WAS",
  JAC: "JAX", ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU"
};

const TEAM_INFO = {
  BUF:["AFC","East"], MIA:["AFC","East"], NE:["AFC","East"], NYJ:["AFC","East"],
  BAL:["AFC","North"], CIN:["AFC","North"], CLE:["AFC","North"], PIT:["AFC","North"],
  HOU:["AFC","South"], IND:["AFC","South"], JAX:["AFC","South"], TEN:["AFC","South"],
  DEN:["AFC","West"], KC:["AFC","West"], LAC:["AFC","West"], LV:["AFC","West"],
  DAL:["NFC","East"], NYG:["NFC","East"], PHI:["NFC","East"], WAS:["NFC","East"],
  CHI:["NFC","North"], DET:["NFC","North"], GB:["NFC","North"], MIN:["NFC","North"],
  ATL:["NFC","South"], CAR:["NFC","South"], NO:["NFC","South"], TB:["NFC","South"],
  ARI:["NFC","West"], LAR:["NFC","West"], SEA:["NFC","West"], SF:["NFC","West"]
};

const VALID_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "D/ST"]);

const FALLBACK_PLAYERS = [
  ["Josh Allen","QB","BUF"],["Lamar Jackson","QB","BAL"],["Jalen Hurts","QB","PHI"],["Patrick Mahomes","QB","KC"],
  ["Joe Burrow","QB","CIN"],["Jayden Daniels","QB","WAS"],["Christian McCaffrey","RB","SF"],["Bijan Robinson","RB","ATL"],
  ["Jahmyr Gibbs","RB","DET"],["Saquon Barkley","RB","PHI"],["Jonathan Taylor","RB","IND"],["Derrick Henry","RB","BAL"],
  ["Breece Hall","RB","NYJ"],["De'Von Achane","RB","MIA"],["Ja'Marr Chase","WR","CIN"],["Justin Jefferson","WR","MIN"],
  ["CeeDee Lamb","WR","DAL"],["Amon-Ra St. Brown","WR","DET"],["Tyreek Hill","WR","MIA"],["Puka Nacua","WR","LAR"],
  ["A.J. Brown","WR","PHI"],["Malik Nabers","WR","NYG"],["Drake London","WR","ATL"],["Garrett Wilson","WR","NYJ"],
  ["Travis Kelce","TE","KC"],["Sam LaPorta","TE","DET"],["Trey McBride","TE","ARI"],["Mark Andrews","TE","BAL"],
  ["Harrison Butker","K","KC"],["Justin Tucker","K","BAL"]
];

let cache = { at: 0, body: null };
let inflight = null;
let lastFailureAt = 0;
const rateBuckets = new Map();

function parseCSV(input) {
  const rows = [];
  let row = [], value = "", quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"' && quoted && input[i + 1] === '"') {
      value += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(value);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += ch;
    }
  }

  row.push(value);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);
  if (!rows.length) return [];

  const headers = rows.shift().map(h => h.trim().replace(/^\uFEFF/, ""));

  return rows.map(cells => {
    const item = {};
    headers.forEach((h, i) => {
      item[h] = (cells[i] || "").trim();
    });
    return item;
  });
}

function normalizeTeam(value) {
  const code = String(value || "").trim().toUpperCase();
  const fixed = TEAM_FIX[code] || code;
  return TEAM_INFO[fixed] ? fixed : "";
}

function buildFallback() {
  const players = FALLBACK_PLAYERS.map((p, i) => ({
    id: "sample-" + (i + 1),
    name: p[0],
    position: p[1],
    team: p[2],
    status: "Sample",
    headshot: "",
    type: "player",
    conference: TEAM_INFO[p[2]][0],
    division: TEAM_INFO[p[2]][1]
  }));

  const defenses = TEAMS.map(([code, name]) => ({
    id: "DST-" + code,
    name: name + " Defense",
    position: "D/ST",
    team: code,
    teamName: name,
    status: "Active",
    headshot: "",
    type: "defense",
    conference: TEAM_INFO[code][0],
    division: TEAM_INFO[code][1]
  }));

  return {
    success: false,
    fallback: true,
    source: "built-in-sample",
    message: "Live NFL roster data is unavailable; this is a small sample list.",
    updatedAt: new Date().toISOString(),
    totalPlayers: players.length + defenses.length,
    playerCount: players.length,
    defenseCount: defenses.length,
    players: players.concat(defenses)
  };
}

async function buildPayload() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response;

  try {
    response = await fetch(SOURCE_URL, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error("NFL player data source returned HTTP " + response.status);
  }

  const records = parseCSV(await response.text());
  const now = new Date();
  const season = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();
  const seen = new Set();
  const players = [];

  for (const p of records) {
    const rawPosition = String(p.position || "").toUpperCase();
    const position = rawPosition === "FB" ? "RB" : rawPosition;
    const team = normalizeTeam(p.latest_team || p.team);
    const id = p.gsis_id || (p.espn_id ? "espn-" + p.espn_id : "");
    const name = p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ");
    const lastSeason = Number(p.last_season || 0);

    if (!id || !name || !VALID_POSITIONS.has(position) || position === "D/ST" || !team) continue;
    if (p.status === "RET" || (lastSeason && lastSeason < season - 1) || seen.has(id)) continue;

    seen.add(id);

    players.push({
      id: String(id),
      name,
      position,
      team,
      status: p.status || "Unknown",
      headshot: p.headshot || p.headshot_url || "",
      type: "player",
      conference: TEAM_INFO[team][0],
      division: TEAM_INFO[team][1]
    });
  }

  const defenses = TEAMS.map(([code, name]) => ({
    id: "DST-" + code,
    name: name + " Defense",
    position: "D/ST",
    team: code,
    teamName: name,
    status: "Active",
    headshot: "",
    type: "defense",
    conference: TEAM_INFO[code][0],
    division: TEAM_INFO[code][1]
  }));

  const all = players.concat(defenses);

  return {
    success: true,
    source: "nflverse",
    updatedAt: now.toISOString(),
    totalPlayers: all.length,
    playerCount: players.length,
    defenseCount: defenses.length,
    players: all
  };
}

async function refreshWithRetries() {
  let lastError;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      return await buildPayload();
    } catch (error) {
      lastError = error;
      console.warn("Fantasy Fairness player data attempt " + attempt + " failed:", error.message);

      if (attempt < FETCH_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 300 * attempt * attempt));
      }
    }
  }

  throw lastError;
}

async function getPayload() {
  if (cache.body && Date.now() - cache.at <= CACHE_MS) {
    return { body: cache.body, state: "fresh" };
  }

  if (!inflight && lastFailureAt && Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS) {
    return cache.body
      ? { body: cache.body, state: "stale" }
      : { body: buildFallback(), state: "fallback" };
  }

  if (!inflight) {
    inflight = refreshWithRetries()
      .then(body => {
        cache = { at: Date.now(), body };
        lastFailureAt = 0;
        return body;
      })
      .finally(() => {
        inflight = null;
      });
  }

  try {
    return { body: await inflight, state: "refreshed" };
  } catch (error) {
    lastFailureAt = Date.now();
    console.error("Fantasy Fairness player data refresh failed:", error.message);

    return cache.body
      ? { body: cache.body, state: "stale", error }
      : { body: buildFallback(), state: "fallback", error };
  }
}

function getQuery(req) {
  if (req.query && typeof req.query === "object") return req.query;

  try {
    return Object.fromEntries(
      new URL(req.url || "/", "http://localhost").searchParams.entries()
    );
  } catch (_) {
    return {};
  }
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePosition(value) {
  const p = String(value || "").trim().toUpperCase();

  if (["DST", "DEF", "D/ST"].includes(p)) return "D/ST";
  if (p === "FB") return "RB";

  return VALID_POSITIONS.has(p) ? p : "";
}

function parseOptions(req) {
  const q = getQuery(req);
  const limit = parseInt(first(q.limit), 10);
  const offset = parseInt(first(q.offset), 10);

  return {
    position: normalizePosition(first(q.position)),
    team: normalizeTeam(first(q.team)),
    search: String(first(q.q) || "").trim().toLowerCase().slice(0, 60),
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : 0,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    defenses: !["0", "false"].includes(String(first(q.defenses) || "").toLowerCase()),
    health: ["1", "true"].includes(String(first(q.health) || "").toLowerCase())
  };
}

function clientIp(req) {
  const forwarded = String(
    (req.headers && req.headers["x-forwarded-for"]) || ""
  ).split(",")[0].trim();

  return forwarded || (req.socket && req.socket.remoteAddress) || "unknown";
}

function rateLimited(req) {
  const minute = Math.floor(Date.now() / 60000);
  const ip = clientIp(req);

  if (rateBuckets.size > 5000) rateBuckets.clear();

  let bucket = rateBuckets.get(ip);

  if (!bucket || bucket.minute !== minute) {
    rateBuckets.set(ip, { minute, count: 1 });
    return false;
  }

  bucket.count++;
  return bucket.count > RATE_LIMIT_PER_MINUTE;
}

function etagFor(body, options, count) {
  const hash = crypto.createHash("sha1")
    .update(JSON.stringify([body.updatedAt, body.totalPlayers, count, options]))
    .digest("hex")
    .slice(0, 16);

  return 'W/"' + hash + '"';
}

module.exports = async function playersHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, If-None-Match");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });
  }

  if (rateLimited(req)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a minute."
    });
  }

  try {
    const options = parseOptions(req);
    const result = await getPayload();

    if (options.health) {
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).json({
        success: true,
        status: result.state === "fallback" ? "degraded" : "ok",
        state: result.state,
        source: result.body.source,
        updatedAt: result.body.updatedAt,
        cacheAgeSeconds: cache.at
          ? Math.round((Date.now() - cache.at) / 1000)
          : null,
        totalPlayers: result.body.totalPlayers,
        playerCount: result.body.playerCount,
        defenseCount: result.body.defenseCount
      });
    }

    if (result.state === "fallback") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Data-State", "fallback");

      return res.status(503).json(
        Object.assign({}, result.body, { state: "fallback" })
      );
    }

    let matched = result.body.players.filter(p =>
      (options.defenses || p.position !== "D/ST") &&
      (!options.position || p.position === options.position) &&
      (!options.team || p.team === options.team) &&
      (!options.search ||
        (p.name + " " + p.position + " " + p.team)
          .toLowerCase()
          .includes(options.search))
    );

    const page = matched.slice(
      options.offset,
      options.limit ? options.offset + options.limit : undefined
    );

    const etag = etagFor(result.body, options, page.length);

    res.setHeader("ETag", etag);
    res.setHeader("X-Data-State", result.state);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    if (req.headers && req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    const byPosition = {};
    const byTeam = {};

    matched.forEach(p => {
      byPosition[p.position] = (byPosition[p.position] || 0) + 1;
      byTeam[p.team] = (byTeam[p.team] || 0) + 1;
    });

    const output = Object.assign({}, result.body, {
      apiVersion: 2,
      state: result.state,
      matched: matched.length,
      returned: page.length,
      offset: options.offset,
      limit: options.limit || null,
      summary: { byPosition, byTeam },
      players: page
    });

    if (result.state === "stale") output.stale = true;

    if (req.method === "HEAD") {
      return res.status(200).end();
    }

    return res.status(200).json(output);

  } catch (error) {
    console.error("Fantasy Fairness players API error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to import NFL players right now.",
      error: error.message
    });
  }
};
