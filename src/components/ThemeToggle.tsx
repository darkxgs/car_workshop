"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        // Check saved preference or local storage
        const saved = localStorage.getItem('theme');
        if (saved === 'light') {
            document.documentElement.classList.add('light-theme');
            setIsLight(true);
        }
    }, []);

    const toggleTheme = () => {
        if (isLight) {
            document.documentElement.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            setIsLight(false);
        } else {
            document.documentElement.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            setIsLight(true);
        }
    };

    return (
        <button 
            onClick={toggleTheme} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-right bg-card/50 hover:bg-muted border border-border text-muted-foreground hover:text-foreground"
        >
            {isLight ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-yellow-400" />}
            <span className="font-medium text-sm">
                {isLight ? 'الوضع الداكن' : 'الوضع الفاتح'}
            </span>
        </button>
    );
}
