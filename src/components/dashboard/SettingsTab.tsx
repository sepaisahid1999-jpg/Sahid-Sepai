import { useState } from 'react';
import type {
  CompanySettings,
  UserInvite,
  UserProfile,
  WhatsAppNumber,
} from '../../types';
import { CompanySettingsTab } from './CompanySettingsTab';
import { UserManagementTab } from './UserManagementTab';
import { WhatsAppManagementTab } from './WhatsAppManagementTab';

interface SettingsTabProps {
  settings: CompanySettings;
  whatsappNumbers: WhatsAppNumber[];
  users: UserProfile[];
  userInvites: UserInvite[];
  currentUid?: string;
}

export function SettingsTab({
  settings,
  whatsappNumbers,
  users,
  userInvites,
  currentUid,
}: SettingsTabProps) {
  const [subTab, setSubTab] = useState<'company' | 'whatsapp' | 'users'>('whatsapp');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('whatsapp')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            subTab === 'whatsapp'
              ? 'bg-[#14452F] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          WhatsApp Management
        </button>
        <button
          type="button"
          onClick={() => setSubTab('company')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            subTab === 'company'
              ? 'bg-[#14452F] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Company &amp; Footer Settings
        </button>
        <button
          type="button"
          onClick={() => setSubTab('users')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            subTab === 'users'
              ? 'bg-[#14452F] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Users &amp; Viewers
        </button>
      </div>

      {subTab === 'whatsapp' && <WhatsAppManagementTab whatsappNumbers={whatsappNumbers} />}
      {subTab === 'company' && <CompanySettingsTab settings={settings} />}
      {subTab === 'users' && (
        <UserManagementTab users={users} userInvites={userInvites} currentUid={currentUid} />
      )}
    </div>
  );
}
