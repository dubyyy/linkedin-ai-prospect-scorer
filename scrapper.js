const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const main = async () => {
  const element_text =
    "Founder & CEO at ScaleLabs • Helping SaaS companies scale • AI-driven ops • Book a free strategy session";

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);

  try {
    console.log("🔗 Opening LinkedIn login...");
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
    });

    // Login
    await page.type("#username", process.env.LINKEDIN_EMAIL, { delay: 100 });
    await page.type("#password", process.env.LINKEDIN_PASS, { delay: 100 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
      page.click('button[type="submit"]'),
    ]);

    console.log("✅ Logged in successfully");

    // Visit profile
    const profileUrl = "https://www.linkedin.com/in/amr-esam-moahmmed-12962a339/";
    console.log("🌐 Opening profile:", profileUrl);
    await page.goto(profileUrl, { waitUntil: "domcontentloaded" });

    await new Promise((r) => setTimeout(r, 7000));
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise((r) => setTimeout(r, 7000));

    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract about section text
    const aboutParent = $("#about").parent();
    const parentText = aboutParent.text().trim();

    const prompt = `
You are a prospect scoring assistant.

Your job is to analyze a prospect’s profile text and return a JSON score (1–10) based on how likely they are to be a good fit for outreach from our service.

Our service: We help SaaS founders and agencies scale their client acquisition with AI-driven systems.

Scoring rules:
- Ideal prospects are **SaaS founders**, **marketing agencies**, or **B2B service providers** who are potential clients — not competitors doing the same thing.
- Penalize people who:
  - Offer the same service (e.g., "we help SaaS scale with AI", "AI automation for agencies", "AI client acquisition", "AI ops", "growth automation", etc.)
  - Mention being "Founder of an AI automation agency" or similar.
- Reward prospects who:
  - Are SaaS founders, coaches, or agency owners struggling to scale.
  - Mention pain points like "want to grow", "need leads", "want more clients", "manual processes", "looking for systems".
- Consider CTAs like “book a call”, “DM me”, or “free strategy session” as signals of intent, but reduce the weight if it’s a competitor’s CTA.
- Give extra credit if they express **interest in growth**, **AI curiosity**, or **efficiency challenges**.

Output a JSON object in this format:
{
  "score": <1-10>,
  "confidence": <1-100>,
  "reason": "...",
  "matched_signals": {
    "roles": [],
    "company": [],
    "ai_keywords": [],
    "cta": [],
    "negative": []
  },
  "weight_breakdown": {
    "baseline": <number>,
    "role": <number>,
    "company": <number>,
    "ai": <number>,
    "intent_cta": <number>,
    "negative": <number>,
    "final_unclamped": <number>,
    "final_clamped": <number>
  },
  "top_3_outreach_touches": [
    "..."
  ]
}

Now evaluate. Input:
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
