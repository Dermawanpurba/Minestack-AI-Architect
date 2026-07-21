/**
 * POST /api/auth
 * Secure login — admin & user credentials live ONLY in Vercel env (never in frontend).
 *
 * Env:
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 *   AUTH_USERS   optional JSON: [{"email":"...","password":"...","name":"...","role":"user"}]
 *   SESSION_SECRET  required for signed session tokens
 *
 * Body: { action: "login"|"me", email?, password?, token? }
 */

const crypto = require("crypto");

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
      if (data.length > 1e6) {
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

function getUsersFromEnv() {
  const users = [];
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (adminEmail && adminPassword) {
    users.push({
      email: adminEmail,
      password: adminPassword,
      name: process.env.ADMIN_NAME || "Admin Minestack",
      role: "admin"
    });
  }

  const raw = process.env.AUTH_USERS || "";
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => {
          if (!u || !u.email || !u.password) return;
          const email = String(u.email).trim().toLowerCase();
          // Avoid duplicate admin email from AUTH_USERS
          if (users.some((x) => x.email === email)) return;
          users.push({
            email,
            password: String(u.password),
            name: u.name || email.split("@")[0],
            role: u.role || "user"
          });
        });
      }
    } catch (_) {
      // ignore bad AUTH_USERS JSON
    }
  }
  return users;
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function sign(payloadB64, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createToken(user, secret) {
  const ttlHours = parseInt(process.env.SESSION_TTL_HOURS || "72", 10);
  const payload = {
    email: user.email,
    name: user.name,
    role: user.role || "user",
    exp: Date.now() + ttlHours * 60 * 60 * 1000
  };
  const payloadB64 = b64urlJson(payload);
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
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

module.exports = async function handler(req, res) {
  // CORS for same-origin usually enough; allow simple preflight if needed
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

  const secret = process.env.SESSION_SECRET || "";
  if (!secret || secret.length < 16) {
    return json(res, 500, {
      success: false,
      message: "SESSION_SECRET belum di-set di Vercel (min 16 karakter)."
    });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return json(res, 400, { success: false, message: e.message });
  }

  const action = body.action || "login";

  if (action === "me") {
    const token = body.token || extractBearer(req);
    const user = verifyToken(token, secret);
    if (!user) {
      return json(res, 401, { success: false, message: "Session tidak valid atau expired." });
    }
    return json(res, 200, { success: true, data: user });
  }

  if (action === "login") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return json(res, 400, { success: false, message: "Email dan password wajib diisi." });
    }

    const users = getUsersFromEnv();
    if (!users.length) {
      return json(res, 500, {
        success: false,
        message: "Belum ada user di server. Set ADMIN_EMAIL & ADMIN_PASSWORD di Vercel Environment Variables."
      });
    }

    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) {
      return json(res, 401, { success: false, message: "Email atau password salah." });
    }

    const publicUser = {
      email: found.email,
      name: found.name,
      role: found.role || "user"
    };
    const token = createToken(publicUser, secret);
    return json(res, 200, {
      success: true,
      data: publicUser,
      token
    });
  }

  return json(res, 400, {
    success: false,
    message: "Unknown action. Gunakan login | me"
  });
};

// Export helpers for /api/ai session check
module.exports.verifyToken = verifyToken;
module.exports.extractBearer = extractBearer;
