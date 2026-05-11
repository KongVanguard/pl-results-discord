const axios = require("axios");
const cheerio = require("cheerio");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PAGE_URL = process.env.COMPETITION_URL;
const COMPETITION_NAME = process.env.COMPETITION_NAME;
const MANUAL_RUN = process.env.MANUAL_RUN === "true";

if (!DISCORD_WEBHOOK_URL) throw new Error("Missing DISCORD_WEBHOOK_URL");
if (!PAGE_URL) throw new Error("Missing COMPETITION_URL");
if (!COMPETITION_NAME) throw new Error("Missing COMPETITION_NAME");

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(new Date())
    .replaceAll("-", "/");
}

async function sendMessage(message) {
  await axios.post(DISCORD_WEBHOOK_URL, {
    username: `${COMPETITION_NAME} Results`,
    content: message
  });
}

async function main() {
  const today = todayDate();

  const { data } = await axios.get(PAGE_URL);
  const $ = cheerio.load(data);

  const text = $("body").text().replace(/\s+/g, " ");
  const recentOnly = text.split("Recent matches:")[1]?.split("Next matches:")[0];

  if (!recentOnly) {
    if (MANUAL_RUN) {
      await sendMessage(`✅ ${COMPETITION_NAME} checker ran successfully.\nNo recent match section found.`);
    }
    return;
  }

  const regex =
    /(\d{4}\/\d{2}\/\d{2}),\s*\d{1,2}h\d{2}\s+(.+?)\s+-\s+(.+?)\s+(\d+:\d+)/g;

  const matches = [];
  let match;

  while ((match = regex.exec(recentOnly)) !== null) {
    const date = match[1];

    if (date !== today) continue;

    const home = match[2].trim();
    const away = match[3].trim();
    const score = match[4].replace(":", "–");

    matches.push(`• ${home} **${score}** ${away}`);
  }

  if (matches.length === 0) {
    if (MANUAL_RUN) {
      await sendMessage(`✅ ${COMPETITION_NAME} checker ran successfully.\nNo matches found today (${today}).`);
    }
    return;
  }

  const message =
    `🏆 **${COMPETITION_NAME} Results — ${today}**\n\n` +
    matches.join("\n");

  await sendMessage(message);
}

main();
