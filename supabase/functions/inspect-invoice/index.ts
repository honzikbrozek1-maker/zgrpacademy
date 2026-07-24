import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id")!;
  const env = (url.searchParams.get("env") ?? "live") as StripeEnv;
  const stripe = createStripeClient(env);
  const inv: any = await stripe.invoices.retrieve(id);
  return new Response(JSON.stringify({
    number: inv.number,
    subtotal: inv.subtotal,
    total: inv.total,
    tax: inv.tax,
    total_taxes: inv.total_taxes,
    default_tax_rates: inv.default_tax_rates,
    lines: inv.lines.data.map((l: any) => ({
      desc: l.description,
      amount: l.amount,
      tax_rates: l.tax_rates,
      tax_amounts: l.tax_amounts,
    })),
    hosted_invoice_url: inv.hosted_invoice_url,
    invoice_pdf: inv.invoice_pdf,
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
