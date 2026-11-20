
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

  const headers = rows.shift().map(header => header.trim());

  return rows.map(cells => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (cells[index] || "").trim();
    });
    return item;
  });
}

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
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
        id: player.gsis_id || player.player_id || player.espn_id || "",
        name:
          player.display_name ||
          player.full_name ||
          player.player_name ||
          [player.first_name, player.last_name].filter(Boolean).join(" "),
        position: player.position || "",
        team:
          player.team ||
          player.team_abbr ||
          player.recent_team ||
          "Unknown",
        status: player.status || "Unknown",
        headshot: player.headshot_url || ""
      }))
      .filter(player =>
        player.name &&
        ["QB", "RB", "WR", "TE", "K", "FB"].includes(player.position)
      );

    res.status(200).json({
      success: true,
      source: "nflverse",
      updatedAt: new Date().toISOString(),
      totalPlayers: players.length,
      players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to import NFL players right now.",
      error: error.message
    });
  }
};
