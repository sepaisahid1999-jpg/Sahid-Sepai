import React, { useMemo, useState } from 'react';
import { Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { formatNumber } from '../../lib/accounting';
import {
  deleteUserInvite,
  inviteUserByEmail,
  updateUserProfileAccess,
} from '../../services/firestoreService';
import type { UserInvite, UserProfile, UserRole } from '../../types';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface UserManagementTabProps {
  users: UserProfile[];
  userInvites: UserInvite[];
  currentUid?: string;
}

type SortKey = 'name' | 'email' | 'role' | 'status';

type PendingAction =
  | { kind: 'revoke-invite'; invite: UserInvite }
  | { kind: 'change-role'; user: UserProfile; nextRole: UserRole }
  | { kind: 'toggle-active'; user: UserProfile; nextActive: boolean };

export function UserManagementTab({
  users,
  userInvites,
  currentUid,
}: UserManagementTabProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'VIEWER' | 'ADMIN'>('VIEWER');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('email');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.displayName.localeCompare(b.displayName);
      else if (sortKey === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortKey === 'role') cmp = a.role.localeCompare(b.role);
      else if (sortKey === 'status') cmp = Number(a.active) - Number(b.active);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [users, search, roleFilter, sortKey, sortDir]);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg(null);
    setActionError(null);
    const emailNorm = inviteEmail.trim().toLowerCase();
    if (!emailNorm.includes('@')) {
      setActionError('Enter a valid email address.');
      return;
    }
    setInviting(true);
    try {
      await inviteUserByEmail({
        email: emailNorm,
        displayName: inviteName.trim() || emailNorm,
        role: inviteRole,
      });
      setInviteMsg(`Authorized ${emailNorm} as ${inviteRole}.`);
      setInviteEmail('');
      setInviteName('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save invitation.');
    } finally {
      setInviting(false);
    }
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    setActionError(null);
    setConfirmBusy(true);
    try {
      if (pendingAction.kind === 'revoke-invite') {
        await deleteUserInvite(pendingAction.invite.email);
      } else if (pendingAction.kind === 'change-role') {
        await updateUserProfileAccess(pendingAction.user.uid, {
          displayName: pendingAction.user.displayName,
          role: pendingAction.nextRole,
          active: pendingAction.user.active,
        });
      } else if (pendingAction.kind === 'toggle-active') {
        await updateUserProfileAccess(pendingAction.user.uid, {
          displayName: pendingAction.user.displayName,
          role: pendingAction.user.role,
          active: pendingAction.nextActive,
        });
      }
      setPendingAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update user access.');
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Registered Accounts</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(users.length, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Administrators</p>
          <p className="text-xl font-semibold text-[#14452F] font-mono-tabular mt-1">
            {formatNumber(users.filter((u) => u.role === 'ADMIN' && u.active).length, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Read-Only Viewers</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(users.filter((u) => u.role === 'VIEWER' && u.active).length, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Allowlist Invites</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(userInvites.length, 0)}
          </p>
        </div>
      </div>

      {/* Pre-authorize Invite Form */}
      <form
        onSubmit={handleInviteSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#14452F]" />
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Authorize Viewer or Co-Admin Account
            </h3>
            <p className="text-xs text-slate-500">
              Pre-authorize a verified email address. Public signup cannot self-assign ADMIN or VIEWER roles.
            </p>
          </div>
        </div>

        {inviteMsg && (
          <div className="p-3 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 text-xs text-[#14452F] font-medium">
            {inviteMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="team.member@example.com"
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Full Name / Designation"
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'VIEWER' | 'ADMIN')}
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="VIEWER">VIEWER (Read-Only)</option>
              <option value="ADMIN">ADMIN (Full Access)</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg whitespace-nowrap"
            >
              {inviting ? 'Saving...' : 'Authorize'}
            </button>
          </div>
        </div>
      </form>

      {/* Authorized Email Allowlist */}
      {userInvites.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 text-xs font-semibold text-slate-800">
            Authorized Email Allowlist ({userInvites.length})
          </div>
          <div className="divide-y divide-slate-100">
            {userInvites.map((inv) => (
              <div
                key={inv.email}
                className="px-5 py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-900">{inv.displayName}</span>
                  <span className="text-slate-500 ml-2 font-mono-tabular">{inv.email}</span>
                  <span className="ml-2 font-semibold text-[#14452F]">· {inv.role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAction({ kind: 'revoke-invite', invite: inv })}
                  className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg"
                  aria-label={`Revoke ${inv.email}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registered Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Registered Portal Users ({filteredUsers.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as 'ALL' | UserRole);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              aria-label="Filter by role"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="VIEWER">VIEWER</option>
              <option value="BUYER">BUYER</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No matching users found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <SortableHeader
                      label="Name"
                      sortKey="name"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableHeader
                      label="Email"
                      sortKey="email"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Role"
                      sortKey="role"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Access Status"
                      sortKey="status"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="center"
                      className="pr-4"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedUsers.map((u) => {
                    const isSelf = u.uid === currentUid;
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {u.displayName}{' '}
                          {isSelf && <span className="text-slate-400 font-normal">(You)</span>}
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-slate-600">{u.email}</td>
                        <td className="py-3 px-3">
                          <select
                            value={u.role}
                            disabled={isSelf}
                            onChange={(e) => {
                              const nextRole = e.target.value as UserRole;
                              if (nextRole !== u.role) {
                                setPendingAction({ kind: 'change-role', user: u, nextRole });
                              }
                            }}
                            className="px-2.5 py-1 border border-slate-300 rounded bg-white text-xs disabled:opacity-60"
                            aria-label={`Role for ${u.email}`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="VIEWER">VIEWER</option>
                            <option value="BUYER">BUYER</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() =>
                              setPendingAction({
                                kind: 'toggle-active',
                                user: u,
                                nextActive: !u.active,
                              })
                            }
                            className={`px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-50 ${
                              u.active
                                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {u.active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* RBAC Matrix Reference */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-[#14452F]" />
          <span>Role-Based Access Control (RBAC) Enforcement</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-slate-200">
            <p className="font-semibold text-[#14452F]">ADMIN</p>
            <p className="mt-1 leading-relaxed">
              Full read/write control across inventory, purchases, sales, financial reports, CMS Website Control Panel, settings, and user role assignments.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-slate-200">
            <p className="font-semibold text-slate-900">VIEWER</p>
            <p className="mt-1 leading-relaxed">
              Strict read-only access to analytics, stock valuation, purchase/sales history, and CSV/Excel exports. All Firestore write operations are blocked by Security Rules.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-slate-200">
            <p className="font-semibold text-slate-900">BUYER</p>
            <p className="mt-1 leading-relaxed">
              Public catalogue browsing and WhatsApp/wholesale quotation submission only. Private costs, suppliers, profits, and logs remain hidden.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.kind === 'revoke-invite'
            ? `Revoke allowlist invitation for ${pendingAction.invite.email}?`
            : pendingAction?.kind === 'change-role'
              ? `Change role for ${pendingAction.user.displayName}?`
              : pendingAction?.kind === 'toggle-active'
                ? `${pendingAction.nextActive ? 'Enable' : 'Disable'} account access for ${pendingAction.user.displayName}?`
                : ''
        }
        description={
          pendingAction?.kind === 'revoke-invite'
            ? 'This email will no longer be automatically provisioned upon login.'
            : pendingAction?.kind === 'change-role'
              ? `User (${pendingAction.user.email}) role will change from ${pendingAction.user.role} to ${pendingAction.nextRole}.`
              : pendingAction?.kind === 'toggle-active'
                ? `Account (${pendingAction.user.email}) will be marked ${pendingAction.nextActive ? 'Active' : 'Disabled'}. Disabled accounts are denied all dashboard reads and writes.`
                : ''
        }
        variant={
          pendingAction?.kind === 'revoke-invite' ||
          (pendingAction?.kind === 'toggle-active' && !pendingAction.nextActive)
            ? 'danger'
            : 'primary'
        }
        confirmLabel="Confirm Change"
        busy={confirmBusy}
        onConfirm={executePendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
