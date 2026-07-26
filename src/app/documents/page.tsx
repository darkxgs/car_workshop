"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FolderOpen, FileText, UploadCloud, Search, Download, Trash2, File, FileArchive, FileImage, ShieldCheck, Loader2 } from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/alerts";

type Doc = {
    id: string | number;
    name: string;
    type: 'pdf' | 'img' | 'doc';
    size: string;
    date: string;
    category: 'legal' | 'invoices' | 'technical';
    file_path?: string;
    file_url?: string;
};

export default function DocumentsPage() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const [newDocCategory, setNewDocCategory] = useState<'legal' | 'invoices' | 'technical'>('legal');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState<'all' | 'legal' | 'invoices' | 'technical'>('all');

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        setLoading(true);
        const { data } = await supabase.from('documents_archive' as any).select('*').order('created_at', { ascending: false });
        if (data) {
            setDocs(data.map((d: any) => ({
                id: d.id,
                name: d.name,
                category: d.category,
                type: d.file_type,
                size: d.file_size,
                file_path: d.file_path,
                date: new Date(d.created_at).toLocaleDateString('ar-SA')
            })));
        }
        setLoading(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setNewDocName(file.name);
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            showError("خطأ", "يرجى اختيار ملف أولاً");
            return;
        }

        setUploading(true);

        try {
            // 1. Upload to Supabase Storage 'documents' bucket
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${newDocCategory}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, selectedFile);

            if (uploadError) {
                console.error("Storage Error:", uploadError);
                throw new Error("حدث خطأ أثناء رفع الملف إلى السيرفر. هل تأكدت من إنشاء حزمة تخزين (Bucket) باسم 'documents'؟");
            }

            // 2. Determine type
            let fileType = 'doc';
            if (selectedFile.type.includes('pdf')) fileType = 'pdf';
            if (selectedFile.type.includes('image')) fileType = 'img';

            // 3. Save metadata to database
            const { error: dbError } = await supabase.from('documents_archive' as any).insert({
                name: newDocName,
                category: newDocCategory,
                file_type: fileType,
                file_size: formatBytes(selectedFile.size),
                file_path: filePath
            });

            if (dbError) throw dbError;

            setIsUploadOpen(false);
            fetchDocs();
            setNewDocName('');
            setNewDocCategory('legal');
            setSelectedFile(null);
            showSuccess("تم", "تم الرفع والأرشفة بنجاح!");
            
        } catch (error: any) {
            showError("خطأ", error.message || "حدث خطأ غير متوقع!");
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc: Doc) => {
        if (!doc.file_path) {
            showError("خطأ", "هذا المستند لا يحتوي على ملف مرفق.");
            return;
        }
        
        try {
            const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600); // 1 hour valid
            if (error) throw error;
            if (data?.signedUrl) {
                // Open file in new tab or trigger download
                window.open(data.signedUrl, '_blank');
            }
        } catch {
            showError("خطأ", "خطأ في تحميل المستند، قد يكون محذوفاً من السيرفر.");
        }
    };

    const deleteDoc = async (doc: Doc) => {
        const isConfirmed = await showConfirm(
            "حذف المستند",
            `هل أنت متأكد من حذف ${doc.name} بشكل نهائي؟`,
            "نعم، احذف المستند",
            true
        );
        if (!isConfirmed) return;

        // Delete from Storage
        if (doc.file_path) {
            await supabase.storage.from('documents').remove([doc.file_path]);
        }
        // Delete metadata
        await supabase.from('documents_archive' as any).delete().eq('id', doc.id);
        fetchDocs();
    };

    const filtered = docs.filter(d => 
        d.name.includes(searchTerm) && 
        (activeFilter === 'all' || d.category === activeFilter)
    );

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <FolderOpen className="text-purple-500" size={32} />
                            الأرشفة والمستندات السحابية (DMS)
                        </h1>
                        <p className="text-muted-foreground">
                            مستودع السجلات القانونية، المخططات والفواتير (مربوط مع Supabase Storage).
                        </p>
                    </div>
                    <button onClick={() => setIsUploadOpen(true)} className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20 whitespace-nowrap">
                        <UploadCloud size={20} /> رفع مستند جديد
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    {/* Filters Sidebar */}
                    <div className="glass-card p-6 rounded-2xl border-border h-fit space-y-6 lg:sticky lg:top-6">
                        <div className="relative w-full">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input 
                                type="text" 
                                placeholder="بحث بالاسم..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground focus:border-purple-500 transition-colors text-sm"
                            />
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">التصنيفات المجلدية</h3>
                            <div className="space-y-1">
                                <button onClick={() => setActiveFilter('all')} className={`w-full text-right p-3 rounded-xl transition-all flex items-center gap-3 ${activeFilter === 'all' ? 'bg-purple-600/10 border border-purple-500/30 text-purple-500' : 'text-muted-foreground border border-transparent hover:border-border hover:bg-muted'}`}>
                                    <FolderOpen size={18} /> كافة المستندات
                                </button>
                                <button onClick={() => setActiveFilter('legal')} className={`w-full text-right p-3 rounded-xl transition-all flex items-center gap-3 ${activeFilter === 'legal' ? 'bg-purple-600/10 border border-purple-500/30 text-purple-500' : 'text-muted-foreground border border-transparent hover:border-border hover:bg-muted'}`}>
                                    <ShieldCheck size={18} /> الأوراق القانونية والتراخيص
                                </button>
                                <button onClick={() => setActiveFilter('invoices')} className={`w-full text-right p-3 rounded-xl transition-all flex items-center gap-3 ${activeFilter === 'invoices' ? 'bg-purple-600/10 border border-purple-500/30 text-purple-500' : 'text-muted-foreground border border-transparent hover:border-border hover:bg-muted'}`}>
                                    <FileArchive size={18} /> المشتريات (فواتير)
                                </button>
                                <button onClick={() => setActiveFilter('technical')} className={`w-full text-right p-3 rounded-xl transition-all flex items-center gap-3 ${activeFilter === 'technical' ? 'bg-purple-600/10 border border-purple-500/30 text-purple-500' : 'text-muted-foreground border border-transparent hover:border-border hover:bg-muted'}`}>
                                    <FileText size={18} /> المراجع الفنية والمخططات
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl mt-4">
                            <p className="text-xs font-bold text-purple-600 dark:text-purple-400">تنويه التخزين السحابي:</p>
                            <p className="text-xs text-muted-foreground mt-1">تأكد من إنشاء مجلد <b>"documents"</b> برمجياً أو يدوياً عبر Supabase Storage Dashboard لكي يسمح لك برفع الملفات.</p>
                        </div>
                    </div>

                    {/* Files Area */}
                    <div className="lg:col-span-3 glass-card rounded-2xl border-border min-h-[500px] flex flex-col">
                        <div className="p-4 border-b border-border bg-muted/50 rounded-t-2xl flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-bold">ملفات مساحة التخزين المربوطة بالسيرفر</span>
                            <span className="text-xs text-purple-500 bg-purple-500/10 font-mono font-bold px-3 py-1 rounded-full border border-purple-500/20">{docs.length} مستند مسجل</span>
                        </div>

                        <div className="p-6 flex-1 bg-background/30">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">جاري مسح المجلدات...</div>
                            ) : filtered.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <File size={48} className="opacity-20 mb-4 text-purple-500" />
                                    <p className="font-bold text-lg">المجلد فارغ!</p>
                                    <p className="text-sm opacity-70">قم برفع أول ملف لك بالنقر على الزر بالأسفل</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filtered.map(doc => (
                                        <div key={doc.id} className="p-4 rounded-xl bg-card border border-border hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 group relative flex flex-col">
                                            <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button onClick={() => handleDownload(doc)} title="تحميل الملف" className="p-1.5 bg-background border border-border hover:bg-blue-500/20 hover:text-blue-500 text-foreground rounded shadow-sm transition-colors"><Download size={14} /></button>
                                                <button onClick={() => deleteDoc(doc)} title="حذف الملف" className="p-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-500 rounded shadow-sm transition-colors"><Trash2 size={14} /></button>
                                            </div>

                                            <div className="w-12 h-12 bg-purple-500/10 rounded-xl mb-4 flex items-center justify-center border border-purple-500/20 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                                                {doc.type === 'pdf' ? <FileText size={24} /> : doc.type === 'img' ? <FileImage size={24} /> : <File size={24} />}
                                            </div>

                                            <h4 className="font-bold text-foreground text-sm mb-1 truncate leading-relaxed pr-2" title={doc.name}>{doc.name}</h4>
                                            
                                            <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-muted-foreground font-bold">
                                                <span className="font-mono bg-muted px-2 py-0.5 rounded">{doc.size}</span>
                                                <span className="font-mono" dir="ltr">{doc.date}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Upload Modal */}
            {isUploadOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleUpload} className="bg-card border border-border w-full max-w-md rounded-3xl p-6 relative shadow-2xl animate-in zoom-in fade-in duration-200 text-right">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-full"><UploadCloud size={24} /></div>
                            <h2 className="text-xl font-bold text-foreground">رفع مستند جديد للسحابة</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-muted-foreground mb-1 block">الملف المراد أرشـفته (PDF, Images, etc) <span className="text-rose-500">*</span></label>
                                <input required type="file" onChange={handleFileSelect} className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:border-purple-500 font-mono text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                            </div>
                            
                            <div>
                                <label className="text-sm font-bold text-muted-foreground mb-1 block">اسم المستند المخصص للإظهار <span className="text-rose-500">*</span></label>
                                <input required type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:border-purple-500" placeholder="مثال: فاتورة توريد زيوت شركة X" />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-muted-foreground mb-1 block">التصنيف أو المجلد</label>
                                <select value={newDocCategory} onChange={e => setNewDocCategory(e.target.value as any)} className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:border-purple-500">
                                    <option value="legal">الأوراق والتراخيص القانونية</option>
                                    <option value="invoices">فواتير المصاريف والمشتريات</option>
                                    <option value="technical">الرسومات البيانية والمراجع (Manuals)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button type="submit" disabled={uploading || !selectedFile} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl flex-1 font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all">
                                {uploading ? <Loader2 className="animate-spin" size={18} /> : null}
                                {uploading ? 'جاري الرفع...' : 'رفع وأرشفة الآن'}
                            </button>
                            <button type="button" onClick={() => setIsUploadOpen(false)} className="px-6 py-3 bg-muted border border-border hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground rounded-xl font-bold transition-all">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
