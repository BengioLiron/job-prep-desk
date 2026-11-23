/**
 * Job Prep Desk: a tiny server between the page and the Claude API.
 * It keeps your Anthropic API key secret and only answers your page.
 *
 * Deploy on Cloudflare Workers (free plan is enough). Set these in the
 * Worker's Settings → Variables and Secrets:
 *   ANTHROPIC_API_KEY  (secret)  your key from console.anthropic.com
 *   APP_TOKEN          (secret)  any long random string; paste the same one in the app's Setup
 *   ALLOWED_ORIGINS    (text)    e.g. https://bengioliron.github.io  (comma-separated; add http://localhost:8000 for local testing)
 *   MODEL              (text, optional)  default claude-sonnet-5-5
 *   MAX_TOKENS         (text, optional)  default 8000
 */
export default {
  async fetch(req, env) {
    const origin = req.headers.get("origin") || "";
    const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const originOk = allowed.includes(origin);
    const cors = {
      "access-control-allow-origin": originOk ? origin : "null",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-max-age": "86400",
      "vary": "origin"
    };
    const reply = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    const path = new URL(req.url).pathname;
    if (req.method !== "POST" || path !== "/v1/complete") return reply(404, { error: "not found" });
    if (!originOk) return reply(403, { error: "origin not allowed" });
    if (!env.APP_TOKEN || req.headers.get("authorization") !== "Bearer " + env.APP_TOKEN) return reply(401, { error: "bad token" });
    if (!env.ANTHROPIC_API_KEY) return reply(500, { error: "ANTHROPIC_API_KEY is not set" });

    let body;
    try { body = await req.json(); } catch { return reply(400, { error: "bad json" }); }
    const prompt = String(body.prompt || "");
    if (!prompt || prompt.length > 300000) return reply(400, { error: "prompt missing or too long" });
    const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
    const content = [
      ...images
        .filter((i) => i && /^image\/(png|jpeg|webp|gif)$/.test(i.media_type) && typeof i.data === "string")
        .map((i) => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } })),
      { type: "text", text: prompt }
    ];

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: env.MODEL || "claude-sonnet-5-5",
        max_tokens: Number(env.MAX_TOKENS || 8000),
        messages: [{ role: "user", content }]
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return reply(r.status === 429 ? 429 : 502, { error: (data.error && data.error.message) || "Claude API error " + r.status });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return reply(200, { text, stop_reason: data.stop_reason, usage: data.usage });
  }
};
