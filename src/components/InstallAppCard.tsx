import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Smartphone, Share, Plus } from 'lucide-react';
import { useT } from '@/lib/i18n';
import iosGuideAsset from '@/assets/ios-pridat-na-plochu.png.asset.json';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppCard() {
  const t = useT();
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Smartphone className="h-4 w-4" /> {t('Přidat na plochu')}
        </div>

        {installed ? (
          <p className="text-xs text-muted-foreground">
            {t('Aplikaci máte nainstalovanou na ploše zařízení.')}
          </p>
        ) : deferred ? (
          <>
            <p className="text-xs text-muted-foreground">
              {t('Nainstalujte si ZGRP Academy jako aplikaci – otevírá se na celou obrazovku bez adresního řádku.')}
            </p>
            <Button
              size="sm"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setDeferred(null);
              }}
            >
              <Plus className="mr-1 h-3 w-3" /> {t('Nainstalovat aplikaci')}
            </Button>
          </>
        ) : isIOS ? (
          <div className="text-xs text-muted-foreground space-y-2">
            <p>{t('Na iPhonu/iPadu (v prohlížeči Safari):')}</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li className="flex items-center gap-1">
                {t('Klepněte na ikonu Sdílet')} <Share className="inline h-3 w-3" /> {t('dole uprostřed')}
              </li>
              <li>{t('Vyberte „Přidat na plochu“')}</li>
              <li>{t('Potvrďte tlačítkem „Přidat“')}</li>
            </ol>
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="block w-full">
                  <img
                    src={iosGuideAsset.url}
                    alt={t('Návod – jak si přidat aplikaci na plochu (iPhone, Safari)')}
                    className="w-full max-w-xs rounded-lg border shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in"
                    loading="lazy"
                  />
                  <span className="block mt-1 text-[11px] text-muted-foreground">
                    {t('Obrázkový návod – klepnutím zvětšíte. Platí pro zařízení Apple (iPhone/iPad) v prohlížeči Safari.')}
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-2">
                <img
                  src={iosGuideAsset.url}
                  alt={t('Návod – jak si přidat aplikaci na plochu (iPhone, Safari)')}
                  className="w-full h-auto rounded-md"
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{t('V prohlížeči otevřete nabídku (⋮ nebo ikona instalace v adresním řádku) a zvolte:')}</p>
            <p>{t('„Instalovat aplikaci“ / „Přidat na plochu“.')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InstallAppCard;
