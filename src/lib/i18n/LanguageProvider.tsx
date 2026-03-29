"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, Language, Dictionary } from "./dictionaries";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Dictionary;
    dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType>({
    language: "ar",
    setLanguage: () => {},
    t: dictionaries.ar,
    dir: "rtl"
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("ar");

    useEffect(() => {
        const storedLang = localStorage.getItem("app_lang") as Language;
        if (storedLang && (storedLang === "ar" || storedLang === "en")) {
            setLanguageState(storedLang);
            document.documentElement.dir = storedLang === "ar" ? "rtl" : "ltr";
            document.documentElement.lang = storedLang;
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("app_lang", lang);
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = lang;
    };

    const dir = language === "ar" ? "rtl" : "ltr";
    const t = dictionaries[language];

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
