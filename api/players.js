
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

const teams = [
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

module.exports = async function (req, res) {
  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const url =
      "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("NFL player data source returned an error.");
    }

    const csv = await response.text();
    const records = parseCSV(csv);

    const players = records
      .map(player => ({
        id:
          player.gsis_id ||
          player.player_id ||
          player.espn_id ||
          "",
        name:
          player.display_name ||
          player.full_name ||
          player.player_name ||
          [player.first_name, player.last_name]
            .filter(Boolean)
            .join(" "),
        position: player.position || "",
        team:
          player.team ||
          player.team_abbr ||
          player.recent_team ||
          "Unknown",
        status: player.status || "Unknown",
        headshot: player.headshot_url || "",
        type: "player"
      }))
      .filter(player =>
        player.name &&
        ["QB", "RB", "WR", "TE", "K", "FB"].includes(player.position)
      );

    const defenses = teams.map(([code, name]) => ({
      id: `DST-${code}`,
      name: `${name} Defense`,
      position: "D/ST",
      team: code,
      teamName: name,
      status: "Active",
      headshot: "",
      type: "defense"
    }));

    const allPlayers = [
      ...players,
      ...defenses
    ];

    res.status(200).json({
      success: true,
      source: "nflverse",
      updatedAt: new Date().toISOString(),
      totalPlayers: allPlayers.length,
      playerCount: players.length,
      defenseCount: defenses.length,
      players: allPlayers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to import NFL players right now.",
      error: error.message
    });
  }
};
