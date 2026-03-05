"use strict";
require("dotenv").config();

const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const compression = require("compression");
const rateLimit   = require("express-rate-limit");
const { Pool }    = require("pg");
const crypto      = require("crypto");
const fetch       = (...args) => globalThis.fetch(...args);
const uuidv4 = () => crypto.randomUUID();

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT     = process.env.PORT || 3001;
const ENC_KEY  = process.env.ENCRYPTION_KEY || "change_me_32_char_secret_key_here";
const ENC_IV_LEN = 16;

// ─── Database ─────────────────────────────────────────────────────────────────
const db = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

if (db) {
  db.on("error", err => console.error("DB pool error:", err));
}

// ─── Encryption helpers ───────────────────────────────────────────────────────
function encrypt(text) {
  const iv  = crypto.randomBytes(ENC_IV_LEN);
  const key = crypto.scryptSync(ENC_KEY, "nexus_salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

function decrypt(enc) {
  const [ivHex, dataHex] = enc.split(":");
  const iv   = Buffer.from(ivHex, "hex");
  const key  = crypto.scryptSync(ENC_KEY, "nexus_salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return dec.toString("utf8");
}

function maskKey(key) {
  if (!key || key.length < 10) return "****";
  return key.slice(0, 7) + "•".repeat(12) + key.slice(-4);
}

// ─── Provider registry ────────────────────────────────────────────────────────
// All supported AI providers with their API endpoint config
const PROVIDERS = {
  anthropic: {
    name: "Anthropic",       logo: "🟣",
    url:  "https://api.anthropic.com/v1/messages",
    models: ["claude-sonnet-4-20250514","claude-opus-4-5","claude-haiku-4-5-20251001"],
    defaultModel: "claude-sonnet-4-20250514",
    authHeader: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
    buildBody: (msgs, sys, maxT, model) => ({ model, max_tokens: maxT, system: sys, messages: msgs }),
    parseResp: (d) => d?.content?.[0]?.text ?? "",
    category: "LLM",
  },
  openai: {
    name: "OpenAI",          logo: "🟢",
    url:  "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo","o1-preview","o1-mini"],
    defaultModel: "gpt-4o",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, max_tokens: maxT,
      messages: [{ role:"system", content:sys }, ...msgs],
    }),
    parseResp: (d) => d?.choices?.[0]?.message?.content ?? "",
    category: "LLM",
  },
  gemini: {
    name: "Google Gemini",   logo: "🔵",
    url:  (key, model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    models: ["gemini-1.5-pro","gemini-1.5-flash","gemini-1.0-pro","gemini-2.0-flash-exp"],
    defaultModel: "gemini-1.5-pro",
    authHeader: () => ({}),
    buildBody: (msgs, sys, maxT, model) => ({
      system_instruction: { parts:[{ text:sys }] },
      contents: msgs.map(m => ({ role:m.role==="assistant"?"model":"user", parts:[{ text:m.content }] })),
      generationConfig: { maxOutputTokens: maxT },
    }),
    parseResp: (d) => d?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    category: "LLM",
  },
  mistral: {
    name: "Mistral AI",      logo: "🟡",
    url:  "https://api.mistral.ai/v1/chat/completions",
    models: ["mistral-large-latest","mistral-medium-latest","mistral-small-latest","mistral-7b-instruct"],
    defaultModel: "mistral-large-latest",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, max_tokens: maxT,
      messages: [{ role:"system", content:sys }, ...msgs],
    }),
    parseResp: (d) => d?.choices?.[0]?.message?.content ?? "",
    category: "LLM",
  },
  groq: {
    name: "Groq",            logo: "⚡",
    url:  "https://api.groq.com/openai/v1/chat/completions",
    models: ["llama-3.3-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768","gemma2-9b-it"],
    defaultModel: "llama-3.3-70b-versatile",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, max_tokens: maxT,
      messages: [{ role:"system", content:sys }, ...msgs],
    }),
    parseResp: (d) => d?.choices?.[0]?.message?.content ?? "",
    category: "LLM",
  },
  cohere: {
    name: "Cohere",          logo: "🔶",
    url:  "https://api.cohere.com/v2/chat",
    models: ["command-r-plus","command-r","command","command-light"],
    defaultModel: "command-r-plus",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, max_tokens: maxT,
      system_prompt: sys,
      messages: msgs,
    }),
    parseResp: (d) => d?.message?.content?.[0]?.text ?? "",
    category: "LLM",
  },
  together: {
    name: "Together AI",     logo: "🤝",
    url:  "https://api.together.xyz/v1/chat/completions",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo","mistralai/Mixtral-8x22B-Instruct-v0.1","Qwen/Qwen2.5-72B-Instruct-Turbo"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, max_tokens: maxT,
      messages: [{ role:"system", content:sys }, ...msgs],
    }),
    parseResp: (d) => d?.choices?.[0]?.message?.content ?? "",
    category: "LLM",
  },
  perplexity: {
    name: "Perplexity",      logo: "🌐",
    url:  "https://api.perplexity.ai/chat/completions",
    models: ["llama-3.1-sonar-large-128k-online","llama-3.1-sonar-small-128k-online","llama-3.1-sonar-huge-128k-online"],
    defaultModel: "llama-3.1-sonar-large-128k-online",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, max_tokens: maxT,
      messages: [{ role:"system", content:sys }, ...msgs],
    }),
    parseResp: (d) => d?.choices?.[0]?.message?.content ?? "",
    category: "LLM",
  },
  huggingface: {
    name: "HF Inference",    logo: "🤗",
    url:  "https://router.huggingface.co/v1/chat/completions",
    models: ["Qwen/Qwen3-4B-Instruct-2507","Qwen/Qwen3-14B-Instruct-2507","HuggingFaceTB/SmolLM3-3B"],
    defaultModel: "Qwen/Qwen3-4B-Instruct-2507",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, stream: false, max_tokens: maxT,
      messages: [{ role:"system", content:sys }, ...msgs],
    }),
    parseResp: (d) => d?.choices?.[0]?.message?.content ?? "",
    category: "LLM",
  },
  stability: {
    name: "Stability AI",    logo: "🎨",
    url:  "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    models: ["stable-diffusion-xl-1024-v1-0","stable-diffusion-v1-6","stable-image-core"],
    defaultModel: "stable-diffusion-xl-1024-v1-0",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs) => ({
      text_prompts: [{ text: msgs[0]?.content ?? "", weight:1 }],
      cfg_scale: 7, height: 1024, width: 1024, steps: 30,
    }),
    parseResp: (d) => d?.artifacts?.[0]?.base64 ? `data:image/png;base64,${d.artifacts[0].base64}` : "",
    category: "Image",
  },
  replicate: {
    name: "Replicate",       logo: "♻️",
    url:  "https://api.replicate.com/v1/predictions",
    models: ["black-forest-labs/flux-schnell","meta/llama-3.2-90b-vision-instruct","stability-ai/stable-diffusion-3"],
    defaultModel: "black-forest-labs/flux-schnell",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      version: model,
      input: { prompt: msgs[0]?.content ?? "" },
    }),
    parseResp: (d) => d?.output?.[0] ?? d?.output ?? "",
    category: "Multi",
  },
  elevenlabs: {
    name: "ElevenLabs",      logo: "🎙️",
    url:  "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    models: ["eleven_monolingual_v1","eleven_multilingual_v2","eleven_turbo_v2"],
    defaultModel: "eleven_monolingual_v1",
    authHeader: (key) => ({ "xi-api-key": key }),
    buildBody: (msgs, sys, maxT, model) => ({
      text: msgs[0]?.content ?? "",
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
    parseResp: (d) => d?.audio_base64 ?? "[Audio generated — binary output]",
    category: "Audio",
  },
  deepgram: {
    name: "Deepgram",        logo: "🎧",
    url:  "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
    models: ["nova-2","nova","enhanced","base"],
    defaultModel: "nova-2",
    authHeader: (key) => ({ "Authorization": `Token ${key}` }),
    buildBody: (msgs) => ({ url: msgs[0]?.content ?? "" }),
    parseResp: (d) => d?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "",
    category: "Audio",
  },
  openrouter: {
    name: "OpenRouter",      logo: "🔀",
    url:  "https://openrouter.ai/api/v1/chat/completions",
    models: ["anthropic/claude-3.5-sonnet","openai/gpt-4o","google/gemini-pro-1.5","meta-llama/llama-3.1-405b"],
    defaultModel: "anthropic/claude-3.5-sonnet",
    authHeader: (key) => ({ "Authorization": `Bearer ${key}` }),
    buildBody: (msgs, sys, maxT, model) => ({
      model, max_tokens: maxT,
      messages: [{ role:"system", content:sys }, ...msgs],
    }),
    parseResp: (d) => d?.choices?.[0]?.message?.content ?? "",
    category: "LLM",
  },
};

// ─── Express App ──────────────────────────────────────────────────────────────
function getEnvCredential(provider) {
  const key = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (!key) return null;
  return {
    key,
    modelHint: process.env[`${provider.toUpperCase()}_MODEL`] || PROVIDERS[provider]?.defaultModel,
  };
}

function getEnvConfiguredProviders() {
  return Object.entries(PROVIDERS).flatMap(([id, meta]) => {
    const cred = getEnvCredential(id);
    if (!cred) return [];
    return [{
      id: `env-${id}`,
      provider: id,
      label: `${meta.name} (env)`,
      model_hint: cred.modelHint,
      is_active: true,
      last_used_at: null,
      created_at: null,
      updated_at: null,
      source: "env",
      meta,
      hasKey: true,
    }];
  });
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const candidates = [
    Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body,
    req.rawBody,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.trim() === "") continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  return {};
}

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("tiny"));

// Rate limiting
const limiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60_000, max: 30, message: { error: "AI rate limit reached" } });
app.use("/api/", limiter);
app.use("/api/chat", aiLimiter);
app.use("/api/orchestrate", aiLimiter);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  if (!db) {
    return res.json({ status:"ok", db:"not_configured", ts: new Date().toISOString(), version:"1.0.0" });
  }
  try {
    await db.query("SELECT 1");
    res.json({ status:"ok", db:"connected", ts: new Date().toISOString(), version:"1.0.0" });
  } catch {
    res.status(503).json({ status:"error", db:"unreachable" });
  }
});

// ─── API Keys CRUD ────────────────────────────────────────────────────────────

// GET /api/keys — list configured providers (masked keys)
app.get("/api/keys", async (req, res) => {
  const envConfigured = getEnvConfiguredProviders();
  if (!db) {
    const configured = new Set(envConfigured.map(r => r.provider));
    const unconfigured = Object.entries(PROVIDERS)
      .filter(([id]) => !configured.has(id))
      .map(([id, meta]) => ({ provider: id, hasKey: false, is_active: false, meta }));
    return res.json({ keys: envConfigured, unconfigured, storage: "env_only" });
  }

  try {
    const { rows } = await db.query(
      "SELECT id, provider, label, model_hint, is_active, last_used_at, created_at, updated_at FROM api_keys ORDER BY provider"
    );
    // Enrich with provider metadata
    const dbKeys = rows.map(r => ({
      ...r,
      meta: PROVIDERS[r.provider] || { name: r.provider, logo:"🔑", models:[], category:"Unknown" },
      hasKey: true,
      source: "db",
    }));
    const seen = new Set(dbKeys.map(r => r.provider));
    const mergedEnv = envConfigured.filter(r => !seen.has(r.provider));
    const keys = [...dbKeys, ...mergedEnv];
    // Add providers that haven't been configured yet in db/env
    const configured = new Set(keys.map(r => r.provider));
    const unconfigured = Object.entries(PROVIDERS)
      .filter(([id]) => !configured.has(id))
      .map(([id, meta]) => ({ provider: id, hasKey: false, is_active: false, meta }));
    res.json({ keys, unconfigured, storage: "db_and_env" });
  } catch (e) {
    if (envConfigured.length > 0) {
      const configured = new Set(envConfigured.map(r => r.provider));
      const unconfigured = Object.entries(PROVIDERS)
        .filter(([id]) => !configured.has(id))
        .map(([id, meta]) => ({ provider: id, hasKey: false, is_active: false, meta }));
      return res.json({ keys: envConfigured, unconfigured, storage: "env_fallback", warning: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/keys — add or update a provider key
app.post("/api/keys", async (req, res) => {
  const body = parseJsonBody(req);
  const { provider, key, label, model_hint } = body;
  if (!provider || !key) return res.status(400).json({ error: "provider and key are required" });
  if (!PROVIDERS[provider]) return res.status(400).json({ error: `Unknown provider: ${provider}` });
  if (!db) {
    return res.status(400).json({
      error: `Database storage unavailable. Set ${provider.toUpperCase()}_API_KEY as an environment variable.`,
    });
  }
  try {
    const enc = encrypt(key.trim());
    const hint = model_hint || PROVIDERS[provider].defaultModel;
    await db.query(`
      INSERT INTO api_keys (provider, key_enc, label, model_hint, is_active)
      VALUES ($1,$2,$3,$4,TRUE)
      ON CONFLICT (provider) DO UPDATE
        SET key_enc=$2, label=$3, model_hint=$4, is_active=TRUE, updated_at=NOW()
    `, [provider, enc, label || PROVIDERS[provider].name, hint]);
    res.json({ ok: true, masked: maskKey(key) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/keys/:provider — remove a key
app.delete("/api/keys/:provider", async (req, res) => {
  if (!db) return res.status(400).json({ error: "Database storage unavailable in this environment." });
  try {
    await db.query("DELETE FROM api_keys WHERE provider=$1", [req.params.provider]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/keys/:provider/toggle — activate/deactivate
app.patch("/api/keys/:provider/toggle", async (req, res) => {
  if (!db) return res.status(400).json({ error: "Database storage unavailable in this environment." });
  try {
    const { rows } = await db.query(
      "UPDATE api_keys SET is_active = NOT is_active WHERE provider=$1 RETURNING is_active",
      [req.params.provider]
    );
    res.json({ ok: true, is_active: rows[0]?.is_active });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI Chat proxy ────────────────────────────────────────────────────────────
async function getKey(provider) {
  const envCred = getEnvCredential(provider);
  if (envCred?.key) return envCred;
  if (!db) {
    throw new Error(`No key configured for provider: ${provider}. Set ${provider.toUpperCase()}_API_KEY.`);
  }
  const { rows } = await db.query(
    "SELECT key_enc, model_hint FROM api_keys WHERE provider=$1 AND is_active=TRUE",
    [provider]
  );
  if (!rows[0]) throw new Error(`No active API key for provider: ${provider}`);
  await db.query("UPDATE api_keys SET last_used_at=NOW() WHERE provider=$1", [provider]);
  return { key: decrypt(rows[0].key_enc), modelHint: rows[0].model_hint };
}

app.post("/api/chat", async (req, res) => {
  const body = parseJsonBody(req);
  const { messages, system = "", maxTokens = 1000, provider = "anthropic", model } = body;
  if (!messages?.length) return res.status(400).json({ error: "messages required" });

  const t0 = Date.now();
  let usedModel = "unknown";
  try {
    const { key, modelHint } = await getKey(provider);
    const prov = PROVIDERS[provider];
    usedModel = model || modelHint || prov.defaultModel;

    const url = typeof prov.url === "function" ? prov.url(key, usedModel) : prov.url;
    const headers = { "Content-Type":"application/json", ...prov.authHeader(key) };
    const body = prov.buildBody(messages, system, maxTokens, usedModel);

    const resp = await fetch(url, { method:"POST", headers, body: JSON.stringify(body) });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || data?.detail || `HTTP ${resp.status}`);

    const text = prov.parseResp(data);
    const lat  = Date.now() - t0;

    // Log usage
    if (db) {
      db.query(
        "INSERT INTO usage_log (provider,model_id,latency_ms,success) VALUES ($1,$2,$3,TRUE)",
        [provider, usedModel, lat]
      ).catch(() => {});
    }

    res.json({ text, provider, model: usedModel, latency_ms: lat });
  } catch (e) {
    if (db) {
      db.query(
        "INSERT INTO usage_log (provider,model_id,latency_ms,success,error_msg) VALUES ($1,$2,$3,FALSE,$4)",
        [provider, usedModel, Date.now()-t0, e.message]
      ).catch(() => {});
    }
    res.status(500).json({ error: e.message });
  }
});

// ─── Orchestrator ─────────────────────────────────────────────────────────────
const ORCH_AGENTS = [
  { id:"planner",    name:"Planner",    sys:"You are a strategic planner. Analyze thoroughly and create a structured execution plan with specific steps, agent assignments, and success criteria." },
  { id:"researcher", name:"Researcher", sys:"You are a research specialist. Gather all relevant knowledge, facts, and context. Be comprehensive and cite reasoning." },
  { id:"executor",   name:"Executor",   sys:"You are an expert executor. Carry out the task with precision and depth, producing high-quality, production-ready output." },
  { id:"critic",     name:"Critic",     sys:"You are a rigorous critic. Format: SCORE(1-10) | CRITICAL ISSUES | SPECIFIC IMPROVEMENTS | REVISED SECTIONS." },
  { id:"synth",      name:"Synthesizer",sys:"You are a master synthesizer. Integrate all agent outputs into a single polished, comprehensive, publication-ready final response." },
];

app.post("/api/orchestrate", async (req, res) => {
  const body = parseJsonBody(req);
  const { task, provider = "anthropic" } = body;
  if (!task) return res.status(400).json({ error: "task required" });

  const runId = uuidv4();
  const t0    = Date.now();
  const steps = [];

  // SSE streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    if (db) {
      await db.query(
        "INSERT INTO orchestrator_runs (id,task,status) VALUES ($1,$2,'running')",
        [runId, task]
      );
    }

    const { key, modelHint } = await getKey(provider);
    const prov = PROVIDERS[provider];
    const model = modelHint || prov.defaultModel;

    send({ type:"start", runId });

    for (const agent of ORCH_AGENTS) {
      const t1  = Date.now();
      send({ type:"agent_start", agentId: agent.id, name: agent.name });

      const prev = steps.length ? `\nPrevious (${steps.at(-1).name}):\n${steps.at(-1).text.slice(0,600)}\n---\nTask: ${task}` : task;
      const msgs = [{ role:"user", content: prev }];

      try {
        const url  = typeof prov.url === "function" ? prov.url(key, model) : prov.url;
        const hdrs = { "Content-Type":"application/json", ...prov.authHeader(key) };
        const body = prov.buildBody(msgs, agent.sys, 1000, model);

        const resp = await fetch(url, { method:"POST", headers:hdrs, body:JSON.stringify(body) });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);

        const text = prov.parseResp(data);
        const step = { agId:agent.id, name:agent.name, text, dur: Date.now()-t1 };
        steps.push(step);
        send({ type:"agent_done", ...step });
      } catch (e) {
        const step = { agId:agent.id, name:agent.name, text:`Error: ${e.message}`, dur:0, error:true };
        steps.push(step);
        send({ type:"agent_error", ...step });
      }
    }

    const dur = Date.now() - t0;
    const final = steps.find(s=>s.agId==="synth")?.text || steps.at(-1)?.text || "";

    if (db) {
      await db.query(
        "UPDATE orchestrator_runs SET steps=$1,final_out=$2,duration_ms=$3,status='done' WHERE id=$4",
        [JSON.stringify(steps), final, dur, runId]
      );
    }

    send({ type:"done", runId, duration_ms: dur });
  } catch (e) {
    if (db) {
      await db.query("UPDATE orchestrator_runs SET status='error' WHERE id=$1", [runId]);
    }
    send({ type:"error", error: e.message });
  }

  res.end();
});

// ─── Usage stats ──────────────────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  if (!db) {
    return res.json({ byProvider: [], recentRuns: [], note: "database not configured" });
  }
  try {
    const { rows: byProvider } = await db.query(`
      SELECT provider, COUNT(*) as calls, AVG(latency_ms)::int as avg_latency,
             SUM(CASE WHEN success THEN 1 ELSE 0 END)::int as successes
      FROM usage_log GROUP BY provider ORDER BY calls DESC
    `);
    const { rows: recent } = await db.query(`
      SELECT id, task, status, duration_ms, created_at FROM orchestrator_runs
      ORDER BY created_at DESC LIMIT 20
    `);
    res.json({ byProvider, recentRuns: recent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Providers list ───────────────────────────────────────────────────────────
app.get("/api/providers", (req, res) => {
  const list = Object.entries(PROVIDERS).map(([id, p]) => ({
    id, name:p.name, logo:p.logo, models:p.models, defaultModel:p.defaultModel, category:p.category,
  }));
  res.json({ providers: list });
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
  console.log(`\n  ◈ Nexus API listening on http://localhost:${PORT}`);
  console.log(`  ◈ Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`  ◈ Encryption: ${ENC_KEY.length} char key\n`);
  });
}

module.exports = app;
