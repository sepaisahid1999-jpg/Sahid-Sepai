import { useCallback, useEffect, useState } from 'react';
import {
  subscribeAdminWhatsAppNumbers,
  subscribeAllCategories,
  subscribeAuditLogs,
  subscribeCustomers,
  subscribeEnquiries,
  subscribePrivateProducts,
  subscribePurchases,
  subscribeSales,
  subscribeStockTransactions,
  subscribeSuppliers,
  subscribeUserInvites,
  subscribeUsers,
} from '../services/firestoreService';
import type {
  AuditLog,
  Category,
  Customer,
  Enquiry,
  Product,
  Purchase,
  Sale,
  StockTransaction,
  Supplier,
  UserInvite,
  UserProfile,
  WhatsAppNumber,
} from '../types';

export interface DashboardRealtimeState {
  products: Product[];
  categories: Category[];
  purchases: Purchase[];
  sales: Sale[];
  transactions: StockTransaction[];
  suppliers: Supplier[];
  customers: Customer[];
  enquiries: Enquiry[];
  whatsappNumbers: WhatsAppNumber[];
  users: UserProfile[];
  userInvites: UserInvite[];
  auditLogs: AuditLog[];
  loadingOverview: boolean;
  syncError: string | null;
  lastSyncedAt: string | null;
  retrySync: () => void;
}

export function useDashboardOverviewData(enabled: boolean): DashboardRealtimeState {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userInvites, setUserInvites] = useState<UserInvite[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retrySync = useCallback(() => {
    setSyncError(null);
    setRetryToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoadingOverview(false);
      return;
    }

    setLoadingOverview(true);
    setSyncError(null);

    const readyFlags = {
      products: false,
      categories: false,
      purchases: false,
      sales: false,
      enquiries: false,
    };

    const markSynced = (key?: keyof typeof readyFlags) => {
      if (key) {
        readyFlags[key] = true;
      }
      if (
        readyFlags.products &&
        readyFlags.categories &&
        readyFlags.purchases &&
        readyFlags.sales &&
        readyFlags.enquiries
      ) {
        setLoadingOverview(false);
      }
      setLastSyncedAt(new Date().toISOString());
    };

    const handleSubError = (err: Error) => {
      setSyncError((prev) => prev || err.message);
      setLoadingOverview(false);
    };

    const unsubs = [
      subscribePrivateProducts(
        (items) => {
          setProducts(items);
          markSynced('products');
        },
        handleSubError
      ),
      subscribeAllCategories(
        (items) => {
          setCategories(items);
          markSynced('categories');
        },
        handleSubError
      ),
      subscribePurchases(
        (items) => {
          setPurchases(items);
          markSynced('purchases');
        },
        handleSubError
      ),
      subscribeSales(
        (items) => {
          setSales(items);
          markSynced('sales');
        },
        handleSubError
      ),
      subscribeEnquiries(
        (items) => {
          setEnquiries(items);
          markSynced('enquiries');
        },
        handleSubError
      ),
      subscribeStockTransactions((items) => {
        setTransactions(items);
        markSynced();
      }, handleSubError),
      subscribeSuppliers(setSuppliers, handleSubError),
      subscribeCustomers(setCustomers, handleSubError),
      subscribeAdminWhatsAppNumbers(setWhatsappNumbers, handleSubError),
      subscribeUsers(setUsers, handleSubError),
      subscribeUserInvites(setUserInvites, handleSubError),
      subscribeAuditLogs(setAuditLogs, handleSubError),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [enabled, retryToken]);

  return {
    products,
    categories,
    purchases,
    sales,
    transactions,
    suppliers,
    customers,
    enquiries,
    whatsappNumbers,
    users,
    userInvites,
    auditLogs,
    loadingOverview,
    syncError,
    lastSyncedAt,
    retrySync,
  };
}
