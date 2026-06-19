"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, Clock, Car, User, Wrench, RefreshCcw, Trash2 } from "lucide-react";
import { useNotifications } from "./GlobalRealtimeProvider";

const ICON_MAP: Record<string, any> = {
    CheckCircle2, Clock, Car, User, Wrench, RefreshCcw
};

export default function NotificationBell({ direction = 'down', align = 'right' }: { direction?: 'up' | 'down', align?: 'left' | 'right' }) {
    const { notifications, markAsRead, clearAll, unreadCount } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleNotifClick = (id: string) => {
        markAsRead(id);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button 
                onClick={toggleDropdown}
                className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-800/40 transition-colors"
            >
                <Bell size={22} className={unreadCount > 0 ? "animate-pulse text-amber-400" : ""} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-rose-500 rounded-full border border-card shadow-sm">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className={`absolute ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'} ${align === 'right' ? '-right-4 sm:right-0' : 'left-0'} w-80 max-h-[80vh] overflow-hidden bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200`} 
                    dir="rtl"
                >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold text-foreground">الإشعارات</h3>
                        {notifications.length > 0 && (
                            <button 
                                onClick={clearAll}
                                className="text-xs text-muted-foreground hover:text-rose-400 transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={12} />
                                مسح الكل
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1" style={{ maxHeight: '400px' }}>
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                <Bell size={24} className="opacity-20" />
                                <span className="text-sm">لا توجد إشعارات جديدة</span>
                            </div>
                        ) : (
                            notifications.map(notif => {
                                const IconComp = ICON_MAP[notif.icon] || Bell;
                                return (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotifClick(notif.id)}
                                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                                            notif.read ? "bg-transparent border-transparent hover:bg-muted/50" : "bg-muted/50 border-border hover:bg-muted/80"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg shrink-0 ${notif.bg} ${notif.color}`}>
                                            <IconComp size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                <h4 className={`text-sm font-bold truncate ${notif.read ? "text-muted-foreground" : "text-foreground"}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0" dir="ltr">
                                                    {notif.time.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className={`text-xs line-clamp-2 ${notif.read ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                                                {notif.text}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
