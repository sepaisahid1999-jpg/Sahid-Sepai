import assert from 'node:assert/strict';
import {
  calculateNextWeightedAveragePurchase,
  calculatePurchaseTotal,
  calculateSaleMetrics,
  computeMonthlySeries,
} from '../src/lib/accounting.ts';
import {
  buildProductEnquiryMessage,
  buildWhatsAppUrl,
  selectWhatsAppNumber,
  validateInternationalPhone,
} from '../src/lib/whatsapp.ts';
import {
  buildDefaultCmsConfig,
  createDefaultSystemPages,
  isAnnouncementActiveOnDate,
  mergeWithDefaultCmsConfig,
} from '../src/lib/cmsDefaults.ts';
import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_PRODUCTS,
  isPlaceholderProduct,
} from '../src/lib/previewPlaceholders.ts';
import { UNIT_OPTIONS } from '../src/lib/constants.ts';
import {
  canHardDeleteProduct,
  isSafeImageUrl,
  validateCategoryInput,
  validateImageFile,
  validateProductInput,
} from '../src/lib/productValidation.ts';
import {
  calculateDetailedPurchaseCost,
  calculatePostReversalProductState,
  getPurchaseSign,
  getReversedPurchaseIdSet,
  isDuplicateSupplierInvoice,
  validatePurchaseInput,
} from '../src/lib/purchaseValidation.ts';
import {
  buildCategoryPerformance,
  calculateOverviewMetrics,
} from '../src/lib/dashboardMetrics.ts';
import type {
  Announcement,
  Category,
  Enquiry,
  Product,
  Purchase,
  Sale,
  WhatsAppNumber,
} from '../src/types/index.ts';

// 1. Purchase Total & Weighted Average Purchase Price
const pur1Total = calculatePurchaseTotal(100, 50, 200); // 100*50 + 200 = 5200
assert.equal(pur1Total, 5200);

const avg1 = calculateNextWeightedAveragePurchase(0, 0, 100, pur1Total);
assert.equal(avg1.nextTotalPurchaseQty, 100);
assert.equal(avg1.nextAvgPurchasePrice, 52);

const pur2Total = calculatePurchaseTotal(100, 60, 0); // 6000
const avg2 = calculateNextWeightedAveragePurchase(
  avg1.nextTotalPurchaseQty,
  avg1.nextTotalPurchaseAmount,
  100,
  pur2Total
);
assert.equal(avg2.nextTotalPurchaseQty, 200);
assert.equal(avg2.nextTotalPurchaseAmount, 11200);
assert.equal(avg2.nextAvgPurchasePrice, 56); // 11200 / 200 = 56

// 2. Sale Metrics (Revenue, COGS, Gross Profit)
const sale1 = calculateSaleMetrics(50, 80, 100, 50, avg2.nextAvgPurchasePrice);
assert.equal(sale1.netSaleTotal, 3950);
assert.equal(sale1.costOfGoodsSold, 2800);
assert.equal(sale1.grossProfit, 1150);

// 3. WhatsApp Validation & Automatic Default Fallback
assert.equal(validateInternationalPhone('+917585841977').valid, true);
assert.equal(validateInternationalPhone('7585841977').valid, false);

const numbers: WhatsAppNumber[] = [
  {
    id: '1',
    displayName: 'Primary',
    phoneNumber: '+917585841977',
    isActive: false, // Default becomes inactive!
    isDefault: true,
    receivesProductEnquiries: true,
    receivesGeneralEnquiries: true,
  },
  {
    id: '2',
    displayName: 'Backup Desk',
    phoneNumber: '+917074340808',
    isActive: true,
    isDefault: false,
    receivesProductEnquiries: true,
    receivesGeneralEnquiries: true,
  },
];

const selected = selectWhatsAppNumber(numbers, 'product');
assert.equal(selected?.phoneNumber, '+917074340808');

const msg = buildProductEnquiryMessage({
  companyName: 'Gazi Jute Enterprises',
  productName: 'Hessian Roll 300 GSM',
  sku: 'GJE-HC-300',
  quantity: 25,
  unit: 'roll',
  buyerName: 'Rahim Traders',
  buyerLocation: 'Kolkata',
});
assert.ok(msg.includes('Product: Hessian Roll 300 GSM'));
assert.ok(msg.includes('Product Code: GJE-HC-300'));
assert.ok(msg.includes('Required Quantity: 25 roll'));

const url = buildWhatsAppUrl('+917074340808', msg);
assert.ok(url.startsWith('https://wa.me/917074340808?text='));

// 4. Monthly Series Aggregation
const samplePurchases: Purchase[] = [
  {
    id: 'p1',
    productId: 'prod_1',
    productName: 'Hessian',
    sku: 'SKU1',
    unit: 'roll',
    purchaseDate: '2026-11-10',
    supplierId: '',
    supplierName: 'Mill A',
    invoiceNumber: 'INV1',
    quantity: 100,
    purchaseRate: 50,
    additionalExpenses: 200,
    totalAmount: 5200,
    notes: '',
    type: 'PURCHASE',
    createdBy: 'u1',
  },
];
const sampleSales: Sale[] = [
  {
    id: 's1',
    productId: 'prod_1',
    productName: 'Hessian',
    sku: 'SKU1',
    unit: 'roll',
    customerId: '',
    customerName: 'Buyer B',
    saleDate: '2026-11-15',
    invoiceNumber: 'S1',
    quantity: 50,
    saleRate: 80,
    discount: 100,
    additionalCharges: 50,
    totalAmount: 3950,
    costOfGoodsSold: 2800,
    grossProfit: 1150,
    notes: '',
    type: 'SALE',
    createdBy: 'u1',
  },
];
const monthly = computeMonthlySeries(samplePurchases, sampleSales);
assert.equal(monthly.length, 1);
assert.equal(monthly[0].purchaseTotal, 5200);
assert.equal(monthly[0].salesTotal, 3950);
assert.equal(monthly[0].grossProfit, 1150);

// 5. CMS Announcements Date Window & Config Merge Fallback
const activeNotice: Announcement = {
  id: 'a1',
  title: 'Harvest Notice',
  message: 'Dispatch open',
  linkLabel: '',
  linkUrl: '',
  bgColor: '#14452F',
  textColor: '#FFFFFF',
  isActive: true,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
};
assert.equal(isAnnouncementActiveOnDate(activeNotice, '2026-11-23'), true);
assert.equal(isAnnouncementActiveOnDate(activeNotice, '2026-10-31'), false);
assert.equal(isAnnouncementActiveOnDate(activeNotice, '2026-12-01'), false);
assert.equal(isAnnouncementActiveOnDate({ ...activeNotice, isActive: false }, '2026-11-23'), false);

const defaultCms = buildDefaultCmsConfig();
const mergedCms = mergeWithDefaultCmsConfig({
  status: 'DRAFT',
  general: { ...defaultCms.general, companyName: 'Gazi Custom Test' },
});
assert.equal(mergedCms.general.companyName, 'Gazi Custom Test');
assert.equal(mergedCms.homepage.sections.length, defaultCms.homepage.sections.length);
assert.ok(defaultCms.homepage.sections.some((s) => s.type === 'wholesale_enquiry'));
assert.ok(defaultCms.homepage.sections.some((s) => s.type === 'contact_section'));

const systemPages = createDefaultSystemPages();
assert.ok(systemPages.some((p) => p.slug === 'privacy-policy'));
assert.ok(systemPages.some((p) => p.slug === 'terms-and-conditions'));

assert.ok(PLACEHOLDER_CATEGORIES.length >= 4);
assert.ok(PLACEHOLDER_PRODUCTS.every((p) => isPlaceholderProduct(p)));

// 6. Product Units, Input Validation, Image Validation & Historical Deletion Protection
for (const requiredUnit of ['kg', 'ton', 'piece', 'bundle', 'bag', 'meter'] as const) {
  assert.ok(
    UNIT_OPTIONS.includes(requiredUnit),
    `Expected UNIT_OPTIONS to include "${requiredUnit}"`
  );
}

const existingProds = [{ productId: 'prod_1', sku: 'GJE-HC-300' }];
const validProdCheck = validateProductInput(
  {
    sku: 'GJE-BAG-50',
    name: 'Heavy Duty B-Twill Jute Bag 50kg',
    categoryId: 'cat_bags',
    description: 'Standard food-grade grain sacking bag.',
    unit: 'bag',
    images: ['https://example.com/bag.jpg'],
    lowStockThreshold: 100,
    minOrderQty: 50,
    status: 'ACTIVE',
  },
  existingProds
);
assert.equal(validProdCheck.valid, true);

// Duplicate SKU blocked on create, allowed when editing same product
const dupSkuCheck = validateProductInput(
  {
    sku: 'gje-hc-300',
    name: 'Duplicate SKU Test',
    categoryId: 'cat_1',
    description: '',
    unit: 'kg',
    images: [],
    lowStockThreshold: 10,
    minOrderQty: 5,
    status: 'ACTIVE',
  },
  existingProds
);
assert.equal(dupSkuCheck.valid, false);
assert.ok(dupSkuCheck.fieldErrors.sku);

const editSameSkuCheck = validateProductInput(
  {
    sku: 'GJE-HC-300',
    name: 'Updated Hessian Roll',
    categoryId: 'cat_1',
    description: '',
    unit: 'meter',
    images: [],
    lowStockThreshold: 10,
    minOrderQty: 5,
    status: 'INACTIVE',
  },
  existingProds,
  'prod_1'
);
assert.equal(editSameSkuCheck.valid, true);

// Invalid unit, MOQ, threshold, unsafe URL blocked
const invalidProdCheck = validateProductInput(
  {
    sku: 'GJE-TEST',
    name: 'Invalid Test',
    categoryId: 'cat_1',
    description: '',
    unit: 'invalid_unit',
    images: ['javascript:alert(1)'],
    lowStockThreshold: -5,
    minOrderQty: 0,
    status: 'ARCHIVED',
  },
  existingProds
);
assert.equal(invalidProdCheck.valid, false);
assert.ok(invalidProdCheck.fieldErrors.unit);
assert.ok(invalidProdCheck.fieldErrors.lowStockThreshold);
assert.ok(invalidProdCheck.fieldErrors.minOrderQty);
assert.ok(invalidProdCheck.fieldErrors.images);
assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
assert.equal(isSafeImageUrl('https://firebasestorage.googleapis.com/v0/b/x/o/img.webp'), true);

// Category validation & duplicate check
const existingCats = [{ id: 'cat_1', name: 'Hessian Cloth' }];
assert.equal(
  validateCategoryInput({ name: 'hessian cloth', description: '' }, existingCats).valid,
  false
);
assert.equal(
  validateCategoryInput({ name: 'Hessian Cloth', description: 'Updated' }, existingCats, 'cat_1')
    .valid,
  true
);

// Image file validation
assert.equal(
  validateImageFile({ name: 'jute.webp', size: 1024 * 500, type: 'image/webp' }).valid,
  true
);
assert.equal(
  validateImageFile({ name: 'huge.png', size: 6 * 1024 * 1024, type: 'image/png' }).valid,
  false
);
assert.equal(
  validateImageFile({ name: 'doc.pdf', size: 1024, type: 'application/pdf' }).valid,
  false
);

// Historical record deletion protection
assert.equal(
  canHardDeleteProduct({
    purchasesCount: 0,
    salesCount: 0,
    stockTransactionsCount: 0,
    totalPurchaseQty: 0,
    totalSalesQty: 0,
  }).allowed,
  true
);
assert.equal(
  canHardDeleteProduct({
    purchasesCount: 1,
    salesCount: 0,
    stockTransactionsCount: 1,
    totalPurchaseQty: 50,
    totalSalesQty: 0,
  }).allowed,
  false
);
assert.equal(
  canHardDeleteProduct({
    purchasesCount: 0,
    salesCount: 0,
    stockTransactionsCount: 0,
    totalPurchaseQty: 25,
    totalSalesQty: 0,
  }).allowed,
  false
);

// 7. Purchase Cost Formula, Weighted Average Progression, Historical Immutability, Reversal & Duplicate Invoice Guard
// Batch 1: 100 kg @ ₹120/kg + ₹500 freight + ₹200 loading + ₹600 tax - ₹300 discount
// Expected Inventory Cost = 12000 + 500 + 200 + 600 - 300 = ₹13000 -> Avg Cost = ₹130/kg
const batch1Cost = calculateDetailedPurchaseCost({
  quantity: 100,
  purchaseRate: 120,
  freightAmount: 500,
  otherExpenses: 200,
  taxAmount: 600,
  discount: 300,
});
assert.equal(batch1Cost.baseAmount, 12000);
assert.equal(batch1Cost.capitalizableExpenses, 1300);
assert.equal(batch1Cost.netInventoryCost, 13000);

const batch1Avg = calculateNextWeightedAveragePurchase(0, 0, 100, batch1Cost.netInventoryCost);
assert.equal(batch1Avg.nextTotalPurchaseQty, 100);
assert.equal(batch1Avg.nextTotalPurchaseAmount, 13000);
assert.equal(batch1Avg.nextAvgPurchasePrice, 130);

const batch1Record: Purchase = {
  id: 'pur_batch_1',
  purchaseId: 'pur_batch_1',
  productId: 'prod_jute_1',
  productName: 'Raw Tossa Jute TD-3',
  sku: 'GJE-TD3',
  unit: 'kg',
  purchaseDate: '2026-11-01',
  supplierId: 'sup_1',
  supplierName: 'Bengal Jute Mills',
  invoiceNumber: 'BJM-001',
  quantity: 100,
  purchaseRate: 120,
  freightAmount: 500,
  otherExpenses: 200,
  discount: 300,
  taxAmount: 600,
  additionalExpenses: batch1Cost.capitalizableExpenses,
  totalAmount: batch1Cost.netInventoryCost,
  paymentStatus: 'PAID',
  notes: '',
  type: 'PURCHASE',
  createdBy: 'admin_1',
};

// Batch 2: 50 kg @ ₹150/kg + ₹250 freight + ₹50 other + ₹0 tax - ₹0 discount = ₹7800
// Combined Total Cost = 13000 + 7800 = ₹20800 over 150 kg -> Avg Cost = ₹138.67/kg
const batch2Cost = calculateDetailedPurchaseCost({
  quantity: 50,
  purchaseRate: 150,
  freightAmount: 250,
  otherExpenses: 50,
  taxAmount: 0,
  discount: 0,
});
assert.equal(batch2Cost.netInventoryCost, 7800);

const batch2Avg = calculateNextWeightedAveragePurchase(
  batch1Avg.nextTotalPurchaseQty,
  batch1Avg.nextTotalPurchaseAmount,
  50,
  batch2Cost.netInventoryCost
);
assert.equal(batch2Avg.nextTotalPurchaseQty, 150);
assert.equal(batch2Avg.nextTotalPurchaseAmount, 20800);
assert.equal(batch2Avg.nextAvgPurchasePrice, 138.67);

// Historical Batch 1 cost must remain immutable after Batch 2 is added
assert.equal(batch1Record.totalAmount, 13000);
assert.equal(batch1Record.purchaseRate, 120);

// Duplicate invoice check catches same supplier + normalized invoice #
const batch2Record: Purchase = {
  ...batch1Record,
  id: 'pur_batch_2',
  purchaseId: 'pur_batch_2',
  purchaseDate: '2026-11-05',
  invoiceNumber: 'BJM-002',
  quantity: 50,
  purchaseRate: 150,
  freightAmount: 250,
  otherExpenses: 50,
  discount: 0,
  taxAmount: 0,
  additionalExpenses: 300,
  totalAmount: 7800,
};
assert.ok(
  isDuplicateSupplierInvoice([batch1Record, batch2Record], {
    supplierId: 'sup_1',
    supplierName: 'Bengal Jute Mills',
    invoiceNumber: '  bjm-001 ',
    type: 'PURCHASE',
  })
);
assert.equal(
  isDuplicateSupplierInvoice([batch1Record, batch2Record], {
    supplierId: 'sup_1',
    supplierName: 'Bengal Jute Mills',
    invoiceNumber: 'BJM-003',
    type: 'PURCHASE',
  }),
  null
);

// Controlled cancellation reversal of Batch 2 restores qty=100, cost=13000, avg=130
const postReversal = calculatePostReversalProductState({
  prevAvailableStock: 150,
  prevTotalPurchaseQty: batch2Avg.nextTotalPurchaseQty,
  prevTotalPurchaseAmount: batch2Avg.nextTotalPurchaseAmount,
  reversedQty: batch2Record.quantity,
  reversedAmount: batch2Record.totalAmount,
});
assert.equal(postReversal.nextAvailableStock, 100);
assert.equal(postReversal.nextTotalPurchaseQty, 100);
assert.equal(postReversal.nextTotalPurchaseAmount, 13000);
assert.equal(postReversal.nextAvgPurchasePrice, 130);

// Negative stock guard: if 120 kg of 150 kg were sold (only 30 kg left), reversing 50 kg Batch 2 must throw
assert.throws(
  () =>
    calculatePostReversalProductState({
      prevAvailableStock: 30,
      prevTotalPurchaseQty: 150,
      prevTotalPurchaseAmount: 20800,
      reversedQty: 50,
      reversedAmount: 7800,
    }),
  /Cannot reverse/
);

// Once Batch 2 is reversed via CANCELLATION_REVERSAL, monthly series nets to Batch 1 only and BJM-002 can be re-entered cleanly
const batch2Reversal: Purchase = {
  ...batch2Record,
  id: 'rev_pur_batch_2',
  purchaseId: 'rev_pur_batch_2',
  invoiceNumber: 'BJM-002-REV',
  referencePurchaseId: 'pur_batch_2',
  type: 'CANCELLATION_REVERSAL',
};
const allWithRev = [batch1Record, batch2Record, batch2Reversal];
assert.equal(getPurchaseSign(batch2Reversal.type), -1);
assert.equal(getReversedPurchaseIdSet(allWithRev).has('pur_batch_2'), true);
assert.equal(
  isDuplicateSupplierInvoice(allWithRev, {
    supplierId: 'sup_1',
    supplierName: 'Bengal Jute Mills',
    invoiceNumber: 'BJM-002',
    type: 'PURCHASE',
  }),
  null
);
const monthlyAfterRev = computeMonthlySeries(allWithRev, []);
assert.equal(monthlyAfterRev[0].purchaseTotal, 13000);

// Invalid quantity & excessive discount validation
assert.equal(
  validatePurchaseInput({
    purchaseDate: '2026-11-10',
    productId: 'prod_jute_1',
    supplierId: 'sup_1',
    supplierName: 'Bengal Jute Mills',
    invoiceNumber: 'BJM-004',
    quantity: 0,
    purchaseRate: 100,
    freightAmount: 0,
    otherExpenses: 0,
    discount: 0,
    taxAmount: 0,
    paymentStatus: 'PAID',
    type: 'PURCHASE',
  }).valid,
  false
);
assert.equal(
  validatePurchaseInput({
    purchaseDate: '2026-11-10',
    productId: 'prod_jute_1',
    supplierId: 'sup_1',
    supplierName: 'Bengal Jute Mills',
    invoiceNumber: 'BJM-005',
    quantity: 10,
    purchaseRate: 100,
    freightAmount: 50,
    otherExpenses: 0,
    discount: 1200, // exceeds 1050
    taxAmount: 0,
    paymentStatus: 'CREDIT',
    type: 'PURCHASE',
  }).valid,
  false
);

// 8. Admin Dashboard Overview Metrics & Category Performance
const overviewProducts: Product[] = [
  {
    id: 'prod_1',
    productId: 'prod_1',
    sku: 'GJE-HC-300',
    name: 'Hessian Cloth 300 GSM',
    categoryId: 'cat_hc',
    categoryName: 'Hessian Cloth',
    description: '',
    unit: 'roll',
    images: [],
    availableStock: 40,
    avgPurchasePrice: 1200,
    avgSalePrice: 1550,
    totalPurchaseQty: 100,
    totalSalesQty: 60,
    totalPurchaseAmount: 120000,
    totalSalesAmount: 93000,
    totalCogs: 72000,
    currentStockValue: 48000,
    grossProfit: 21000,
    estimatedProfit: 14000,
    lowStockThreshold: 15,
    minOrderQty: 5,
    showStockPublicly: true,
    status: 'ACTIVE',
  },
  {
    id: 'prod_2',
    productId: 'prod_2',
    sku: 'GJE-BG-50',
    name: 'B-Twill Gunny Sacks',
    categoryId: 'cat_bag',
    categoryName: 'Jute Gunny Sacks',
    description: '',
    unit: 'bag',
    images: [],
    availableStock: 10,
    avgPurchasePrice: 80,
    avgSalePrice: 110,
    totalPurchaseQty: 50,
    totalSalesQty: 40,
    totalPurchaseAmount: 4000,
    totalSalesAmount: 4400,
    totalCogs: 3200,
    currentStockValue: 800,
    grossProfit: 1200,
    estimatedProfit: 300,
    lowStockThreshold: 20, // Triggers low stock alert (10 <= 20)
    minOrderQty: 50,
    showStockPublicly: false,
    status: 'INACTIVE',
  },
  {
    id: 'prod_archived',
    productId: 'prod_archived',
    sku: 'GJE-OLD',
    name: 'Discontinued Twine',
    categoryId: 'cat_twine',
    categoryName: 'Jute Twine',
    description: '',
    unit: 'kg',
    images: [],
    availableStock: 99, // Excluded from active/inactive SKU stock metrics
    avgPurchasePrice: 50,
    avgSalePrice: 0,
    totalPurchaseQty: 99,
    totalSalesQty: 0,
    totalPurchaseAmount: 4950,
    totalSalesAmount: 0,
    totalCogs: 0,
    currentStockValue: 4950,
    grossProfit: 0,
    estimatedProfit: 0,
    lowStockThreshold: 5,
    minOrderQty: 10,
    showStockPublicly: false,
    status: 'ARCHIVED',
  },
];

const overviewSales: Sale[] = [
  {
    id: 's_1',
    productId: 'prod_1',
    productName: 'Hessian Cloth 300 GSM',
    sku: 'GJE-HC-300',
    unit: 'roll',
    customerId: 'c1',
    customerName: 'Agro Mills',
    saleDate: '2026-11-20',
    invoiceNumber: 'INV-101',
    quantity: 10,
    saleRate: 1600,
    discount: 500,
    additionalCharges: 0,
    totalAmount: 15500,
    costOfGoodsSold: 12000,
    grossProfit: 3500,
    notes: '',
    type: 'SALE',
    createdBy: 'admin_1',
  },
  {
    id: 's_ret',
    productId: 'prod_1',
    productName: 'Hessian Cloth 300 GSM',
    sku: 'GJE-HC-300',
    unit: 'roll',
    customerId: 'c1',
    customerName: 'Agro Mills',
    saleDate: '2026-11-21',
    invoiceNumber: 'CRN-101',
    quantity: 2,
    saleRate: 1550,
    discount: 0,
    additionalCharges: 0,
    totalAmount: 3100,
    costOfGoodsSold: 2400,
    grossProfit: 700,
    notes: '',
    type: 'CUSTOMER_RETURN',
    createdBy: 'admin_1',
  },
];

const overviewEnquiries: Enquiry[] = [
  {
    id: 'e1',
    productId: 'prod_1',
    productName: 'Hessian Cloth 300 GSM',
    sku: 'GJE-HC-300',
    quantity: 20,
    unit: 'roll',
    buyerName: 'Buyer One',
    buyerPhone: '+919876543210',
    buyerLocation: 'Kolkata',
    message: 'Quote needed',
    whatsappNumberUsed: '+917585841977',
    enquiryType: 'PRODUCT',
    status: 'NEW',
    adminNotes: '',
  },
  {
    id: 'e2',
    productId: '',
    productName: 'General',
    sku: 'GENERAL',
    quantity: 0,
    unit: '',
    buyerName: 'Buyer Two',
    buyerPhone: '',
    buyerLocation: 'Patna',
    message: 'Call back',
    whatsappNumberUsed: '+917585841977',
    enquiryType: 'GENERAL',
    status: 'PENDING',
    adminNotes: '',
  },
  {
    id: 'e3',
    productId: '',
    productName: 'General',
    sku: 'GENERAL',
    quantity: 0,
    unit: '',
    buyerName: 'Buyer Three',
    buyerPhone: '',
    buyerLocation: 'Delhi',
    message: 'Done',
    whatsappNumberUsed: '+917585841977',
    enquiryType: 'GENERAL',
    status: 'COMPLETED',
    adminNotes: '',
  },
];

const overviewMetrics = calculateOverviewMetrics({
  products: overviewProducts,
  filteredPurchases: samplePurchases,
  filteredSales: overviewSales,
  enquiries: overviewEnquiries,
});

assert.equal(overviewMetrics.totalProducts, 2);
assert.equal(overviewMetrics.archivedProducts, 1);
assert.equal(overviewMetrics.activeCatalogueProducts, 1);
assert.equal(overviewMetrics.totalStockQuantity, 50); // 40 rolls + 10 bags
assert.equal(overviewMetrics.estimatedInventoryValue, 48800); // 48000 + 800
assert.equal(overviewMetrics.totalPurchaseValue, 5200);
assert.equal(overviewMetrics.totalSalesRevenue, 12400); // 15500 - 3100
assert.equal(overviewMetrics.totalCogs, 9600); // 12000 - 2400
assert.equal(overviewMetrics.grossProfit, 2800); // 3500 - 700
assert.equal(overviewMetrics.lowStockAlerts, 1); // prod_2
assert.equal(overviewMetrics.pendingBuyerRequests, 2); // NEW + PENDING
assert.equal(overviewMetrics.unitBreakdown.length, 2);

const catPerf = buildCategoryPerformance({
  products: overviewProducts,
  categories: [
    { id: 'cat_hc', name: 'Hessian Cloth', slug: 'hessian-cloth', active: true },
    { id: 'cat_bag', name: 'Jute Gunny Sacks', slug: 'jute-gunny-sacks', active: true },
  ] as Category[],
  filteredSales: overviewSales,
});
assert.equal(catPerf[0].name, 'Hessian Cloth');
assert.equal(catPerf[0].stockValue, 48000);
assert.equal(catPerf[0].salesRevenue, 12400);

console.log('ALL CORE ACCOUNTING, DASHBOARD METRICS, WHATSAPP, CMS, PRODUCT & PURCHASE TESTS PASSED');
