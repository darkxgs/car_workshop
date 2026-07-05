"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { playNotificationSound } from "@/lib/sound";
import Swal from "sweetalert2";

export type NotificationItem = {
    id: string;
    title: string;
    text: string;
    time: Date;
    read: boolean;
    icon: string;
    color: string;
    bg: string;
};

const SVC_NAMES: Record<string, string> = {
    engineOil: "زيت المحرك",
    oilFilter: "فلتر زيت المحرك",
    airFilter: "فلتر الهواء",
    acFilter: "فلتر التبريد",
    brakeFluid: "زيت المكابح",
    coolant: "ماء الراديتر",
    battery: "البطارية",
    engineBelts: "قايش المحرك",
    brakePads: "دسكات السيارة",
    sparkPlugs: "شمعات الاحتراق",
    gearboxHydraulic: "هايدروليك الكير",
    gearboxFilter: "فلتر الكير",
    wipers: "الماسحات",
    additives: "المضافات والمحسنات",
    engineFlash: "فلاش محرك",
    engineCeramic: "سيراميك محرك",
    linerCleaner: "منظف بطانة (جكجكة)",
};

interface NotificationContextType {
    notifications: NotificationItem[];
    markAsRead: (id: string) => void;
    clearAll: () => void;
    unreadCount: number;
}

export const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    markAsRead: () => {},
    clearAll: () => {},
    unreadCount: 0
});

export const useNotifications = () => useContext(NotificationContext);

export default function GlobalRealtimeProvider({ children }: { children: React.ReactNode }) {
    const { user, employeeBranchId, employeeRole } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('global_notifications');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Convert string dates back to Date objects
                setNotifications(parsed.map((n: any) => ({ ...n, time: new Date(n.time) })));
            }
        } catch (e) {
            console.error('Failed to parse notifications from local storage', e);
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage when updated
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('global_notifications', JSON.stringify(notifications));
        }
    }, [notifications, isLoaded]);

    const addNotification = (notif: Omit<NotificationItem, 'id' | 'time' | 'read'>) => {
        setNotifications(prev => [{
            ...notif,
            id: Math.random().toString(36).substring(2, 9),
            time: new Date(),
            read: false
        }, ...prev].slice(0, 50)); // Keep last 50
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    useEffect(() => {
        if (!user) return; // Only listen if authenticated

        const channel = supabase.channel('global_notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_reports' }, (payload) => {
                
                const newRecord = payload.new as any;
                const oldRecord = payload.old as any;

                // Branch filtering
                if (employeeRole !== 'Owner' && employeeRole !== 'Admin') {
                    if (newRecord?.branch_id && newRecord.branch_id !== employeeBranchId) {
                        return; // Ignore if it's not for this branch
                    }
                }

                // 1. New Work Order Created
                if (payload.eventType === 'INSERT') {
                    if (newRecord.status === 'تم الاستلام') {
                        playNotificationSound();
                        const title = `أمر عمل جديد!`;
                        const text = `تم فتح أمر عمل جديد برقم ${newRecord.report_number}`;
                        addNotification({ title, text, icon: 'Clock', color: 'text-sky-400', bg: 'bg-sky-500/10' });
                        Swal.fire({
                            title,
                            text,
                            icon: 'info',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 5000,
                            timerProgressBar: true,
                            background: '#0f172a',
                            color: '#38bdf8'
                        });
                    }
                }

                // 2. Status Updates
                if (payload.eventType === 'UPDATE') {
                    if (oldRecord) {
                        let didAlert = false;
                        
                        // Status Changed
                        if (oldRecord.status !== undefined && newRecord.status !== oldRecord.status) {
                            playNotificationSound();
                            didAlert = true;
                            
                            if (oldRecord.status === 'تم الانتهاء' && newRecord.status === 'قيد العمل') {
                                const title = `تمت إعادة فتح أمر العمل ⏳`;
                                const text = `تمت إعادة المركبة #${newRecord.report_number} إلى وضع قيد العمل`;
                                addNotification({ title, text, icon: 'RefreshCcw', color: 'text-amber-500', bg: 'bg-amber-500/10' });
                                Swal.fire({
                                    title, text,
                                    icon: 'warning',
                                    toast: true, position: 'top-end', showConfirmButton: false, timer: 5000, timerProgressBar: true, background: '#0f172a', color: '#f59e0b'
                                });
                            } else if (newRecord.status === 'قيد العمل') {
                                const title = `بدأ العمل 🛠️`;
                                const text = `أمر العمل #${newRecord.report_number} أصبح قيد العمل الآن`;
                                addNotification({ title, text, icon: 'Wrench', color: 'text-blue-500', bg: 'bg-blue-500/10' });
                                Swal.fire({
                                    title, text,
                                    icon: 'info',
                                    toast: true, position: 'top-end', showConfirmButton: false, timer: 5000, timerProgressBar: true, background: '#0f172a', color: '#3b82f6'
                                });
                            } else if (newRecord.status === 'تم الانتهاء') {
                                const title = `أمر صيانة جاهز للمحاسبة 💸`;
                                const text = `اكتمل العمل في أمر الصيانة #${newRecord.report_number} - يرجى المراجعة والتدقيق المالي.`;
                                addNotification({ title, text, icon: 'CheckCircle2', color: 'text-emerald-500', bg: 'bg-emerald-500/10' });
                                Swal.fire({
                                    title, text,
                                    icon: 'success',
                                    toast: true, position: 'top-end', showConfirmButton: false, timer: 7000, timerProgressBar: true, background: '#0f172a', color: '#10b981'
                                });
                            }
                        }

                        // Key Details Changed (only if status didn't just change, to avoid spam)
                        if (!didAlert) {
                            if (newRecord.bay_number !== oldRecord.bay_number) {
                                playNotificationSound();
                                const title = `تحديث الخانة 🚗`;
                                const text = `تم نقل أمر العمل #${newRecord.report_number} إلى ${newRecord.bay_number || 'غير محدد'}`;
                                addNotification({ title, text, icon: 'Car', color: 'text-purple-500', bg: 'bg-purple-500/10' });
                                Swal.fire({
                                    title, text,
                                    icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000, timerProgressBar: true, background: '#0f172a', color: '#8b5cf6'
                                });
                            } else {
                                const oldTech = Array.isArray(oldRecord.selected_services) ? oldRecord.selected_services[0]?.technicianName : undefined;
                                const newTech = Array.isArray(newRecord.selected_services) ? newRecord.selected_services[0]?.technicianName : undefined;
                                if (oldTech !== undefined && newTech && newTech !== oldTech) {
                                    playNotificationSound();
                                    const title = `تغيير الفني المسؤول 🔧`;
                                    const text = `تم تعيين فني جديد لأمر العمل #${newRecord.report_number}`;
                                    addNotification({ title, text, icon: 'User', color: 'text-indigo-500', bg: 'bg-indigo-500/10' });
                                    Swal.fire({
                                        title, text,
                                        icon: 'info',
                                        toast: true, position: 'top-end', showConfirmButton: false, timer: 4000, timerProgressBar: true, background: '#0f172a', color: '#8b5cf6'
                                    });
                                }
                                
                                // Detailed Service changes
                                if (!didAlert && oldRecord.selected_services && newRecord.selected_services) {
                                    const oldArr = Array.isArray(oldRecord.selected_services) ? oldRecord.selected_services : [oldRecord.selected_services];
                                    const newArr = Array.isArray(newRecord.selected_services) ? newRecord.selected_services : [newRecord.selected_services];
                                    
                                    let addedMessage = "";

                                    // Check if a dynamic service was added
                                    if (newArr.length > oldArr.length) {
                                        const newlyAdded = newArr[newArr.length - 1];
                                        if (newlyAdded && newlyAdded.name) {
                                            addedMessage = `إضافة: ${newlyAdded.name}`;
                                        }
                                    } else {
                                        // Deep check for Paper v2 Format toggles
                                        const old0 = oldArr[0] || {};
                                        const new0 = newArr[0] || {};
                                        if (new0.is_paper_v2_format && old0.is_paper_v2_format) {
                                            
                                            // 1. Custom Services Length
                                            const oldCustom = old0.customServices || [];
                                            const newCustom = new0.customServices || [];
                                            if (newCustom.length > oldCustom.length) {
                                                const newlyAdded = newCustom[newCustom.length - 1];
                                                if (newlyAdded && newlyAdded.label) {
                                                    addedMessage = `إضافة عنصر: ${newlyAdded.label}`;
                                                }
                                            } 
                                            // 2. Services toggled to "تغيير"
                                            else {
                                                const oldS = old0.services || {};
                                                const newS = new0.services || {};
                                                for (const key of Object.keys(newS)) {
                                                    if (newS[key]?.status === 'تغيير' && oldS[key]?.status !== 'تغيير') {
                                                        const arabicName = SVC_NAMES[key] || key;
                                                        addedMessage = `تحديد تغيير: ${arabicName}`;
                                                        break; // Just show one for the toast
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if (addedMessage) {
                                        playNotificationSound();
                                        const title = `تعديل داخلي 🛠️`;
                                        const text = `في أمر #${newRecord.report_number} - ${addedMessage}`;
                                        addNotification({ title, text, icon: 'Wrench', color: 'text-rose-500', bg: 'bg-rose-500/10' });
                                        Swal.fire({
                                            title, text,
                                            icon: 'info',
                                            toast: true, position: 'top-end', showConfirmButton: false, timer: 5000, timerProgressBar: true, background: '#0f172a', color: '#f43f5e'
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, employeeBranchId, employeeRole]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, markAsRead, clearAll, unreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
}
