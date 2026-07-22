/**
 * POST /api/ai
 * Server-side AI proxy — API key NEVER leaves the server.
 *
 * Env (Vercel):
 *   AI_API_KEY     required
 *   AI_BASE_URL    default https://siaptuan.my.id/v1
 *   AI_MODEL       default combo1
 *   SESSION_SECRET required (same as /api/auth) — request must include Bearer session
 *   AI_REQUIRE_AUTH  default "true" — set "false" only for emergency debug
 *
 * Body: OpenAI-compatible chat payload { model?, messages, temperature?, max_tokens? }
 * Server overwrites Authorization with AI_API_KEY.
 * Client may suggest model; if empty, AI_MODEL is used.
 */

const crypto = require("crypto");

const ALLOWED_PREFIXES = [
  "https://siaptuan.my.id/v1",
  "https://api.openai.com/v1",
  "https://openrouter.ai/api/v1",
  "https://api.anthropic.com/v1",
  "https://api.groq.com/openai/v1"
];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 8e6) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function b64urlSign(payloadB64, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = b64urlSign(payloadB64, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const jsonStr = Buffer.from(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const payload = JSON.parse(jsonStr);
    if (!payload.exp || Date.now() > payload.exp) return null;
    return {
      email: payload.email,
      name: payload.name,
      role: payload.role || "user"
    };
  } catch (_) {
    return null;
  }
}

function extractBearer(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"] || "";
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) {
    return h.slice(7).trim();
  }
  return "";
}

function isAllowedBase(url) {
  const u = (url || "").replace(/\/+$/, "");
  return ALLOWED_PREFIXES.some((p) => u === p || u.startsWith(p + "/"));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { success: false, message: "Method not allowed" });
  }

  const requireAuth = String(process.env.AI_REQUIRE_AUTH || "true").toLowerCase() !== "false";
  const secret = process.env.SESSION_SECRET || "";

  if (requireAuth) {
    if (!secret || secret.length < 16) {
      return json(res, 500, {
        success: false,
        message: "SESSION_SECRET belum di-set di server."
      });
    }
    const token = extractBearer(req);
    const user = verifyToken(token, secret);
    if (!user) {
      return json(res, 401, {
        success: false,
        message: "Unauthorized. Login dulu sebelum memakai AI."
      });
    }
  }

  const apiKey = process.env.AI_API_KEY || "";
  if (!apiKey) {
    return json(res, 500, {
      success: false,
      message: "AI_API_KEY belum di-set di Vercel Environment Variables."
    });
  }

  let baseUrl = (process.env.AI_BASE_URL || "https://siaptuan.my.id/v1").replace(/\/+$/, "");
  if (!isAllowedBase(baseUrl)) {
    return json(res, 500, {
      success: false,
      message: "AI_BASE_URL tidak ada di allowlist server."
    });
  }

  const defaultModel = process.env.AI_MODEL || "combo1";

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return json(res, 400, { success: false, message: e.message });
  }

  const primaryModel = (body.model && String(body.model).trim()) || defaultModel;
  const candidateModels = [
    primaryModel,
    "gpt-4o-mini",
    "gemini-1.5-flash",
    "combo1",
    "claude-3-5-haiku"
  ].filter((m, i, self) => m && self.indexOf(m) === i);

  const targetUrl = `${baseUrl}/chat/completions`;
  let lastStatus = 502;
  let lastText = "";
  let lastModel = primaryModel;

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];
    const upstream = {
      model: currentModel,
      messages: body.messages || [],
      temperature: body.temperature,
      max_tokens: body.max_tokens
    };
    Object.keys(upstream).forEach((k) => {
      if (upstream[k] === undefined) delete upstream[k];
    });

    if (!Array.isArray(upstream.messages) || upstream.messages.length === 0) {
      return json(res, 400, { success: false, message: "messages wajib diisi." });
    }

    try {
      const upstreamRes = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(upstream)
      });

      const text = await upstreamRes.text();
      lastStatus = upstreamRes.status;
      lastText = text;
      lastModel = currentModel;

      if (upstreamRes.ok) {
        res.statusCode = upstreamRes.status;
        res.setHeader(
          "Content-Type",
          upstreamRes.headers.get("content-type") || "application/json; charset=utf-8"
        );
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-AI-Model", currentModel);
        res.end(text);
        return;
      }

      const isRouterError =
        upstreamRes.status === 502 ||
        upstreamRes.status === 503 ||
        upstreamRes.status === 504 ||
        /temporarily unavailable|router_error|model_not_found|busy|overloaded/i.test(text);

      if (!isRouterError || i === candidateModels.length - 1) {
        break;
      }

      // Pause briefly before trying fallback model
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      lastStatus = 502;
      lastText = JSON.stringify({
        error: {
          message: "Gagal menghubungi AI upstream: " + (err.message || String(err)),
          type: "network_error"
        }
      });
    }
  }

  res.statusCode = lastStatus;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-AI-Model", lastModel);
  res.end(lastText);
};
