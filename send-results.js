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

    const home = match[2].trim();
    const away = match[3].trim();

    const [homeGoals, awayGoals] = match[4].split(":").map(Number);
    const score = `${homeGoals}–${awayGoals}`;

    let homeEmoji = "⚪";
    let awayEmoji = "⚪";

    if (homeGoals > awayGoals) {
      homeEmoji = "🟢";
      awayEmoji = "🔴";
    } else if (awayGoals > homeGoals) {
      homeEmoji = "🔴";
      awayEmoji = "🟢";
    }

    if (!matchesByDate[date]) matchesByDate[date] = [];

    matchesByDate[date].push(
      `${homeEmoji} **${home}** ${score} **${away}** ${awayEmoji}`
    );
  }

  const sections = Object.keys(matchesByDate)
    .sort()
    .reverse()
    .map(date => {
      return `📅 **${date}**\n${matchesByDate[date].join("\n")}`;
    });

  if (sections.length === 0) {
    if (MANUAL_RUN) {
      await sendMessage(
        `✅ ${COMPETITION_NAME} checker ran successfully.\nNo matches found for ${validDates.join(" or ")}.`
      );
    }
    return;
  }

  const message =
    `🏆 **${COMPETITION_NAME} Results**\n\n` +
    sections.join("\n\n");

  await sendMessage(message);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
