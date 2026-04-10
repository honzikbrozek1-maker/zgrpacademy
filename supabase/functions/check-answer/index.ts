import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "@supabase/supabase-js/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userAnswer, correctAnswer, sentence } = await req.json();

    if (!userAnswer || !correctAnswer) {
      return new Response(
        JSON.stringify({ error: "Missing userAnswer or correctAnswer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are an answer checker for a learning app. The user needs to fill in a missing word in a sentence.

Sentence with blank: "${sentence}"
Correct answer: "${correctAnswer}"
User's answer: "${userAnswer}"

Rules:
- Accept the answer if it's semantically the same as the correct answer
- Accept minor typos and spelling mistakes
- Accept synonyms that fit the context
- Accept different grammatical forms (e.g. singular/plural, different cases in Czech)
- Be lenient but the answer must convey the same meaning

Respond with ONLY a JSON object (no markdown, no code blocks):
{"correct": true/false, "feedback": "brief explanation in Czech"}`;

    const response = await fetch("https://ai.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `AI request failed: ${response.status}`, details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { correct: userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase(), feedback: "Automatická kontrola" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
