"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const widthClass = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div
                className={`w-full ${widthClass} rounded-2xl animate-scale-in`}
                style={{
                    background: "linear-gradient(135deg, #0d2a1a 0%, #071912 100%)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.05)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-emerald-900/40">
                    <h2 className="font-display font-bold text-foreground text-lg">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:text-white hover:bg-rose-500/20 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
                {/* Body */}
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════
   REUSABLE FORM FIELD HELPERS
   ════════════════════════════════════════════ */

interface FieldProps {
    label: string;
    children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
    return (
        <div>
            <label className="block text-xs text-emerald-500 font-display mb-1.5">{label}</label>
            {children}
        </div>
    );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function Input(props: InputProps) {
    return (
        <input
            {...props}
            className={`input-field text-sm ${props.className ?? ""}`}
        />
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: { value: string; label: string }[];
}
export function Select({ options, ...props }: SelectProps) {
    return (
        <select {...props} className={`input-field text-sm ${props.className ?? ""}`}>
            {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

/* ════════════════════════════════════════════
   DELETE CONFIRMATION DIALOG
   ════════════════════════════════════════════ */
interface ConfirmDeleteProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    title?: string;
    description?: string;
    btnDelete?: string;
    btnCancel?: string;
}

export function ConfirmDelete({ isOpen, onClose, onConfirm, itemName, title = "تأكيد الحذف", description = "هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.", btnDelete = "حذف", btnCancel = "إلغاء" }: ConfirmDeleteProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-emerald-200 text-sm mb-6">
                {itemName ? (
                    <>
                        {title}{" "}<strong className="text-foreground">«{itemName}»</strong>؟ <br/>
                        {description}
                    </>
                ) : (
                    description
                )}
            </p>
            <div className="flex gap-3">
                <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-display text-sm transition-colors">
                    {btnDelete}
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-emerald-400 font-display text-sm transition-colors" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    {btnCancel}
                </button>
            </div>
        </Modal>
    );
}
