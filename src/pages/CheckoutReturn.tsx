import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { InvoicesList } from "@/components/InvoicesList";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refreshProfile, profile } = useAuth();
  const navigate = useNavigate();
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      while (!cancelled && attempts < 20) {
        await refreshProfile();
        if (cancelled) return;
        attempts++;
        // We can't read profile from closure reliably; fetch state via hook re-render
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) setPolling(false);
    };

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profile?.has_paid) {
      setPolling(false);
    }
  }, [profile?.has_paid]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {profile?.has_paid ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" /> Platba dokončena
              </>
            ) : polling ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" /> Ověřujeme platbu...
              </>
            ) : (
              "Platba zpracována"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionId && (
            <p className="text-xs text-muted-foreground break-all">Session: {sessionId}</p>
          )}
          {profile?.has_paid ? (
            <>
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Tvoje faktura</p>
                <InvoicesList />
              </div>
              <Button className="w-full" onClick={() => navigate("/")}>Pokračovat do aplikace</Button>
            </>
          ) : !polling ? (
            <>
              <p className="text-sm text-muted-foreground">
                Platba ještě nedorazila do systému. Pokud jsi zaplatil, zkus stránku obnovit za chvíli.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Zkusit znovu
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
