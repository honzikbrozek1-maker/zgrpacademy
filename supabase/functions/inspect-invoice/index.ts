import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const env = (url.searchParams.get("env") ?? "live") as StripeEnv;
  const stripe = createStripeClient(env);
  const invId = url.searchParams.get("id");
  const customer = url.searchParams.get("customer");

  if (customer) {
    const sessions = await stripe.checkout.sessions.list({ customer, limit: 3 });
    const out = [];
    for (const s of sessions.data) {
      const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 5 });
      out.push({
        id: s.id,
        created: new Date(s.created * 1000).toISOString(),
        amount_total: s.amount_total,
        total_details: s.total_details,
        line_items: items.data.map((l: any) => ({
          desc: l.description, amount_total: l.amount_total, amount_tax: l.amount_tax,
        })),
      });
    }
    return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
  }

  const inv: any = await stripe.invoices.retrieve(invId!);
  return new Response(JSON.stringify({
    number: inv.number,
    subtotal: inv.subtotal,
    total: inv.total,
    total_taxes: inv.total_taxes,
    hosted_invoice_url: inv.hosted_invoice_url,
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
