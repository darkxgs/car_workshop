"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { Sparkles, Loader2, Send, User, Bot } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
    "منو أكثر فني عمل سيارات هذا الشهر؟",
    "كم سيارة استلمنا اليوم؟",
    "شنو إجمالي الإيرادات هذا الشهر؟",
    "أعطني أكثر 5 منتجات مبيعاً",
];

export default function AssistantPage() {
    const { employeeRole, loading: authLoading } = useAuth();
    const isAuthorized = employeeRole === "Owner" || employeeRole === "Admin";

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, sending]);

    const send = async (text: string) => {
        const q = text.trim();
        if (!q || sending) return;
        setError(null);
        const next = [...messages, { role: "user" as const, content: q }];
        setMessages(next);
        setInput("");
        setSending(true);
        try {
            const res = await fetch("/api/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: next }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || "حدث خطأ.");
            } else {
                setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
            }
        } catch {
            setError("تعذّر الاتصال بالخادم.");
        } finally {
            setSending(false);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-rose-500 w-12 h-12" /></div>;
    }
    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center font-ibm" dir="rtl">
                <div className="glass-card p-8 rounded-3xl border border-rose-500/20 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-rose-500 mb-2">غير مصرح بالوصول</h2>
                    <p className="text-muted-foreground">المساعد الذكي متاح للمالك والمدير فقط.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
                {/* Header */}
                <div className="pb-4 border-b border-border mb-4 shrink-0">
                    <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <Sparkles className="text-rose-500" size={30} />
                        المساعد الذكي
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">اسأل بالعربي عن أي بيانات بالورشة — الفنيين، الإيرادات، السيارات، المخزون...</p>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pl-1">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-6 text-muted-foreground">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center"><Sparkles size={32} /></div>
                            <p>اسألني أي سؤال عن بيانات الورشة. مثال:</p>
                            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                                {SUGGESTIONS.map((s, i) => (
                                    <button key={i} onClick={() => send(s)} className="px-3 py-2 text-sm bg-card border border-border rounded-xl hover:border-rose-500/40 hover:text-foreground transition-colors">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-rose-500/10 text-rose-400" : "bg-blue-500/10 text-blue-400"}`}>
                                {m.role === "user" ? <User size={18} /> : <Bot size={18} />}
                            </div>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-rose-600 text-white" : "glass-card border border-border text-foreground"}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Bot size={18} /></div>
                            <div className="glass-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="animate-spin w-4 h-4" /> يفكّر ويبحث بالبيانات...
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-3 text-rose-200 text-sm">{error}</div>
                    )}
                </div>

                {/* Composer */}
                <form
                    onSubmit={(e) => { e.preventDefault(); send(input); }}
                    className="shrink-0 mt-4 flex items-end gap-2 bg-card border border-border rounded-2xl p-2"
                >
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                        placeholder="اكتب سؤالك هنا..."
                        rows={1}
                        className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground px-2 py-2 max-h-40 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}
