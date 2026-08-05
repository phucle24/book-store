import {
  ArticleStatus,
  BookStatus,
  PrismaClient,
} from "@prisma/client";
import type { AffiliateLink } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();
const prisma = new PrismaClient();

type CheckLevel = "pass" | "warn" | "fail";

type Check = {
  level: CheckLevel;
  label: string;
  detail?: string;
};

const checks: Check[] = [];

function loadDotEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = unquote(rawValue);
  }
}

function unquote(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function add(level: CheckLevel, label: string, detail?: string) {
  checks.push({ level, label, detail });
}

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function requireEnv(name: string) {
  const value = envValue(name);
  if (!value) {
    add("fail", `${name} is missing`);
    return "";
  }

  add("pass", `${name} is set`);
  return value;
}

function requireSecret(name: string, minLength: number, blockedValues: string[]) {
  const value = requireEnv(name);
  if (!value) return;

  if (value.length < minLength || blockedValues.includes(value)) {
    add("fail", `${name} is not production-safe`, `Use at least ${minLength} random characters.`);
    return;
  }

  add("pass", `${name} looks production-safe`);
}

async function main() {
  console.log("Running production release checks...\n");

  requireEnv("DATABASE_URL");
  requireEnv("DIRECT_URL");
  requireEnv("ADMIN_EMAIL");
  requireSecret("ADMIN_PASSWORD", 16, ["change_me", "password", "admin"]);
  requireSecret("CRON_SECRET", 32, ["change_me", "change_me_to_a_long_random_value"]);

  const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL");
  if (siteUrl) {
    if (siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1")) {
      add("fail", "NEXT_PUBLIC_SITE_URL still points to localhost");
    } else if (!siteUrl.startsWith("https://")) {
      add("fail", "NEXT_PUBLIC_SITE_URL must use HTTPS in production");
    } else {
      add("pass", "NEXT_PUBLIC_SITE_URL uses a production HTTPS URL");
    }
  }

  requireEnv("NEXT_PUBLIC_SITE_NAME");

  if (!envValue("GOOGLE_SITE_VERIFICATION")) {
    add("warn", "GOOGLE_SITE_VERIFICATION is missing", "Set this before Search Console verify.");
  } else {
    add("pass", "GOOGLE_SITE_VERIFICATION is set");
  }

  if (!envValue("DEEPSEEK_API_KEY")) {
    add("warn", "DEEPSEEK_API_KEY is missing", "Admin AI will show a friendly error.");
  } else {
    add("pass", "DEEPSEEK_API_KEY is set");
  }

  if (!envValue("TAVILY_API_KEY")) {
    add("warn", "TAVILY_API_KEY is missing", "AI Autopilot research cannot run.");
  } else {
    add("pass", "TAVILY_API_KEY is set");
  }

  await checkDatabaseContent();
  printChecks();

  const failCount = checks.filter((check) => check.level === "fail").length;
  await prisma.$disconnect();

  if (failCount > 0) {
    process.exit(1);
  }
}

async function checkDatabaseContent() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    add("pass", "Database connection works");
  } catch (error) {
    add("fail", "Database connection failed", error instanceof Error ? error.message : String(error));
    return;
  }

  const [publishedArticles, activeBooks, activeAffiliateLinks] = await Promise.all([
    prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
    prisma.book.count({ where: { status: BookStatus.ACTIVE } }),
    prisma.affiliateLink.count({ where: { isActive: true } }),
  ]);

  if (publishedArticles >= 5) {
    add("pass", "Published article count is launch-ready", `${publishedArticles} published`);
  } else {
    add("fail", "Not enough published articles", `${publishedArticles} found, expected at least 5.`);
  }

  if (activeBooks >= 5) {
    add("pass", "Active book count is launch-ready", `${activeBooks} active`);
  } else {
    add("fail", "Not enough active books", `${activeBooks} found, expected at least 5.`);
  }

  if (activeAffiliateLinks > 0) {
    add("pass", "Active affiliate links exist", `${activeAffiliateLinks} active`);
  } else {
    add("warn", "No active affiliate links", "CTA buttons will not convert.");
  }

  const missingSeo = await prisma.article.count({
    where: {
      status: ArticleStatus.PUBLISHED,
      OR: [
        { seoTitle: null },
        { seoTitle: "" },
        { seoDescription: null },
        { seoDescription: "" },
        { focusKeyword: null },
        { focusKeyword: "" },
      ],
    },
  });

  if (missingSeo === 0) {
    add("pass", "Published articles have SEO fields");
  } else {
    add("fail", "Published articles missing SEO fields", `${missingSeo} article(s) need review.`);
  }

  const missingAuthor = await prisma.article.count({
    where: {
      status: ArticleStatus.PUBLISHED,
      OR: [
        { authorName: null },
        { authorName: "" },
        { authorSlug: null },
        { authorSlug: "" },
      ],
    },
  });

  if (missingAuthor === 0) {
    add("pass", "Published articles have author bylines");
  } else {
    add("fail", "Published articles missing author bylines", `${missingAuthor} article(s) need review.`);
  }

  await checkAffiliateDestinations();
}

async function checkAffiliateDestinations() {
  const links = await prisma.affiliateLink.findMany({
    where: { isActive: true },
    select: {
      id: true,
      label: true,
      destinationUrl: true,
      trackingSlug: true,
    },
    take: 50,
  });

  const invalidUrls = links.filter((link) => !isValidUrl(link.destinationUrl));
  if (invalidUrls.length) {
    add("fail", "Some active affiliate URLs are invalid", labelLinks(invalidUrls));
  } else if (links.length) {
    add("pass", "Active affiliate URLs are valid");
  }

  const demoLinks = links.filter((link) => isDemoAffiliateUrl(link.destinationUrl));
  if (demoLinks.length) {
    add("warn", "Some affiliate URLs look like demo/search links", labelLinks(demoLinks));
  }
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isDemoAffiliateUrl(value: string) {
  const lower = value.toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("example.com") ||
    lower.includes("shopee.vn/search?keyword")
  );
}

function labelLinks(
  links: Pick<AffiliateLink, "label" | "trackingSlug">[],
) {
  return links.map((link) => `${link.label} (${link.trackingSlug})`).join(", ");
}

function printChecks() {
  for (const check of checks) {
    const prefix = check.level === "pass" ? "PASS" : check.level === "warn" ? "WARN" : "FAIL";
    const detail = check.detail ? ` - ${check.detail}` : "";
    console.log(`[${prefix}] ${check.label}${detail}`);
  }

  const summary = checks.reduce<Record<CheckLevel, number>>(
    (acc, check) => {
      acc[check.level] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 },
  );

  console.log(
    `\nSummary: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`,
  );
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
