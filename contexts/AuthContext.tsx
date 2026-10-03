'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, DesignerProfile, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  designerProfile: DesignerProfile | null;
  loading: boolean;
  isImpersonating?: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: UserRole }>;
  impersonateUser: (userId: string) => Promise<{ error: Error | null }>;
  stopImpersonation: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    designerDetails?: {
      businessName: string;
      state: string;
      city?: string;
      area: string;
      address?: string;
      categories: string[];
      whatsapp?: string;
    }
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USERS_MAP: Record<string, { id: string; name: string; role: UserRole }> = {
  'dele.couture@demo.tailoram.com': {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Bamidele Adeleke',
    role: 'designer',
  },
  'maryam.bello@demo.tailoram.com': {
    id: '11111111-1111-1111-1111-111111111102',
    name: 'Hajiya Maryam Bello',
    role: 'designer',
  },
  'emeka.craft@demo.tailoram.com': {
    id: '11111111-1111-1111-1111-111111111103',
    name: 'Chukwuemeka Okoli',
    role: 'designer',
  },
  'yewande.adire@demo.tailoram.com': {
    id: '11111111-1111-1111-1111-111111111104',
    name: 'Yewande Salami',
    role: 'designer',
  },
  'zainab.kaftan@demo.tailoram.com': {
    id: '11111111-1111-1111-1111-111111111105',
    name: 'Zainab Danjuma',
    role: 'designer',
  },
  'chidinma.bridal@demo.tailoram.com': {
    id: '11111111-1111-1111-1111-111111111106',
    name: 'Chidinma Nnamani',
    role: 'designer',
  },
  'tunde.balogun@demo.tailoram.com': {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Tunde Balogun',
    role: 'client',
  },
  'amina.mohammed@demo.tailoram.com': {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Amina Mohammed',
    role: 'client',
  },
  'ngozi.eze@demo.tailoram.com': {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Ngozi Eze',
    role: 'client',
  },
  'femi.adeyemi@demo.tailoram.com': {
    id: '22222222-2222-2222-2222-222222222204',
    name: 'Femi Adeyemi',
    role: 'client',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [designerProfile, setDesignerProfile] = useState<DesignerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Fetch user profile and designer profile if applicable
  const fetchProfiles = async (userId: string) => {
    try {
      // 1. Fetch main profile
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let activeProfile: Profile | null = profData as Profile | null;

      if (!activeProfile) {
        const matchedDemo = Object.values(DEMO_USERS_MAP).find((u) => u.id === userId);
        if (matchedDemo) {
          activeProfile = {
            id: matchedDemo.id,
            role: matchedDemo.role,
            full_name: matchedDemo.name,
            created_at: new Date().toISOString(),
          };
        }
      }

      if (activeProfile) {
        setProfile(activeProfile);

        // 2. If user is a designer, fetch their designer profile
        if (activeProfile.role === 'designer') {
          const { data: dData, error: dError } = await supabase
            .from('designer_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!dError && dData) {
            const storedUpdatedProfiles = typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem('tailoram_updated_designer_profiles') || '{}')
              : {};
            const localUpdates = storedUpdatedProfiles[dData.id] || {};
            const localAvatar = typeof window !== 'undefined' ? localStorage.getItem(`tailoram_avatar_${dData.id}`) : null;
            const mergedDesigner: DesignerProfile = {
              ...(dData as DesignerProfile),
              ...localUpdates,
              profile_image_url: localUpdates.profile_image_url || (dData as any).profile_image_url || localAvatar || null,
            };
            setDesignerProfile(mergedDesigner);
          } else {
            setDesignerProfile(null);
          }
        } else {
          setDesignerProfile(null);
        }
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfiles(user.id);
    }
  };

  useEffect(() => {
    // Check impersonation flag on mount
    if (typeof window !== 'undefined') {
      const imp = sessionStorage.getItem('tailoram_impersonating_admin');
      if (imp) {
        setIsImpersonating(true);
      }
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfiles(session.user.id).finally(() => setLoading(false));
      } else {
        // Restore demo session from localStorage if present
        try {
          if (typeof window !== 'undefined') {
            const demoRaw = localStorage.getItem('tailoram_demo_session');
            if (demoRaw) {
              const parsed = JSON.parse(demoRaw);
              if (parsed?.user?.id) {
                setUser(parsed.user);
                setSession(parsed.session || null);
                fetchProfiles(parsed.user.id).finally(() => setLoading(false));
                return;
              }
            }
          }
        } catch {
          // ignore parse error
        }
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        await fetchProfiles(session.user.id);
        setLoading(false);
      } else {
        const hasDemo = typeof window !== 'undefined' && localStorage.getItem('tailoram_demo_session');
        if (!hasDemo) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setDesignerProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign In function
  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Attempt standard Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data?.user) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tailoram_demo_session');
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        await fetchProfiles(data.user.id);
        return { error: null, role: (prof?.role as UserRole) || 'client' };
      }

      // 2. Fallback check for demo accounts & admin-reset credentials
      let customPasswords: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('tailoram_user_passwords');
          if (local) customPasswords = { ...customPasswords, ...JSON.parse(local) };
        } catch {}
      }
      try {
        const { data: setts } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'user_passwords')
          .maybeSingle();
        if (setts?.value && typeof setts.value === 'object') {
          customPasswords = { ...customPasswords, ...setts.value };
        }
      } catch {}

      const isKnownDemo = cleanEmail in DEMO_USERS_MAP;
      const expectedPassword = customPasswords[cleanEmail] || 'Tailoram2026!';

      if (isKnownDemo || customPasswords[cleanEmail]) {
        if (password === expectedPassword || password === 'Tailoram2026!') {
          const demoInfo = DEMO_USERS_MAP[cleanEmail] || {
            id: '11111111-1111-1111-1111-111111111101',
            name: 'Demo User',
            role: 'designer' as UserRole,
          };

          const syntheticUser: User = {
            id: demoInfo.id,
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: demoInfo.name, role: demoInfo.role },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: cleanEmail,
            phone: '',
            role: 'authenticated',
            updated_at: new Date().toISOString(),
          };

          const syntheticSession: Session = {
            access_token: 'demo-token-' + demoInfo.id,
            token_type: 'bearer',
            expires_in: 86400 * 30,
            expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
            refresh_token: 'demo-refresh-' + demoInfo.id,
            user: syntheticUser,
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'tailoram_demo_session',
              JSON.stringify({ user: syntheticUser, session: syntheticSession })
            );
          }

          setUser(syntheticUser);
          setSession(syntheticSession);
          await fetchProfiles(demoInfo.id);

          return { error: null, role: demoInfo.role };
        }
      }

      // Return clean, human-friendly error without technical hints
      return {
        error: new Error('Invalid email or password. Please try again.'),
      };
    } catch (err: any) {
      return {
        error: new Error(err.message || 'Invalid email or password. Please try again.'),
      };
    }
  };

  // Sign Up function
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    designerDetails?: {
      businessName: string;
      bio?: string;
      state: string;
      city?: string;
      area: string;
      address?: string;
      categories: string[];
      whatsapp?: string;
    }
  ) => {
    try {
      // 1. Sign up user with metadata passed directly to Supabase Auth.
      // The Postgres trigger automatically reads this data and creates the
      // profiles and designer_profiles rows cleanly with SECURITY DEFINER.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            business_name: designerDetails?.businessName || fullName,
            bio: designerDetails?.bio || null,
            state: designerDetails?.state || 'Lagos',
            city: designerDetails?.city || designerDetails?.state || 'Lagos',
            area: designerDetails?.area || 'General',
            address: designerDetails?.address || null,
            categories: designerDetails?.categories || ['native_wear', 'ankara'],
            whatsapp: designerDetails?.whatsapp || null,
          },
        },
      });

      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) {
        throw new Error('Registration failed. Please check your credentials.');
      }

      // Check if user has an active session or if Supabase email confirmation is enabled
      const hasActiveSession = !!authData.session;

      // Also attempt client-side upsert as fallback (safely ignored if trigger handled it)
      try {
        await supabase.from('profiles').upsert(
          {
            id: newUserId,
            full_name: fullName,
            role: role,
          },
          { onConflict: 'id' }
        );

        if (role === 'designer' && designerDetails) {
          const designerInsertPayload: any = {
            user_id: newUserId,
            business_name: designerDetails.businessName || fullName,
            bio: designerDetails.bio || null,
            state: designerDetails.state || 'Lagos',
            city: designerDetails.city || designerDetails.state || 'Lagos',
            area: designerDetails.area || 'General',
            address: designerDetails.address || null,
            categories: designerDetails.categories || ['native_wear', 'ankara'],
            whatsapp: designerDetails.whatsapp || null,
          };

          const { error: dUpsertError } = await supabase.from('designer_profiles').upsert(
            designerInsertPayload,
            { onConflict: 'user_id' }
          );

          // If address column doesn't exist yet in Supabase, retry without address so sign-up succeeds seamlessly
          if (dUpsertError && (dUpsertError.message?.toLowerCase().includes('address') || dUpsertError.code === 'PGRST204')) {
            const { address: _, ...safePayload } = designerInsertPayload;
            await supabase.from('designer_profiles').upsert(safePayload, { onConflict: 'user_id' });
          }
        }
      } catch (insertErr) {
        // Trigger on the database handles this automatically
        console.log('Client-side upsert fallback info:', insertErr);
      }

      if (hasActiveSession) {
        await fetchProfiles(newUserId);
        return { error: null, needsEmailConfirmation: false };
      } else {
        return { error: null, needsEmailConfirmation: true };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  // Impersonate User function (Allows Admins to manage any designer studio without password)
  const impersonateUser = async (targetUserId: string) => {
    try {
      setLoading(true);

      // 1. Fetch user's main profile
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      let targetProfile: Profile | null = profData as Profile | null;
      let targetName = targetProfile?.full_name || 'Designer';
      let targetRole: UserRole = targetProfile?.role || 'designer';

      // 2. Fetch designer profile for business information
      const { data: dData } = await supabase
        .from('designer_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      const businessName = dData?.business_name || targetName;

      // Fallback matching from DEMO_USERS_MAP if not found in profiles table
      const matchedDemo = Object.values(DEMO_USERS_MAP).find((u) => u.id === targetUserId);
      if (matchedDemo) {
        targetName = matchedDemo.name;
        targetRole = matchedDemo.role;
        if (!targetProfile) {
          targetProfile = {
            id: matchedDemo.id,
            role: matchedDemo.role,
            full_name: matchedDemo.name,
            created_at: new Date().toISOString(),
          };
        }
      }

      const matchedDemoEmail = Object.entries(DEMO_USERS_MAP).find(([_, u]) => u.id === targetUserId)?.[0];
      const targetEmail =
        matchedDemoEmail ||
        `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}@designer.tailoram.com`;

      const syntheticUser: User = {
        id: targetUserId,
        app_metadata: { provider: 'admin_impersonate' },
        user_metadata: { full_name: businessName, role: targetRole },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: targetEmail,
        phone: dData?.whatsapp || '',
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      const syntheticSession: Session = {
        access_token: 'impersonate-token-' + targetUserId,
        token_type: 'bearer',
        expires_in: 86400 * 30,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
        refresh_token: 'impersonate-refresh-' + targetUserId,
        user: syntheticUser,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'tailoram_demo_session',
          JSON.stringify({ user: syntheticUser, session: syntheticSession })
        );
        sessionStorage.setItem(
          'tailoram_impersonating_admin',
          JSON.stringify({
            userId: targetUserId,
            name: targetName,
            businessName: businessName,
          })
        );
      }

      setUser(syntheticUser);
      setSession(syntheticSession);
      setIsImpersonating(true);

      await fetchProfiles(targetUserId);

      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      console.error('Failed to impersonate user:', err);
      return { error: err };
    }
  };

  // Stop Impersonation function (Reverts back to Admin)
  const stopImpersonation = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tailoram_impersonating_admin');
      localStorage.removeItem('tailoram_demo_session');
    }
    setIsImpersonating(false);
    setUser(null);
    setSession(null);
    setProfile(null);
    setDesignerProfile(null);
  };

  // Sign Out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tailoram_demo_session');
      sessionStorage.removeItem('tailoram_impersonating_admin');
    }
    setIsImpersonating(false);
    setUser(null);
    setSession(null);
    setProfile(null);
    setDesignerProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        designerProfile,
        loading,
        isImpersonating,
        signIn,
        impersonateUser,
        stopImpersonation,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
