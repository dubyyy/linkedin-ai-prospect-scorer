// scraper.js
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const COOKIE_PATH = "./cookies.json";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const main = async () => {
  // Ensure cookies exist
  if (!fs.existsSync(COOKIE_PATH)) {
    console.error("❌ Missing cookies.json — run `node login.js` first.");
    process.exit(1);
  }

  const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH));
  const browser = await puppeteer.launch({ headless: true }); // headless by default
  const page = await browser.newPage();
  await page.setCookie(...cookies);

  const element_text =
    "Founder & CEO at ScaleLabs • Helping SaaS companies scale • AI-driven ops • Book a free strategy session";

  try {
    const profileUrl = "https://www.linkedin.com/in/amr-esam-moahmmed-12962a339/";
    console.log("🌐 Opening profile:", profileUrl);
    await page.goto(profileUrl, { waitUntil: "domcontentloaded" });

    await new Promise((r) => setTimeout(r, 7000));
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise((r) => setTimeout(r, 7000));

    const html = await page.content();
    const $ = cheerio.load(html);
    const aboutParent = $("#about").parent();
    const parentText = aboutParent.text().trim();

    const prompt = `
You are a prospect analysis assistant.

You’ll analyze a prospect’s LinkedIn profile text and return:
1. A numeric score from 1–100 (where 100 = perfect fit, 1 = irrelevant).
2. A short outreach context (6–7 sentences total).

Our offer: We help SaaS founders and agencies scale client acquisition using AI-driven systems.

Scoring rules:
- Ideal prospects are **SaaS founders**, **marketing agencies**, or **B2B service providers** who could benefit from automation or AI client acquisition.
- Penalize if they already sell similar services (e.g., "we help SaaS scale with AI", "automation for agencies", etc.).
- Reward if they mention pain points like growth, leads, systems, scaling, or efficiency.
- CTAs like “book a call” or “free strategy session” may show intent — but if it’s part of a competitor’s offer, flag it.
- Output should help a human instantly decide outreach suitability and tone.

Output format (strictly this format):
Score: <1–100>
Context: <6–7 sentence summary of who they are, key signals, red flags, and one line outreach idea>

Now analyze:
element_text: """${element_text}"""
element_value: """${parentText}"""
`;


    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);

    console.log("\n🔍 Prospect Scoring Result:");
    console.log(result.response.text());
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await browser.close();
    console.log("🧹 Browser closed");
  }
};

main().catch(console.error);
