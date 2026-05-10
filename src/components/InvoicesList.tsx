import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ExternalLink, Download } from "lucide-react";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  number: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export function InvoicesList() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("list-invoices", { body: {} });
      if (error) setError(error.message);
      else setInvoices(data?.invoices ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Načítání faktur...
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (invoices.length === 0) return <p className="text-sm text-muted-foreground">Zatím nemáš žádné faktury.</p>;

  return (
    <ul className="space-y-2">
      {invoices.map((inv) => {
        const hasInvoice = inv.hosted_invoice_url || inv.invoice_pdf;
        return (
          <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {inv.number ? `Faktura ${inv.number}` : "Faktura"} ·{" "}
                  {(inv.amount / 100).toLocaleString("cs-CZ")} {inv.currency.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(inv.created_at).toLocaleDateString("cs-CZ")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {hasInvoice ? (
                <>
                  {inv.hosted_invoice_url && (
                    <Button asChild size="sm" variant="outline">
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                        Zobrazit <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {inv.invoice_pdf && (
                    <Button asChild size="sm">
                      <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1 h-3 w-3" /> PDF
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Faktura není k dispozici (starší platba)
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
