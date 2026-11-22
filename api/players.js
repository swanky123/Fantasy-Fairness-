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
