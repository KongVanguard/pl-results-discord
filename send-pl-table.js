const axios = require("axios");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_TABLE_WEBHOOK_URL;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

if (!DISCORD_WEBHOOK_URL) throw new Error("Missing DISCORD_TABLE_WEBHOOK_URL");
if (!FOOTBALL_DATA_TOKEN) throw new Error("Missing FOOTBALL_DATA_TOKEN");

const STANDINGS_URL = "https://api.football-data.org/v4/competitions/PL/standings";
const MATCHES_URL = "https://api.football-data.org/v4/competitions/PL/matches";

function pad(text, length) {
  return String(text).padEnd(length, " ");
}

function formatApiDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
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

async function premierLeagueMatchPlayedRecently() {
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const dateFrom = formatApiDate(yesterday);
  const dateTo = formatApiDate(now);

  const response = await axios.get(
    `${MATCHES_URL}?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    {
      headers: {
        "X-Auth-Token": FOOTBALL_DATA_TOKEN
      }
    }
  );

  const matches = response.data.matches || [];

  return matches.some(match => match.status === "FINISHED");
}

async function main() {
  const matchPlayed = await premierLeagueMatchPlayedRecently();

  if (!matchPlayed) {
    console.log("No Premier League match played recently. Table will not be sent.");
    return;
  }

  const response = await axios.get(STANDINGS_URL, {
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

main().catch(error => {
  console.error(error);
  process.exit(1);
});
