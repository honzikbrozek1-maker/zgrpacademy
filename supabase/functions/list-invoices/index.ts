import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { data: payments, error } = await supabase
      .from("payments")
      .select("id, amount, currency, status, environment, created_at, stripe_invoice_id, stripe_session_id, stripe_payment_intent_id, stripe_customer_id")
      .eq("user_id", userData.user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const results = await Promise.all(
      (payments ?? []).map(async (p) => {
        let hostedUrl: string | null = null;
        let pdfUrl: string | null = null;
        let number: string | null = null;

        try {
          const stripe = createStripeClient(p.environment as StripeEnv);
          let inv: any = null;

          if (p.stripe_invoice_id) {
            inv = await stripe.invoices.retrieve(p.stripe_invoice_id);
          } else if (p.stripe_customer_id) {
            // Fallback: look up invoices for this customer and match by payment_intent
            const list = await stripe.invoices.list({
              customer: p.stripe_customer_id,
              limit: 10,
            });
            inv = list.data.find((i: any) =>
              i.payment_intent === p.stripe_payment_intent_id
            ) ?? null;
          }

          if (inv) {
            hostedUrl = inv.hosted_invoice_url ?? null;
            pdfUrl = inv.invoice_pdf ?? null;
            number = inv.number ?? null;
          }
        } catch (e) {
          console.error("invoice fetch failed for payment", p.id, e);
        }

        return {
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          created_at: p.created_at,
          number,
          hosted_invoice_url: hostedUrl,
          invoice_pdf: pdfUrl,
        };
      }),
    );

    return new Response(JSON.stringify({ invoices: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("list-invoices error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
