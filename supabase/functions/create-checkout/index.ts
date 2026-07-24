import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const ALLOWED_RETURN_ORIGINS = [
  "https://zgrpacademy.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const ALLOWED_RETURN_ORIGIN_PATTERNS: RegExp[] = [
  // Lovable preview subdomains (id-preview--*, *--*.lovable.app, *.lovableproject.com)
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
];

function isAllowedReturnOrigin(origin: string): boolean {
  if (ALLOWED_RETURN_ORIGINS.includes(origin)) return true;
  return ALLOWED_RETURN_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REGISTRATION_FEE_PRICE_ID = "registration_fee_v3";
const REGISTRATION_FEE_AMOUNT = 10000;
const REGISTRATION_FEE_CURRENCY = "czk";
const REGISTRATION_FEE_NAME = "Registrační poplatek ZGRP Academy";

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUserId = userData.user.id;
    const authUserEmail = userData.user.email;

    const { priceId, userId, returnUrl, environment } = await req.json();

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      throw new Error("Invalid priceId");
    }
    if (environment !== "sandbox" && environment !== "live") {
      throw new Error("Invalid environment");
    }
    if (!returnUrl || typeof returnUrl !== "string") {
      throw new Error("Invalid returnUrl");
    }
    // Validate returnUrl origin against allowlist
    let parsedReturn: URL;
    try {
      parsedReturn = new URL(returnUrl);
    } catch {
      throw new Error("Invalid returnUrl");
    }
    if (!isAllowedReturnOrigin(parsedReturn.origin)) {
      throw new Error("returnUrl origin not allowed");
    }
    // Enforce that userId (if provided) matches authenticated user
    if (userId && userId !== authUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const effectiveUserId = authUserId;
    const effectiveEmail = authUserEmail;

    const env: StripeEnv = environment;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    const stripePrice = prices.data[0];

    if (!stripePrice && priceId !== REGISTRATION_FEE_PRICE_ID) {
      throw new Error(`Price not found: ${priceId} (${env})`);
    }

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: effectiveEmail,
      userId: effectiveUserId,
    });

    // Resolve or create a 21% inclusive Czech VAT tax rate (cached by lookup via metadata)
    const taxRateLookupKey = "cz_vat_21_inclusive";
    let taxRateId: string | null = null;
    try {
      const existingRates = await stripe.taxRates.list({ active: true, limit: 100 });
      const found = existingRates.data.find(
        (r: any) => r.metadata?.lookup_key === taxRateLookupKey,
      );
      if (found) {
        taxRateId = found.id;
      } else {
        const created = await stripe.taxRates.create({
          display_name: "DPH",
          description: "DPH 21 %",
          jurisdiction: "CZ",
          country: "CZ",
          percentage: 21,
          inclusive: true,
          tax_type: "vat",
          metadata: { lookup_key: taxRateLookupKey },
        });
        taxRateId = created.id;
      }
    } catch (e) {
      console.error("tax rate setup failed:", e);
    }

    const lineItem = stripePrice
      ? {
          price: stripePrice.id,
          quantity: 1,
          ...(taxRateId && { tax_rates: [taxRateId] }),
        }
      : {
          price_data: {
            currency: REGISTRATION_FEE_CURRENCY,
            unit_amount: REGISTRATION_FEE_AMOUNT,
            product_data: {
              name: REGISTRATION_FEE_NAME,
              tax_code: "txcd_10000000",
            },
          },
          quantity: 1,
          ...(taxRateId && { tax_rates: [taxRateId] }),
        };

    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      payment_intent_data: { description: REGISTRATION_FEE_NAME },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: REGISTRATION_FEE_NAME,
          footer: "Vystavila: Viveka s.r.o. — Děkujeme za registraci.",
          rendering_options: { amount_tax_display: "include_inclusive_tax" },
        },
      },
      ...(customerId && {
        customer: customerId,
        customer_update: { address: "auto", name: "auto" },
      }),
      metadata: { userId: effectiveUserId },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: "Nepodařilo se vytvořit platbu. Zkuste to prosím později." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
