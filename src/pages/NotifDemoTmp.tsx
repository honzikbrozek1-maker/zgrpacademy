import { useEffect } from 'react';
import { toast } from 'sonner';

export default function NotifDemoTmp() {
  useEffect(() => {
    toast('Nová žádost o admin oprávnění', {
      description: 'Tomáš Brožek žádá o admin oprávnění.',
      duration: 300000,
      action: { label: 'Schválit', onClick: () => {} },
      cancel: { label: 'Zamítnout', onClick: () => {} },
    });
  }, []);
  return <div className="min-h-screen bg-background p-6">demo</div>;
}
