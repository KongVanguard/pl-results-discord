```js
const axios = require("axios");
const cheerio = require("cheerio");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PAGE_URL = process.env.COMPETITION_URL;
const COMPETITION_NAME = process.env.COMPETITION_NAME;

async function main() {
  const { data } = await axios.get(PAGE_URL);

  const $ = cheerio.load(data);

  const text = $("body").text();

  const recentOnly =
    text.split("Recent matches:")[1]?.split("Next matches:")[0];

  if (!recentOnly) {
    return;
  }

  const regex =
    /(\d{4}\/\d{2}\/\d{2}),\s*\d{1,2}h\d{2}\s+(.+?)\s+-\s+(.+?)\s+(\d+:\d+)/gs;

  const matches = [];

  let match;

  while ((match = regex.exec(recentOnly)) !== null) {
    const home = match[2].trim();
    const away = match[3].trim();
    const score = match[4].replace(":", "–");

    matches.push(`${home} ${score} ${away}`);
  }

  const latestMatches = matches.slice(0, 10);

  // ONLY POST IF MATCHES EXIST
  if (latestMatches.length === 0) {
    return;
  }

  const message =
    `🏆 **${COMPETITION_NAME} Results**\n\n` +
    latestMatches.join("\n");

  await axios.post(DISCORD_WEBHOOK_URL, {
    username: `${COMPETITION_NAME} Results`,
    content: message
  });
}

main();
```
