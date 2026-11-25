import { SCHEMA_LIMITS } from './constants';
import type { WhatsAppNumber } from '../types';

export function validateInternationalPhone(input: string): { valid: boolean; normalized: string; error?: string } {
  const stripped = input.replace(/[\s\-()]/g, '');
  if (!SCHEMA_LIMITS.WHATSAPP_PATTERN.test(stripped)) {
    return {
      valid: false,
      normalized: stripped,
      error: 'Enter an international number with country code, e.g. +917585841977',
    };
  }
  return { valid: true, normalized: stripped };
}

export function selectWhatsAppNumber(
  numbers: WhatsAppNumber[],
  purpose: 'product' | 'general'
): WhatsAppNumber | null {
  const active = numbers.filter((n) => n.isActive);
  if (active.length === 0) return null;

  const purposeField =
    purpose === 'product' ? 'receivesProductEnquiries' : 'receivesGeneralEnquiries';

  const defaultForPurpose = active.find((n) => n.isDefault && n[purposeField]);
  if (defaultForPurpose) return defaultForPurpose;

  const anyForPurpose = active.find((n) => n[purposeField]);
  if (anyForPurpose) return anyForPurpose;

  const activeDefault = active.find((n) => n.isDefault);
  if (activeDefault) return activeDefault;

  return active[0];
}

export function buildProductEnquiryMessage(params: {
  companyName: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  buyerName: string;
  buyerLocation: string;
  notes?: string;
}): string {
  const base = [
    `Hello ${params.companyName},`,
    '',
    'I am interested in purchasing:',
    '',
    `Product: ${params.productName}`,
    `Product Code: ${params.sku}`,
    `Required Quantity: ${params.quantity} ${params.unit}`,
    `My Name: ${params.buyerName}`,
    `My Location: ${params.buyerLocation}`,
  ];
  if (params.notes && params.notes.trim()) {
    base.push(`Additional Notes: ${params.notes.trim()}`);
  }
  base.push('', 'Please share your best quotation.');
  return base.join('\n');
}

export function buildGeneralEnquiryMessage(params: {
  companyName: string;
  buyerName: string;
  buyerPhone?: string;
  buyerLocation: string;
  message: string;
}): string {
  const lines = [
    `Hello ${params.companyName},`,
    '',
    'I have a wholesale enquiry:',
    '',
    `My Name: ${params.buyerName}`,
    `My Location: ${params.buyerLocation}`,
  ];
  if (params.buyerPhone?.trim()) {
    lines.push(`Phone: ${params.buyerPhone.trim()}`);
  }
  lines.push(`Enquiry: ${params.message.trim()}`, '', 'Please share details and availability.');
  return lines.join('\n');
}

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const digits = phoneNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
