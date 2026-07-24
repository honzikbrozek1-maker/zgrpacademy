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

const REGISTRATION_FEE_PRICE_IDS = new Set([
  "registration_fee_v4_10czk",
  "registration_fee_v5_15czk",
  "registration_fee_v6_20czk",
  "registration_fee_v7_100czk",
]);
const REGISTRATION_FEE_PRICE_ID = "registration_fee_v7_100czk";
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

    const isRegistrationFee = REGISTRATION_FEE_PRICE_IDS.has(priceId);
    const prices = isRegistrationFee ? { data: [] } : await stripe.prices.list({ lookup_keys: [priceId] });
    const stripePrice = prices.data[0];

    if (!stripePrice && !isRegistrationFee) {
      throw new Error(`Price not found: ${priceId} (${env})`);
    }

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: effectiveEmail,
      userId: effectiveUserId,
    });

    // Účet příjemce není plátce DPH — daň se nepřipočítává ani neuvádí.
    // Registrační poplatek posíláme jako dynamickou cenu, aby se nepoužila stará uložená cena ve Stripe.
    const lineItem = isRegistrationFee
      ? {
          price_data: {
            currency: REGISTRATION_FEE_CURRENCY,
            unit_amount: REGISTRATION_FEE_AMOUNT,
            product_data: {
              name: REGISTRATION_FEE_NAME,
            },
          },
          quantity: 1,
        }
      : stripePrice
      ? {
          price: stripePrice.id,
          quantity: 1,
        }
      : null;

    if (!lineItem) {
      throw new Error(`Price not found: ${priceId} (${env})`);
    }


    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: "payment",
      ui_mode: "embedded_page",
      locale: "cs",
      return_url: returnUrl,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      payment_intent_data: { description: REGISTRATION_FEE_NAME },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: REGISTRATION_FEE_NAME,
          footer: "Neplátce DPH.\nIČO: 08720746",
        },
      },

      ...(customerId && {
        customer: customerId,
        customer_update: { address: "auto", name: "auto" },
      }),
      
      metadata: { userId: effectiveUserId },
    });

    // Nastav češtinu jako preferovaný jazyk zákazníka (ovlivňuje jazyk faktury)
    if (session.customer && typeof session.customer === "string") {
      try {
        await stripe.customers.update(session.customer, { preferred_locales: ["cs"] });
      } catch (_) { /* ignore */ }
    }

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
