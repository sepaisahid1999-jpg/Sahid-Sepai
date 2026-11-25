import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SCHEMA_LIMITS } from '../lib/constants';
import { buildDefaultCmsConfig, mergeWithDefaultCmsConfig } from '../lib/cmsDefaults';
import {
  buildAuditLogPayload,
  generateSafeId,
  recordAuditLog,
  uploadImageToStorage,
} from './firestoreService';
import type {
  Announcement,
  CmsConfigDocument,
  CmsPage,
  CmsRevision,
  CmsRevisionAction,
} from '../types';

function clamp(val: string | undefined | null, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

export function slugifyCmsSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
  return cleaned || `page-${Date.now().toString(36)}`;
}

/**
 * Recursively strips `undefined` from objects/arrays so Firestore never rejects payloads.
 */
function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined || value === null) {
    return '' as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return value;
}

function buildConfigPayload(
  config: CmsConfigDocument,
  status: CmsConfigDocument['status'],
  version: number,
  uid: string
) {
  const clean = mergeWithDefaultCmsConfig(config);
  return {
    status,
    version: Math.max(1, Math.floor(version)),
    general: sanitizeForFirestore(clean.general),
    header: sanitizeForFirestore(clean.header),
    homepage: sanitizeForFirestore(clean.homepage),
    footer: sanitizeForFirestore(clean.footer),
    design: sanitizeForFirestore(clean.design),
    seo: sanitizeForFirestore(clean.seo),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
}

// ---------------------------------------------------------------------------
// Storage Upload Helper for CMS
// ---------------------------------------------------------------------------

export async function uploadCmsAsset(file: File, subfolder = 'assets'): Promise<string> {
  return uploadImageToStorage(file, `cms/${subfolder}`);
}

// ---------------------------------------------------------------------------
// Subscriptions: CMS Config (Published vs Draft)
// ---------------------------------------------------------------------------

export function subscribePublishedCmsConfig(
  onData: (config: CmsConfigDocument | null, exists: boolean) => void
): Unsubscribe {
  const path = 'cmsConfig/published';
  return onSnapshot(
    doc(db, 'cmsConfig', 'published'),
    (snap) => {
      if (snap.exists()) {
        onData(mergeWithDefaultCmsConfig(snap.data() as Partial<CmsConfigDocument>), true);
      } else {
        onData(null, false);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeDraftCmsConfig(
  onData: (config: CmsConfigDocument, exists: boolean) => void
): Unsubscribe {
  const path = 'cmsConfig/draft';
  return onSnapshot(
    doc(db, 'cmsConfig', 'draft'),
    (snap) => {
      if (snap.exists()) {
        onData(mergeWithDefaultCmsConfig(snap.data() as Partial<CmsConfigDocument>), true);
      } else {
        onData(buildDefaultCmsConfig(), false);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeCmsRevisions(onData: (revisions: CmsRevision[]) => void): Unsubscribe {
  const path = 'cmsRevisions';
  const q = query(collection(db, 'cmsRevisions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CmsRevision, 'id'>),
      }));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// ---------------------------------------------------------------------------
// Draft, Publish, Unpublish & Revision History Actions
// ---------------------------------------------------------------------------

async function createRevisionRecord(
  action: CmsRevisionAction,
  version: number,
  note: string,
  config: CmsConfigDocument
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Admin authentication required.');
  const email = auth.currentUser?.email || '';
  const revId = generateSafeId('rev');
  const clean = mergeWithDefaultCmsConfig(config);
  const { updatedAt: _omit, ...snapshotRest } = clean;
  void _omit;

  await setDoc(doc(db, 'cmsRevisions', revId), {
    version: Math.max(1, Math.floor(version)),
    action,
    note: clamp(note, 300),
    savedBy: uid,
    savedByEmail: clamp(email, 254),
    snapshot: sanitizeForFirestore({
      ...snapshotRest,
      version: Math.max(1, Math.floor(version)),
      updatedBy: uid,
    }),
    createdAt: serverTimestamp(),
  });
}

export async function saveDraftCmsConfig(
  config: CmsConfigDocument,
  note = 'Saved draft changes'
): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Admin authentication required.');
  const path = 'cmsConfig/draft';
  const nextVersion = Math.max(1, (config.version || 1) + 1);

  try {
    const payload = buildConfigPayload(config, 'DRAFT', nextVersion, uid);
    await setDoc(doc(db, 'cmsConfig', 'draft'), payload);
    await createRevisionRecord('DRAFT_SAVED', nextVersion, note, {
      ...config,
      status: 'DRAFT',
      version: nextVersion,
    });
    await recordAuditLog('CMS_DRAFT', 'CMS_CONFIG', 'draft', `Saved CMS draft v${nextVersion}: ${clamp(note, 160)}`);
    return nextVersion;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function publishCmsConfig(
  config: CmsConfigDocument,
  note = 'Published website updates'
): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Admin authentication required.');
  const path = 'cmsConfig/published';
  const nextVersion = Math.max(1, (config.version || 1) + 1);

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();
    const clean = mergeWithDefaultCmsConfig(config);

    // 1. Update cmsConfig/published
    batch.set(doc(db, 'cmsConfig', 'published'), {
      status: 'PUBLISHED',
      version: nextVersion,
      general: sanitizeForFirestore(clean.general),
      header: sanitizeForFirestore(clean.header),
      homepage: sanitizeForFirestore(clean.homepage),
      footer: sanitizeForFirestore(clean.footer),
      design: sanitizeForFirestore(clean.design),
      seo: sanitizeForFirestore(clean.seo),
      updatedBy: uid,
      updatedAt: now,
    });

    // 2. Sync cmsConfig/draft so draft & published match after publish
    batch.set(doc(db, 'cmsConfig', 'draft'), {
      status: 'PUBLISHED',
      version: nextVersion,
      general: sanitizeForFirestore(clean.general),
      header: sanitizeForFirestore(clean.header),
      homepage: sanitizeForFirestore(clean.homepage),
      footer: sanitizeForFirestore(clean.footer),
      design: sanitizeForFirestore(clean.design),
      seo: sanitizeForFirestore(clean.seo),
      updatedBy: uid,
      updatedAt: now,
    });

    // 3. Keep legacy companySettings/public synchronized for backward compatibility
    batch.set(doc(db, 'companySettings', 'public'), {
      companyName: clamp(clean.general.companyName || 'Gazi Jute Enterprises', SCHEMA_LIMITS.NAME_MAX),
      tagline: clamp(clean.general.tagline, 240),
      logoUrl: clamp(clean.general.logoUrl, 1000),
      contactNumbers: (clean.general.contactNumbers || [])
        .map((c) => clamp(c, SCHEMA_LIMITS.PHONE_MAX))
        .filter(Boolean)
        .slice(0, 6),
      email: clamp(clean.general.email || 'gazijute91@gmail.com', SCHEMA_LIMITS.EMAIL_MAX),
      address: clamp(clean.general.address, SCHEMA_LIMITS.ADDRESS_MAX),
      aboutSummary: clamp(clean.homepage.aboutSummary || clean.footer.description, 2000),
      aboutStory: clamp(clean.homepage.aboutStory, 5000),
      footerCopyright: clamp(clean.footer.copyrightText || '© Gazi Jute Enterprises', 240),
      businessHours: clamp(clean.general.businessHours, 200),
      gstNumber: clamp(clean.general.gstNumber, 32),
      updatedAt: now,
    });

    // 4. Write revision snapshot
    const revId = generateSafeId('rev');
    const { updatedAt: _omit, ...snapshotRest } = clean;
    void _omit;
    batch.set(doc(db, 'cmsRevisions', revId), {
      version: nextVersion,
      action: 'PUBLISHED',
      note: clamp(note, 300),
      savedBy: uid,
      savedByEmail: clamp(auth.currentUser?.email || '', 254),
      snapshot: sanitizeForFirestore({
        ...snapshotRest,
        status: 'PUBLISHED',
        version: nextVersion,
        updatedBy: uid,
      }),
      createdAt: now,
    });

    const auditPayload = buildAuditLogPayload(
      'CMS_PUBLISH',
      'CMS_CONFIG',
      'published',
      `Published CMS layout v${nextVersion}: ${clamp(note, 160)}`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }

    await batch.commit();
    return nextVersion;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function unpublishCmsConfig(currentPublished: CmsConfigDocument): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Admin authentication required.');
  const path = 'cmsConfig/published';
  const nextVersion = Math.max(1, (currentPublished.version || 1) + 1);

  try {
    const payload = buildConfigPayload(currentPublished, 'UNPUBLISHED', nextVersion, uid);
    await setDoc(doc(db, 'cmsConfig', 'published'), payload);
    await createRevisionRecord(
      'UNPUBLISHED',
      nextVersion,
      'Unpublished custom CMS layout (public site reverted to baseline defaults)',
      { ...currentPublished, status: 'UNPUBLISHED', version: nextVersion }
    );
    await recordAuditLog('CMS_UNPUBLISH', 'CMS_CONFIG', 'published', `Unpublished custom CMS layout (v${nextVersion})`);
    return nextVersion;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function restoreRevisionToDraft(revision: CmsRevision): Promise<CmsConfigDocument> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Admin authentication required.');
  const path = 'cmsConfig/draft';
  const nextVersion = Math.max(1, (revision.version || 1) + 1);
  const restored = mergeWithDefaultCmsConfig(revision.snapshot);

  try {
    const payload = buildConfigPayload(restored, 'DRAFT', nextVersion, uid);
    await setDoc(doc(db, 'cmsConfig', 'draft'), payload);
    await createRevisionRecord(
      'RESTORED',
      nextVersion,
      `Restored revision v${revision.version} (${revision.action}) into Draft`,
      { ...restored, status: 'DRAFT', version: nextVersion }
    );
    await recordAuditLog('CMS_RESTORE', 'CMS_CONFIG', 'draft', `Restored CMS revision v${revision.version} into draft v${nextVersion}`);
    return {
      ...restored,
      status: 'DRAFT',
      version: nextVersion,
      updatedBy: uid,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---------------------------------------------------------------------------
// CMS Pages CRUD
// ---------------------------------------------------------------------------

export function subscribePublishedCmsPages(onData: (pages: CmsPage[]) => void): Unsubscribe {
  const path = 'cmsPages';
  const q = query(collection(db, 'cmsPages'), where('status', '==', 'PUBLISHED'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<CmsPage, 'id'>) }))
        .sort((a, b) => a.title.localeCompare(b.title));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllCmsPages(onData: (pages: CmsPage[]) => void): Unsubscribe {
  const path = 'cmsPages';
  return onSnapshot(
    collection(db, 'cmsPages'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<CmsPage, 'id'>) }))
        .sort((a, b) => Number(b.isSystemPage) - Number(a.isSystemPage) || a.title.localeCompare(b.title));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function saveCmsPage(
  input: Omit<CmsPage, 'id' | 'pageId' | 'createdAt' | 'updatedAt'>,
  existingPageId?: string
): Promise<string> {
  const pageId = existingPageId || generateSafeId('page');
  const path = `cmsPages/${pageId}`;
  const cleanGallery = (input.galleryImages || [])
    .map((u) => clamp(u, 1200))
    .filter(Boolean)
    .slice(0, 8);
  const slug = slugifyCmsSlug(input.slug || input.title);

  try {
    const docRef = doc(db, 'cmsPages', pageId);
    const snap = await getDoc(docRef);
    const fields = {
      slug,
      title: clamp(input.title, 160),
      subtitle: clamp(input.subtitle, 400),
      heroImage: clamp(input.heroImage, 1200),
      content: clamp(input.content, 20000),
      galleryImages: cleanGallery,
      seoTitle: clamp(input.seoTitle, 160),
      seoDescription: clamp(input.seoDescription, 320),
      seoKeywords: clamp(input.seoKeywords, 400),
      seoOgImage: clamp(input.seoOgImage, 1200),
      status: input.status,
      isSystemPage: Boolean(input.isSystemPage),
      showInNav: Boolean(input.showInNav),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(docRef, fields);
      await recordAuditLog('CMS_PAGE_SAVE', 'CMS_PAGE', pageId, `Updated CMS page "/p/${slug}" (${input.status})`);
    } else {
      await setDoc(docRef, {
        pageId,
        ...fields,
        createdAt: serverTimestamp(),
      });
      await recordAuditLog('CMS_PAGE_SAVE', 'CMS_PAGE', pageId, `Created CMS page "/p/${slug}" (${input.status})`);
    }
    return pageId;
  } catch (error) {
    handleFirestoreError(error, existingPageId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCmsPage(pageId: string): Promise<void> {
  const path = `cmsPages/${pageId}`;
  try {
    await deleteDoc(doc(db, 'cmsPages', pageId));
    await recordAuditLog('CMS_PAGE_DELETE', 'CMS_PAGE', pageId, `Deleted CMS page (${pageId})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// Announcements CRUD
// ---------------------------------------------------------------------------

export function subscribeActiveAnnouncements(onData: (items: Announcement[]) => void): Unsubscribe {
  const path = 'announcements';
  const q = query(collection(db, 'announcements'), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }))
        .sort((a, b) => a.title.localeCompare(b.title));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllAnnouncements(onData: (items: Announcement[]) => void): Unsubscribe {
  const path = 'announcements';
  return onSnapshot(
    collection(db, 'announcements'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }))
        .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.title.localeCompare(b.title));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function saveAnnouncement(
  input: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || generateSafeId('ann');
  const path = `announcements/${id}`;

  try {
    const docRef = doc(db, 'announcements', id);
    const fields = {
      title: clamp(input.title, 160),
      message: clamp(input.message, 600),
      linkLabel: clamp(input.linkLabel, 60),
      linkUrl: clamp(input.linkUrl, 400),
      bgColor: clamp(input.bgColor || '#14452F', 24),
      textColor: clamp(input.textColor || '#FFFFFF', 24),
      isActive: Boolean(input.isActive),
      startDate: clamp(input.startDate, 32),
      endDate: clamp(input.endDate, 32),
      updatedAt: serverTimestamp(),
    };

    if (existingId) {
      await updateDoc(docRef, fields);
    } else {
      await setDoc(docRef, {
        ...fields,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const path = `announcements/${id}`;
  try {
    await deleteDoc(doc(db, 'announcements', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
