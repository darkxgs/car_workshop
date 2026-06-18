"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { playNotificationSound } from "@/lib/sound";
import Swal from "sweetalert2";

export default function GlobalRealtimeProvider() {
    const { user, employeeBranchId, employeeRole } = useAuth();

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
                        Swal.fire({
                            title: `أمر عمل جديد!`,
                            text: `تم فتح أمر عمل جديد برقم ${newRecord.report_number}`,
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
                                Swal.fire({
                                    title: `تمت إعادة فتح أمر العمل ⏳`,
                                    text: `تمت إعادة المركبة #${newRecord.report_number} إلى وضع قيد العمل`,
                                    icon: 'warning',
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 5000,
                                    timerProgressBar: true,
                                    background: '#0f172a',
                                    color: '#f59e0b'
                                });
                            } else if (newRecord.status === 'قيد العمل') {
                                Swal.fire({
                                    title: `بدأ العمل 🛠️`,
                                    text: `أمر العمل #${newRecord.report_number} أصبح قيد العمل الآن`,
                                    icon: 'info',
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 5000,
                                    timerProgressBar: true,
                                    background: '#0f172a',
                                    color: '#3b82f6'
                                });
                            } else if (newRecord.status === 'تم الانتهاء') {
                                Swal.fire({
                                    title: `جاهز للتسليم 💚`,
                                    text: `اكتمل العمل في أمر العمل #${newRecord.report_number}`,
                                    icon: 'success',
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 6000,
                                    timerProgressBar: true,
                                    background: '#0f172a',
                                    color: '#10b981'
                                });
                            }
                        }

                        // Key Details Changed (only if status didn't just change, to avoid spam)
                        if (!didAlert) {
                            if (newRecord.bay_number !== oldRecord.bay_number) {
                                playNotificationSound();
                                Swal.fire({
                                    title: `تحديث الخانة 🚗`,
                                    text: `تم نقل أمر العمل #${newRecord.report_number} إلى ${newRecord.bay_number || 'غير محدد'}`,
                                    icon: 'info',
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 4000,
                                    timerProgressBar: true,
                                    background: '#0f172a',
                                    color: '#8b5cf6'
                                });
                            } else {
                                const oldTech = Array.isArray(oldRecord.selected_services) ? oldRecord.selected_services[0]?.technicianName : undefined;
                                const newTech = Array.isArray(newRecord.selected_services) ? newRecord.selected_services[0]?.technicianName : undefined;
                                if (oldTech !== undefined && newTech && newTech !== oldTech) {
                                playNotificationSound();
                                Swal.fire({
                                    title: `تغيير الفني المسؤول 🔧`,
                                    text: `تم تعيين فني جديد لأمر العمل #${newRecord.report_number}`,
                                    icon: 'info',
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 4000,
                                    timerProgressBar: true,
                                    background: '#0f172a',
                                    color: '#8b5cf6'
                                });
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

    return null; // This component doesn't render anything visible
}
