import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import {
  calculateNextWeightedAveragePurchase,
  calculateSaleMetrics,
  roundCurrency,
} from '../lib/accounting';
import { DEFAULT_COMPANY_SETTINGS, SCHEMA_LIMITS } from '../lib/constants';
import {
  canHardDeleteProduct,
  normalizeSku,
  validateCategoryInput,
  validateImageFile,
  validateProductInput,
  type ProductHistoryCounts,
} from '../lib/productValidation';
import {
  calculateDetailedPurchaseCost,
  calculatePostReversalProductState,
  getReversedPurchaseIdSet,
  isDuplicateSupplierInvoice,
  validatePurchaseInput,
} from '../lib/purchaseValidation';
import { validateInternationalPhone } from '../lib/whatsapp';
import type {
  AuditLog,
  Category,
  CompanySettings,
  Customer,
  Enquiry,
  EnquiryStatus,
  Product,
  ProductStatus,
  PublicProduct,
  Purchase,
  PurchasePaymentStatus,
  PurchaseType,
  Sale,
  SaleType,
  StockTransaction,
  Supplier,
  UserInvite,
  UserProfile,
  UserRole,
  WhatsAppNumber,
} from '../types';

export function generateSafeId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function clamp(val: string | undefined | null, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SCHEMA_LIMITS.CATEGORY_MAX);
  return base.length >= 2 ? base : `cat-${Date.now().toString(36)}`;
}

export function buildAuditLogPayload(
  action: string,
  entityType: string,
  entityId: string,
  summary: string
) {
  const user = auth.currentUser;
  if (!user?.uid) return null;
  const email = clamp(user.email || 'admin@gazijute.com', SCHEMA_LIMITS.EMAIL_MAX);
  const safeEmail = email.length >= 3 ? email : 'admin@gazijute.com';
  const name = clamp(user.displayName || safeEmail.split('@')[0] || 'Admin', 120) || 'Admin';
  return {
    action: clamp(action, 64) || 'ADMIN_ACTION',
    entityType: clamp(entityType, 48) || 'SYSTEM',
    entityId: clamp(entityId, 128) || 'unknown',
    summary: clamp(summary, 400) || 'Administrative action recorded',
    actorUid: user.uid,
    actorEmail: safeEmail,
    actorName: name,
    createdAt: serverTimestamp(),
  };
}

export async function recordAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  summary: string
): Promise<void> {
  const payload = buildAuditLogPayload(action, entityType, entityId, summary);
  if (!payload) return;
  const id = generateSafeId('audit');
  const path = `auditLogs/${id}`;
  try {
    await setDoc(doc(db, 'auditLogs', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

function handleSubscriptionError(
  error: unknown,
  operationType: OperationType,
  path: string,
  onError?: (err: Error) => void
): void {
  if (onError) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    console.error('Firestore Subscription Error:', JSON.stringify({ error: rawMsg, operationType, path }));
    const friendly =
      rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('insufficient')
        ? `Access denied reading "${path}". Verify your verified Admin role and Firestore security rules.`
        : `Unable to sync live "${path}" records: ${rawMsg}`;
    onError(new Error(friendly));
    return;
  }
  handleFirestoreError(error, operationType, path);
}

// ---------------------------------------------------------------------------
// Subscriptions (Public)
// ---------------------------------------------------------------------------

export function subscribeCompanySettings(
  onData: (settings: CompanySettings, existsInDb: boolean) => void
): Unsubscribe {
  const path = 'companySettings/public';
  return onSnapshot(
    doc(db, 'companySettings', 'public'),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as CompanySettings, true);
      } else {
        onData(DEFAULT_COMPANY_SETTINGS, false);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeActiveCategories(onData: (items: Category[]) => void): Unsubscribe {
  const path = 'categories';
  const q = query(collection(db, 'categories'), where('active', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllCategories(
  onData: (items: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'categories';
  return onSnapshot(
    collection(db, 'categories'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribePublicProducts(onData: (items: PublicProduct[]) => void): Unsubscribe {
  const path = 'publicProducts';
  const q = query(collection(db, 'publicProducts'), where('status', '==', 'ACTIVE'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<PublicProduct, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function fetchPublicProductById(productId: string): Promise<PublicProduct | null> {
  const path = `publicProducts/${productId}`;
  try {
    const snap = await getDoc(doc(db, 'publicProducts', productId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<PublicProduct, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeActiveWhatsAppNumbers(
  onData: (items: WhatsAppNumber[]) => void
): Unsubscribe {
  const path = 'whatsappNumbers';
  const q = query(collection(db, 'whatsappNumbers'), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WhatsAppNumber, 'id'>),
      }));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// ---------------------------------------------------------------------------
// Subscriptions (Admin / Viewer)
// ---------------------------------------------------------------------------

export function subscribeAdminWhatsAppNumbers(
  onData: (items: WhatsAppNumber[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'whatsappNumbers';
  return onSnapshot(
    collection(db, 'whatsappNumbers'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<WhatsAppNumber, 'id'>) }))
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.displayName.localeCompare(b.displayName));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribePrivateProducts(
  onData: (items: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'products';
  return onSnapshot(
    collection(db, 'products'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribePurchases(
  onData: (items: Purchase[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'purchases';
  const q = query(collection(db, 'purchases'), orderBy('purchaseDate', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Purchase, 'id'>) }));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeSales(
  onData: (items: Sale[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'sales';
  const q = query(collection(db, 'sales'), orderBy('saleDate', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sale, 'id'>) }));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeStockTransactions(
  onData: (items: StockTransaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'stockTransactions';
  const q = query(collection(db, 'stockTransactions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StockTransaction, 'id'>),
      }));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeSuppliers(
  onData: (items: Supplier[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'suppliers';
  return onSnapshot(
    collection(db, 'suppliers'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Supplier, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeCustomers(
  onData: (items: Customer[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'customers';
  return onSnapshot(
    collection(db, 'customers'),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Customer, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeEnquiries(
  onData: (items: Enquiry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'enquiries';
  const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Enquiry, 'id'>) }));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeUsers(
  onData: (items: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as UserProfile)
        .sort((a, b) => a.email.localeCompare(b.email));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeUserInvites(
  onData: (items: UserInvite[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'userInvites';
  return onSnapshot(
    collection(db, 'userInvites'),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as UserInvite)
        .sort((a, b) => a.email.localeCompare(b.email));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeAuditLogs(
  onData: (items: AuditLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'auditLogs';
  const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AuditLog, 'id'>),
      }));
      onData(list);
    },
    (error) => handleSubscriptionError(error, OperationType.LIST, path, onError)
  );
}

// ---------------------------------------------------------------------------
// Storage Upload
// ---------------------------------------------------------------------------

export async function uploadImageToStorage(
  file: File,
  folder: string
): Promise<string> {
  if (!auth.currentUser?.uid) {
    throw new Error('Administrator authentication is required to upload images.');
  }
  if (!auth.currentUser.emailVerified) {
    throw new Error('Verified administrator email is required before uploading to Firebase Storage.');
  }
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
  const storageRef = ref(storage, `${folder}/${Date.now()}_${cleanName}`);
  try {
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    return await getDownloadURL(storageRef);
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : String(err);
    if (code === 'storage/unauthorized' || msg.includes('403')) {
      throw new Error(
        'Firebase Storage denied the upload. Ensure you are signed in as a verified Admin and deploy storage.rules in Firebase Console.'
      );
    }
    if (code === 'storage/bucket-not-found' || msg.includes('404')) {
      throw new Error(
        'Firebase Storage bucket is not initialized yet. Enable Storage in Firebase Console → Storage → Get started.'
      );
    }
    throw new Error(`Storage upload failed: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Initialization & Company Settings
// ---------------------------------------------------------------------------

export async function saveCompanySettings(settings: Omit<CompanySettings, 'updatedAt'>): Promise<void> {
  const path = 'companySettings/public';
  try {
    await setDoc(doc(db, 'companySettings', 'public'), {
      companyName: clamp(settings.companyName, SCHEMA_LIMITS.NAME_MAX),
      tagline: clamp(settings.tagline, 240),
      logoUrl: clamp(settings.logoUrl, 1000),
      contactNumbers: settings.contactNumbers
        .map((c) => clamp(c, SCHEMA_LIMITS.PHONE_MAX))
        .filter(Boolean)
        .slice(0, 6),
      email: clamp(settings.email, SCHEMA_LIMITS.EMAIL_MAX),
      address: clamp(settings.address, SCHEMA_LIMITS.ADDRESS_MAX),
      aboutSummary: clamp(settings.aboutSummary, 2000),
      aboutStory: clamp(settings.aboutStory, 5000),
      footerCopyright: clamp(settings.footerCopyright, 240),
      businessHours: clamp(settings.businessHours, 200),
      gstNumber: clamp(settings.gstNumber, 32),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      'UPDATE_COMPANY_SETTINGS',
      'COMPANY_SETTINGS',
      'public',
      `Updated company settings & branding for ${clamp(settings.companyName, 80)}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function initializeDefaultCompanyAndWhatsApp(): Promise<void> {
  try {
    const settingsSnap = await getDoc(doc(db, 'companySettings', 'public'));
    if (!settingsSnap.exists()) {
      await saveCompanySettings(DEFAULT_COMPANY_SETTINGS);
    }

    const waSnap = await getDocs(collection(db, 'whatsappNumbers'));
    if (waSnap.empty) {
      const batch = writeBatch(db);
      const id1 = generateSafeId('wa');
      const id2 = generateSafeId('wa');
      batch.set(doc(db, 'whatsappNumbers', id1), {
        displayName: 'Primary Wholesale Desk',
        phoneNumber: '+917585841977',
        isActive: true,
        isDefault: true,
        receivesProductEnquiries: true,
        receivesGeneralEnquiries: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'whatsappNumbers', id2), {
        displayName: 'Trade & Dispatch Desk',
        phoneNumber: '+917074340808',
        isActive: true,
        isDefault: false,
        receivesProductEnquiries: true,
        receivesGeneralEnquiries: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    }

    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      const starterCategories = [
        { name: 'Raw Jute Fiber', description: 'Graded Tossa and White raw jute bales for spinning and export.' },
        { name: 'Hessian Cloth', description: 'Woven jute burlap rolls in commercial GSM widths.' },
        { name: 'Jute Gunny Sacks', description: 'Heavy-duty B-Twill and A-Twill agricultural grain sacks.' },
        { name: 'Jute Twine & Yarn', description: 'Multi-ply twisted jute twine spools and industrial yarn.' },
      ];
      const batch = writeBatch(db);
      for (const cat of starterCategories) {
        const id = generateSafeId('cat');
        batch.set(doc(db, 'categories', id), {
          name: cat.name,
          slug: slugify(cat.name),
          description: cat.description,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'companySettings/public');
  }
}

// ---------------------------------------------------------------------------
// Categories CRUD
// ---------------------------------------------------------------------------

export async function createCategory(input: {
  name: string;
  description?: string;
  active?: boolean;
}): Promise<string> {
  const id = generateSafeId('cat');
  const path = `categories/${id}`;
  try {
    const existingSnap = await getDocs(collection(db, 'categories'));
    const existing = existingSnap.docs.map((d) => ({
      id: d.id,
      name: String((d.data() as { name?: string }).name || ''),
    }));
    const check = validateCategoryInput(
      { name: input.name, description: input.description },
      existing
    );
    if (!check.valid) {
      throw new Error(check.errors[0] || 'Invalid category data.');
    }

    await setDoc(doc(db, 'categories', id), {
      name: clamp(input.name, SCHEMA_LIMITS.CATEGORY_MAX),
      slug: slugify(input.name),
      description: clamp(input.description || '', 400),
      active: input.active ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog('CREATE_CATEGORY', 'CATEGORY', id, `Created category "${clamp(input.name, 80)}"`);
    return id;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Category') || error.message.includes('already exists'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCategory(
  id: string,
  input: { name: string; description?: string; active: boolean }
): Promise<void> {
  const path = `categories/${id}`;
  try {
    const existingSnap = await getDocs(collection(db, 'categories'));
    const existing = existingSnap.docs.map((d) => ({
      id: d.id,
      name: String((d.data() as { name?: string }).name || ''),
    }));
    const check = validateCategoryInput(
      { name: input.name, description: input.description },
      existing,
      id
    );
    if (!check.valid) {
      throw new Error(check.errors[0] || 'Invalid category data.');
    }

    const cleanName = clamp(input.name, SCHEMA_LIMITS.CATEGORY_MAX);
    const linkedProductsSnap = await getDocs(
      query(collection(db, 'products'), where('categoryId', '==', id))
    );

    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'categories', id), {
      name: cleanName,
      slug: slugify(input.name),
      description: clamp(input.description || '', 400),
      active: input.active,
      updatedAt: now,
    });

    for (const prodDoc of linkedProductsSnap.docs) {
      batch.update(doc(db, 'products', prodDoc.id), {
        categoryName: cleanName,
        updatedAt: now,
      });
      batch.update(doc(db, 'publicProducts', prodDoc.id), {
        categoryName: cleanName,
        updatedAt: now,
      });
    }

    const auditPayload = buildAuditLogPayload(
      'UPDATE_CATEGORY',
      'CATEGORY',
      id,
      `Updated category "${cleanName}" (${input.active ? 'Active' : 'Hidden'})`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }

    await batch.commit();
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Category') || error.message.includes('already exists'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const path = `categories/${id}`;
  try {
    const linkedProducts = await getDocs(
      query(collection(db, 'products'), where('categoryId', '==', id), limit(1))
    );
    if (!linkedProducts.empty) {
      throw new Error(
        'Cannot delete this category because one or more products are currently assigned to it. Reassign those products to another category first.'
      );
    }

    await deleteDoc(doc(db, 'categories', id));
    await recordAuditLog('DELETE_CATEGORY', 'CATEGORY', id, `Deleted category (${id})`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot delete this category')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// Products CRUD (Atomic sync between products & publicProducts)
// ---------------------------------------------------------------------------

export async function createProduct(input: {
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  unit: string;
  images: string[];
  lowStockThreshold: number;
  minOrderQty: number;
  showStockPublicly: boolean;
  status: ProductStatus;
}): Promise<string> {
  const productId = generateSafeId('prod');
  const path = `products/${productId}`;
  const cleanImages = input.images
    .map((u) => clamp(u, SCHEMA_LIMITS.URL_MAX))
    .filter(Boolean)
    .slice(0, SCHEMA_LIMITS.IMAGES_MAX);

  try {
    const existingSnap = await getDocs(collection(db, 'products'));
    const existingProducts = existingSnap.docs.map((d) => {
      const data = d.data() as { productId?: string; sku?: string };
      return { productId: data.productId || d.id, sku: String(data.sku || '') };
    });

    const validation = validateProductInput(
      {
        sku: input.sku,
        name: input.name,
        categoryId: input.categoryId,
        description: input.description,
        unit: input.unit,
        images: cleanImages,
        lowStockThreshold: input.lowStockThreshold,
        minOrderQty: input.minOrderQty,
        status: input.status,
      },
      existingProducts
    );
    if (!validation.valid) {
      throw new Error(validation.errors[0] || 'Product validation failed.');
    }

    const cleanSku = clamp(normalizeSku(input.sku), SCHEMA_LIMITS.SKU_MAX);
    const cleanMoq = Math.max(1, Number(input.minOrderQty) || 1);
    const cleanLowStock = Math.max(0, Number(input.lowStockThreshold) || 0);
    const isPublicActive = input.status === 'ACTIVE';

    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.set(doc(db, 'products', productId), {
      productId,
      sku: cleanSku,
      name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
      categoryId: clamp(input.categoryId, SCHEMA_LIMITS.ID_MAX),
      categoryName: clamp(input.categoryName, SCHEMA_LIMITS.CATEGORY_MAX),
      description: clamp(input.description, SCHEMA_LIMITS.DESCRIPTION_MAX),
      unit: clamp(input.unit, SCHEMA_LIMITS.UNIT_MAX),
      images: cleanImages,
      availableStock: 0,
      avgPurchasePrice: 0,
      avgSalePrice: 0,
      totalPurchaseQty: 0,
      totalSalesQty: 0,
      totalPurchaseAmount: 0,
      totalSalesAmount: 0,
      totalCogs: 0,
      currentStockValue: 0,
      grossProfit: 0,
      estimatedProfit: 0,
      lowStockThreshold: cleanLowStock,
      minOrderQty: cleanMoq,
      showStockPublicly: Boolean(input.showStockPublicly),
      status: input.status,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'publicProducts', productId), {
      productId,
      sku: cleanSku,
      name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
      categoryId: clamp(input.categoryId, SCHEMA_LIMITS.ID_MAX),
      categoryName: clamp(input.categoryName, SCHEMA_LIMITS.CATEGORY_MAX),
      description: clamp(input.description, SCHEMA_LIMITS.DESCRIPTION_MAX),
      unit: clamp(input.unit, SCHEMA_LIMITS.UNIT_MAX),
      images: cleanImages,
      status: input.status,
      showStockPublicly: isPublicActive ? Boolean(input.showStockPublicly) : false,
      publicAvailableStock: 0,
      minOrderQty: cleanMoq,
      createdAt: now,
      updatedAt: now,
    });

    const auditPayload = buildAuditLogPayload(
      'CREATE_PRODUCT',
      'PRODUCT',
      productId,
      `Created product "${clamp(input.name, 100)}" (${cleanSku})`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }

    await batch.commit();
    return productId;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('SKU') ||
        error.message.includes('Product') ||
        error.message.includes('Unit') ||
        error.message.includes('Minimum') ||
        error.message.includes('Low Stock') ||
        error.message.includes('category') ||
        error.message.includes('image'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProductDetails(
  productId: string,
  input: {
    sku: string;
    name: string;
    categoryId: string;
    categoryName: string;
    description: string;
    unit: string;
    images: string[];
    lowStockThreshold: number;
    minOrderQty: number;
    showStockPublicly: boolean;
    status: ProductStatus;
    availableStock: number;
  }
): Promise<void> {
  const path = `products/${productId}`;
  const cleanImages = input.images
    .map((u) => clamp(u, SCHEMA_LIMITS.URL_MAX))
    .filter(Boolean)
    .slice(0, SCHEMA_LIMITS.IMAGES_MAX);

  try {
    const existingSnap = await getDocs(collection(db, 'products'));
    const existingProducts = existingSnap.docs.map((d) => {
      const data = d.data() as { productId?: string; sku?: string };
      return { productId: data.productId || d.id, sku: String(data.sku || '') };
    });

    const validation = validateProductInput(
      {
        sku: input.sku,
        name: input.name,
        categoryId: input.categoryId,
        description: input.description,
        unit: input.unit,
        images: cleanImages,
        lowStockThreshold: input.lowStockThreshold,
        minOrderQty: input.minOrderQty,
        status: input.status,
      },
      existingProducts,
      productId
    );
    if (!validation.valid) {
      throw new Error(validation.errors[0] || 'Product validation failed.');
    }

    const currentDoc = existingSnap.docs.find((d) => d.id === productId);
    const authoritativeStock = currentDoc
      ? Number((currentDoc.data() as Product).availableStock) || 0
      : Math.max(0, Number(input.availableStock) || 0);

    const cleanSku = clamp(normalizeSku(input.sku), SCHEMA_LIMITS.SKU_MAX);
    const cleanMoq = Math.max(1, Number(input.minOrderQty) || 1);
    const cleanLowStock = Math.max(0, Number(input.lowStockThreshold) || 0);
    const exposeStock = input.status === 'ACTIVE' && Boolean(input.showStockPublicly);

    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'products', productId), {
      sku: cleanSku,
      name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
      categoryId: clamp(input.categoryId, SCHEMA_LIMITS.ID_MAX),
      categoryName: clamp(input.categoryName, SCHEMA_LIMITS.CATEGORY_MAX),
      description: clamp(input.description, SCHEMA_LIMITS.DESCRIPTION_MAX),
      unit: clamp(input.unit, SCHEMA_LIMITS.UNIT_MAX),
      images: cleanImages,
      lowStockThreshold: cleanLowStock,
      minOrderQty: cleanMoq,
      showStockPublicly: Boolean(input.showStockPublicly),
      status: input.status,
      updatedAt: now,
    });

    batch.update(doc(db, 'publicProducts', productId), {
      sku: cleanSku,
      name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
      categoryId: clamp(input.categoryId, SCHEMA_LIMITS.ID_MAX),
      categoryName: clamp(input.categoryName, SCHEMA_LIMITS.CATEGORY_MAX),
      description: clamp(input.description, SCHEMA_LIMITS.DESCRIPTION_MAX),
      unit: clamp(input.unit, SCHEMA_LIMITS.UNIT_MAX),
      images: cleanImages,
      status: input.status,
      showStockPublicly: Boolean(input.showStockPublicly),
      publicAvailableStock: exposeStock ? Math.max(0, authoritativeStock) : 0,
      minOrderQty: cleanMoq,
      updatedAt: now,
    });

    const auditPayload = buildAuditLogPayload(
      'UPDATE_PRODUCT',
      'PRODUCT',
      productId,
      `Updated product "${clamp(input.name, 100)}" (${cleanSku}, ${input.status})`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }

    await batch.commit();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('SKU') ||
        error.message.includes('Product') ||
        error.message.includes('Unit') ||
        error.message.includes('Minimum') ||
        error.message.includes('Low Stock') ||
        error.message.includes('category') ||
        error.message.includes('image'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function checkProductHasTransactionHistory(
  productId: string
): Promise<ProductHistoryCounts> {
  const path = `products/${productId}`;
  try {
    const [prodSnap, purchasesSnap, salesSnap, txSnap] = await Promise.all([
      getDoc(doc(db, 'products', productId)),
      getDocs(query(collection(db, 'purchases'), where('productId', '==', productId))),
      getDocs(query(collection(db, 'sales'), where('productId', '==', productId))),
      getDocs(query(collection(db, 'stockTransactions'), where('productId', '==', productId))),
    ]);

    const prodData = prodSnap.exists() ? (prodSnap.data() as Product) : null;
    return {
      purchasesCount: purchasesSnap.size,
      salesCount: salesSnap.size,
      stockTransactionsCount: txSnap.size,
      totalPurchaseQty: prodData ? Number(prodData.totalPurchaseQty) || 0 : 0,
      totalSalesQty: prodData ? Number(prodData.totalSalesQty) || 0 : 0,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function archiveProduct(productId: string, reason?: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    const prodSnap = await getDoc(doc(db, 'products', productId));
    if (!prodSnap.exists()) {
      throw new Error('Product does not exist.');
    }
    const prod = prodSnap.data() as Product;
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'products', productId), {
      status: 'ARCHIVED',
      updatedAt: now,
    });

    batch.update(doc(db, 'publicProducts', productId), {
      status: 'ARCHIVED',
      publicAvailableStock: 0,
      updatedAt: now,
    });

    const reasonText = reason?.trim() ? ` — Reason: ${clamp(reason, 120)}` : '';
    const auditPayload = buildAuditLogPayload(
      'ARCHIVE_PRODUCT',
      'PRODUCT',
      productId,
      `Archived product "${clamp(prod.name, 80)}" (${prod.sku}) preserving historical transactions${reasonText}`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function restoreProduct(
  productId: string,
  targetStatus: 'ACTIVE' | 'INACTIVE' = 'INACTIVE'
): Promise<void> {
  const path = `products/${productId}`;
  try {
    const prodSnap = await getDoc(doc(db, 'products', productId));
    if (!prodSnap.exists()) {
      throw new Error('Product does not exist.');
    }
    const prod = prodSnap.data() as Product;
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'products', productId), {
      status: targetStatus,
      updatedAt: now,
    });

    batch.update(doc(db, 'publicProducts', productId), {
      status: targetStatus,
      publicAvailableStock:
        targetStatus === 'ACTIVE' && prod.showStockPublicly
          ? Math.max(0, prod.availableStock)
          : 0,
      updatedAt: now,
    });

    const auditPayload = buildAuditLogPayload(
      'RESTORE_PRODUCT',
      'PRODUCT',
      productId,
      `Restored product "${clamp(prod.name, 80)}" (${prod.sku}) to ${targetStatus}`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    const historyCounts = await checkProductHasTransactionHistory(productId);
    const eligibility = canHardDeleteProduct(historyCounts);
    if (!eligibility.allowed) {
      throw new Error(
        eligibility.reason ||
          'Cannot delete product with transaction history. Archive the product instead.'
      );
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, 'products', productId));
    batch.delete(doc(db, 'publicProducts', productId));
    const auditPayload = buildAuditLogPayload(
      'DELETE_PRODUCT',
      'PRODUCT',
      productId,
      `Permanently deleted product (${productId}) with zero historical transactions`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }
    await batch.commit();
  } catch (error) {
    if (error instanceof Error && error.message.includes('historical')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// Stock In / Purchase Transaction (Atomic + Detailed Cost + Controlled Reversal)
// ---------------------------------------------------------------------------

export interface StockInPurchaseInput {
  purchaseId?: string;
  productId: string;
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  quantity: number;
  purchaseRate: number;
  freightAmount?: number;
  otherExpenses?: number;
  discount?: number;
  taxAmount?: number;
  additionalExpenses?: number;
  paymentStatus?: PurchasePaymentStatus;
  referencePurchaseId?: string;
  notes: string;
  type?: PurchaseType;
}

export async function recordStockInPurchase(input: StockInPurchaseInput): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required for stock transactions.');

  const txTypeMode: PurchaseType = input.type ?? 'PURCHASE';
  const paymentStatus: PurchasePaymentStatus = input.paymentStatus ?? 'PAID';
  const freight = Number(input.freightAmount ?? 0) || 0;
  const otherExp =
    input.otherExpenses !== undefined
      ? Number(input.otherExpenses) || 0
      : Number(input.additionalExpenses ?? 0) || 0;
  const discount = Number(input.discount ?? 0) || 0;
  const tax = Number(input.taxAmount ?? 0) || 0;

  const validation = validatePurchaseInput({
    purchaseDate: input.purchaseDate,
    productId: input.productId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    invoiceNumber: input.invoiceNumber,
    quantity: Number(input.quantity),
    purchaseRate: Number(input.purchaseRate),
    freightAmount: freight,
    otherExpenses: otherExp,
    discount,
    taxAmount: tax,
    paymentStatus,
    type: txTypeMode,
  });

  if (!validation.valid) {
    throw new Error(validation.errors[0] || 'Invalid purchase transaction input.');
  }

  const qty = Number(input.quantity);
  const rate = Number(input.purchaseRate);
  const { breakdown } = validation;
  const totalAmount = breakdown.netInventoryCost;
  const capitalizableExpenses = breakdown.capitalizableExpenses;

  const purchaseId = clamp(input.purchaseId || generateSafeId('pur'), SCHEMA_LIMITS.ID_MAX);
  const txId = generateSafeId('tx');
  const path = `purchases/${purchaseId}`;

  try {
    if (txTypeMode === 'PURCHASE') {
      const existingSnap = await getDocs(collection(db, 'purchases'));
      const existingPurchases = existingSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Purchase, 'id'>),
      }));
      const duplicate = isDuplicateSupplierInvoice(existingPurchases, {
        supplierId: input.supplierId,
        supplierName: input.supplierName,
        invoiceNumber: input.invoiceNumber,
        type: txTypeMode,
      });
      if (duplicate) {
        throw new Error(
          `Duplicate invoice detected: Invoice "${input.invoiceNumber.trim()}" for supplier "${duplicate.supplierName}" already exists (${duplicate.purchaseId || duplicate.id}).`
        );
      }
    }

    await runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'products', input.productId);
      const pubRef = doc(db, 'publicProducts', input.productId);
      const purRef = doc(db, 'purchases', purchaseId);

      const [prodSnap, existingPurSnap] = await Promise.all([
        transaction.get(prodRef),
        transaction.get(purRef),
      ]);

      if (existingPurSnap.exists()) {
        throw new Error(`Purchase ID "${purchaseId}" already exists. Duplicate submission blocked.`);
      }

      if (!prodSnap.exists()) {
        throw new Error('Selected product does not exist.');
      }

      const prev = prodSnap.data() as Product;
      if (prev.status === 'ARCHIVED') {
        throw new Error(
          `Product "${prev.name}" is archived. Restore it to Active or Inactive before recording new stock entries.`
        );
      }

      let nextAvailableStock = prev.availableStock;
      let nextTotalPurchaseQty = prev.totalPurchaseQty;
      let nextTotalPurchaseAmount = prev.totalPurchaseAmount;
      let nextAvgPurchasePrice = prev.avgPurchasePrice;

      if (txTypeMode === 'RETURN_TO_SUPPLIER' || txTypeMode === 'CANCELLATION_REVERSAL') {
        const postRev = calculatePostReversalProductState({
          prevAvailableStock: prev.availableStock,
          prevTotalPurchaseQty: prev.totalPurchaseQty,
          prevTotalPurchaseAmount: prev.totalPurchaseAmount,
          reversedQty: qty,
          reversedAmount: totalAmount,
        });
        nextAvailableStock = postRev.nextAvailableStock;
        nextTotalPurchaseQty = postRev.nextTotalPurchaseQty;
        nextTotalPurchaseAmount = postRev.nextTotalPurchaseAmount;
        nextAvgPurchasePrice = postRev.nextAvgPurchasePrice;
      } else {
        nextAvailableStock = roundCurrency(prev.availableStock + qty);
        const avgResult = calculateNextWeightedAveragePurchase(
          prev.totalPurchaseQty,
          prev.totalPurchaseAmount,
          qty,
          totalAmount
        );
        nextTotalPurchaseQty = avgResult.nextTotalPurchaseQty;
        nextTotalPurchaseAmount = avgResult.nextTotalPurchaseAmount;
        nextAvgPurchasePrice = avgResult.nextAvgPurchasePrice;
      }

      const nextCurrentStockValue = roundCurrency(nextAvailableStock * nextAvgPurchasePrice);
      const nextEstimatedProfit =
        prev.avgSalePrice > 0
          ? roundCurrency(nextAvailableStock * Math.max(0, prev.avgSalePrice - nextAvgPurchasePrice))
          : 0;

      const now = serverTimestamp();

      transaction.update(prodRef, {
        availableStock: nextAvailableStock,
        avgPurchasePrice: nextAvgPurchasePrice,
        totalPurchaseQty: nextTotalPurchaseQty,
        totalPurchaseAmount: nextTotalPurchaseAmount,
        currentStockValue: nextCurrentStockValue,
        estimatedProfit: nextEstimatedProfit,
        updatedAt: now,
      });

      transaction.update(pubRef, {
        publicAvailableStock:
          prev.status === 'ACTIVE' && prev.showStockPublicly ? nextAvailableStock : 0,
        updatedAt: now,
      });

      transaction.set(purRef, {
        purchaseId,
        productId: prev.productId,
        productName: clamp(prev.name, SCHEMA_LIMITS.NAME_MAX),
        sku: clamp(prev.sku, SCHEMA_LIMITS.SKU_MAX),
        unit: clamp(prev.unit, SCHEMA_LIMITS.UNIT_MAX),
        purchaseDate: clamp(input.purchaseDate, 32),
        supplierId: clamp(input.supplierId, SCHEMA_LIMITS.ID_MAX),
        supplierName: clamp(input.supplierName, SCHEMA_LIMITS.NAME_MAX),
        invoiceNumber: clamp(input.invoiceNumber, SCHEMA_LIMITS.INVOICE_MAX),
        quantity: qty,
        purchaseRate: rate,
        freightAmount: breakdown.freightAmount,
        otherExpenses: breakdown.otherExpenses,
        discount: breakdown.discount,
        taxAmount: breakdown.taxAmount,
        additionalExpenses: capitalizableExpenses,
        totalAmount,
        paymentStatus,
        referencePurchaseId: clamp(input.referencePurchaseId || '', SCHEMA_LIMITS.ID_MAX),
        notes: clamp(input.notes, SCHEMA_LIMITS.NOTES_MAX),
        type: txTypeMode,
        createdBy: uid,
        createdAt: now,
      });

      const ledgerTxType =
        txTypeMode === 'PURCHASE'
          ? 'STOCK_IN'
          : txTypeMode === 'CANCELLATION_REVERSAL'
            ? 'PURCHASE_REVERSAL'
            : 'PURCHASE_CORRECTION';

      transaction.set(doc(db, 'stockTransactions', txId), {
        productId: prev.productId,
        productName: clamp(prev.name, SCHEMA_LIMITS.NAME_MAX),
        sku: clamp(prev.sku, SCHEMA_LIMITS.SKU_MAX),
        txType: ledgerTxType,
        referenceId: purchaseId,
        txDate: clamp(input.purchaseDate, 32),
        quantityDelta:
          txTypeMode === 'RETURN_TO_SUPPLIER' || txTypeMode === 'CANCELLATION_REVERSAL'
            ? -qty
            : qty,
        unitRate: qty > 0 ? roundCurrency(totalAmount / qty) : rate,
        totalValue: totalAmount,
        resultingStock: nextAvailableStock,
        resultingAvgPurchasePrice: nextAvgPurchasePrice,
        notes: clamp(input.notes || `${txTypeMode}: ${input.invoiceNumber}`, SCHEMA_LIMITS.NOTES_MAX),
        createdBy: uid,
        createdAt: now,
      });

      const auditPayload = buildAuditLogPayload(
        'STOCK_IN',
        'PURCHASE',
        purchaseId,
        `${txTypeMode}: ${qty} ${prev.unit} of ${clamp(prev.name, 80)} (${clamp(input.invoiceNumber, 40)}) — ₹${totalAmount} [${paymentStatus}]`
      );
      if (auditPayload) {
        transaction.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
      }
    });

    return purchaseId;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Cannot return') ||
        error.message.includes('Cannot reverse') ||
        error.message.includes('Duplicate invoice') ||
        error.message.includes('Purchase ID') ||
        error.message.includes('archived'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function reverseOrCancelPurchase(params: {
  originalPurchaseId: string;
  reason: string;
  mode: 'CANCEL' | 'EDIT';
  replacementInput?: Omit<StockInPurchaseInput, 'purchaseId' | 'type' | 'referencePurchaseId'>;
}): Promise<{ reversalId: string; replacementId?: string }> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required.');

  const cleanReason = clamp(params.reason, 400);
  if (!cleanReason) {
    throw new Error('Please provide a reason for this controlled reversal.');
  }

  const reversalId = `rev_${params.originalPurchaseId}`.slice(0, SCHEMA_LIMITS.ID_MAX);
  const revTxId = generateSafeId('tx');
  const replacementId = params.mode === 'EDIT' ? generateSafeId('pur') : undefined;
  const replTxId = params.mode === 'EDIT' ? generateSafeId('tx') : undefined;

  let replBreakdown: ReturnType<typeof calculateDetailedPurchaseCost> | null = null;
  if (params.mode === 'EDIT') {
    if (!params.replacementInput) {
      throw new Error('Replacement purchase details are required when editing.');
    }
    const r = params.replacementInput;
    const validation = validatePurchaseInput({
      purchaseDate: r.purchaseDate,
      productId: r.productId,
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      invoiceNumber: r.invoiceNumber,
      quantity: Number(r.quantity),
      purchaseRate: Number(r.purchaseRate),
      freightAmount: Number(r.freightAmount ?? 0) || 0,
      otherExpenses: Number(r.otherExpenses ?? 0) || 0,
      discount: Number(r.discount ?? 0) || 0,
      taxAmount: Number(r.taxAmount ?? 0) || 0,
      paymentStatus: r.paymentStatus ?? 'PAID',
      type: 'PURCHASE',
    });
    if (!validation.valid) {
      throw new Error(validation.errors[0] || 'Replacement purchase details are invalid.');
    }
    replBreakdown = validation.breakdown;
  }

  const path = `purchases/${reversalId}`;
  try {
    const allPurchasesSnap = await getDocs(collection(db, 'purchases'));
    const allPurchases = allPurchasesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Purchase, 'id'>),
    }));
    const reversedSet = getReversedPurchaseIdSet(allPurchases);
    if (reversedSet.has(params.originalPurchaseId)) {
      throw new Error('This purchase entry has already been cancelled or reversed.');
    }

    if (params.mode === 'EDIT' && params.replacementInput) {
      const dup = isDuplicateSupplierInvoice(allPurchases, {
        supplierId: params.replacementInput.supplierId,
        supplierName: params.replacementInput.supplierName,
        invoiceNumber: params.replacementInput.invoiceNumber,
        type: 'PURCHASE',
        ignorePurchaseId: params.originalPurchaseId,
      });
      if (dup) {
        throw new Error(
          `Duplicate invoice detected: Invoice "${params.replacementInput.invoiceNumber.trim()}" already exists for supplier "${dup.supplierName}".`
        );
      }
    }

    await runTransaction(db, async (transaction) => {
      const origRef = doc(db, 'purchases', params.originalPurchaseId);
      const revRef = doc(db, 'purchases', reversalId);
      const [origSnap, revSnap] = await Promise.all([
        transaction.get(origRef),
        transaction.get(revRef),
      ]);

      if (!origSnap.exists()) {
        throw new Error('Original purchase record could not be found.');
      }
      if (revSnap.exists()) {
        throw new Error('A controlled reversal entry already exists for this purchase.');
      }

      const orig = origSnap.data() as Purchase;
      if (orig.type === 'CANCELLATION_REVERSAL' || orig.type === 'RETURN_TO_SUPPLIER') {
        throw new Error('Reversal and return entries cannot themselves be reversed.');
      }

      const oldProdRef = doc(db, 'products', orig.productId);
      const oldPubRef = doc(db, 'publicProducts', orig.productId);

      const changingProduct =
        params.mode === 'EDIT' &&
        params.replacementInput &&
        params.replacementInput.productId !== orig.productId;

      const newProdRef =
        changingProduct && params.replacementInput
          ? doc(db, 'products', params.replacementInput.productId)
          : null;
      const newPubRef =
        changingProduct && params.replacementInput
          ? doc(db, 'publicProducts', params.replacementInput.productId)
          : null;

      const [oldProdSnap, newProdSnap] = await Promise.all([
        transaction.get(oldProdRef),
        newProdRef ? transaction.get(newProdRef) : Promise.resolve(null),
      ]);

      if (!oldProdSnap.exists()) {
        throw new Error('Original product record does not exist.');
      }
      const oldPrev = oldProdSnap.data() as Product;

      const now = serverTimestamp();

      // Step A: Reversal impact on original product
      let afterRevStock = roundCurrency(oldPrev.availableStock - orig.quantity);
      let afterRevTotalQty = Math.max(0, roundCurrency(oldPrev.totalPurchaseQty - orig.quantity));
      let afterRevTotalAmount = Math.max(
        0,
        roundCurrency(oldPrev.totalPurchaseAmount - orig.totalAmount)
      );

      if (params.mode === 'CANCEL' || changingProduct) {
        if (afterRevStock < 0) {
          throw new Error(
            `Cannot ${params.mode === 'CANCEL' ? 'cancel' : 'move'} purchase of ${orig.quantity} ${orig.unit} because only ${oldPrev.availableStock} ${oldPrev.unit} remain in stock.`
          );
        }
      } else if (params.mode === 'EDIT' && params.replacementInput) {
        const newQty = Number(params.replacementInput.quantity);
        if (roundCurrency(afterRevStock + newQty) < 0) {
          throw new Error(
            `Insufficient stock to reduce quantity to ${newQty} ${orig.unit}. Only ${oldPrev.availableStock} ${oldPrev.unit} remain on hand.`
          );
        }
      }

      const afterRevAvgPrice =
        afterRevTotalQty > 0 ? roundCurrency(afterRevTotalAmount / afterRevTotalQty) : 0;

      // Step B: If editing on the SAME product, apply replacement right after reversal
      if (params.mode === 'EDIT' && !changingProduct && params.replacementInput && replBreakdown) {
        if (oldPrev.status === 'ARCHIVED') {
          throw new Error(`Product "${oldPrev.name}" is archived and cannot receive edits.`);
        }
        const newQty = Number(params.replacementInput.quantity);
        const newCost = replBreakdown.netInventoryCost;
        const finalStock = roundCurrency(afterRevStock + newQty);
        const finalAvg = calculateNextWeightedAveragePurchase(
          afterRevTotalQty,
          afterRevTotalAmount,
          newQty,
          newCost
        );
        const finalStockValue = roundCurrency(finalStock * finalAvg.nextAvgPurchasePrice);
        const finalEstimatedProfit =
          oldPrev.avgSalePrice > 0
            ? roundCurrency(
                finalStock * Math.max(0, oldPrev.avgSalePrice - finalAvg.nextAvgPurchasePrice)
              )
            : 0;

        transaction.update(oldProdRef, {
          availableStock: finalStock,
          avgPurchasePrice: finalAvg.nextAvgPurchasePrice,
          totalPurchaseQty: finalAvg.nextTotalPurchaseQty,
          totalPurchaseAmount: finalAvg.nextTotalPurchaseAmount,
          currentStockValue: finalStockValue,
          estimatedProfit: finalEstimatedProfit,
          updatedAt: now,
        });
        transaction.update(oldPubRef, {
          publicAvailableStock:
            oldPrev.status === 'ACTIVE' && oldPrev.showStockPublicly ? finalStock : 0,
          updatedAt: now,
        });
      } else {
        // Pure cancellation OR product changed -> finalize old product reversal update
        const revStockValue = roundCurrency(afterRevStock * afterRevAvgPrice);
        const revEstProfit =
          oldPrev.avgSalePrice > 0
            ? roundCurrency(afterRevStock * Math.max(0, oldPrev.avgSalePrice - afterRevAvgPrice))
            : 0;

        transaction.update(oldProdRef, {
          availableStock: afterRevStock,
          avgPurchasePrice: afterRevAvgPrice,
          totalPurchaseQty: afterRevTotalQty,
          totalPurchaseAmount: afterRevTotalAmount,
          currentStockValue: revStockValue,
          estimatedProfit: revEstProfit,
          updatedAt: now,
        });
        transaction.update(oldPubRef, {
          publicAvailableStock:
            oldPrev.status === 'ACTIVE' && oldPrev.showStockPublicly ? afterRevStock : 0,
          updatedAt: now,
        });

        // If product changed during edit, apply replacement onto new product
        if (
          params.mode === 'EDIT' &&
          changingProduct &&
          newProdSnap &&
          newProdRef &&
          newPubRef &&
          params.replacementInput &&
          replBreakdown
        ) {
          if (!newProdSnap.exists()) {
            throw new Error('Replacement product record does not exist.');
          }
          const newPrev = newProdSnap.data() as Product;
          if (newPrev.status === 'ARCHIVED') {
            throw new Error(`Product "${newPrev.name}" is archived and cannot receive stock.`);
          }
          const newQty = Number(params.replacementInput.quantity);
          const newCost = replBreakdown.netInventoryCost;
          const nextStock = roundCurrency(newPrev.availableStock + newQty);
          const nextAvg = calculateNextWeightedAveragePurchase(
            newPrev.totalPurchaseQty,
            newPrev.totalPurchaseAmount,
            newQty,
            newCost
          );
          transaction.update(newProdRef, {
            availableStock: nextStock,
            avgPurchasePrice: nextAvg.nextAvgPurchasePrice,
            totalPurchaseQty: nextAvg.nextTotalPurchaseQty,
            totalPurchaseAmount: nextAvg.nextTotalPurchaseAmount,
            currentStockValue: roundCurrency(nextStock * nextAvg.nextAvgPurchasePrice),
            estimatedProfit:
              newPrev.avgSalePrice > 0
                ? roundCurrency(
                    nextStock * Math.max(0, newPrev.avgSalePrice - nextAvg.nextAvgPurchasePrice)
                  )
                : 0,
            updatedAt: now,
          });
          transaction.update(newPubRef, {
            publicAvailableStock:
              newPrev.status === 'ACTIVE' && newPrev.showStockPublicly ? nextStock : 0,
            updatedAt: now,
          });
        }
      }

      // Write Reversal Purchase Doc
      const revInvoice = `${orig.invoiceNumber}-REV`.slice(0, SCHEMA_LIMITS.INVOICE_MAX);
      transaction.set(revRef, {
        purchaseId: reversalId,
        productId: orig.productId,
        productName: orig.productName,
        sku: orig.sku,
        unit: orig.unit,
        purchaseDate: orig.purchaseDate,
        supplierId: orig.supplierId || '',
        supplierName: orig.supplierName,
        invoiceNumber: revInvoice,
        quantity: orig.quantity,
        purchaseRate: orig.purchaseRate,
        freightAmount: orig.freightAmount ?? 0,
        otherExpenses: orig.otherExpenses ?? 0,
        discount: orig.discount ?? 0,
        taxAmount: orig.taxAmount ?? 0,
        additionalExpenses: orig.additionalExpenses,
        totalAmount: orig.totalAmount,
        paymentStatus: orig.paymentStatus ?? 'PAID',
        referencePurchaseId: params.originalPurchaseId,
        notes: clamp(
          `${params.mode === 'CANCEL' ? 'Cancelled' : 'Superseded for edit'}: ${cleanReason}`,
          SCHEMA_LIMITS.NOTES_MAX
        ),
        type: 'CANCELLATION_REVERSAL',
        createdBy: uid,
        createdAt: now,
      });

      transaction.set(doc(db, 'stockTransactions', revTxId), {
        productId: orig.productId,
        productName: orig.productName,
        sku: orig.sku,
        txType: 'PURCHASE_REVERSAL',
        referenceId: reversalId,
        txDate: orig.purchaseDate,
        quantityDelta: -orig.quantity,
        unitRate: orig.quantity > 0 ? roundCurrency(orig.totalAmount / orig.quantity) : orig.purchaseRate,
        totalValue: orig.totalAmount,
        resultingStock: Math.max(0, afterRevStock),
        resultingAvgPurchasePrice: afterRevAvgPrice,
        notes: clamp(`Reversal of ${orig.invoiceNumber}: ${cleanReason}`, SCHEMA_LIMITS.NOTES_MAX),
        createdBy: uid,
        createdAt: now,
      });

      // Write Replacement Purchase Doc if EDIT
      if (
        params.mode === 'EDIT' &&
        replacementId &&
        replTxId &&
        params.replacementInput &&
        replBreakdown
      ) {
        const r = params.replacementInput;
        const targetProduct =
          changingProduct && newProdSnap?.exists() ? (newProdSnap.data() as Product) : oldPrev;
        const rQty = Number(r.quantity);
        const rRate = Number(r.purchaseRate);
        const rPayment: PurchasePaymentStatus = r.paymentStatus ?? 'PAID';

        const rResultingStock = changingProduct
          ? roundCurrency(targetProduct.availableStock + rQty)
          : roundCurrency(afterRevStock + rQty);
        const rResultingAvg = changingProduct
          ? calculateNextWeightedAveragePurchase(
              targetProduct.totalPurchaseQty,
              targetProduct.totalPurchaseAmount,
              rQty,
              replBreakdown.netInventoryCost
            ).nextAvgPurchasePrice
          : calculateNextWeightedAveragePurchase(
              afterRevTotalQty,
              afterRevTotalAmount,
              rQty,
              replBreakdown.netInventoryCost
            ).nextAvgPurchasePrice;

        transaction.set(doc(db, 'purchases', replacementId), {
          purchaseId: replacementId,
          productId: targetProduct.productId,
          productName: clamp(targetProduct.name, SCHEMA_LIMITS.NAME_MAX),
          sku: clamp(targetProduct.sku, SCHEMA_LIMITS.SKU_MAX),
          unit: clamp(targetProduct.unit, SCHEMA_LIMITS.UNIT_MAX),
          purchaseDate: clamp(r.purchaseDate, 32),
          supplierId: clamp(r.supplierId, SCHEMA_LIMITS.ID_MAX),
          supplierName: clamp(r.supplierName, SCHEMA_LIMITS.NAME_MAX),
          invoiceNumber: clamp(r.invoiceNumber, SCHEMA_LIMITS.INVOICE_MAX),
          quantity: rQty,
          purchaseRate: rRate,
          freightAmount: replBreakdown.freightAmount,
          otherExpenses: replBreakdown.otherExpenses,
          discount: replBreakdown.discount,
          taxAmount: replBreakdown.taxAmount,
          additionalExpenses: replBreakdown.capitalizableExpenses,
          totalAmount: replBreakdown.netInventoryCost,
          paymentStatus: rPayment,
          referencePurchaseId: params.originalPurchaseId,
          notes: clamp(
            r.notes || `Corrected replacement for ${orig.invoiceNumber}`,
            SCHEMA_LIMITS.NOTES_MAX
          ),
          type: 'PURCHASE',
          createdBy: uid,
          createdAt: now,
        });

        transaction.set(doc(db, 'stockTransactions', replTxId), {
          productId: targetProduct.productId,
          productName: clamp(targetProduct.name, SCHEMA_LIMITS.NAME_MAX),
          sku: clamp(targetProduct.sku, SCHEMA_LIMITS.SKU_MAX),
          txType: 'STOCK_IN',
          referenceId: replacementId,
          txDate: clamp(r.purchaseDate, 32),
          quantityDelta: rQty,
          unitRate: rQty > 0 ? roundCurrency(replBreakdown.netInventoryCost / rQty) : rRate,
          totalValue: replBreakdown.netInventoryCost,
          resultingStock: rResultingStock,
          resultingAvgPurchasePrice: rResultingAvg,
          notes: clamp(
            `Replacement for ${orig.invoiceNumber}: ${cleanReason}`,
            SCHEMA_LIMITS.NOTES_MAX
          ),
          createdBy: uid,
          createdAt: now,
        });
      }

      const auditPayload = buildAuditLogPayload(
        params.mode === 'CANCEL' ? 'CANCEL_PURCHASE' : 'EDIT_PURCHASE_REVERSAL',
        'PURCHASE',
        params.originalPurchaseId,
        params.mode === 'CANCEL'
          ? `Reversed/cancelled purchase ${orig.invoiceNumber} (${orig.quantity} ${orig.unit} of ${orig.productName}) — Reason: ${cleanReason}`
          : `Edited purchase ${orig.invoiceNumber} via reversal (${reversalId}) -> new entry (${replacementId}) — Reason: ${cleanReason}`
      );
      if (auditPayload) {
        transaction.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
      }
    });

    return { reversalId, replacementId };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Cannot') ||
        error.message.includes('Insufficient stock') ||
        error.message.includes('Duplicate invoice') ||
        error.message.includes('already') ||
        error.message.includes('cannot') ||
        error.message.includes('archived'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updatePurchasePaymentStatus(
  purchaseId: string,
  paymentStatus: PurchasePaymentStatus,
  notes?: string
): Promise<void> {
  const path = `purchases/${purchaseId}`;
  try {
    const payload: Record<string, unknown> = { paymentStatus };
    if (notes !== undefined) {
      payload.notes = clamp(notes, SCHEMA_LIMITS.NOTES_MAX);
    }
    await updateDoc(doc(db, 'purchases', purchaseId), payload);
    await recordAuditLog(
      'UPDATE_PURCHASE_PAYMENT',
      'PURCHASE',
      purchaseId,
      `Updated purchase (${purchaseId}) payment status to ${paymentStatus}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Stock Out / Sales Transaction (Atomic, Prevents Negative Stock)
// ---------------------------------------------------------------------------

export async function recordStockOutSale(input: {
  productId: string;
  customerId: string;
  customerName: string;
  saleDate: string;
  invoiceNumber: string;
  quantity: number;
  saleRate: number;
  discount: number;
  additionalCharges: number;
  notes: string;
  type?: SaleType;
}): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required for stock transactions.');

  const qty = Number(input.quantity);
  const rate = Number(input.saleRate);
  const discount = Number(input.discount) || 0;
  const charges = Number(input.additionalCharges) || 0;
  if (!(qty > 0)) throw new Error('Quantity must be greater than zero.');
  if (rate < 0 || discount < 0 || charges < 0) {
    throw new Error('Sale rate, discount, and additional charges cannot be negative.');
  }

  const saleId = generateSafeId('sale');
  const txId = generateSafeId('tx');
  const saleMode: SaleType = input.type ?? 'SALE';
  const path = `sales/${saleId}`;

  try {
    await runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'products', input.productId);
      const pubRef = doc(db, 'publicProducts', input.productId);
      const prodSnap = await transaction.get(prodRef);

      if (!prodSnap.exists()) {
        throw new Error('Selected product does not exist.');
      }

      const prev = prodSnap.data() as Product;
      if (prev.status === 'ARCHIVED') {
        throw new Error(
          `Product "${prev.name}" is archived. Restore it to Active or Inactive before recording new sales.`
        );
      }
      const metrics = calculateSaleMetrics(qty, rate, discount, charges, prev.avgPurchasePrice);

      let nextAvailableStock = prev.availableStock;
      let nextTotalSalesQty = prev.totalSalesQty;
      let nextTotalSalesAmount = prev.totalSalesAmount;
      let nextTotalCogs = prev.totalCogs;
      let nextGrossProfit = prev.grossProfit;

      if (saleMode === 'CUSTOMER_RETURN') {
        nextAvailableStock = roundCurrency(prev.availableStock + qty);
        nextTotalSalesQty = Math.max(0, roundCurrency(prev.totalSalesQty - qty));
        nextTotalSalesAmount = Math.max(0, roundCurrency(prev.totalSalesAmount - metrics.netSaleTotal));
        nextTotalCogs = Math.max(0, roundCurrency(prev.totalCogs - metrics.costOfGoodsSold));
        nextGrossProfit = roundCurrency(prev.grossProfit - metrics.grossProfit);
      } else {
        if (prev.availableStock < qty) {
          throw new Error(
            `Insufficient stock for ${prev.name}. Available: ${prev.availableStock} ${prev.unit}, requested: ${qty} ${prev.unit}. Negative stock is not allowed.`
          );
        }
        nextAvailableStock = roundCurrency(prev.availableStock - qty);
        nextTotalSalesQty = roundCurrency(prev.totalSalesQty + qty);
        nextTotalSalesAmount = roundCurrency(prev.totalSalesAmount + metrics.netSaleTotal);
        nextTotalCogs = roundCurrency(prev.totalCogs + metrics.costOfGoodsSold);
        nextGrossProfit = roundCurrency(prev.grossProfit + metrics.grossProfit);
      }

      const nextAvgSalePrice =
        nextTotalSalesQty > 0 ? roundCurrency(nextTotalSalesAmount / nextTotalSalesQty) : 0;
      const nextCurrentStockValue = roundCurrency(nextAvailableStock * prev.avgPurchasePrice);
      const nextEstimatedProfit =
        nextAvgSalePrice > 0
          ? roundCurrency(nextAvailableStock * Math.max(0, nextAvgSalePrice - prev.avgPurchasePrice))
          : 0;

      const now = serverTimestamp();

      transaction.update(prodRef, {
        availableStock: nextAvailableStock,
        avgSalePrice: nextAvgSalePrice,
        totalSalesQty: nextTotalSalesQty,
        totalSalesAmount: nextTotalSalesAmount,
        totalCogs: nextTotalCogs,
        currentStockValue: nextCurrentStockValue,
        grossProfit: nextGrossProfit,
        estimatedProfit: nextEstimatedProfit,
        updatedAt: now,
      });

      transaction.update(pubRef, {
        publicAvailableStock:
          prev.status === 'ACTIVE' && prev.showStockPublicly ? nextAvailableStock : 0,
        updatedAt: now,
      });

      transaction.set(doc(db, 'sales', saleId), {
        productId: prev.productId,
        productName: clamp(prev.name, SCHEMA_LIMITS.NAME_MAX),
        sku: clamp(prev.sku, SCHEMA_LIMITS.SKU_MAX),
        unit: clamp(prev.unit, SCHEMA_LIMITS.UNIT_MAX),
        customerId: clamp(input.customerId, SCHEMA_LIMITS.ID_MAX),
        customerName: clamp(input.customerName, SCHEMA_LIMITS.NAME_MAX),
        saleDate: clamp(input.saleDate, 32),
        invoiceNumber: clamp(input.invoiceNumber, SCHEMA_LIMITS.INVOICE_MAX),
        quantity: qty,
        saleRate: rate,
        discount,
        additionalCharges: charges,
        totalAmount: metrics.netSaleTotal,
        costOfGoodsSold: metrics.costOfGoodsSold,
        grossProfit: metrics.grossProfit,
        notes: clamp(input.notes, SCHEMA_LIMITS.NOTES_MAX),
        type: saleMode,
        createdBy: uid,
        createdAt: now,
      });

      transaction.set(doc(db, 'stockTransactions', txId), {
        productId: prev.productId,
        productName: clamp(prev.name, SCHEMA_LIMITS.NAME_MAX),
        sku: clamp(prev.sku, SCHEMA_LIMITS.SKU_MAX),
        txType: saleMode === 'CUSTOMER_RETURN' ? 'SALE_RETURN' : 'STOCK_OUT',
        referenceId: saleId,
        txDate: clamp(input.saleDate, 32),
        quantityDelta: saleMode === 'CUSTOMER_RETURN' ? qty : -qty,
        unitRate: qty > 0 ? roundCurrency(metrics.netSaleTotal / qty) : rate,
        totalValue: metrics.netSaleTotal,
        resultingStock: nextAvailableStock,
        resultingAvgPurchasePrice: prev.avgPurchasePrice,
        notes: clamp(input.notes || `${saleMode}: ${input.invoiceNumber}`, SCHEMA_LIMITS.NOTES_MAX),
        createdBy: uid,
        createdAt: now,
      });

      const auditPayload = buildAuditLogPayload(
        'STOCK_OUT',
        'SALE',
        saleId,
        `${saleMode}: ${qty} ${prev.unit} of ${clamp(prev.name, 80)} (${clamp(input.invoiceNumber, 40)}) — Net ₹${metrics.netSaleTotal}`
      );
      if (auditPayload) {
        transaction.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
      }
    });

    return saleId;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Insufficient stock') || error.message.includes('archived'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---------------------------------------------------------------------------
// Suppliers & Customers CRUD
// ---------------------------------------------------------------------------

export async function saveSupplier(
  input: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || generateSafeId('sup');
  const path = `suppliers/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'suppliers', id), {
        name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
        phone: clamp(input.phone, SCHEMA_LIMITS.PHONE_MAX),
        email: clamp(input.email, SCHEMA_LIMITS.EMAIL_MAX),
        address: clamp(input.address, 400),
        gstNumber: clamp(input.gstNumber, 32),
        notes: clamp(input.notes, SCHEMA_LIMITS.NOTES_MAX),
        updatedAt: serverTimestamp(),
      });
      await recordAuditLog('UPDATE_SUPPLIER', 'SUPPLIER', id, `Updated supplier "${clamp(input.name, 100)}"`);
    } else {
      await setDoc(doc(db, 'suppliers', id), {
        name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
        phone: clamp(input.phone, SCHEMA_LIMITS.PHONE_MAX),
        email: clamp(input.email, SCHEMA_LIMITS.EMAIL_MAX),
        address: clamp(input.address, 400),
        gstNumber: clamp(input.gstNumber, 32),
        notes: clamp(input.notes, SCHEMA_LIMITS.NOTES_MAX),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await recordAuditLog('CREATE_SUPPLIER', 'SUPPLIER', id, `Added supplier "${clamp(input.name, 100)}"`);
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'suppliers', id));
    await recordAuditLog('DELETE_SUPPLIER', 'SUPPLIER', id, `Deleted supplier (${id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `suppliers/${id}`);
  }
}

export async function saveCustomer(
  input: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || generateSafeId('cust');
  const path = `customers/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'customers', id), {
        name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
        phone: clamp(input.phone, SCHEMA_LIMITS.PHONE_MAX),
        location: clamp(input.location, SCHEMA_LIMITS.LOCATION_MAX),
        email: clamp(input.email, SCHEMA_LIMITS.EMAIL_MAX),
        gstNumber: clamp(input.gstNumber, 32),
        notes: clamp(input.notes, SCHEMA_LIMITS.NOTES_MAX),
        updatedAt: serverTimestamp(),
      });
      await recordAuditLog('UPDATE_CUSTOMER', 'CUSTOMER', id, `Updated customer "${clamp(input.name, 100)}"`);
    } else {
      await setDoc(doc(db, 'customers', id), {
        name: clamp(input.name, SCHEMA_LIMITS.NAME_MAX),
        phone: clamp(input.phone, SCHEMA_LIMITS.PHONE_MAX),
        location: clamp(input.location, SCHEMA_LIMITS.LOCATION_MAX),
        email: clamp(input.email, SCHEMA_LIMITS.EMAIL_MAX),
        gstNumber: clamp(input.gstNumber, 32),
        notes: clamp(input.notes, SCHEMA_LIMITS.NOTES_MAX),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await recordAuditLog('CREATE_CUSTOMER', 'CUSTOMER', id, `Added customer "${clamp(input.name, 100)}"`);
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customers', id));
    await recordAuditLog('DELETE_CUSTOMER', 'CUSTOMER', id, `Deleted customer (${id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
  }
}

// ---------------------------------------------------------------------------
// WhatsApp Number Management
// ---------------------------------------------------------------------------

export async function saveWhatsAppNumber(
  input: Omit<WhatsAppNumber, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const check = validateInternationalPhone(input.phoneNumber);
  if (!check.valid) throw new Error(check.error || 'Invalid international phone number.');

  const id = existingId || generateSafeId('wa');
  const path = `whatsappNumbers/${id}`;

  try {
    const allSnap = await getDocs(collection(db, 'whatsappNumbers'));
    const batch = writeBatch(db);
    const now = serverTimestamp();

    if (input.isDefault) {
      for (const d of allSnap.docs) {
        if (d.id !== id && d.data().isDefault) {
          batch.update(d.ref, { isDefault: false, updatedAt: now });
        }
      }
    }

    if (existingId) {
      batch.update(doc(db, 'whatsappNumbers', id), {
        displayName: clamp(input.displayName, 80),
        phoneNumber: check.normalized,
        isActive: Boolean(input.isActive),
        isDefault: Boolean(input.isDefault),
        receivesProductEnquiries: Boolean(input.receivesProductEnquiries),
        receivesGeneralEnquiries: Boolean(input.receivesGeneralEnquiries),
        updatedAt: now,
      });
    } else {
      batch.set(doc(db, 'whatsappNumbers', id), {
        displayName: clamp(input.displayName, 80),
        phoneNumber: check.normalized,
        isActive: Boolean(input.isActive),
        isDefault: Boolean(input.isDefault),
        receivesProductEnquiries: Boolean(input.receivesProductEnquiries),
        receivesGeneralEnquiries: Boolean(input.receivesGeneralEnquiries),
        createdAt: now,
        updatedAt: now,
      });
    }

    const auditPayload = buildAuditLogPayload(
      existingId ? 'UPDATE_WHATSAPP' : 'CREATE_WHATSAPP',
      'WHATSAPP_NUMBER',
      id,
      `${existingId ? 'Updated' : 'Added'} WhatsApp number "${clamp(input.displayName, 60)}" (${check.normalized})`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }

    await batch.commit();
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function setDefaultWhatsAppNumber(targetId: string): Promise<void> {
  try {
    const allSnap = await getDocs(collection(db, 'whatsappNumbers'));
    const batch = writeBatch(db);
    const now = serverTimestamp();
    for (const d of allSnap.docs) {
      if (d.id === targetId) {
        batch.update(d.ref, { isDefault: true, isActive: true, updatedAt: now });
      } else if (d.data().isDefault) {
        batch.update(d.ref, { isDefault: false, updatedAt: now });
      }
    }
    const auditPayload = buildAuditLogPayload(
      'UPDATE_WHATSAPP',
      'WHATSAPP_NUMBER',
      targetId,
      `Set default WhatsApp enquiry routing number (${targetId})`
    );
    if (auditPayload) {
      batch.set(doc(db, 'auditLogs', generateSafeId('audit')), auditPayload);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `whatsappNumbers/${targetId}`);
  }
}

export async function toggleWhatsAppActive(targetId: string, isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'whatsappNumbers', targetId), {
      isActive,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      'UPDATE_WHATSAPP',
      'WHATSAPP_NUMBER',
      targetId,
      `${isActive ? 'Activated' : 'Deactivated'} WhatsApp number (${targetId})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `whatsappNumbers/${targetId}`);
  }
}

export async function deleteWhatsAppNumber(targetId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'whatsappNumbers', targetId));
    await recordAuditLog('DELETE_WHATSAPP', 'WHATSAPP_NUMBER', targetId, `Removed WhatsApp number (${targetId})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `whatsappNumbers/${targetId}`);
  }
}

// ---------------------------------------------------------------------------
// Enquiries (Public Create, Admin Manage)
// ---------------------------------------------------------------------------

export async function submitBuyerEnquiry(input: {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  buyerName: string;
  buyerPhone: string;
  buyerLocation: string;
  message: string;
  whatsappNumberUsed: string;
  enquiryType: 'PRODUCT' | 'GENERAL';
}): Promise<string> {
  const id = generateSafeId('enq');
  const path = `enquiries/${id}`;
  try {
    const now = serverTimestamp();
    await setDoc(doc(db, 'enquiries', id), {
      productId: clamp(input.productId, SCHEMA_LIMITS.ID_MAX),
      productName: clamp(input.productName, SCHEMA_LIMITS.NAME_MAX),
      sku: clamp(input.sku, SCHEMA_LIMITS.SKU_MAX),
      quantity: Math.max(0, Number(input.quantity) || 0),
      unit: clamp(input.unit, SCHEMA_LIMITS.UNIT_MAX),
      buyerName: clamp(input.buyerName, 120),
      buyerPhone: clamp(input.buyerPhone, SCHEMA_LIMITS.PHONE_MAX),
      buyerLocation: clamp(input.buyerLocation, SCHEMA_LIMITS.LOCATION_MAX),
      message: clamp(input.message, 2000),
      whatsappNumberUsed: clamp(input.whatsappNumberUsed, 24),
      enquiryType: input.enquiryType,
      status: 'NEW',
      adminNotes: '',
      createdAt: now,
      updatedAt: now,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus,
  adminNotes: string
): Promise<void> {
  const path = `enquiries/${id}`;
  try {
    await updateDoc(doc(db, 'enquiries', id), {
      status,
      adminNotes: clamp(adminNotes, SCHEMA_LIMITS.NOTES_MAX),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog('UPDATE_ENQUIRY', 'ENQUIRY', id, `Updated buyer enquiry (${id}) status to ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEnquiry(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'enquiries', id));
    await recordAuditLog('DELETE_ENQUIRY', 'ENQUIRY', id, `Deleted buyer enquiry (${id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `enquiries/${id}`);
  }
}

// ---------------------------------------------------------------------------
// User & Role Management (Admin)
// ---------------------------------------------------------------------------

export async function inviteUserByEmail(input: {
  email: string;
  displayName: string;
  role: 'ADMIN' | 'VIEWER';
}): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required.');
  const normalizedEmail = clamp(input.email.toLowerCase(), SCHEMA_LIMITS.EMAIL_MAX);
  const path = `userInvites/${normalizedEmail}`;
  try {
    await setDoc(doc(db, 'userInvites', normalizedEmail), {
      email: normalizedEmail,
      displayName: clamp(input.displayName, 120),
      role: input.role,
      active: true,
      invitedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog('INVITE_USER', 'USER_INVITE', normalizedEmail, `Authorized ${normalizedEmail} as ${input.role}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserInvite(email: string): Promise<void> {
  const normalized = email.toLowerCase();
  try {
    await deleteDoc(doc(db, 'userInvites', normalized));
    await recordAuditLog('REVOKE_INVITE', 'USER_INVITE', normalized, `Revoked authorization invite for ${normalized}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `userInvites/${normalized}`);
  }
}

export async function updateUserProfileAccess(
  uid: string,
  updates: { displayName: string; role: UserRole; active: boolean }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clamp(updates.displayName, 120),
      role: updates.role,
      active: updates.active,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      'UPDATE_USER_ACCESS',
      'USER',
      uid,
      `Updated user "${clamp(updates.displayName, 60)}" access: role=${updates.role}, active=${updates.active}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
