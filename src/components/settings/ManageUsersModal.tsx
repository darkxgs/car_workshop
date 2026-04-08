"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Loader2, Trash2, Shield, User, X } from "lucide-react";
import { Modal } from "@/components/shared/Modal";

interface ManageUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AppUser {
    id: string; // auth_id
    email: string;
    role: string;
    name: string;
    employee_id?: string;
}

export function ManageUsersModal({ isOpen, onClose }: ManageUsersModalProps) {
    const { t } = useLanguage();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/users");
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const handleDelete = async (user: AppUser) => {
        if (!confirm(`${t.common.confirmDelete} ${user.name}? \n${t.common.cannotUndo}`)) return;

        setDeleting(user.id);
        try {
            const res = await fetch(`/api/users?id=${user.id}&employee_id=${user.employee_id || ''}`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                setUsers(users.filter(u => u.id !== user.id));
            } else {
                alert("Failed to delete user");
            }
        } catch (error) {
            console.error("Delete Error:", error);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.settings.manageUsers}>
            <div className="space-y-4 font-display">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
                    </div>
                ) : users.length === 0 ? (
                    <p className="text-center text-emerald-600/60 py-10">{t.common.noData}</p>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {users.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border border-emerald-900/30 bg-emerald-900/10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'Admin' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {user.role === 'Admin' ? <Shield size={18} /> : <User size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-foreground font-medium text-sm">{user.name}</p>
                                        <p className="text-emerald-500/70 text-xs mt-0.5">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full ${user.role === 'Admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                        {user.role === 'Admin' ? t.employees.roleAdmin : t.employees.roleInspector}
                                    </span>
                                    
                                    <button 
                                        onClick={() => handleDelete(user)}
                                        disabled={deleting === user.id}
                                        className="text-rose-400/70 hover:text-rose-400 hover:bg-rose-400/10 p-2 rounded-lg transition-colors"
                                        title={t.common.delete}
                                    >
                                        {deleting === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="pt-4 border-t border-emerald-900/30 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-emerald-400 hover:bg-emerald-900/30 transition-colors text-sm font-medium">
                        {t.common.close}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
