import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  FIREBASE_RUNTIME_INFO,
  runBackendDiagnostics,
  type BackendDiagnosticsReport,
} from '../../lib/firebase';
import { saveCompanySettings, uploadImageToStorage } from '../../services/firestoreService';
import type { CompanySettings } from '../../types';

interface CompanySettingsTabProps {
  settings: CompanySettings;
}

export function CompanySettingsTab({ settings }: CompanySettingsTabProps) {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [contactText, setContactText] = useState(settings.contactNumbers.join(', '));
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [aboutSummary, setAboutSummary] = useState(settings.aboutSummary);
  const [aboutStory, setAboutStory] = useState(settings.aboutStory);
  const [footerCopyright, setFooterCopyright] = useState(settings.footerCopyright);
  const [businessHours, setBusinessHours] = useState(settings.businessHours);
  const [gstNumber, setGstNumber] = useState(settings.gstNumber);

  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [companyMsg, setCompanyMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [diagRunning, setDiagRunning] = useState(false);
  const [diagReport, setDiagReport] = useState<BackendDiagnosticsReport | null>(null);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setTagline(settings.tagline);
    setLogoUrl(settings.logoUrl);
    setContactText(settings.contactNumbers.join(', '));
    setEmail(settings.email);
    setAddress(settings.address);
    setAboutSummary(settings.aboutSummary);
    setAboutStory(settings.aboutStory);
    setFooterCopyright(settings.footerCopyright);
    setBusinessHours(settings.businessHours);
    setGstNumber(settings.gstNumber);
  }, [settings]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyMsg(null);
    setErrorMsg(null);
    setSavingCompany(true);
    try {
      const contactNumbers = contactText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await saveCompanySettings({
        companyName,
        tagline,
        logoUrl,
        contactNumbers,
        email,
        address,
        aboutSummary,
        aboutStory,
        footerCopyright,
        businessHours,
        gstNumber,
      });
      setCompanyMsg('Company details & footer updated across the live site.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save company settings.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadingLogo(true);
    try {
      const url = await uploadImageToStorage(file, 'branding');
      setLogoUrl(url);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Logo upload failed (${err.message}). Paste a logo URL instead if Storage is not enabled.`
          : 'Logo upload failed.'
      );
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRunDiagnostics = async () => {
    setDiagRunning(true);
    try {
      const report = await runBackendDiagnostics();
      setDiagReport(report);
    } finally {
      setDiagRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSaveCompany}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-start gap-2.5 border-b border-slate-100 pb-4">
          <Building2 className="w-5 h-5 text-[#14452F] mt-0.5 shrink-0" />
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Company Branding, Contact &amp; Footer Settings
            </h3>
            <p className="text-xs text-slate-500">
              Changes reflect immediately across the public header, About page, Contact page, and footer.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {companyMsg && (
          <div className="p-3 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 text-xs text-[#14452F] font-medium">
            {companyMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Official Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contact Numbers (comma-separated) *
            </label>
            <input
              type="text"
              required
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder="7585841977, 7074340808"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Business Hours</label>
            <input
              type="text"
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN (optional)</label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Company Logo URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://... or upload logo"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#14452F] bg-[#ECF4EF] hover:bg-[#DCECE3] rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploadingLogo ? 'Uploading...' : 'Upload Logo to Firebase Storage'}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo}
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Address *</label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            About Summary (Homepage &amp; Footer)
          </label>
          <textarea
            rows={2}
            value={aboutSummary}
            onChange={(e) => setAboutSummary(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Full Company Story (About Us Page)
          </label>
          <textarea
            rows={4}
            value={aboutStory}
            onChange={(e) => setAboutStory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Footer Copyright Notice *
          </label>
          <input
            type="text"
            required
            value={footerCopyright}
            onChange={(e) => setFooterCopyright(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={savingCompany}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
          >
            {savingCompany ? 'Saving Settings...' : 'Save Company Settings'}
          </button>
        </div>
      </form>

      {/* Firebase Backend & Security Diagnostics */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-2.5">
            <Database className="w-5 h-5 text-[#14452F] mt-0.5 shrink-0" />
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Firebase Backend &amp; Security Diagnostics
              </h3>
              <p className="text-xs text-slate-500">
                Verify live Cloud Firestore connectivity, security rule isolation, Authentication providers, and Storage bucket status.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={diagRunning}
            onClick={() => void handleRunDiagnostics()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
          >
            <Activity className={`w-3.5 h-3.5 ${diagRunning ? 'animate-spin' : ''}`} />
            {diagRunning ? 'Checking Backend...' : 'Run Live Connectivity Check'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200">
            <p className="text-slate-500">Firebase Project ID</p>
            <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5 truncate">
              {FIREBASE_RUNTIME_INFO.projectId}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200">
            <p className="text-slate-500">Firestore Database</p>
            <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5 truncate">
              {FIREBASE_RUNTIME_INFO.firestoreDatabaseId}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200">
            <p className="text-slate-500">Storage Bucket</p>
            <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5 truncate">
              {FIREBASE_RUNTIME_INFO.storageBucket}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200">
            <p className="text-slate-500">Auth Domain</p>
            <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5 truncate">
              {FIREBASE_RUNTIME_INFO.authDomain}
            </p>
          </div>
        </div>

        {diagReport && (
          <div className="space-y-2.5">
            <p className="text-[11px] text-slate-500 font-mono-tabular">
              Last checked: {new Date(diagReport.checkedAt).toLocaleString()}
            </p>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {diagReport.checks.map((item) => (
                <div key={item.id} className="p-3.5 bg-white flex items-start gap-3 text-xs">
                  {item.status === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : item.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="text-slate-600 leading-relaxed">{item.detail}</p>
                    {item.actionRequired && (
                      <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 font-medium">
                        Action Required: {item.actionRequired}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
