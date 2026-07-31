import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Můj profil",
  description: "Vrátí profil přihlášeného uživatele: jméno, body, stav platby a role.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nepřihlášeno" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, total_points, current_level, has_paid, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const result = {
      email: ctx.getUserEmail() ?? null,
      profile: profile ?? null,
      roles: (roles ?? []).map((r: { role: string }) => r.role),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
