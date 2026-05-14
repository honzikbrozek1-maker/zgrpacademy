// Edge function: generate-questions
// Admin-only: generates quiz questions via Lovable AI Gateway from supplied text.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  text: string;
  level_id: string;
  types: string[];
  count?: number;
  existing_questions?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth-context client to identify the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Server-side admin role check (cannot be bypassed by client)
    const { data: roleRow, error: roleErr } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr || !roleRow) {
      return json({ error: "Forbidden: admin role required" }, 403);
    }

    const body = (await req.json()) as Body;
    if (!body?.text || !body?.level_id || !Array.isArray(body?.types) || body.types.length === 0) {
      return json({ error: "Invalid request" }, 400);
    }
    if (body.text.length > 20000) {
      return json({ error: "Text too long" }, 400);
    }

    const allowedTypes = new Set(["quiz", "fill_in_blank", "flashcard"]);
    const types = body.types.filter((t) => allowedTypes.has(t));
    if (types.length === 0) {
      return json({ error: "No valid question types" }, 400);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return json({ error: "AI not configured" }, 500);
    }

    const systemPrompt = `Jsi expert na tvorbu vzdělávacích otázek v češtině. Z dodaného textu vytvoř kvalitní otázky.
Vrať POUZE JSON pole otázek bez dalšího textu. Každá otázka má pole:
- type: jeden z ${JSON.stringify(types)}
- question_text: text otázky (pro fill_in_blank použij ___ pro mezeru)
- option_1, option_2, option_3, option_4: pro quiz čtyři možnosti, jinak null
- correct_answer: pro quiz číslo 1-4, pro fill_in_blank null (správná odpověď v back_text), pro flashcard null
- back_text: pro flashcard a fill_in_blank obsahuje správnou odpověď, pro quiz null
Vytvoř 5-10 otázek pokrývajících klíčové pojmy.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.text },
        ],
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limit. Zkuste to později." }, 429);
    if (aiResp.status === 402) return json({ error: "AI kredit vyčerpán." }, 402);
    if (!aiResp.ok) {
      return json({ error: "AI error" }, 500);
    }

    const aiData = await aiResp.json();
    const content: string = aiData?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\[[\s\S]*\]/);
    let questions: unknown[] = [];
    try {
      questions = JSON.parse(match ? match[0] : content);
    } catch {
      return json({ error: "AI vrátila neplatný formát" }, 500);
    }

    return json({ questions });
  } catch (e) {
    console.error("generate-questions error:", e);
    return json({ error: "Server error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
