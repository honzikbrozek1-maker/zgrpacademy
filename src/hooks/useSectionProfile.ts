import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface SectionProfile {
  color_scheme: string;
}

function getCachedSectionProfile(category: string): SectionProfile | null {
  if (typeof window === 'undefined') return null;

  const cachedColorScheme = localStorage.getItem(`section-color-scheme:${category}`);
  if (!cachedColorScheme) return null;

  return {
    color_scheme: cachedColorScheme,
  };
}

export function useSectionProfile(category: string) {
  const { user } = useAuth();
  const [sectionProfile, setSectionProfile] = useState<SectionProfile | null>(() => getCachedSectionProfile(category));

  const refresh = useCallback(async () => {
    if (!user) {
      setSectionProfile(getCachedSectionProfile(category));
      return;
    }

    const { data } = await supabase
      .from('section_profiles')
      .select('color_scheme')
      .eq('user_id', user.id)
      .eq('category', category)
      .single();

    if (data) {
      setSectionProfile(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`section-color-scheme:${category}`, data.color_scheme);
      }
      return;
    }

    setSectionProfile(getCachedSectionProfile(category));
  }, [user, category]);

  useEffect(() => {
    setSectionProfile(getCachedSectionProfile(category));
    refresh();
  }, [category, refresh]);

  return { sectionProfile, refreshSectionProfile: refresh };
}
