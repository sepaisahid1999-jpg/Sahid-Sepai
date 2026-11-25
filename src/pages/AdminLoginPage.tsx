import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogOut, MailCheck, RefreshCw, ShieldAlert } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { BOOTSTRAPPED_ADMIN_EMAILS } from '../lib/constants';

export function AdminLoginPage() {
  const { settings } = useCompany();
  const {
    user,
    profile,
    role,
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
    clearAuthError,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isViewer) {
      navigate('/viewer', { replace: true });
    }
  }, [authReady, user, isAdmin, isViewer, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSentMsg(null);
    setSigningIn(true);
    try {
      await signInWithEmail(email, password);
    } catch {
      // Error surfaced via authError in context
    } finally {
      setSigningIn(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSentMsg(null);
    setSigningIn(true);
    try {
      await sendPasswordReset(email);
      setResetSentMsg(
        `Password reset instructions sent to ${email.trim()}. Check your inbox and spam folder.`
      );
    } catch {
      // Error surfaced via authError in context
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setResetSentMsg(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error surfaced via authError in context
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyMsg(null);
    setVerifyBusy(true);
    try {
      await sendVerificationEmail();
      setVerifyMsg(`Verification link sent to ${user?.email}. Open the email link, then click Refresh Status.`);
    } catch {
      // Error surfaced via authError
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleRefreshVerification = async () => {
    setVerifyMsg(null);
    setVerifyBusy(true);
    try {
      await refreshSession();
      setVerifyMsg('Session refreshed. If your email is not yet marked verified, confirm the verification link first.');
    } catch {
      // Error surfaced via authError
    } finally {
      setVerifyBusy(false);
    }
  };

  const isDisabledProfile = Boolean(user?.emailVerified && profile && !profile.active);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <PageMeta
        title={`Staff & Admin Login – ${settings.companyName}`}
        description={`Authorized administrator and viewer portal sign-in for ${settings.companyName}.`}
      />
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-7 sm:p-8 space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto h-11 w-11 rounded-lg bg-[#ECF4EF] text-[#14452F] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl font-semibold text-slate-950">
                Admin &amp; Viewer Portal
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Restricted access for authorized {settings.companyName} administrators and read-only viewers. Public admin registration is disabled.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 break-words">
                {authError}
              </div>
            )}

            {resetSentMsg && (
              <div className="p-3 rounded-lg bg-[#ECF4EF] border border-[#14452F]/25 text-xs text-[#14452F] font-medium">
                {resetSentMsg}
              </div>
            )}

            {!authReady ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Checking session...
              </div>
            ) : user && !user.emailVerified ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <MailCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950 space-y-1">
                    <p className="font-semibold">Email Verification Required</p>
                    <p className="leading-relaxed">
                      Signed in as <strong>{user.email}</strong>, but your email address is not verified yet. Server security rules require verified email addresses before loading staff permissions.
                    </p>
                  </div>
                </div>

                {verifyMsg && (
                  <div className="p-3 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 text-xs text-[#14452F]">
                    {verifyMsg}
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={verifyBusy}
                    onClick={() => void handleRefreshVerification()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyBusy ? 'animate-spin' : ''}`} />
                    I&apos;ve Verified — Refresh Session
                  </button>
                  <button
                    type="button"
                    disabled={verifyBusy}
                    onClick={() => void handleResendVerification()}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-[#14452F] bg-[#ECF4EF] hover:bg-[#DCECE3] disabled:opacity-50 rounded-lg"
                  >
                    Send / Resend Verification Email
                  </button>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : isDisabledProfile ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-900 space-y-1">
                    <p className="font-semibold">Account Disabled</p>
                    <p>
                      The account <strong>{user?.email}</strong> has been deactivated by an administrator.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : user && role === 'BUYER' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-semibold">Unauthorized Access Rejected</p>
                    <p>
                      Signed in as <strong>{user.email}</strong> (Role: BUYER). This account is not authorized for the Admin or Viewer portal.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                  <Link
                    to="/products"
                    className="flex-1 text-center py-2.5 px-4 text-xs font-semibold text-white bg-[#14452F] rounded-lg hover:bg-[#0D3322]"
                  >
                    Public Catalogue
                  </Link>
                </div>
              </div>
            ) : mode === 'reset' ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Authorized Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="gazijute91@gmail.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg transition-colors"
                >
                  {signingIn ? 'Sending Reset Link...' : 'Send Password Reset Email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    setResetSentMsg(null);
                    setMode('login');
                  }}
                  className="w-full text-xs font-medium text-slate-600 hover:text-slate-900 py-1"
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <form onSubmit={handleEmailLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="gazijute91@gmail.com"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          clearAuthError();
                          setResetSentMsg(null);
                          setMode('reset');
                        }}
                        className="text-[11px] font-medium text-[#14452F] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={signingIn || googleBusy}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {signingIn ? 'Signing In...' : 'Sign In with Email & Password'}
                  </button>
                </form>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                    Or
                  </span>
                  <div className="border-t border-slate-200 w-full" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn || googleBusy}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {googleBusy ? 'Signing in with Google...' : 'Continue with Authorized Google Account'}
                </button>
              </div>
            )}
          </div>

          {/* First Admin Setup Guide */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5 text-xs text-slate-600">
            <h2 className="font-semibold text-slate-900">First Admin Setup &amp; Security Guide</h2>
            <p className="leading-relaxed">
              Primary administrator accounts ({BOOTSTRAPPED_ADMIN_EMAILS.join(', ')}) are enforced server-side via Firebase Security Rules upon verified sign-in.
            </p>
            <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
              <li>
                In <strong>Firebase Console → Authentication → Sign-in method</strong>, ensure both <strong>Email/Password</strong> and <strong>Google</strong> are enabled.
              </li>
              <li>
                Create your Email/Password administrator login securely under <strong>Authentication → Users → Add user</strong> (no passwords are ever stored in code).
              </li>
              <li>
                Provision additional Admins or read-only Viewers exclusively inside <strong>Admin Dashboard → User Management</strong>.
              </li>
            </ol>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
