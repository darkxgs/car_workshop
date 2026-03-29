"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getRatesCached, convert, formatCurrencyValue, CurrencyCode, Rates } from "@/lib/currencyService";

export type Currency = CurrencyCode;

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (c: Currency) => void;
    formatCurrency: (amountInIQD: number) => string; // amount stored in DB is in IQD
    rates: Rates | null;
    loadingRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
    currency: "IQD",
    setCurrency: () => {},
    formatCurrency: (amount) => `${amount.toLocaleString()} د.ع`,
    rates: null,
    loadingRates: false,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>("IQD");
    const { language } = useLanguage();
    const [rates, setRates] = useState<Rates | null>(null);
    const [loadingRates, setLoadingRates] = useState(true);

    // load preferred currency from localStorage
    useEffect(() => {
        const stored = (localStorage.getItem("app_currency") as Currency) || null;
        if (stored && ["IQD", "USD", "EGP"].includes(stored)) setCurrencyState(stored);
    }, []);

    // load exchange rates on mount and refresh every X while app open
    useEffect(() => {
        let mounted = true;
        let timer: number | undefined;

        async function load() {
            setLoadingRates(true);
            const r = await getRatesCached();
            if (!mounted) return;
            setRates(r);
            setLoadingRates(false);
        }

        load();

        // refresh hourly while app open
        timer = window.setInterval(load, 60 * 60 * 1000); // refresh every hour

        return () => {
            mounted = false;
            if (timer) window.clearInterval(timer);
        };
    }, []);

    const setCurrency = (curr: Currency) => {
        setCurrencyState(curr);
        try { localStorage.setItem("app_currency", curr); } catch {}
    };

    // Use ar-SA to use standard western numerals in Arabic locales.
    const locale = language === "ar" ? "ar-SA" : "en-US";

    const formatCurrency = (amountInIQD: number) => {
        // if rates not ready, show IQD or do best-effort
        const currentRates = rates ?? { IQD: 1, USD: 1 / 1310, EGP: 1 / 27 };

        // convert IQD -> selected currency
        const converted = convert(amountInIQD, "IQD", currency as Currency, currentRates);
        return formatCurrencyValue(converted, currency as Currency, locale);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, rates, loadingRates }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export const useCurrency = () => useContext(CurrencyContext);
