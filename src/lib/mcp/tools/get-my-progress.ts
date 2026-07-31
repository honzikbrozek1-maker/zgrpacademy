import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_progress",
  title: "Můj pokrok",
  description:
    "Vrátí pokrok přihlášeného uživatele v jednotlivých levelech a skupinách (dokončeno, skóre).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nepřihlášeno" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [levelRes, groupRes] = await Promise.all([
      supabase
        .from("user_progress")
        .select("level_id, completed, test_score, completed_at")
        .eq("user_id", userId),
      supabase
        .from("user_group_progress")
        .select("group_id, passed, test_score, completed_at")
        .eq("user_id", userId),
    ]);
    const error = levelRes.error ?? groupRes.error;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const result = {
      levels: levelRes.data ?? [],
      groups: groupRes.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
