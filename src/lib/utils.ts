/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number, currency?: 'BRL' | 'EUR') => {
  const finalCurrency = currency || (
    typeof window !== 'undefined' && 
    (localStorage.getItem('simplepsi_country') === 'PT' || localStorage.getItem('prof_country') === 'PT' || window.location.pathname.startsWith('/pt') || window.location.search.includes('country=pt'))
      ? 'EUR'
      : 'BRL'
  );
  if (finalCurrency === 'EUR') {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getWhatsAppLink = (phone?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('351') && digits.length >= 12) {
    return `https://wa.me/${digits}`;
  }
  if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('2'))) {
    return `https://wa.me/351${digits}`;
  }
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

export function formatPatientFrequency(patient: {
  recurrence?: string;
  sessionDay?: string;
  sessionTime?: string;
}): string {
  if (!patient || !patient.sessionDay) {
    return 'Avulso / Sob Demanda';
  }
  const day = patient.sessionDay.replace('-feira', '');
  const time = patient.sessionTime ? ` às ${patient.sessionTime}` : '';
  const recurrence = patient.recurrence || 'Semanal';

  if (recurrence === 'Semanal') {
    return `Semanal • ${day}s${time}`;
  }
  if (recurrence === 'Quinzenal') {
    return `Quinzenal • ${day}s${time}`;
  }
  if (recurrence === 'Mensal') {
    return `Mensal • ${day}s${time}`;
  }
  return `${day}s${time}`;
}

export function getPatientLastSessionInfo(patient: any): string | null {
  const evolucoes = patient?.clinicalData?.evoluções;
  if (Array.isArray(evolucoes) && evolucoes.length > 0) {
    const first = evolucoes[0];
    if (first?.date) {
      return first.date;
    }
  }
  return null;
}
