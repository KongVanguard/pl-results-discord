const axios = require("axios");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_TABLE_WEBHOOK_URL;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

if (!DISCORD_WEBHOOK_URL) throw new Error("Missing DISCORD_TABLE_WEBHOOK_URL");
if (!FOOTBALL_DATA_TOKEN) throw new Error("Missing FOOTBALL_DATA_TOKEN");

const API_URL = "https://api.football-data.org/v4/competitions/PL/standings";

function pad(text, length) {
  return String(text).padEnd(length, " ");
}

function currentTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

async function sendMessage(message) {
  await axios.post(DISCORD_WEBHOOK_URL, {
    username: "Premier League Table",
    content: message
  });
}

async function main() {
  const response = await axios.get(API_URL, {
    headers: {
      "X-Auth-Token": FOOTBALL_DATA_TOKEN
    }
  });

  const standings = response.data.standings?.[0]?.table;

  if (!standings || standings.length === 0) {
    await sendMessage("⚠️ Premier League table checker ran, but no table data was found.");
    return;
  }

  let table = "";

  table += `${pad("#", 4)}${pad("Club", 22)}${pad("MP", 5)}${pad("W", 4)}${pad("D", 4)}${pad("L", 4)}${pad("GF", 5)}${pad("GA", 5)}${pad("GD", 6)}PTS\n`;
  table += "---------------------------------------------------------------\n";

  for (const row of standings) {
    table += `${pad(row.position, 4)}${pad(row.team.shortName, 22)}${pad(row.playedGames, 5)}${pad(row.won, 4)}${pad(row.draw, 4)}${pad(row.lost, 4)}${pad(row.goalsFor, 5)}${pad(row.goalsAgainst, 5)}${pad(row.goalDifference, 6)}${row.points}\n`;
  }

  const updated = currentTime();

  const message =
    `📊 **Premier League Table**\n` +
    `Updated: ${updated} (Vietnam Time)\n\n` +
    "```txt\n" +
    table +
    "```";

  await sendMessage(message);
}

main();
