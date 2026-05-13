import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Checkout() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Re-check profile on mount in case webhook already ran
  useEffect(() => {
    refreshProfile();
  }, []);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.has_paid) return <Navigate to="/" replace />;

  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId: "registration_fee_v2",
        customerEmail: user.email,
        userId: user.id,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Nepodařilo se vytvořit platbu");
    }
    return data.clientSecret;
  };

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
              Pro vstup do ZGRP Academy je potřeba uhradit jednorázový poplatek <strong>15 Kč</strong>. Po platbě obdržíš fakturu.
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
          </CardContent>
        </Card>

        <div id="checkout">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
