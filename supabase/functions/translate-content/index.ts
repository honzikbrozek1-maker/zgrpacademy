// Edge function: translate-content
// Admin-only: translates Czech course content (levels, groups, questions) into
// Slovak (`*_sk` columns) via the Lovable AI Gateway. Processes one batch per
// call so the client can drive progress.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Entity = "levels" | "groups" | "questions";

const FIELDS: Record<Entity, { table: string; key: string; fields: string[] }> = {
  levels: { table: "levels", key: "title", fields: ["title", "description"] },
  groups: {
    table: "level_groups",
    key: "title",
    fields: [
      "title",
      "description",
      "diploma_title",
      "diploma_subtitle",
      "diploma_body_text",
      "diploma_intro_text",
      "diploma_award_title",
      "diploma_note_text",
      "diploma_issuer",
    ],
  },
  questions: {
    table: "questions",
    key: "question_text",
    fields: [
      "question_text",
      "option_1",
      "option_2",
      "option_3",
      "option_4",
      "back_text",
      "wrong_option_1",
      "wrong_option_2",
      "wrong_option_3",
    ],
  },
};

const BATCH: Record<Entity, number> = { levels: 10, groups: 5, questions: 8 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);

    const body = (await req.json().catch(() => ({}))) as { entity?: Entity; force?: boolean };
    const entity = body?.entity;
    if (!entity || !FIELDS[entity]) return json({ error: "Invalid entity" }, 400);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "AI not configured" }, 500);

    const cfg = FIELDS[entity];
    const admin = createClient(supabaseUrl, serviceKey);

    const selectCols = ["id", ...cfg.fields].join(", ");
    const missingFilter = `${cfg.key}_sk.is.null,${cfg.key}_sk.eq.`;

    // How many rows still need translating (before this batch).
    const countQuery = admin.from(cfg.table).select("id", { count: "exact", head: true });
    if (!body.force) countQuery.or(missingFilter);
    const { count: pendingBefore } = await countQuery;

    const rowsQuery = admin.from(cfg.table).select(selectCols).limit(BATCH[entity]);
    if (!body.force) rowsQuery.or(missingFilter);
    const { data: rows, error: rowsErr } = await rowsQuery;
    if (rowsErr) return json({ error: rowsErr.message }, 500);

    if (!rows || rows.length === 0) return json({ translated: 0, remaining: 0 });

    // Build a compact payload of only the non-empty fields.
    const payload = (rows as Record<string, unknown>[]).map((r) => {
      const item: Record<string, string> = { id: String(r.id) };
      for (const f of cfg.fields) {
        const v = r[f];
        if (typeof v === "string" && v.trim()) item[f] = v;
      }
      return item;
    });

    const systemPrompt = `Jsi profesionální překladatel z češtiny do slovenštiny pro vzdělávací aplikaci.
Dostaneš JSON pole objektů. Přelož do přirozené spisovné slovenštiny HODNOTY všech textových polí kromě pole "id".
PRAVIDLA:
- Zachovej PŘESNĚ strukturu JSON, stejná pole i stejné "id".
- Nepřekládej ani neměň zástupné texty jako ______ (podtržítka), {group_title}, {score}, čísla, značky a vlastní jména organizací (ZGRP).
- Neměň pořadí ani počet položek — správné odpovědi jsou určeny pořadím možností.
- Pokud je věta s mezerou ______, slovenský překlad musí mezeru ______ obsahovat na odpovídajícím místě.
- Vrať POUZE JSON pole, žádný jiný text ani markdown.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limit. Zkuste to později." }, 429);
    if (aiResp.status === 402) return json({ error: "AI kredit vyčerpán." }, 402);
    if (!aiResp.ok) return json({ error: "AI error" }, 500);

    const aiData = await aiResp.json();
    const content: string = aiData?.choices?.[0]?.message?.content ?? "";
    let translated: Record<string, string>[];
    try {
      translated = parseJsonLenient(content) as Record<string, string>[];
      if (!Array.isArray(translated)) throw new Error("not an array");
    } catch {
      console.error("translate-content: AI returned invalid JSON:", content.slice(0, 500));
      return json({ error: "AI vrátila neplatný formát" }, 500);
    }

    let done = 0;
    for (const item of translated) {
      const id = item?.id;
      if (!id) continue;
      const original = payload.find((p) => p.id === String(id));
      if (!original) continue;
      const update: Record<string, string> = {};
      for (const f of cfg.fields) {
        const val = item[f];
        if (typeof val === "string" && val.trim() && original[f]) update[`${f}_sk`] = val.trim();
      }
      if (Object.keys(update).length === 0) continue;
      const { error: upErr } = await admin.from(cfg.table).update(update).eq("id", id);
      if (!upErr) done++;
    }

    return json({ translated: done, remaining: Math.max((pendingBefore ?? 0) - done, 0) });
  } catch (e) {
    console.error("translate-content error:", e);
    return json({ error: "Server error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Parses the AI's JSON output tolerantly. Models sometimes emit literal
 * newlines/tabs inside JSON string values, which is invalid JSON — escape
 * those control characters (only inside string literals) and retry.
 */
function parseJsonLenient(raw: string): unknown {
  const match = raw.match(/\[[\s\S]*\]/);
  const text = (match ? match[0] : raw).trim();
  try {
    return JSON.parse(text);
  } catch {
    let out = "";
    let inString = false;
    let escaped = false;
    for (const ch of text) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        out += ch;
        continue;
      }
      if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) {
        out += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : "\\t";
        continue;
      }
      out += ch;
    }
    return JSON.parse(out);
  }
}
