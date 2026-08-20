import { siteUrl } from "@/lib/seo";

export const DEFAULT_INDEXNOW_KEY =
  process.env.INDEXNOW_KEY || "48c0817bbbf14ceca4506c116c4c9540";

/**
 * Tự động gửi URL tới IndexNow (Bing, Yandex, Seznam, Naver...)
 */
export async function submitToIndexNow(urls: string[]): Promise<{ success: boolean; status?: number; error?: string }> {
  if (!urls.length) return { success: true };

  try {
    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tramdocmotchut.vn";
    const host = new URL(rawSiteUrl).host;
    const key = DEFAULT_INDEXNOW_KEY;
    const keyLocation = siteUrl(`/${key}.txt`);

    const payload = {
      host,
      key,
      keyLocation,
      urlList: urls,
    };

    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 200 || res.status === 202) {
      console.log(`[IndexNow] Ping thành công ${urls.length} URL (Status: ${res.status})`);
      return { success: true, status: res.status };
    }

    const errText = await res.text().catch(() => "");
    console.warn(`[IndexNow] Phản hồi không thành công: ${res.status} - ${errText}`);
    return { success: false, status: res.status, error: errText };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[IndexNow] Lỗi khi ping IndexNow:", message);
    return { success: false, error: message };
  }
}

/**
 * Tạo Google Service Account JWT token nếu đã cung cấp credentials
 */
async function getGoogleIndexingAccessToken(): Promise<string | null> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Chuẩn hóa private key (xử lý newline escape)
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claimSet = {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encoder = new TextEncoder();
    const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
    const b64ClaimSet = Buffer.from(JSON.stringify(claimSet)).toString("base64url");
    const signatureInput = `${b64Header}.${b64ClaimSet}`;

    const pemContents = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");
    const binaryKey = Buffer.from(pemContents, "base64");

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(signatureInput)
    );

    const b64Signature = Buffer.from(signature).toString("base64url");
    const jwt = `${signatureInput}.${b64Signature}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.warn("[Google Indexing] Không lấy được Access Token:", err);
      return null;
    }

    const data = await tokenRes.json();
    return data.access_token || null;
  } catch (error) {
    console.error("[Google Indexing] Lỗi khi tạo JWT token:", error);
    return null;
  }
}

/**
 * Tự động gửi URL tới Google Indexing API
 */
export async function submitToGoogleIndexing(urls: string[]): Promise<{ success: boolean; notifiedCount: number }> {
  if (!urls.length) return { success: true, notifiedCount: 0 };

  const accessToken = await getGoogleIndexingAccessToken();
  if (!accessToken) {
    console.info("[Google Indexing] Chưa cấu hình GOOGLE_SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY. Bỏ qua ping Google.");
    return { success: false, notifiedCount: 0 };
  }

  let successCount = 0;
  for (const url of urls) {
    try {
      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url,
          type: "URL_UPDATED",
        }),
      });

      if (res.ok) {
        successCount++;
        console.log(`[Google Indexing] Đã ping URL_UPDATED thành công: ${url}`);
      } else {
        const text = await res.text();
        console.warn(`[Google Indexing] Ping thất bại cho ${url}:`, text);
      }
    } catch (err) {
      console.error(`[Google Indexing] Lỗi khi ping ${url}:`, err);
    }
  }

  return { success: successCount > 0, notifiedCount: successCount };
}

/**
 * Tự động thông báo đồng thời cho cả IndexNow và Google Indexing API
 * Hàm này chạy background (non-blocking) để không làm chậm thao tác của người dùng.
 */
export function notifySearchEngines(urls: string[]) {
  if (!urls || urls.length === 0) return;

  const validUrls = urls
    .map((u) => (u.startsWith("http") ? u : siteUrl(u)))
    .filter(Boolean);

  Promise.allSettled([
    submitToIndexNow(validUrls),
    submitToGoogleIndexing(validUrls),
  ]).then(() => {
    console.log(`[Search Engine Auto-Ping] Hoàn tất ping cho ${validUrls.length} URL.`);
  });
}
