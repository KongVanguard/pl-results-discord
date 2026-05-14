const axios = require("axios");
const cheerio = require("cheerio");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PAGE_URL = process.env.COMPETITION_URL;
const COMPETITION_NAME = process.env.COMPETITION_NAME;
const MANUAL_RUN = process.env.MANUAL_RUN === "true";

if (!DISCORD_WEBHOOK_URL) throw new Error("Missing DISCORD_WEBHOOK_URL");
if (!PAGE_URL) throw new Error("Missing COMPETITION_URL");
if (!COMPETITION_NAME) throw new Error("Missing COMPETITION_NAME");

function formatDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(date)
    .replaceAll("-", "/");
}

function datesToCheck() {
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  return [formatDate(now), formatDate(yesterday)];
}

function cleanTeamName(name) {
  let cleaned = name
    .replace(/\(\d+\)/g, "")
    .replace(/\b[A-Z]{2,4}\b$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ");

  for (let i = 1; i <= Math.floor(words.length / 2); i++) {
    const firstPart = words.slice(0, i).join(" ");
    const secondPart = words.slice(i, i * 2).join(" ");

    if (firstPart === secondPart) {
      cleaned = firstPart;
      break;
    }
  }

  cleaned = cleaned
    .replace(/\bFC\b/g, "")
    .replace(/\bAFC\b/g, "")
    .replace(/\bCF\b/g, "")
    .replace(/\bSC\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

async function sendMessage(message) {
  const response = await axios.post(DISCORD_WEBHOOK_URL, {
    username: `${COMPETITION_NAME} Results`,
    content: message
  });

  console.log("Discord response:", response.status);
}

async function main() {
  const validDates = datesToCheck();

  console.log("Checking dates:", validDates.join(", "));
  console.log("Competition:", COMPETITION_NAME);
  console.log("URL:", PAGE_URL);

  const { data } = await axios.get(PAGE_URL);
  const $ = cheerio.load(data);

  const text = $("body").text().replace(/\s+/g, " ");
  const recentOnly = text.split("Recent matches:")[1]?.split("Next matches:")[0];

  if (!recentOnly) {
    if (MANUAL_RUN) {
      await sendMessage(
        `✅ ${COMPETITION_NAME} checker ran successfully.\nNo recent match section found.`
      );
    }
    return;
  }

  const regex =
    /(\d{4}\/\d{2}\/\d{2}),\s*\d{1,2}h\d{2}\s+(.+?)\s+-\s+(.+?)\s+(\d+:\d+)/g;

  const matchesByDate = {};
  let match;

  while ((match = regex.exec(recentOnly)) !== null) {
    const date = match[1];

    if (!validDates.includes(date)) continue;

    const home = cleanTeamName(match[2]);
    const away = cleanTeamName(match[3]);

    const [homeGoals, awayGoals] = match[4].split(":").map(Number);

    const homeEmoji =
      homeGoals > awayGoals ? "🟢" : homeGoals < awayGoals ? "🔴" : "⚪";

    const awayEmoji =
      awayGoals > homeGoals ? "🟢" : awayGoals < homeGoals ? "🔴" : "⚪";

    if (!matchesByDate[date]) matchesByDate[date] = [];

    matchesByDate[date].push(
      `📅 ${date}\n${homeEmoji} ${home} [${homeGoals} – ${awayGoals}] ${away} ${awayEmoji}`
    );
  }

  const dates = Object.keys(matchesByDate).sort().reverse();

  if (dates.length === 0) {
    if (MANUAL_RUN) {
      await sendMessage(
        `✅ ${COMPETITION_NAME} checker ran successfully.\nNo matches found for ${validDates.join(" or ")}.`
      );
    }
    return;
  }

  const message =
    `🏆 **${COMPETITION_NAME} Results**\n\n` +
    dates
      .map(date => matchesByDate[date].join("\n\n"))
      .join("\n\n");

  await sendMessage(message);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
