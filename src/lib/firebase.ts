import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const FIREBASE_RUNTIME_INFO = {
  projectId: firebaseConfig.projectId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  storageBucket: firebaseConfig.storageBucket,
  authDomain: firebaseConfig.authDomain,
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export type DiagnosticStatus = 'ok' | 'warning' | 'error';

export interface BackendDiagnosticCheck {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
  actionRequired?: string;
}

export interface BackendDiagnosticsReport {
  checkedAt: string;
  checks: BackendDiagnosticCheck[];
}

export async function runBackendDiagnostics(): Promise<BackendDiagnosticsReport> {
  const checks: BackendDiagnosticCheck[] = [];

  // 1. Configuration completeness
  const hasConfig = Boolean(
    firebaseConfig.projectId &&
      firebaseConfig.firestoreDatabaseId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.authDomain &&
      firebaseConfig.apiKey
  );
  checks.push({
    id: 'config',
    label: 'Firebase SDK Configuration',
    status: hasConfig ? 'ok' : 'error',
    detail: hasConfig
      ? `Connected to project "${firebaseConfig.projectId}" (DB: ${firebaseConfig.firestoreDatabaseId}).`
      : 'Missing required fields in firebase-applet-config.json.',
  });

  // 2. Cloud Firestore connectivity
  try {
    const companySnap = await getDocFromServer(doc(db, 'companySettings', 'public'));
    checks.push({
      id: 'firestore',
      label: 'Cloud Firestore Connection',
      status: companySnap.exists() ? 'ok' : 'warning',
      detail: companySnap.exists()
        ? 'Live Cloud Firestore connection verified and companySettings/public is populated.'
        : 'Cloud Firestore is reachable, but companySettings/public is not seeded yet.',
      actionRequired: companySnap.exists()
        ? undefined
        : 'Click "Initialize Defaults in Firestore" at the top of the Admin Dashboard or save Company Settings below.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      id: 'firestore',
      label: 'Cloud Firestore Connection',
      status: 'error',
      detail: `Unable to reach Cloud Firestore: ${message}`,
      actionRequired: 'Verify internet connectivity and Firestore Rules deployment.',
    });
  }

  // 3. Public catalog scoped query verification
  try {
    const pubSnap = await getDocs(
      query(collection(db, 'publicProducts'), where('status', '==', 'ACTIVE'), limit(1))
    );
    checks.push({
      id: 'public-catalog',
      label: 'Public Catalogue Query & Rules',
      status: 'ok',
      detail: `Scoped publicProducts query succeeded (${pubSnap.size} sample doc returned).`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      id: 'public-catalog',
      label: 'Public Catalogue Query & Rules',
      status: 'error',
      detail: `Public catalogue query failed: ${message}`,
    });
  }

  // 4. Unauthenticated Private Data Lockdown Check
  try {
    const restUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/products?pageSize=1`;
    const res = await fetch(restUrl);
    if (res.status === 403) {
      checks.push({
        id: 'private-lockdown',
        label: 'Private Inventory & Finance Lockdown',
        status: 'ok',
        detail: 'Unauthenticated read on private "products" collection returned HTTP 403 PERMISSION_DENIED.',
      });
    } else {
      checks.push({
        id: 'private-lockdown',
        label: 'Private Inventory & Finance Lockdown',
        status: 'error',
        detail: `Unexpected HTTP ${res.status} when probing unauthenticated access to /products.`,
        actionRequired: 'Deploy hardened firestore.rules immediately.',
      });
    }
  } catch (err) {
    checks.push({
      id: 'private-lockdown',
      label: 'Private Inventory & Finance Lockdown',
      status: 'warning',
      detail: `Could not verify REST lockdown probe: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 5. Email/Password Auth Provider Check
  try {
    const authProbeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'connectivity-check@invalid.local',
          password: 'connectivity-check-probe',
          returnSecureToken: true,
        }),
      }
    );
    const body = (await authProbeRes.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    const errCode = body?.error?.message || '';
    if (errCode.includes('PASSWORD_LOGIN_DISABLED') || errCode.includes('OPERATION_NOT_ALLOWED')) {
      checks.push({
        id: 'email-auth',
        label: 'Email/Password Authentication Provider',
        status: 'warning',
        detail: 'Email/Password sign-in is currently DISABLED in Firebase Authentication (PASSWORD_LOGIN_DISABLED).',
        actionRequired:
          'Open Firebase Console → Authentication → Sign-in method → Add/Enable Email/Password.',
      });
    } else {
      checks.push({
        id: 'email-auth',
        label: 'Email/Password Authentication Provider',
        status: 'ok',
        detail: 'Email/Password sign-in provider is enabled in Firebase Authentication.',
      });
    }
  } catch (err) {
    checks.push({
      id: 'email-auth',
      label: 'Email/Password Authentication Provider',
      status: 'warning',
      detail: `Unable to probe Auth provider: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 6. Firebase Storage Bucket Check
  try {
    const storageRes = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o?maxResults=1`
    );
    if (storageRes.status === 404) {
      checks.push({
        id: 'storage',
        label: 'Firebase Storage Bucket',
        status: 'warning',
        detail: `Storage bucket "${firebaseConfig.storageBucket}" returned HTTP 404 (not initialized yet).`,
        actionRequired:
          'Open Firebase Console → Storage → Get started to initialize the bucket, then paste storage.rules into Storage → Rules.',
      });
    } else if (storageRes.status === 200 || storageRes.status === 401 || storageRes.status === 403) {
      checks.push({
        id: 'storage',
        label: 'Firebase Storage Bucket',
        status: 'ok',
        detail: `Storage bucket "${firebaseConfig.storageBucket}" is provisioned and reachable (HTTP ${storageRes.status}).`,
      });
    } else {
      checks.push({
        id: 'storage',
        label: 'Firebase Storage Bucket',
        status: 'warning',
        detail: `Storage bucket responded with HTTP ${storageRes.status}.`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'storage',
      label: 'Firebase Storage Bucket',
      status: 'warning',
      detail: `Storage probe error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    checks,
  };
}

