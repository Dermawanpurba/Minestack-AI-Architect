/**
 * GET /api/config
 * Public, non-secret runtime config for the frontend.
 * NEVER returns AI_API_KEY or passwords.
 */

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Method not allowed" }));
    return;
  }

  const hasAiKey = Boolean(process.env.AI_API_KEY);
  const hasAdmin = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  const hasSession = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);

  const body = {
    success: true,
    data: {
      appName: process.env.APP_NAME || "Minestack AI Architect",
      // Model is not a secret; safe to show default
      aiModel: process.env.AI_MODEL || "combo1",
      // Base URL host only for display (optional)
      aiProviderConfigured: hasAiKey,
      authConfigured: hasAdmin && hasSession,
      storageMode: "localStorage",
      secureMode: true,
      notes:
        "API Key & password admin hanya di Vercel Environment Variables. Frontend memanggil /api/ai dan /api/auth."
    }
  };

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};
