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
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: UserRole }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    designerDetails?: {
      businessName: string;
      area: string;
      categories: string[];
      whatsapp?: string;
    }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [designerProfile, setDesignerProfile] = useState<DesignerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile and designer profile if applicable
  const fetchProfiles = async (userId: string) => {
    try {
      // 1. Fetch main profile
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profError) {
        console.error('Error fetching profile:', profError.message);
        setProfile(null);
        setDesignerProfile(null);
        return;
      }

      setProfile(profData as Profile);

      // 2. If user is a designer, fetch their designer profile
      if (profData?.role === 'designer') {
        const { data: dData, error: dError } = await supabase
          .from('designer_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!dError && dData) {
          setDesignerProfile(dData as DesignerProfile);
        } else {
          setDesignerProfile(null);
        }
      } else {
        setDesignerProfile(null);
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
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfiles(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfiles(session.user.id);
      } else {
        setProfile(null);
        setDesignerProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign In function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        return { error: null, role: prof?.role as UserRole };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
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
      area: string;
      categories: string[];
      whatsapp?: string;
    }
  ) => {
    try {
      // 1. Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) {
        throw new Error('Registration failed. Please try again.');
      }

      // 2. Create entry in profiles table
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: newUserId,
          full_name: fullName,
          role: role,
        },
      ]);

      if (profileError) {
        console.error('Profile insertion error:', profileError);
        throw profileError;
      }

      // 3. If role is designer, create row in designer_profiles
      if (role === 'designer' && designerDetails) {
        const { error: designerError } = await supabase
          .from('designer_profiles')
          .insert([
            {
              user_id: newUserId,
              business_name: designerDetails.businessName || fullName,
              city: 'Lagos',
              area: designerDetails.area || 'Ikeja',
              categories: designerDetails.categories || ['native_wear'],
              whatsapp: designerDetails.whatsapp || null,
            },
          ]);

        if (designerError) {
          console.error('Designer profile creation error:', designerError);
          throw designerError;
        }
      }

      // Refresh state
      await fetchProfiles(newUserId);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Sign Out function
  const signOut = async () => {
    await supabase.auth.signOut();
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
        signIn,
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
