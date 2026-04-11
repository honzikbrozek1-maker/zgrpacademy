import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface SectionProfile {
  total_points: number;
  current_level: number;
  color_scheme: string;
}

export function useSectionProfile(category: string) {
  const { user } = useAuth();
  const [sectionProfile, setSectionProfile] = useState<SectionProfile | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('section_profiles')
      .select('total_points, current_level, color_scheme')
      .eq('user_id', user.id)
      .eq('category', category)
      .single();
    if (data) setSectionProfile(data);
  }, [user, category]);

  useEffect(() => { refresh(); }, [refresh]);

  return { sectionProfile, refreshSectionProfile: refresh };
}
