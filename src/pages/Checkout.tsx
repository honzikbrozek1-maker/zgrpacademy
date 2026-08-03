import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Vestavěné prohlížeče v aplikacích (Telegram, Messenger, Instagram…) často
 *  blokují cookies třetích stran a platební okno se v nich nenačte. */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Telegram|Line\/|MicroMessenger|Twitter|Snapchat|TikTok|Pinterest|LinkedInApp|WhatsApp/i.test(ua);
}

export default function Checkout() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const autoRetriedRef = useRef(false);
  const [inApp] = useState(() => isInAppBrowser());
  const [stripePromise] = useState(() => {
    try {
      return getStripe();
    } catch {
      return null;
    }
  });


  // Re-check profile on mount in case webhook already ran
  useEffect(() => {
    refreshProfile();
  }, []);

  // Pokud se stránka obnoví z cache prohlížeče (např. návrat zpět na mobilu),
  // stará platební relace už může být neplatná – vytvoříme novou.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setCheckoutError(null);
        setSessionKey((k) => k + 1);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Hlídač: pokud se platební rámeček do 12 s nevykreslí, zkusíme relaci
  // jednou automaticky vytvořit znovu; teprve pak ukážeme chybu.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const iframe = checkoutRef.current?.querySelector("iframe");
      if (iframe) return;
      if (!autoRetriedRef.current) {
        autoRetriedRef.current = true;
        setSessionKey((k) => k + 1);
      } else {
        setCheckoutError("timeout");
      }
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [sessionKey]);


  const fetchClientSecret = useCallback(async (): Promise<string> => {
    setCheckoutError(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: "registration_fee_v7_100czk",
          customerEmail: user?.email,
          userId: user?.id,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.clientSecret) {
        throw new Error(error?.message || "Nepodařilo se vytvořit platbu");
      }
      return data.clientSecret;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nepodařilo se vytvořit platbu";
      setCheckoutError(message);
      throw error;
    }
  }, [user?.email, user?.id, sessionKey]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.has_paid) return <Navigate to="/" replace />;


  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Registrační poplatek</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-2">
              Pro vstup do ZGRP Academy je potřeba uhradit jednorázový poplatek <strong>100 Kč</strong>. Po platbě obdržíš fakturu.
            </p>
            <p className="text-sm text-muted-foreground">
              Přihlášen jako: <span className="font-medium">{user.email}</span>{" "}
              <Button variant="link" className="px-1 h-auto" onClick={() => { signOut(); navigate("/auth"); }}>
                Odhlásit se
              </Button>
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nápověda k vyplnění adresy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Řádek 1 (Address line 1):</strong> ulice a číslo popisné, např. <em>Pražská 123</em>.</p>
            <p><strong className="text-foreground">Řádek 2 (Address line 2):</strong> nepovinné – doplněk adresy, např. <em>byt 5</em>, <em>patro 3</em>, <em>c/o Jan Novák</em>. V ČR a SK obvykle nechte prázdné.</p>
            <p><strong className="text-foreground">City (Město):</strong> název obce, např. <em>Praha</em> nebo <em>Brno</em>.</p>
            <p><strong className="text-foreground">Postal code (PSČ):</strong> poštovní směrovací číslo, v ČR 5 číslic (např. <em>110 00</em>), na SK 5 číslic (např. <em>811 01</em>).</p>
          </CardContent>
        </Card>

        {inApp && (
          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardContent className="pt-6 text-sm space-y-2">
              <p className="font-medium">Otevřete stránku v běžném prohlížeči</p>
              <p className="text-muted-foreground">
                Vypadá to, že jste stránku otevřeli uvnitř jiné aplikace (např. Telegram, Messenger nebo Instagram).
                Platební formulář se v ní často nenačte. Zkopírujte si odkaz a vložte ho do Safari nebo Chrome.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setLinkCopied(true);
                  } catch {
                    setLinkCopied(false);
                  }
                }}
              >
                {linkCopied ? "Odkaz zkopírován" : "Zkopírovat odkaz"}
              </Button>
            </CardContent>
          </Card>
        )}

        {checkoutError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive space-y-2">
              <p>Platební okno se nepodařilo načíst.</p>
              <p>
                Zkuste tlačítko „Načíst platbu znovu“ níže, otevřít stránku v jiném prohlížeči
                (Safari / Chrome) nebo vypnout blokování reklam a cookies třetích stran.
              </p>
            </CardContent>
          </Card>
        )}

        <div id="checkout" ref={checkoutRef}>
          {stripePromise ? (
            <EmbeddedCheckoutProvider
              key={sessionKey}
              stripe={stripePromise}
              options={checkoutOptions}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : null}
        </div>


        <p className="text-center text-sm text-muted-foreground">
          Nezobrazuje se platební formulář, nebo hlásí chybu?{" "}
          <Button
            variant="link"
            className="px-1 h-auto"
            onClick={() => {
              setCheckoutError(null);
              autoRetriedRef.current = false;
              setSessionKey((k) => k + 1);
            }}

          >
            Načíst platbu znovu
          </Button>
        </p>

      </div>
    </div>
  );
}
