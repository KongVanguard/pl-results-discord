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

async function main() {
  const { data } = await axios.get(PAGE_URL);
  const $ = cheerio.load(data);

  const text = $("body").text().replace(/\s+/g, " ");

  const tableOnly =
    text.split("Table:")[1]?.split("Recent matches:")[0];

  if (!tableOnly) {
    await sendMessage("⚠️ Premier League table checker ran, but no table was found.");
    return;
  }

  const regex =
    /(\d+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+):(\d+)\s+(-?\d+)\s+(\d+)/g;

  const rows = [];
  let match;

  while ((match = regex.exec(tableOnly)) !== null) {
    const position = match[1];
    const team = match[2].trim();
    const played = match[3];
    const wins = match[4];
    const draws = match[5];
    const losses = match[6];
    const goalsFor = match[7];
    const goalsAgainst = match[8];
    const goalDifference = match[9];
    const points = match[10];

    rows.push(
      `${position}. **${team}** — ${points} pts | P${played} W${wins} D${draws} L${losses} | GD ${goalDifference} | ${goalsFor}:${goalsAgainst}`
    );
  }

  if (rows.length === 0) {
    await sendMessage("⚠️ Premier League table checker ran, but could not read the table.");
    return;
  }

  const message =
    `📊 **Premier League Table**\n\n` +
    rows.slice(0, 20).join("\n");

  await sendMessage(message);
}

main();
