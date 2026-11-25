import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { BOOTSTRAPPED_ADMIN_EMAILS } from '../lib/constants';
import type { UserInvite, UserProfile, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isViewer: boolean;
  authReady: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'auth/operation-not-allowed' || msg.includes('PASSWORD_LOGIN_DISABLED')) {
    return 'Email/Password sign-in is disabled in Firebase Console. Enable it under Authentication → Sign-in method → Email/Password.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Invalid email address or password. Check your credentials or use Forgot Password.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Wait a few minutes or reset your password.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled in Firebase Authentication.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in window was closed before completing.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not allowlisted under Firebase Console → Authentication → Settings → Authorized domains.';
  }
  return msg || fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncUserProfile = useCallback(async (firebaseUser: User | null) => {
    setUser(firebaseUser);
    if (!firebaseUser) {
      setProfile(null);
      setAuthReady(true);
      return;
    }

    // Security Rules enforce email_verified == true on all /users reads & writes.
    // Avoid spurious PERMISSION_DENIED errors when an Email/Password account is unverified.
    if (!firebaseUser.emailVerified) {
      setProfile(null);
      setAuthReady(true);
      return;
    }

    const email = (firebaseUser.email || '').toLowerCase();
    const userPath = `users/${firebaseUser.uid}`;

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
      } else {
        let resolvedRole: UserRole = 'BUYER';
        if (
          BOOTSTRAPPED_ADMIN_EMAILS.includes(email as (typeof BOOTSTRAPPED_ADMIN_EMAILS)[number])
        ) {
          resolvedRole = 'ADMIN';
        } else if (email) {
          try {
            const inviteSnap = await getDoc(doc(db, 'userInvites', email));
            if (inviteSnap.exists()) {
              const invite = inviteSnap.data() as UserInvite;
              if (invite.active && (invite.role === 'ADMIN' || invite.role === 'VIEWER')) {
                resolvedRole = invite.role;
              }
            }
          } catch {
            // No invite found or not readable; fallback strictly to BUYER
          }
        }

        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: email || 'unknown@example.com',
          displayName: (firebaseUser.displayName || email.split('@')[0] || 'User').slice(0, 120),
          role: resolvedRole,
          active: true,
        };

        await setDoc(userRef, {
          ...newProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Auth profile resolution error:', err);
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.GET, userPath);
        } catch (formatted) {
          setAuthError(formatted instanceof Error ? formatted.message : String(formatted));
        }
      } else {
        setAuthError(err instanceof Error ? err.message : 'Failed to load user profile.');
      }
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      void syncUserProfile(firebaseUser);
    });

    return () => unsub();
  }, [syncUserProfile]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = mapFirebaseAuthError(err, 'Google sign-in failed.');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      const msg = 'Enter both your email address and password.';
      setAuthError(msg);
      throw new Error(msg);
    }
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
    } catch (err) {
      const msg = mapFirebaseAuthError(err, 'Email/Password sign-in failed.');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      const msg = 'Enter your authorized email address to receive a password reset link.';
      setAuthError(msg);
      throw new Error(msg);
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
    } catch (err) {
      const msg = mapFirebaseAuthError(err, 'Unable to send password reset email.');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const sendVerificationEmail = async () => {
    setAuthError(null);
    if (!auth.currentUser) {
      throw new Error('No active user session found.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      const msg = mapFirebaseAuthError(err, 'Unable to send verification email.');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const refreshSession = async () => {
    setAuthError(null);
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      await syncUserProfile(auth.currentUser);
    } catch (err) {
      const msg = mapFirebaseAuthError(err, 'Unable to refresh session.');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
    setProfile(null);
  };

  const emailLower = (user?.email || '').toLowerCase();
  const isBootstrapped =
    Boolean(user?.emailVerified) &&
    BOOTSTRAPPED_ADMIN_EMAILS.includes(emailLower as (typeof BOOTSTRAPPED_ADMIN_EMAILS)[number]);

  const effectiveRole: UserRole = isBootstrapped
    ? 'ADMIN'
    : profile && profile.active
      ? profile.role
      : 'BUYER';

  const isAdmin = Boolean(user?.emailVerified) && effectiveRole === 'ADMIN';
  const isViewer =
    Boolean(user?.emailVerified) && (effectiveRole === 'ADMIN' || effectiveRole === 'VIEWER');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: effectiveRole,
        isAdmin,
        isViewer,
        authReady,
        authError,
        signInWithGoogle,
        signInWithEmail,
        sendPasswordReset,
        sendVerificationEmail,
        refreshSession,
        logout,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
