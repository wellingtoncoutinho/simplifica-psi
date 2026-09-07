/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getWhatsAppLink = (phone?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const sanitized = digits.length === 10 || digits.length === 11 ? '55' + digits : digits;
  return `https://wa.me/${sanitized}`;
};

export function safeDateParse(dateInput: any, fallbackDate: Date = new Date()): Date {
  if (!dateInput) return fallbackDate;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? fallbackDate : dateInput;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return fallbackDate;
    
    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? fallbackDate : d;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(`${trimmed}T12:00:00`);
      return isNaN(d.getTime()) ? fallbackDate : d;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [dd, mm, yyyy] = trimmed.split('/');
      const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
      return isNaN(d.getTime()) ? fallbackDate : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? fallbackDate : d;
  }
  return fallbackDate;
}

