export type CurrencyCode = "IQD" | "USD" | "EGP";

const BASE = "IQD";
const API_URL = `https://open.er-api.com/v6/latest/${BASE}`;
const LS_KEY = "app_exchange_rates_v2";
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export type Rates = Record<string, number>; // rates: amount of <currency> per 1 IQD

// Fallback rates (per 1 IQD)
const FALLBACK_RATES: Rates = {
  IQD: 1,
  USD: 1 / 1310, 
  EGP: 1 / 27,  
};

interface LsPayload {
  rates: Rates;
  ts: number;
}

async function fetchRates(): Promise<Rates> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Failed fetching exchange rates");
  const data = await res.json();
  if (data?.result !== "success" || !data.rates) throw new Error("Bad response from rates API");
  
  // Override specific rates with fixed expected values instead of fluctuating market rates
  data.rates.EGP = 1 / 27; 
  data.rates.USD = 1 / 1310;

  return { ...data.rates, IQD: 1 };
}

function saveToLocal(rates: Rates) {
  const payload: LsPayload = { rates, ts: Date.now() };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    // ignore localStorage errors
  }
}

function loadFromLocal(): LsPayload | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LsPayload;
  } catch {
    return null;
  }
}

/**
 * Get rates with caching (localStorage + in-memory via LS)
 * Returns FALLBACK_RATES on failure.
 */
export async function getRatesCached(): Promise<Rates> {
  const cached = loadFromLocal();
  const now = Date.now();

  if (cached && now - cached.ts < CACHE_DURATION) {
    return cached.rates;
  }

  try {
    const rates = await fetchRates();
    saveToLocal(rates);
    return rates;
  } catch {
    if (cached?.rates) return cached.rates;
    return FALLBACK_RATES;
  }
}

/**
 * Convert amount between currencies.
 * Assumes rates are "currency per 1 IQD" (base = IQD).
 */
export function convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: Rates): number {
  if (from === to) return amount;

  if (from === BASE) {
    const toRate = rates[to];
    if (toRate == null) throw new Error("Unsupported target currency");
    return amount * toRate;
  }

  if (to === BASE) {
    const fromRate = rates[from];
    if (fromRate == null) throw new Error("Unsupported from currency");
    return amount / fromRate;
  }

  // from -> IQD -> to
  const amountInBase = amount / (rates[from] ?? 1);
  return amountInBase * (rates[to] ?? 1);
}

/**
 * Format number as currency using Intl.NumberFormat.
 * locale example: 'ar-SA' or 'en-US'
 */
export function formatCurrencyValue(value: number, currency: CurrencyCode, locale = "en-US") {
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  };

  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
