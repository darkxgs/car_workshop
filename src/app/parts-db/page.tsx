"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Database, Search, FileCog, Plus, Filter, Wrench, CheckCircle2 } from "lucide-react";

export default function PartsDatabasePage() {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState("");

    // Mock Database
    const mockDbParts = [
        { id: 1, code: "OIL-10W40-M", brand: "Mobil 1", type: "زيت محرك", price: 150, compModels: "عام - سيارات الركاب" },
        { id: 2, code: "OIL-5W30-T", brand: "Toyota Genuine", type: "زيت محرك", price: 180, compModels: "تويوتا (كامري، كورولا، يارس)" },
        { id: 3, code: "SPRK-DEN-01", brand: "Denso Iridium", type: "بواجي", price: 45, compModels: "تويوتا، هوندا، نيسان" },
        { id: 4, code: "FLT-AIR-K&N", brand: "K&N", type: "فلتر هواء", price: 320, compModels: "متعدد (تحتاج تحقق)" },
        { id: 5, code: "BRK-PAD-AC", brand: "ACDelco", type: "تيل فرامل", price: 210, compModels: "شفروليه، جمس، كاديلاك" }
    ];

    const filteredParts = mockDbParts.filter(p => 
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.type.includes(searchTerm) ||
        p.compModels.includes(searchTerm)
    );

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-24" dir={t.common.dashboard === "لوحة التحكم" ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
                        <Database className="text-rose-500" size={32} />
                        قاعدة بيانات القطع السريعة
                    </h1>
                    <p className="text-slate-400">
                        موسوعة القطع البديلة واقتراحات توافقية القطع للسيارات
                    </p>
                </div>
                <button className="btn-primary bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 flex gap-2">
                    <Plus size={18} /> إضافة قطعة للقاعدة
                </button>
            </div>

            {/* Smart Suggestion Panel */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group border-rose-900/30">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full pointer-events-none" />
                
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-rose-900/50 pb-4">
                    <FileCog className="text-rose-400" size={24} />
                    الاقتراح الذكي للقطع والزيوت
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <input type="text" placeholder="نوع السيارة (مثال: تويوتا)" className="input-field" />
                    <input type="text" placeholder="الموديل (مثال: كامري)" className="input-field" />
                    <input type="text" placeholder="حجم المحرك (مثال: 2.5L)" className="input-field" dir="ltr" />
                    <button className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20">
                        <Wrench size={18} /> بحث التوافق
                    </button>
                </div>

                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-slate-400 text-sm text-center">أدخل بيانات السيارة أعلاه للحصول على اقتراحات القطع، الزيوت الموصى بها، والبدائل المتاحة لتبسيط عملية الفحص وتقليل الأخطاء.</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" size={18} />
                    <input 
                        type="text" 
                        placeholder="البحث باسم الشركة المصنعة، الموديل، الكود..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field w-full"
                        style={{ paddingRight: '3rem' }}
                    />
                </div>
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition">
                    <Filter size={18} />
                    الماركات
                </button>
            </div>

            {/* Parts Catalog */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredParts.map(part => (
                    <div key={part.id} className="glass-card p-5 rounded-2xl border-t-2 border-t-slate-800 hover:border-t-rose-500/50 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md mb-2 inline-block">
                                    {part.type}
                                </span>
                                <h3 className="text-lg font-bold text-white tracking-wide">{part.brand}</h3>
                                <p className="text-slate-400 text-sm font-mono mt-1" dir="ltr">{part.code}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:bg-rose-500/10 group-hover:border-rose-500/30 transition-colors">
                                <Database size={18} className="text-slate-400 group-hover:text-rose-400" />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-800 mb-4">
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs mb-1">السيارات المتوافقة:</span>
                                <span className="text-slate-300 text-sm font-medium">{part.compModels}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                            <span className="text-2xl font-bold font-mono text-white">{part.price} <span className="text-rose-500 text-sm">IQD</span></span>
                            <button className="text-sm font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-400" />
                                تحديد للورشة
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {filteredParts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500 text-lg">لم يتم العثور على قطع تطابق بحثك.</p>
                </div>
            )}
        </div>
    );
}
