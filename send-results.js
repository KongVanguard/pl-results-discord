const axios = require("axios");
const cheerio = require("cheerio");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PAGE_URL = "https://native-stats.org/competition/PL/";

function todayUK() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date()).replaceAll("-", "/");
}

function cleanTeamName(text) {
  return text
    .replace(/\(\d+\)/g, "")
    .replace(/\b[A-Z]{2,4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const { data } = await axios.get(PAGE_URL);
  const $ = cheerio.load(data);
  const text = $("body").text();

  const recentOnly = text.split("Recent matches:")[1].split("Next matches:")[0];

  const date = todayUK();

  const regex =
    /(\d{4}\/\d{2}\/\d{2}),\s*\d{1,2}h\d{2}\s+(.+?)\s+-\s+(.+?)\s+(\d+:\d+)/gs;

  const matches = [];
  let match;

  while ((match = regex.exec(recentOnly)) !== null) {
    const matchDate = match[1];

    if (matchDate !== date) continue;

    const home = cleanTeamName(match[2]);
    const away = cleanTeamName(match[3]);
    const score = match[4].replace(":", "–");

    matches.push(`${home} ${score} ${away}`);
  }

  let message;

  if (matches.length === 0) {
    message = `🏆 **Premier League Results — ${date}**\n\nNo Premier League results today.`;
  } else {
    message = `🏆 **Premier League Results — ${date}**\n\n${matches.join("\n")}`;
  }

  await axios.post(DISCORD_WEBHOOK_URL, {
    username: "Premier League Results",
    content: message
  });
}

main().catch(async error => {
  console.error(error);

  if (DISCORD_WEBHOOK_URL) {
    await axios.post(DISCORD_WEBHOOK_URL, {
      username: "Premier League Results",
      content: "⚠️ Could not fetch Premier League results today."
    });
  }

  process.exit(1);
});
