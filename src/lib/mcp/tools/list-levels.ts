import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_levels",
  title: "Seznam levelů",
  description:
    "Vypíše dostupné levely (volitelně filtrované podle kategorie) včetně skupiny a počtu otázek.",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Volitelný filtr kategorie, např. 'products' nebo 'backoffice'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nepřihlášeno" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("levels")
      .select("id, title, description, category, order_index, passing_score, group_id")
      .order("order_index", { ascending: true });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const levels = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(levels) }],
      structuredContent: { levels },
    };
  },
});
