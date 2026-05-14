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
                    // Only alert if status actually changed
                    if (oldRecord && newRecord.status !== oldRecord.status) {
                        
                        // Let reception / admin know if it's done
                        if (newRecord.status === 'تم الانتهاء' && (employeeRole === 'Receptionist' || employeeRole === 'Owner' || employeeRole === 'Admin')) {
                            playNotificationSound();
                            Swal.fire({
                                title: `مركبة جاهزة للتسليم`,
                                text: `اكتمل العمل في أمر العمل ${newRecord.report_number} وهو جاهز للطباعة/التسليم`,
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

                        // Let the technical supervisor know if something is assigned / in progress (maybe skipped so not too spammy)
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
