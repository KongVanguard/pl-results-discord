const axios = require("axios");
const cheerio = require("cheerio");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_TABLE_WEBHOOK_URL;
const PAGE_URL = "https://native-stats.org/competition/PL/";

if (!DISCORD_WEBHOOK_URL) {
  throw new Error("Missing DISCORD_TABLE_WEBHOOK_URL");
}

async function sendMessage(message) {
  await axios.post(DISCORD_WEBHOOK_URL, {
    username: "Premier League Table",
    content: message
  });
}

function pad(text, length) {
  return String(text).padEnd(length, " ");
}

async function main() {
  const { data } = await axios.get(PAGE_URL);
  const $ = cheerio.load(data);

  const text = $("body").text().replace(/\s+/g, " ");

  const tableOnly = text.split("Table:")[1]?.split("Recent matches:")[0];

  if (!tableOnly) {
    await sendMessage("⚠️ Premier League table checker ran, but no table was found.");
    return;
  }

  const regex =
    /(\d+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+):(\d+)\s+(-?\d+)\s+(\d+)/g;

  const rows = [];
  let match;

  while ((match = regex.exec(tableOnly)) !== null) {
    rows.push({
      pos: match[1],
      team: match[2].trim(),
      mp: match[3],
      w: match[4],
      d: match[5],
      l: match[6],
      gf: match[7],
      ga: match[8],
      gd: match[9],
      pts: match[10]
    });
  }

  if (rows.length === 0) {
    await sendMessage("⚠️ Premier League table checker ran, but could not read the table.");
    return;
  }

  let table = "";
  table += `${pad("#", 4)}${pad("Club", 22)}${pad("MP", 5)}${pad("W", 4)}${pad("D", 4)}${pad("L", 4)}${pad("GF", 5)}${pad("GA", 5)}${pad("GD", 6)}PTS\n`;
  table += "---------------------------------------------------------------\n";

  for (const row of rows.slice(0, 20)) {
    table += `${pad(row.pos, 4)}${pad(row.team, 22)}${pad(row.mp, 5)}${pad(row.w, 4)}${pad(row.d, 4)}${pad(row.l, 4)}${pad(row.gf, 5)}${pad(row.ga, 5)}${pad(row.gd, 6)}${row.pts}\n`;
  }

  const message =
    `📊 **Premier League Table**\n\n` +
    "```txt\n" +
    table +
    "```";

  await sendMessage(message);
}

main();
