"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    MessageCircle,
    Send,
    ShieldCheck,
    Settings,
    Code,
    FileText,
    Calculator,
    RefreshCw,
    Users,
    Activity,
    TrendingUp,
    FileCode,
    Copy,
    Sparkles,
    Check,
    Eye,
    Image as ImageIcon
} from "lucide-react";

type TemplateType = "welcome" | "maintenance" | "oil" | "offers";
type CurrencyType = "IQD" | "USD";

interface ChatMessage {
    id: string;
    text: string;
    sender: "workshop" | "client";
    time: string;
    status?: "sent" | "delivered" | "read";
    buttons?: string[];
    hasImage?: boolean;
}

interface ApiLog {
    id: string;
    timestamp: string;
    type: "request" | "response";
    method: string;
    url: string;
    status: number;
    headers: Record<string, string>;
    payload: string;
}

export default function WhatsAppIntegrationPage() {
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Tab State
    const [activeTab, setActiveTab] = useState<"simulator" | "feasibility" | "developer">("simulator");

    // BSP Connection States
    const [bsp, setBsp] = useState<"unifonic" | "infobip">("unifonic");
    const [unifonicHost, setUnifonicHost] = useState("apis.unifonic.com");
    const [infobipSubdomain, setInfobipSubdomain] = useState("w1m2y3");
    const [apiKey, setApiKey] = useState("uni_live_iraq_workshop_772x88b");
    const [senderId] = useState("AUTO_ENG_IQ");

    // Client/Car variables
    const [clientName, setClientName] = useState("أبو حيدر الأسدي");
    const [clientPhone, setClientPhone] = useState("+964 770 123 4567");
    const [carModel, setCarModel] = useState("تويوتا لاندكروزر 2023");
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("welcome");
    const [maintenanceKm, setMaintenanceKm] = useState("10,000 كم");
    const [oilChangeDate, setOilChangeDate] = useState("2026-07-20");
    const [includeImage, setIncludeImage] = useState(false);

    // Dynamic Templates Text (Pre-loaded with official messages we have ready)
    const [templates, setTemplates] = useState({
        welcome: `مرحباً أستاذ {name}، يسعدنا جداً انضمامك لمركز هندسة السيارات. 🚗✨\nتم تسجيل سيارتك {car} بنجاح في نظامنا لخدمات ما بعد البيع والمتابعة الدورية. سنكون معك دائماً لتذكيرك بمواعيد الصيانة للحفاظ على أداء سيارتك.\n\nتفضل بزيارة فرعنا دائماً أو تواصل معنا هنا لأي استفسار.`,
        maintenance: `عزيزي أستاذ {name}، نود تذكيرك بأن سيارتك {car} قد اقتربت من موعد صيانة الـ {param}.\n\nالالتزام بالصيانة الدورية يحمي سيارتك ويحافظ على الضمان. ننتظرك لزيارة أقرب فرع لنا في بغداد/البصرة.\n\nيمكنك تأكيد موعدك بالضغط على الزر أدناه:`,
        oil: `تذكير صيانة 🛢️\nأستاذ {name}، حسب بياناتنا، موعد تغيير زيت المحرك لسيارتك {car} مستحق بتاريخ {param} (أو عند الوصول للمسافة المحددة).\n\nتغيير الزيت في وقته يضمن سلامة محرك سيارتك. تفضل بزيارة الورشة وسنقوم بالخدمة فوراً.`,
        offers: `عروض حصرية من هندسة السيارات! 🎉\nأستاذ {name}، بمناسبة الصيف، احصل على فحص كومبيوتر مجاني وتصفية محرك بخصم 15% لسيارتك {car}!\n\nيسري هذا العرض في جميع فروعنا في العراق حتى نهاية الشهر الحالي.\nاحجز الآن بالضغط على الزر بالأسفل.`
    });

    // Simulator Interaction States
    const [isSending, setIsSending] = useState(false);
    const [typingStatus, setTypingStatus] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: "initial-welcome",
            text: "مرحباً بك في مركز هندسة السيارات. هذا هو خط التواصل التفاعلي الموثق للورشة.",
            sender: "workshop",
            time: "10:30 ص",
            status: "read"
        }
    ]);
    const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);

    // Auto-scroll to bottom of chat when messages or typing status updates
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, typingStatus]);

    // ROI Calculator States
    const [roiBranches, setRoiBranches] = useState<number>(3);
    const [roiCustomers, setRoiCustomers] = useState<number>(1500);
    const [roiTicketSize, setRoiTicketSize] = useState<number>(60000); // in IQD
    const [roiCurrency, setRoiCurrency] = useState<CurrencyType>("IQD");
    const [roiReturnRate, setRoiReturnRate] = useState<number>(10); // 10% increase

    // Copy Notification State
    const [copiedText, setCopiedText] = useState<string | null>(null);

    // Resolve API Host based on selected BSP and user input
    const getApiUrl = (): string => {
        if (bsp === "unifonic") {
            return `https://${unifonicHost}/v1/messages`;
        } else {
            return `https://${infobipSubdomain}.api.infobip.com/whatsapp/1/message/template`;
        }
    };

    // Replace template variables dynamically for display
    const getFormattedMessageText = (templateKey: TemplateType): string => {
        const rawText = templates[templateKey];
        const paramValue = templateKey === "maintenance" ? maintenanceKm : oilChangeDate;
        return rawText
            .replace(/{name}/g, clientName)
            .replace(/{car}/g, carModel)
            .replace(/{param}/g, paramValue);
    };

    // Simulate sending message through BSP API
    const handleSimulateSend = () => {
        if (isSending) return;

        setIsSending(true);

        const currentMsgText = getFormattedMessageText(selectedTemplate);
        const timeStr = new Date().toLocaleTimeString("ar-IQ", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

        // Set Headers based on BSP standards
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };
        if (bsp === "unifonic") {
            headers["Authorization"] = `Bearer ${apiKey}`;
        } else {
            headers["Authorization"] = `App ${apiKey}`;
        }

        const paramValue = selectedTemplate === "maintenance" ? maintenanceKm : oilChangeDate;

        // Step 1: Add API Request Log
        const reqLog: ApiLog = {
            id: `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "request",
            method: "POST",
            url: getApiUrl(),
            status: 202,
            headers: headers,
            payload: bsp === "unifonic" 
                ? JSON.stringify({
                    recipient: clientPhone.replace(/\s+/g, ""),
                    sender_id: senderId,
                    message_type: "template",
                    template_name: `workshop_${selectedTemplate}`,
                    language: "ar",
                    parameters: {
                        client_name: clientName,
                        car_model: carModel,
                        variable_param: paramValue,
                        ...(includeImage ? { header_image_url: "https://yourworkshop.com/assets/banner.jpg" } : {})
                    }
                }, null, 2)
                : JSON.stringify({
                    messages: [
                        {
                            from: senderId,
                            to: clientPhone.replace(/\s+/g, ""),
                            messageId: `msg-${Math.floor(Math.random() * 100000)}`,
                            content: {
                                templateName: `workshop_${selectedTemplate}`,
                                templateData: {
                                    body: {
                                        placeholders: [clientName, carModel, paramValue]
                                    },
                                    ...(includeImage ? {
                                        header: {
                                            type: "IMAGE",
                                            mediaUrl: "https://yourworkshop.com/assets/banner.jpg"
                                        }
                                    } : {})
                                },
                                language: "ar"
                            }
                        }
                    ]
                }, null, 2)
        };

        setTimeout(() => {
            setApiLogs(prev => [reqLog, ...prev]);
            
            // Step 2: Show response API Log
            const respLog: ApiLog = {
                id: `resp-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: "response",
                method: "POST",
                url: reqLog.url,
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Server": bsp === "unifonic" ? "Unifonic API Gateway" : "Infobip API Gateway"
                },
                payload: bsp === "unifonic"
                    ? JSON.stringify({
                        success: true,
                        message_id: `msg_wa_${Math.floor(Math.random() * 10000000)}`,
                        status: "Queued",
                        provider: "unifonic",
                        timestamp: new Date().toISOString()
                    }, null, 2)
                    : JSON.stringify({
                        messages: [
                            {
                                to: clientPhone.replace(/\s+/g, ""),
                                messageId: `msg-ib-${Math.floor(Math.random() * 1000000)}`,
                                status: {
                                    groupId: 1,
                                    groupName: "PENDING",
                                    id: 7,
                                    name: "PENDING_ENROUTE",
                                    description: "Message is sent to the operator."
                                }
                            }
                        ]
                    }, null, 2)
            };
            setApiLogs(prev => [respLog, ...prev]);
            setIsSending(false);
            
            // Step 3: Trigger typing status on phone
            setTypingStatus(true);

            setTimeout(() => {
                setTypingStatus(false);
                // Step 4: Append message to WhatsApp Simulator Chat
                const newMsg: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    text: currentMsgText,
                    sender: "workshop",
                    time: timeStr,
                    status: "sent",
                    hasImage: includeImage,
                    buttons: selectedTemplate === "maintenance" || selectedTemplate === "offers" 
                        ? ["تأكيد حجز موعد", "موقع الورشة"] 
                        : undefined
                };
                setChatMessages(prev => [...prev, newMsg]);

                // Simulate status updates (Delivered -> Read)
                setTimeout(() => {
                    setChatMessages(prev =>
                        prev.map(m => m.id === newMsg.id ? { ...m, status: "delivered" } : m)
                    );
                    setTimeout(() => {
                        setChatMessages(prev =>
                            prev.map(m => m.id === newMsg.id ? { ...m, status: "read" } : m)
                        );
                    }, 1000);
                }, 1000);

            }, 1200);

        }, 1000);
    };

    // Handle Quick Reply Action on Phone
    const handleQuickReply = (buttonText: string, messageId: string) => {
        const timeStr = new Date().toLocaleTimeString("ar-IQ", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

        // 1. Add user reply
        const clientReply: ChatMessage = {
            id: `reply-${Date.now()}`,
            text: buttonText,
            sender: "client",
            time: timeStr
        };

        setChatMessages(prev => [...prev, clientReply]);
        
        // Remove buttons from previous message to simulate clicked status
        setChatMessages(prev =>
            prev.map(m => m.id === messageId ? { ...m, buttons: undefined } : m)
        );

        // 2. Add API log for Webhook reception of button click!
        const webhookLog: ApiLog = {
            id: `webhook-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "request",
            method: "POST",
            url: "https://yourworkshop.com/api/webhooks/whatsapp",
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "X-Webhook-Signature": "sha256=d394b9fdf9..."
            },
            payload: JSON.stringify({
                event: "message_received",
                from: clientPhone.replace(/\s+/g, ""),
                message: {
                    type: "button_reply",
                    text: buttonText,
                    payload: buttonText === "تأكيد حجز موعد" ? "USER_CONFIRM_BOOKING" : "USER_REQUEST_MAP"
                },
                timestamp: new Date().toISOString()
            }, null, 2)
        };
        setTimeout(() => {
            setApiLogs(prev => [webhookLog, ...prev]);
        }, 300);

        // 3. Workshop/Bot replies automatically after writing
        setTypingStatus(true);
        setTimeout(() => {
            setTypingStatus(false);
            
            let replyText = "";
            if (buttonText === "تأكيد حجز موعد") {
                replyText = `شكراً لتواصلك أستاذ ${clientName}! تم تسجيل طلب حجز صيانة لسيارة ${carModel} بنجاح ✅.\n\nسيقوم موظف الاستقبال لدينا بالاتصال بك فوراً لتأكيد الساعة المناسبة لك. أهلاً وسهلاً بك.`;
            } else {
                replyText = `📍 هذا هو موقع الورشة الرئيسي:\nمركز هندسة السيارات - بغداد - الكرادة / قرب ساحة الحرية\nرابط خرائط جوجل: https://maps.google.com/?q=33.3121,44.4231\n\nبإمكانك القدوم مباشرة، نحن بانتظارك من الساعة 8:00 صباحاً وحتى 8:00 مساءً.`;
            }

            setChatMessages(prev => [
                ...prev,
                {
                    id: `bot-reply-${Date.now()}`,
                    text: replyText,
                    sender: "workshop",
                    time: new Date().toLocaleTimeString("ar-IQ", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true
                    }),
                    status: "read"
                }
            ]);
        }, 1500);
    };

    // ROI Calculator helper formulas
    const calculateRoi = () => {
        const totalCustomers = roiCustomers * roiBranches;
        
        // Avg 4 messages per client monthly
        const messagesPerMonth = totalCustomers * 4; 
        
        // Unifonic / Infobip average Iraq WhatsApp conversation session cost: ~$0.018
        const pricePerConversationUSD = 0.018; 
        const conversionRate = roiCurrency === "IQD" ? 1460 : 1;
        
        const monthlyApiCostUSD = totalCustomers * pricePerConversationUSD;
        const monthlyApiCost = monthlyApiCostUSD * conversionRate;
        
        // Extra return rate customers
        const returnedCustomers = Math.round(totalCustomers * (roiReturnRate / 100));
        
        // Extra revenue generated
        const extraRevenue = returnedCustomers * roiTicketSize;
        
        // Profit increase
        const netProfit = extraRevenue - monthlyApiCost;
        
        return {
            totalCustomers,
            messagesPerMonth,
            monthlyApiCost: Math.round(monthlyApiCost).toLocaleString(),
            returnedCustomers,
            extraRevenue: Math.round(extraRevenue).toLocaleString(),
            netProfit: Math.round(netProfit).toLocaleString(),
            roiPercent: Math.round((netProfit / (monthlyApiCost || 1)) * 100)
        };
    };

    const roi = calculateRoi();

    // Copy code snippet helper
    const handleCopyCode = (codeText: string, label: string) => {
        navigator.clipboard.writeText(codeText);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 3000);
    };

    // Handle template text editing by user
    const handleTemplateTextChange = (key: TemplateType, value: string) => {
        setTemplates(prev => ({ ...prev, [key]: value }));
    };

    // Code snippets updated with correct APIs and Hosts
    const codeCSharp = `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class WhatsAppNotificationService
{
    private readonly HttpClient _httpClient;
    
    // إعدادات الاتصال بمزود الخدمة المختار (Unifonic / Infobip)
    private readonly bool _useUnifonic = true; 
    
    // المضيف ونقاط الاتصال الرسمية
    private readonly string _unifonicApiUrl = "https://${unifonicHost}/v1/messages";
    private readonly string _infobipApiUrl = "https://${infobipSubdomain}.api.infobip.com/whatsapp/1/message/template";
    private readonly string _apiKey = "${apiKey}";
    private readonly string _senderId = "AUTO_ENG_IQ";

    public WhatsAppNotificationService()
    {
        _httpClient = new HttpClient();
    }

    /// <summary>
    /// إرسال رسالة تذكير صيانة موثقة للعميل عبر WhatsApp
    /// </summary>
    public async Task<bool> SendMaintenanceReminderAsync(string phoneNumber, string clientName, string carModel, string kmLimit)
    {
        phoneNumber = phoneNumber.Replace(" ", "").Replace("+", ""); // مثال: 9647701234567

        if (_useUnifonic)
        {
            var payload = new
            {
                recipient = phoneNumber,
                sender_id = _senderId,
                message_type = "template",
                template_name = "workshop_maintenance",
                language = "ar",
                parameters = new
                {
                    client_name = clientName,
                    car_model = carModel,
                    variable_param = kmLimit
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, _unifonicApiUrl);
            request.Headers.Add("Authorization", $"Bearer {_apiKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        else
        {
            // الربط عبر Infobip API
            var payload = new
            {
                messages = new[]
                {
                    new
                    {
                        from = _senderId,
                        to = phoneNumber,
                        content = new
                        {
                            templateName = "workshop_maintenance",
                            templateData = new
                            {
                                body = new
                                {
                                    placeholders = new[] { clientName, carModel, kmLimit }
                                }
                            },
                            language = "ar"
                        }
                    }
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, _infobipApiUrl);
            request.Headers.Add("Authorization", $"App {_apiKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
    }
}`;

    const codeSql = `-- 1. جدول لتسجيل رسائل الواتساب المرسلة للعملاء وحالتها
CREATE TABLE whatsapp_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    vehicle_id UUID REFERENCES vehicles(id),
    notification_type VARCHAR(50), -- 'Welcome', 'Maintenance_5k', 'Oil_Change', etc.
    phone_number VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'Sent', -- 'Sent', 'Delivered', 'Read'
    api_message_id VARCHAR(100)
);

-- 2. استعلام للـ Scheduler Job (يُشغل كل صباح) لتحديد المستحقين لتذكير الصيانة
-- يسحب السيارات التي اقترب موعد صيانتها (تغيير الزيت بعد 5000 كم أو 3 أشهر)
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    c.phone AS client_phone,
    v.id AS vehicle_id,
    v.make || ' ' || v.model AS car_model,
    v.current_mileage,
    ir.created_at AS last_service_date
FROM inspection_reports ir
JOIN vehicles v ON ir.vehicle_id = v.id
JOIN clients c ON v.client_id = c.id
WHERE 
    -- لم نرسل لهم رسالة تذكير صيانة خلال الـ 30 يوم الماضية
    NOT EXISTS (
        SELECT 1 FROM whatsapp_notifications_log wl 
        WHERE wl.client_id = c.id 
          AND wl.notification_type = 'Maintenance_Reminder'
          AND wl.sent_at > NOW() - INTERVAL '30 days'
    )
    -- المعيار: السيارة قطعت أكثر من 4800 كم منذ آخر صيانة (تقترب من 5000 كم)
    AND (v.current_mileage - ir.mileage_at_inspection) >= 4800;`;

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 text-right" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/60 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl shadow-slate-900/5">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 animate-pulse">
                            <MessageCircle size={24} />
                        </div>
                        <h1 className="text-2xl font-bold font-display text-foreground">
                            ربط خدمة الواتساب وإرسال الإشعارات التلقائية
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-2xl font-sans">
                        شاهد محاكاة حية وتفاعلية لخدمة الـ WhatsApp API الرسمية، واقرأ دراسة الجدوى التشغيلية لكيفية استرجاع العملاء وزيادة المبيعات لجميع الفروع في العراق.
                    </p>
                </div>

                <div className="flex bg-slate-900/40 p-1.5 rounded-xl border border-slate-800 self-start">
                    <button
                        onClick={() => setActiveTab("simulator")}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                            activeTab === "simulator"
                                ? "bg-rose-600 text-white shadow-md"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        💡 المحاكي والـ UI/UX
                    </button>
                    <button
                        onClick={() => setActiveTab("feasibility")}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                            activeTab === "feasibility"
                                ? "bg-rose-600 text-white shadow-md"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        📊 الجدوى والأرباح
                    </button>
                    <button
                        onClick={() => setActiveTab("developer")}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                            activeTab === "developer"
                                ? "bg-rose-600 text-white shadow-md"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        💻 كود الربط
                    </button>
                </div>
            </div>

            {/* TAB 1: Simulator & UX Mockup */}
            {activeTab === "simulator" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Input parameters */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* BSP Configuration Panel */}
                        <div className="bg-card/40 border border-border p-6 rounded-2xl shadow-md space-y-5">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <h3 className="font-bold text-foreground flex items-center gap-2 font-sans">
                                    <Settings size={18} className="text-rose-500" />
                                    إعدادات مزود الـ API ومضيف الاتصال (Host)
                                </h3>
                                <span className="bg-green-500/10 text-green-500 text-xs px-2.5 py-1 rounded-full border border-green-500/20 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                                    متصل حالياً
                                </span>
                            </div>

                            <div className="space-y-4 text-right">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-2">
                                        مزود الخدمة المختار
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setBsp("unifonic")}
                                            className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                                                bsp === "unifonic"
                                                    ? "bg-slate-800 border-rose-500/50 text-rose-400 font-bold"
                                                    : "border-border text-muted-foreground hover:bg-slate-800/20"
                                            }`}
                                        >
                                            Unifonic
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBsp("infobip")}
                                            className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                                                bsp === "infobip"
                                                    ? "bg-slate-800 border-rose-500/50 text-rose-400 font-bold"
                                                    : "border-border text-muted-foreground hover:bg-slate-800/20"
                                            }`}
                                        >
                                            Infobip
                                        </button>
                                    </div>
                                </div>

                                {/* Custom API Host configuration */}
                                <div className="space-y-3 p-3.5 bg-slate-900/40 border border-slate-800 rounded-xl animate-fadeIn">
                                    {bsp === "unifonic" ? (
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                مضيف الاتصال لـ Unifonic (API Host)
                                            </label>
                                            <select
                                                value={unifonicHost}
                                                onChange={(e) => setUnifonicHost(e.target.value)}
                                                className="w-full text-xs font-mono bg-slate-950 border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none"
                                            >
                                                <option value="apis.unifonic.com">apis.unifonic.com (المضيف الرسمي الافتراضي)</option>
                                                <option value="el.cloud.unifonic.com/rest/whatsapp">el.cloud.unifonic.com (مضيف كلاود التفاعلي)</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                معرف مضيف الحساب الفريد لـ Infobip (Subdomain)
                                            </label>
                                            <div className="flex items-center gap-1.5" dir="ltr">
                                                <input
                                                    type="text"
                                                    value={infobipSubdomain}
                                                    onChange={(e) => setInfobipSubdomain(e.target.value)}
                                                    className="w-24 text-center text-xs font-mono bg-slate-950 border border-border rounded-lg px-2 py-2 text-foreground focus:outline-none"
                                                    placeholder="w1m2y3"
                                                />
                                                <span className="text-xs text-muted-foreground font-mono">.api.infobip.com</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1 block">
                                                💡 توفر لك Infobip مضيفاً فريداً لكل حساب عند التسجيل لتأمين المكالمات.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            رمز الترخيص API Key
                                        </label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full text-xs font-mono text-left bg-slate-900/60 border border-border rounded-lg px-3 py-2 text-foreground focus:border-rose-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            معرف الإرسال Sender ID
                                        </label>
                                        <input
                                            type="text"
                                            value={senderId}
                                            disabled
                                            className="w-full text-xs font-mono text-center bg-slate-900/40 border border-border/60 rounded-lg px-3 py-2 text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Message variables & template editor */}
                        <div className="bg-card/40 border border-border p-6 rounded-2xl shadow-md space-y-4">
                            <h3 className="font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                                <Activity size={18} className="text-yellow-500" />
                                تخصيص وتعديل قوالب الرسائل الجاهزة (Live)
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            اسم العميل المستلم
                                        </label>
                                        <input
                                            type="text"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            className="w-full text-sm bg-slate-900/40 border border-border rounded-lg px-3 py-2 text-foreground focus:border-rose-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            رقم هاتف العميل (العراق)
                                        </label>
                                        <input
                                            type="text"
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            className="w-full text-sm font-mono text-left bg-slate-900/40 border border-border rounded-lg px-3 py-2 text-foreground focus:border-rose-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            نوع وموديل السيارة
                                        </label>
                                        <input
                                            type="text"
                                            value={carModel}
                                            onChange={(e) => setCarModel(e.target.value)}
                                            className="w-full text-sm bg-slate-900/40 border border-border rounded-lg px-3 py-2 text-foreground focus:border-rose-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            قالب الرسالة المطلوب
                                        </label>
                                        <select
                                            value={selectedTemplate}
                                            onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)}
                                            className="w-full text-sm bg-slate-900/40 border border-border rounded-lg px-2.5 py-2 text-foreground focus:border-rose-500 focus:outline-none"
                                        >
                                            <option value="welcome">قالب الترحيب بالعملاء الجدد</option>
                                            <option value="maintenance">قالب تذكير صيانة العداد</option>
                                            <option value="oil">قالب موعد تغيير الزيت</option>
                                            <option value="offers">قالب العروض الخاصة</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Dynamic values configuration */}
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedTemplate === "maintenance" && (
                                        <div className="bg-slate-900/30 p-2.5 rounded-lg border border-border/50 animate-fadeIn col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                تحديد صيانة الكيلومترات
                                            </label>
                                            <select
                                                value={maintenanceKm}
                                                onChange={(e) => setMaintenanceKm(e.target.value)}
                                                className="w-full text-xs bg-slate-900/60 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
                                            >
                                                <option value="5,000 كم">صيانة الـ 5,000 كم (الأولى)</option>
                                                <option value="10,000 كم">صيانة الـ 10,000 كم (رئيسية)</option>
                                                <option value="20,000 كم">صيانة الـ 20,000 كم (كاملة)</option>
                                                <option value="40,000 كم">صيانة الـ 40,000 كم (شاملة)</option>
                                            </select>
                                        </div>
                                    )}

                                    {selectedTemplate === "oil" && (
                                        <div className="bg-slate-900/30 p-2.5 rounded-lg border border-border/50 animate-fadeIn col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                موعد تغيير الزيت المتوقع
                                            </label>
                                            <input
                                                type="date"
                                                value={oilChangeDate}
                                                onChange={(e) => setOilChangeDate(e.target.value)}
                                                className="w-full text-xs bg-slate-900/60 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none text-left"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Live Template Body Text Editor */}
                                <div className="space-y-1 p-3 bg-slate-900/20 border border-border/50 rounded-xl">
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-muted-foreground">نص القالب المعتمد (قابل للتعديل)</span>
                                        <span className="text-green-500 text-[10px] bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/25">قالب معتمد في ميتا ✅</span>
                                    </div>
                                    <textarea
                                        value={templates[selectedTemplate]}
                                        onChange={(e) => handleTemplateTextChange(selectedTemplate, e.target.value)}
                                        rows={4}
                                        className="w-full text-xs bg-slate-950 border border-border rounded-lg p-2.5 text-foreground focus:border-rose-500 focus:outline-none leading-relaxed"
                                        placeholder="اكتب نص الرسالة هنا... استخدم {name} لاسم العميل، {car} لنوع السيارة، {param} للمتغير الآخر"
                                    />
                                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                        💡 المتغيرات: <strong>{"{name}"}</strong> (اسم العميل)، <strong>{"{car}"}</strong> (السيارة)، <strong>{"{param}"}</strong> (العداد/التاريخ).
                                    </span>
                                </div>

                                {/* Media Header Attachment Option */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="include_image"
                                        checked={includeImage}
                                        onChange={(e) => setIncludeImage(e.target.checked)}
                                        className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                                    />
                                    <label htmlFor="include_image" className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1">
                                        <ImageIcon size={14} className="text-blue-400" />
                                        إرفاق صورة ترويجية/فنية في رأس الرسالة (Rich Media Template)
                                    </label>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSimulateSend}
                                    disabled={isSending}
                                    className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSending ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={18} />
                                            جاري إرسال التنبيه عبر الـ API المعتمد...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} className="rotate-180" />
                                            إرسال التنبيه التلقائي (محاكاة)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* API Console Logger (Bottom Left) */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-mono text-slate-400">سجل استدعاء الـ API ومطابقة الـ Payload (HTTP Console)</span>
                                <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                                </div>
                            </div>
                            <div className="p-4 font-mono text-[10px] space-y-4 max-h-[220px] overflow-y-auto text-left" dir="ltr">
                                {apiLogs.length === 0 ? (
                                    <div className="text-slate-600 italic text-center py-6">
                                        لا توجد طلبات API نشطة حالياً. اضغط على "إرسال التنبيه" لتشغيل المحاكي ومراقبة الاتصال.
                                    </div>
                                ) : (
                                    apiLogs.map(log => (
                                        <div key={log.id} className="border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    log.type === "request" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                                                }`}>
                                                    {log.type === "request" ? "API REQUEST" : "API RESPONSE"}
                                                </span>
                                                <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="text-slate-300 font-bold mb-1">
                                                {log.method} {log.url} - <span className={log.status === 200 ? "text-green-400" : "text-yellow-400"}>{log.status}</span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="text-slate-500 block text-[9px]">Headers:</span>
                                                <pre className="bg-slate-900/60 p-1.5 rounded text-slate-400 text-[9px] overflow-x-auto">
                                                    {Object.entries(log.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
                                                </pre>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-[9px]">JSON Body Payload:</span>
                                                <pre className="bg-slate-900 p-2 rounded text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-28">
                                                    {log.payload}
                                                </pre>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: The Smartphone Frame and chat bubble simulator */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center">
                        {/* High Fidelity Phone Container */}
                        <div className="relative w-full max-w-[380px] h-[720px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-4 border-slate-800 ring-12 ring-slate-900 flex flex-col overflow-hidden">
                            {/* Speaker notch */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-full z-30 flex items-center justify-between px-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
                                <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-900/40"></div>
                            </div>

                            {/* Phone Screen */}
                            <div className="flex-1 rounded-[38px] bg-[#0b141a] overflow-hidden flex flex-col relative border border-slate-900">
                                {/* Phone Header Status Bar */}
                                <div className="h-10 bg-[#0b141a] px-6 flex items-center justify-between text-white text-[11px] font-medium z-20">
                                    <span>{new Date().toLocaleTimeString("ar-IQ", { hour: "numeric", minute: "2-digit" })}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-4 h-2.5 border border-white/80 rounded-sm relative flex items-center p-0.5"><span className="w-2.5 h-full bg-white rounded-2xs"></span></span>
                                        <span className="text-[10px]">LTE</span>
                                        <span className="opacity-90">📶</span>
                                    </div>
                                </div>

                                {/* WhatsApp App Header */}
                                <div className="bg-[#1f2c34] p-3 text-white flex items-center justify-between shadow-md z-15 border-b border-slate-800">
                                    <div className="flex items-center gap-2 text-right" dir="rtl">
                                        <div className="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold text-sm relative shadow-md">
                                            ⚙️
                                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#1f2c34] flex items-center justify-center">
                                                <span className="text-[7px] text-white">✓</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-start leading-tight">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-[13px]">هندسة السيارات (العراق)</span>
                                                <span className="text-blue-400 text-[9px] bg-blue-500/10 px-1 rounded-sm border border-blue-500/20">حساب موثق</span>
                                            </div>
                                            <span className="text-[10px] text-green-400">نشط الآن</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-slate-300 text-sm">
                                        <span>📞</span>
                                        <span>📹</span>
                                        <span>⋮</span>
                                    </div>
                                </div>

                                {/* Chat Wallpaper Area */}
                                <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-contain">
                                    <div className="flex-1" />
                                    {/* Date separator */}
                                    <div className="self-center bg-[#182229] text-slate-400 text-[9px] px-2 py-0.5 rounded-md shadow-sm border border-slate-800">
                                        اليوم
                                    </div>

                                    {/* Conversation Bubbles */}
                                    {chatMessages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`max-w-[85%] rounded-2xl p-0.5 shadow-md relative text-right flex flex-col overflow-hidden ${
                                                msg.sender === "workshop"
                                                    ? "bg-[#005c4b] text-[#e9edef] self-start rounded-tr-none animate-fadeIn"
                                                    : "bg-[#202c33] text-[#e9edef] self-end rounded-tl-none border border-slate-800 animate-fadeIn"
                                            }`}
                                        >
                                            {/* Header Image if template includes image */}
                                            {msg.hasImage && msg.sender === "workshop" && (
                                                <div className="w-full h-28 bg-slate-900/60 relative flex items-center justify-center border-b border-emerald-800/40">
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 bg-gradient-to-t from-slate-950/80 to-transparent">
                                                        <span className="text-[11px] font-bold text-white tracking-wide">⚙️ مركز هندسة السيارات</span>
                                                        <span className="text-[8px] text-slate-300 mt-0.5">الصيانة الموثقة والأداء المتكامل</span>
                                                    </div>
                                                    {/* Styled graphic to mimic image placeholder banner */}
                                                    <div className="w-full h-full bg-gradient-to-r from-rose-950/40 via-emerald-950/30 to-rose-950/40 flex items-center justify-center">
                                                        <span className="text-[22px]">🚗🔧</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-3 flex flex-col gap-1.5">
                                                <p className="text-[11.5px] leading-relaxed whitespace-pre-wrap">
                                                    {msg.text}
                                                </p>
                                                
                                                <div className="flex items-center justify-end gap-1 self-end">
                                                    <span className="text-[8px] text-slate-300 opacity-70">{msg.time}</span>
                                                    {msg.sender === "workshop" && (
                                                        <span className="text-[10px]">
                                                            {msg.status === "sent" && <span className="text-slate-400">✓</span>}
                                                            {msg.status === "delivered" && <span className="text-slate-400">✓✓</span>}
                                                            {msg.status === "read" && <span className="text-blue-400">✓✓</span>}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Render Quick Reply Template Buttons */}
                                            {msg.buttons && (
                                                <div className="border-t border-emerald-800/40 bg-emerald-900/20 flex flex-col divide-y divide-emerald-800/40">
                                                    {msg.buttons.map((btn, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => handleQuickReply(btn, msg.id)}
                                                            className="w-full bg-transparent hover:bg-emerald-800/40 text-[10.5px] font-bold text-[#38e54d] py-2 px-3 transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <span>📲</span>
                                                            {btn}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Typing status simulation */}
                                    {typingStatus && (
                                        <div className="bg-[#005c4b] text-[#e9edef] self-start rounded-2xl rounded-tr-none p-3 shadow-md text-xs flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                            <span className="text-[9px] text-emerald-200">يكتب الآن...</span>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input Box */}
                                <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-slate-800">
                                    <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-1.5 flex items-center justify-between text-slate-400 text-xs border border-slate-800">
                                        <span>رسالة...</span>
                                        <div className="flex gap-2.5 text-sm">
                                            <span>📎</span>
                                            <span>📷</span>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs">
                                        🎙️
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive UI Mockup Legend */}
                        <div className="mt-4 max-w-md text-center bg-slate-900/30 p-3 rounded-xl border border-border/40">
                            <span className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                                💡 <strong>تنبيه تفاعلي:</strong> هاد هاتف ذكي افتراضي يوريك كيف توصل الرسالة للعميل. غير محتوى الرسالة من القائمة اليمين واضغط إرسال، أو انقر الأزرار التفاعلية على شاشة الموبايل للرد التلقائي!
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Detailed Feasibility Study */}
            {activeTab === "feasibility" && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Visual Highlights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-sans">
                        <div className="bg-card/50 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                                <TrendingUp size={24} />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] text-muted-foreground block">معدل تقليل النسيان للعملاء</span>
                                <h4 className="text-xl font-bold text-foreground">أكثر من 80%</h4>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] text-muted-foreground block">معدل العودة لصيانة الورشة</span>
                                <h4 className="text-xl font-bold text-foreground">زيادة 5% - 15%</h4>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <Activity size={24} />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] text-muted-foreground block">تقليل الاتصالات اليدوية</span>
                                <h4 className="text-xl font-bold text-foreground">يصل إلى 90%</h4>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] text-muted-foreground block">تفعيل الرقم الرسمي</span>
                                <h4 className="text-sm font-bold text-foreground text-amber-500">يتكفل به الـ BSP بالكامل</h4>
                            </div>
                        </div>
                    </div>

                    {/* Executive Feasibility Content & ROI Calculator */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Right: Detailed text report */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-card/40 border border-border p-6 rounded-2xl shadow-md space-y-6">
                                <h2 className="text-lg font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                                    <FileText className="text-rose-500" size={20} />
                                    دراسة الجدوى التنفيذية والآلية الرسمية للمشروع
                                </h2>

                                <div className="space-y-5 text-sm leading-relaxed text-muted-foreground font-sans">
                                    <div>
                                        <h4 className="font-bold text-foreground text-base mb-1.5">1. حل تخطي الـ Meta Business Verification المعقد</h4>
                                        <p>
                                            التحقق من حسابات فيسبوك التجارية للشركات يدوياً يتطلب وثائق رسمية وسجلات تجارية عراقية باللغة الإنجليزية وتوثيق موقع ومجالات قد تستغرق شهوراً.
                                            الحل العملي والفعال هو الشراكة مع **Business Solution Provider (BSP)** مثل يونيفونك أو إنفوبيب، حيث توفر هذه الجهات تفعيلاً سريعاً وقانونياً بالكامل مع Meta ويتم تفعيل الرقم الرسمي باسم الورشة في غضون أيام قليلة وبدون تعطيل.
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-foreground text-base mb-1.5">2. آلية الربط بالسيستم الحالي (Database Trigger & Worker Service)</h4>
                                        <p>
                                            النظام الحالي يمتلك كل مقومات البيانات الأساسية (قاعدة البيانات، بيانات الصيانة، العدادات، الفروع). الربط الفعلي لا يتطلب بناء أي برمجيات معقدة إضافية، إنما فقط إضافة خدمة خلفية (Background Worker Service) بالخطوات التالية:
                                        </p>
                                        <ul className="list-disc list-inside mt-2 space-y-1.5 mr-4">
                                            <li><strong className="text-foreground">فحص تذكير صيانة العداد:</strong> تعمل الخدمة يومياً للتحقق من قيم عدادات السيارات (كل 5000 كم، 10000 كم، إلخ) وترسل التذكير التلقائي.</li>
                                            <li><strong className="text-foreground">تنبيه تغيير الزيت:</strong> يتم قراءة تاريخ الاستحقاق وتذكير العميل قبل الموعد بـ 3 أيام لتسجيل الزيارة.</li>
                                            <li><strong className="text-foreground">ترحيب بالعملاء الجدد:</strong> عند إنشاء حساب عميل جديد بالاستقبال، يرسل السيستم تلقائياً رسالة الترحيب الموثقة باسم المركز.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-foreground text-base mb-1.5">3. مقارنة سريعة بين مزودي الخدمة في العراق والشرق الأوسط</h4>
                                        <div className="overflow-x-auto mt-2">
                                            <table className="w-full text-right border-collapse border border-border">
                                                <thead>
                                                    <tr className="bg-slate-900/60 text-foreground font-bold">
                                                        <th className="p-2 border border-border">المزود (BSP)</th>
                                                        <th className="p-2 border border-border">دعم المنطقة واللغة</th>
                                                        <th className="p-2 border border-border">تكلفة تشغيلية متوقعة</th>
                                                        <th className="p-2 border border-border">تفعيل الحساب</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="p-2 border border-border font-bold text-foreground">Unifonic (يونيفونك)</td>
                                                        <td className="p-2 border border-border">دعم عربي متكامل وخبرة واسعة بالعراق والخليج</td>
                                                        <td className="p-2 border border-border font-mono">apis.unifonic.com</td>
                                                        <td className="p-2 border border-border">سريع (3-5 أيام عمل)</td>
                                                    </tr>
                                                    <tr className="bg-slate-900/20">
                                                        <td className="p-2 border border-border font-bold text-foreground">Infobip (إنفوبيب)</td>
                                                        <td className="p-2 border border-border">قوي ومناسب جداً للرسائل الدولية والمحلية</td>
                                                        <td className="p-2 border border-border font-mono">*.api.infobip.com</td>
                                                        <td className="p-2 border border-border">4-7 أيام عمل</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-2 border border-border">Twilio (تويليو)</td>
                                                        <td className="p-2 border border-border">دعم دولي ممتاز لكن الدعم العربي محدود</td>
                                                        <td className="p-2 border border-border font-mono">api.twilio.com</td>
                                                        <td className="p-2 border border-border">10-14 يوم عمل</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Left: Dynamic ROI Calculator */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-card/45 border border-border p-6 rounded-2xl shadow-lg space-y-5">
                                <h3 className="font-bold text-foreground border-b border-border pb-3 flex items-center gap-2 font-sans">
                                    <Calculator className="text-green-500" size={18} />
                                    حاسبة العائد الاستثماري التفاعلية (ROI Calculator)
                                </h3>

                                <div className="space-y-4">
                                    {/* Currency Toggle */}
                                    <div className="flex items-center justify-between font-sans">
                                        <span className="text-xs font-bold text-muted-foreground">العملة المستخدمة للحساب</span>
                                        <div className="flex bg-slate-900/40 p-1 rounded-lg border border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => setRoiCurrency("IQD")}
                                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                                    roiCurrency === "IQD" ? "bg-rose-600 text-white" : "text-muted-foreground"
                                                }`}
                                            >
                                                دينار عراقي (IQD)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRoiCurrency("USD")}
                                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                                    roiCurrency === "USD" ? "bg-rose-600 text-white" : "text-muted-foreground"
                                                }`}
                                            >
                                                دولار أمريكي (USD)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Parameter Sliders */}
                                    <div className="space-y-3 font-sans">
                                        <div>
                                            <div className="flex justify-between text-xs font-semibold mb-1">
                                                <span className="text-muted-foreground">الملف التعريفي: عدد الفروع</span>
                                                <span className="text-foreground font-bold">{roiBranches} فروع</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="6"
                                                value={roiBranches}
                                                onChange={(e) => setRoiBranches(Number(e.target.value))}
                                                className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-semibold mb-1">
                                                <span className="text-muted-foreground">عدد العملاء شهرياً للفرع</span>
                                                <span className="text-foreground font-bold">{roiCustomers} عميل</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="500"
                                                max="3000"
                                                step="100"
                                                value={roiCustomers}
                                                onChange={(e) => setRoiCustomers(Number(e.target.value))}
                                                className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-semibold mb-1">
                                                <span className="text-muted-foreground">متوسط الفاتورة للعميل</span>
                                                <span className="text-foreground font-bold">
                                                    {roiTicketSize.toLocaleString()} {roiCurrency}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={roiCurrency === "IQD" ? 15000 : 10}
                                                max={roiCurrency === "IQD" ? 150000 : 100}
                                                step={roiCurrency === "IQD" ? 5000 : 5}
                                                value={roiTicketSize}
                                                onChange={(e) => setRoiTicketSize(Number(e.target.value))}
                                                className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-semibold mb-1">
                                                <span className="text-muted-foreground">معدل تحسن العودة للورشة</span>
                                                <span className="text-green-400 font-bold">+{roiReturnRate}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="3"
                                                max="20"
                                                step="1"
                                                value={roiReturnRate}
                                                onChange={(e) => setRoiReturnRate(Number(e.target.value))}
                                                className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Calculations Result Output */}
                                    <div className="bg-slate-900/60 p-4 rounded-xl border border-border/80 space-y-3.5 mt-2 font-sans">
                                        <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80">
                                            <span className="text-muted-foreground">إجمالي عملاء المركز (شهرياً):</span>
                                            <span className="text-foreground font-bold">{roi.totalCustomers.toLocaleString()} عميل</span>
                                        </div>
                                        <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80">
                                            <span className="text-foreground font-bold">حجم الرسائل المطلوب شهرياً:</span>
                                            <span className="text-foreground font-bold">{roi.messagesPerMonth.toLocaleString()} رسالة</span>
                                        </div>
                                        <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80">
                                            <span className="text-muted-foreground">تكلفة استهلاك API المتوقعة:</span>
                                            <span className="text-rose-400 font-bold">{roi.monthlyApiCost} {roiCurrency}</span>
                                        </div>
                                        <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80">
                                            <span className="text-muted-foreground">العملاء الإضافيين المسترجعيم:</span>
                                            <span className="text-green-400 font-bold">+{roi.returnedCustomers.toLocaleString()} عميل</span>
                                        </div>
                                        <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80">
                                            <span className="text-muted-foreground">زيادة إجمالي الإيرادات شهرياً:</span>
                                            <span className="text-green-400 font-bold">+{roi.extraRevenue} {roiCurrency}</span>
                                        </div>

                                        {/* Big ROI Box */}
                                        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-3 rounded-lg border border-green-500/20 text-center space-y-1">
                                            <span className="text-[10px] text-green-400 font-bold block uppercase tracking-wider">الأرباح الصافية الإضافية (شهرياً)</span>
                                            <h3 className="text-2xl font-black text-green-400 font-display">
                                                +{roi.netProfit} {roiCurrency}
                                            </h3>
                                            <span className="text-[9px] text-muted-foreground block">
                                                نسبة زيادة الأرباح مقارنة بالتكلفة: <strong className="text-green-400">{roi.roiPercent}%</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Developer Integration Codes */}
            {activeTab === "developer" && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-card/40 border border-border p-6 rounded-2xl shadow-md space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3 text-right">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <FileCode className="text-rose-500" size={20} />
                                أكواد ومرجع المطورين لتفعيل الربط بالمركز مع تحديد الـ Host والـ Header
                            </h2>
                            {copiedText && (
                                <span className="bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/20">
                                    تم نسخ كود {copiedText} بنجاح!
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed font-sans">
                            تكامل نظام الورشة مع واتساب يتطلب إضافة خدمة إرسال الرسائل HTTP وتفعيل SQL Cron Job للتحقق من صيانة المركبة بشكل مجدول. الأكواد التالية تستخدم المضيف (Host) المختار وإعدادات الـ Header الصحيحة للمزود:
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                            {/* C# Integration Service */}
                            <div className="space-y-2 text-right">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">1. كود الاستدعاء بلغة C# (WhatsAppNotificationService.cs)</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(codeCSharp, "C#")}
                                        className="p-1.5 hover:bg-slate-800 text-muted-foreground hover:text-foreground rounded transition-colors text-xs flex items-center gap-1.5 font-sans"
                                    >
                                        <Copy size={13} />
                                        نسخ الكود
                                    </button>
                                </div>
                                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto text-left h-[420px]" dir="ltr">
                                    {codeCSharp}
                                </pre>
                            </div>

                            {/* SQL Scheduler & DB logs */}
                            <div className="space-y-2 text-right">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">2. استعلامات قاعدة البيانات وتصنيف التذكير (Cron.sql)</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(codeSql, "SQL")}
                                        className="p-1.5 hover:bg-slate-800 text-muted-foreground hover:text-foreground rounded transition-colors text-xs flex items-center gap-1.5 font-sans"
                                    >
                                        <Copy size={13} />
                                        نسخ الكود
                                    </button>
                                </div>
                                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto text-left h-[420px]" dir="ltr">
                                    {codeSql}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
