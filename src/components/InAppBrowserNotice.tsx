import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Vestavěné prohlížeče v aplikacích (WhatsApp, Telegram, Messenger, Instagram…)
 *  často blokují cookies třetích stran a platební okno se v nich nenačte. */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Telegram|Line\/|MicroMessenger|Twitter|Snapchat|TikTok|Pinterest|LinkedInApp|WhatsApp|WebView|GSA\//i.test(ua);
}

export function InAppBrowserNotice({ className }: { className?: string }) {
  const [inApp] = useState(() => isInAppBrowser());
  const [copied, setCopied] = useState(false);

  if (!inApp) return null;

  return (
    <Card className={`border-amber-500/40 bg-amber-500/10 ${className ?? ""}`}>
      <CardContent className="pt-6 text-sm space-y-2">
        <p className="font-medium">Otevřete stránku v běžném prohlížeči</p>
        <p className="text-muted-foreground">
          Vypadá to, že jste odkaz otevřeli uvnitř jiné aplikace (např. WhatsApp, Telegram,
          Messenger nebo Instagram). Registrace a hlavně platba se v ní často nenačtou.
          Zkopírujte si odkaz a vložte ho do Safari nebo Chrome.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Odkaz zkopírován" : "Zkopírovat odkaz"}
        </Button>
      </CardContent>
    </Card>
  );
}
