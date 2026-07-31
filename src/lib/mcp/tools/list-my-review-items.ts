import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_review_items",
  title: "Moje opakování",
  description:
    "Vypíše otázky zařazené do opakování pro přihlášeného uživatele (bez správných odpovědí).",
  inputSchema: {
    confidence: z
      .string()
      .optional()
      .describe("Volitelný filtr úrovně jistoty, např. 'low'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ confidence }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nepřihlášeno" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("review_items")
      .select("id, question_id, confidence, source, updated_at")
      .eq("user_id", ctx.getUserId())
      .order("updated_at", { ascending: false });
    if (confidence) query = query.eq("confidence", confidence);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const items = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(items) }],
      structuredContent: { items },
    };
  },
});
