import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/supabase-server";

// Node runtime (needs the service-role Supabase client + the Anthropic SDK), never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

// Schema + quirks the model must know to write correct PostgreSQL. Kept concise.
const SCHEMA_DOC = `قاعدة البيانات (PostgreSQL) لورشة سيارات. الجداول والأعمدة المهمة:

branches(id uuid, name text)  -- الفروع
employees(id uuid, auth_id uuid, name text, username text, role text, branch_id uuid, phone text, created_at timestamptz)
  -- role أحد: 'Owner','Admin','Supervisor','Receptionist'
clients(id uuid, name text, phone text, created_at timestamptz)  -- العملاء
vehicles(id uuid, client_id uuid, make text, model text, engine_size text, plate_number text, booklet_serial text, created_at timestamptz)
inspection_reports(id uuid, report_number int, branch_id uuid, vehicle_id uuid NULL, receptionist_id uuid, supervisor_id uuid,
  status text, order_type text, odometer_reading int, odometer_unit text, total_price numeric, notes text,
  completed_at timestamptz, created_at timestamptz, estimated_duration int, start_time timestamptz, end_time timestamptz,
  elapsed_time int, is_delayed bool, bay_number text, technician_id uuid NULL, selected_services jsonb)
  -- هذا الجدول الأساسي لأوامر العمل والمبيعات.
  -- status (عربي): 'تم الاستلام','قيد العمل','تم الانتهاء','متأخر','ملغى'
  -- order_type: 'maintenance' (أمر صيانة) أو 'sale' (بيع منتج). المبيعات vehicle_id فيها NULL.
inventory(id uuid, branch_id uuid, item_code text, name text, category text, purchase_price numeric, sell_price numeric, quantity int, min_quantity int)
report_services(id uuid, report_id uuid, category text, status text, notes text, service_price numeric, created_at timestamptz)
used_parts(id uuid, report_id uuid, inventory_id uuid, quantity int, unit_price numeric, total_price numeric, part_name text, part_code text)
pos_sales(id bigint, total_amount numeric, payment_method text, items jsonb, created_at timestamptz)

ملاحظات بالغة الأهمية:
- اسم الفني ليس عموداً. يُخزَّن نصاً في selected_services->0->>'technicianName'. واسم المشرف في selected_services->0->>'shiftSupervisor'.
- لو عمل سيارةً واحدةً أكثر من فني، يُكتب الاسم مدموجاً بفواصل مثل +، -، /، و، ، . عند تحليل الفنيين فرداً فرداً استخدم regexp_split_to_table على هذه الفواصل وحذف الفراغات.
- عدد الخدمات على كرت الصيانة ≈ عدد عناصر selected_services->0->'services' التي قيمتها status='يحتاج تغيير'، زائد عناصر مصفوفتي customServices و freeServices.
- بيع المنتج (order_type='sale'): selected_services->0 يحتوي customerName و customerPhone و products (مصفوفة فيها name,qty,price).
- الإيراد عادةً = مجموع total_price للأوامر المنتهية (status='تم الانتهاء').
- العميل مرتبط بالكرت عبر vehicles.client_id (انضمّ inspection_reports.vehicle_id = vehicles.id ثم vehicles.client_id = clients.id). المبيعات بلا مركبة فاسم عميلها داخل selected_services.
- استخدم دائماً صيغة PostgreSQL ومعاملات JSON (->, ->>). أضف LIMIT مناسباً. النتائج محدودة بـ 1000 صف.`;

const SYSTEM = `أنت مساعد ذكي لإدارة ورشة سيارات، تخدم المالك والمدير. تجاوب بالعربية بإيجاز ووضوح.
لديك أداة query_database لتنفيذ استعلامات قراءة فقط (SELECT) على قاعدة البيانات الحقيقية.
القواعد:
- لا تخمّن الأرقام أبداً. استعلم من قاعدة البيانات أولاً ثم أجب من النتائج الفعلية.
- استعلامات قراءة فقط (SELECT/WITH). لا تعديل ولا حذف.
- لو احتجت عدة استعلامات للوصول للجواب نفّذها بالتتابع.
- بعد الحصول على النتائج، قدّم إجابة عربية مختصرة ومباشرة (أرقام واضحة، أسماء، جداول صغيرة عند اللزوم).
- لو السؤال غامض اطلب توضيحاً بدل التخمين.
- لو ما توفرت بيانات كافية قُل ذلك بصراحة.

${SCHEMA_DOC}`;

const TOOLS: Anthropic.Tool[] = [
    {
        name: "query_database",
        description:
            "Run ONE read-only PostgreSQL SELECT/WITH query against the workshop database and return the rows as JSON. Use it to answer any question about the data. No INSERT/UPDATE/DELETE/DDL. Always include a sensible LIMIT; results are capped at 1000 rows.",
        input_schema: {
            type: "object",
            properties: {
                sql: { type: "string", description: "A single read-only PostgreSQL SELECT/WITH statement." },
            },
            required: ["sql"],
        },
    },
];

export async function POST(request: Request) {
    const guard = await requireAdmin();
    if (!guard.ok) {
        return Response.json({ error: guard.error || "غير مصرح." }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return Response.json(
            { error: "المساعد غير مُفعّل بعد: لم يتم ضبط مفتاح ANTHROPIC_API_KEY في إعدادات المشروع." },
            { status: 503 }
        );
    }

    let body: { messages?: unknown };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "طلب غير صالح." }, { status: 400 });
    }

    const incoming = Array.isArray(body.messages) ? body.messages : null;
    if (!incoming) {
        return Response.json({ error: "messages[] مطلوبة." }, { status: 400 });
    }

    // Only carry forward simple user/assistant text turns from the client.
    const messages: Anthropic.MessageParam[] = incoming
        .filter((m): m is { role: "user" | "assistant"; content: string } =>
            !!m && typeof m === "object" &&
            ((m as any).role === "user" || (m as any).role === "assistant") &&
            typeof (m as any).content === "string" && (m as any).content.trim() !== ""
        )
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
        return Response.json({ error: "آخر رسالة يجب أن تكون من المستخدم." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const supabaseAdmin = guard.supabaseAdmin;

    try {
        let response = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: SYSTEM,
            tools: TOOLS,
            messages,
        });

        let loops = 0;
        const executed: { sql: string }[] = [];
        while (response.stop_reason === "tool_use" && loops < 8) {
            loops++;
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of response.content) {
                if (block.type === "tool_use" && block.name === "query_database") {
                    const sql = String((block.input as { sql?: string })?.sql ?? "");
                    executed.push({ sql });
                    const { data, error } = await (supabaseAdmin as any).rpc("assistant_query", { query_text: sql });
                    let content: string;
                    let isError = false;
                    if (error) {
                        content = `ERROR: ${error.message}`;
                        isError = true;
                    } else {
                        content = JSON.stringify(data ?? []).slice(0, 60000);
                    }
                    toolResults.push({ type: "tool_result", tool_use_id: block.id, content, is_error: isError });
                }
            }
            messages.push({ role: "assistant", content: response.content as unknown as Anthropic.ContentBlockParam[] });
            messages.push({ role: "user", content: toolResults });
            response = await client.messages.create({
                model: MODEL,
                max_tokens: 4096,
                system: SYSTEM,
                tools: TOOLS,
                messages,
            });
        }

        const reply = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n")
            .trim();

        return Response.json({ reply: reply || "لم أتمكن من إيجاد إجابة." });
    } catch (err: any) {
        console.error("assistant route error:", err);
        const status = err?.status === 401 ? 502 : 500;
        return Response.json(
            { error: "تعذّر الاتصال بالمساعد. " + (err?.message ? `(${err.message})` : "") },
            { status }
        );
    }
}
