// login.js
import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // manual login
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto("https://www.linkedin.com/login", { waitUntil: "networkidle2" });

  console.log("🟢 Please log in manually...");
  console.log("Once logged in completely, press ENTER here in the terminal.");

  process.stdin.resume();
  process.stdin.on("data", async () => {
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    console.log(`✅ Cookies saved to ${COOKIE_PATH}`);

    await browser.close();
    process.exit(0);
  });
})();
