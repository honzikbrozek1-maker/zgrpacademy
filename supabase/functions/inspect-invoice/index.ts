import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const env = (url.searchParams.get("env") ?? "live") as StripeEnv;
  const stripe = createStripeClient(env);
  const sessionId = url.searchParams.get("session");
  if (sessionId) {
    const s: any = await stripe.checkout.sessions.retrieve(sessionId);
    const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 5 });
    return new Response(JSON.stringify({
      amount_total: s.amount_total,
      amount_subtotal: s.amount_subtotal,
      total_details: s.total_details,
      line_items: items.data.map((l: any) => ({
        desc: l.description,
        amount_subtotal: l.amount_subtotal,
        amount_total: l.amount_total,
        amount_tax: l.amount_tax,
        taxes: l.taxes,
      })),
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  }
  const invId = url.searchParams.get("id")!;
  const inv: any = await stripe.invoices.retrieve(invId);
  return new Response(JSON.stringify({
    number: inv.number, subtotal: inv.subtotal, total: inv.total, total_taxes: inv.total_taxes,
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
