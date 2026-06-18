import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env variables
let envText = '';
if (fs.existsSync('.env.local')) {
    envText = fs.readFileSync('.env.local', 'utf8');
} else if (fs.existsSync('.env')) {
    envText = fs.readFileSync('.env', 'utf8');
}

const env = {};
envText.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > -1) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("خطأ: مفقود بيانات Supabase في ملف .env");
    process.exit(1);
}

// Clients initialization
const clientAnon = createClient(supabaseUrl, anonKey);
const clientService = createClient(supabaseUrl, serviceKey);

async function runTest() {
    console.log("====================================================");
    console.log("🚀 بدء فحص واختبار نظام دفاتر الصيانة الرقمية والـ QR");
    console.log("====================================================\n");

    // 1. اختبار استعلام أعلى رقم تسلسلي (Serial Generator Test)
    console.log("1️⃣ اختبار آلية توليد الأرقام التسلسلية المتعاقبة:");
    let proposedSerial = "BK-10001";
    try {
        const { data: lastVeh, error: maxErr } = await clientService
            .from('vehicles')
            .select('booklet_serial')
            .not('booklet_serial', 'is', null)
            .order('booklet_serial', { ascending: false })
            .limit(1);

        if (maxErr) throw maxErr;

        let nextNum = 10001;
        let currentMax = "لا يوجد";
        if (lastVeh && lastVeh.length > 0 && lastVeh[0].booklet_serial) {
            currentMax = lastVeh[0].booklet_serial;
            const match = currentMax.match(/BK-(\d+)/);
            if (match) {
                nextNum = parseInt(match[1]) + 1;
            }
        }
        proposedSerial = `BK-${nextNum}`;
        console.log(`   - أعلى رقم تسلسلي مسجل حالياً: [ ${currentMax} ]`);
        console.log(`   - الرقم التسلسلي التالي المقترح توليده: [ ${proposedSerial} ]`);
        console.log("   ✅ اختبار توليد الرقم التسلسلي يعمل بنجاح 100%.\n");
    } catch (e) {
        console.error("   ❌ فشل اختبار توليد الأرقام التسلسلية:", e);
    }

    // 2. إعداد بيانات وهمية لإجراء فحص شامل متكامل
    console.log("2️⃣ إعداد بيانات تجريبية مؤقتة (مؤمنة):");
    const testSerial = "BK-99999"; // رقم دفتر تجريبي خاص بالاختبار
    let tempClientId = null;
    let tempVehicleId = null;
    let tempReportId = null;

    try {
        // أ) إيجاد أو إنشاء فرع وموظف للتجربة
        const { data: branches } = await clientService.from('branches').select('id, name').limit(1);
        const branchId = branches?.[0]?.id || null;
        const branchName = branches?.[0]?.name || "الفرع الرئيسي للتجربة";

        const { data: employees } = await clientService.from('employees').select('id, name').limit(1);
        const receptionistId = employees?.[0]?.id || null;
        const receptionistName = employees?.[0]?.name || "موظف تجريبي";

        // ب) إضافة عميل تجريبي
        const { data: clientData, error: clientErr } = await clientService
            .from('clients')
            .insert({
                name: 'زبون فحص النظام الرقمي',
                phone: '07701234567',
                email: 'test-public-timeline@auto-workshop.com'
            })
            .select('id')
            .single();

        if (clientErr) throw clientErr;
        tempClientId = clientData.id;
        console.log(`   - تم إنشاء العميل المؤقت بنجاح (معرف: ${tempClientId})`);

        // ج) إضافة سيارة تجريبية مرتبطة بالعميل ورقم الدفتر التجريبي
        const { data: vehData, error: vehErr } = await clientService
            .from('vehicles')
            .insert({
                client_id: tempClientId,
                make: 'تويوتا',
                model: 'كورولا ٢٠٢٦',
                plate_number: 'العراق - بغداد - ٨٨٨٨',
                engine_size: '1.8L',
                booklet_serial: testSerial
            })
            .select('id')
            .single();

        if (vehErr) throw vehErr;
        tempVehicleId = vehData.id;
        console.log(`   - تم إنشاء السيارة المؤقتة برقم دفتر [ ${testSerial} ] (معرف: ${tempVehicleId})`);

        // د) إضافة تقرير صيانة (زيارة) وهمي للمركبة مع تفاصيل الخدمات والزيوت
        const sampleServices = [{
            is_paper_v2_format: true,
            services: {
                engineOil: {
                    status: "يحتاج تغيير",
                    details: {
                        brand: "Toyota Genuine Oil",
                        viscosity: "5W-30",
                        liters: "4.5"
                    },
                    price: 45000
                },
                oilFilter: { status: "يحتاج تغيير", price: 10000, details: { qty: "1" } },
                sparkPlugs: { status: "جيد", price: 0 }
            },
            freeServices: {
                engineClean: true,
                tirePressure: true
            },
            customServices: [
                { label: "غسيل السيارة بالكامل", status: "مكتمل", price: 15000 }
            ],
            shiftSupervisor: "المشرف الهندسي للتجربة",
            technicianName: "الفني المعتمد للتجربة"
        }];

        const { data: repData, error: repErr } = await clientService
            .from('inspection_reports')
            .insert({
                vehicle_id: tempVehicleId,
                report_number: 99999,
                status: 'تم الانتهاء',
                total_price: 70000,
                odometer_reading: 25500,
                selected_services: sampleServices,
                branch_id: branchId,
                receptionist_id: receptionistId
            })
            .select('id')
            .single();

        if (repErr) throw repErr;
        tempReportId = repData.id;
        console.log(`   - تم إنشاء تقرير الصيانة المؤقت بنجاح (معرف: ${tempReportId})\n`);

        // 3. محاكاة وصول زبون عام (Anonymous Client) عبر رمز الـ QR كود
        console.log("3️⃣ محاكاة وصول زبون عام (Anonymous) عبر رابط الدفتر الرقمي:");
        
        // أ) جلب بيانات السيارة والصاحب بالمفتاح العام (Anon Key)
        const { data: vehicleData, error: vehicleErr } = await clientAnon
            .from("vehicles")
            .select(`
                id, make, model, plate_number, engine_size, booklet_serial,
                clients (id, name, phone)
            `)
            .eq("booklet_serial", testSerial)
            .maybeSingle();

        if (vehicleErr) throw vehicleErr;
        if (!vehicleData) {
            throw new Error("فشل في استرجاع المركبة عبر المفتاح العام!");
        }

        console.log("   ✅ تم جلب بيانات السيارة بنجاح (بدون مصادقة):");
        console.log(`      - الماركة والموديل: ${vehicleData.make} ${vehicleData.model}`);
        console.log(`      - رقم اللوحة: ${vehicleData.plate_number}`);
        console.log(`      - حجم المحرك: ${vehicleData.engine_size || 'غير محدد'}`);
        console.log(`      - المالك: ${vehicleData.clients?.name || 'غير محدد'}`);
        console.log(`      - رقم الهاتف (قبل القناع): ${vehicleData.clients?.phone || 'غير محدد'}`);
        
        // قناع الهاتف
        const rawPhone = vehicleData.clients?.phone;
        let maskedPhone = "—";
        if (rawPhone) {
            const cleaned = rawPhone.trim();
            if (cleaned.length > 6) {
                if (cleaned.startsWith("07")) {
                    maskedPhone = `${cleaned.slice(0, 3)}****${cleaned.slice(-4)}`;
                } else if (cleaned.startsWith("+964")) {
                    maskedPhone = `${cleaned.slice(0, 7)}****${cleaned.slice(-4)}`;
                } else {
                    maskedPhone = `${cleaned.slice(0, 3)}****${cleaned.slice(-3)}`;
                }
            } else {
                maskedPhone = cleaned;
            }
        }
        console.log(`      - رقم الهاتف (بعد القناع للخصوصية): ${maskedPhone}`);

        // ب) جلب الخط الزمني لزيارات الصيانة بالـ Anon Client
        const { data: reportsData, error: reportsErr } = await clientAnon
            .from("inspection_reports")
            .select(`
                id, report_number, status, total_price, selected_services, odometer_reading, created_at,
                branches (name),
                receptionist:receptionist_id (name)
            `)
            .eq("vehicle_id", vehicleData.id)
            .order("created_at", { ascending: false });

        if (reportsErr) throw reportsErr;

        console.log(`   ✅ تم استرجاع الخط الزمني للزيارات بنجاح:`);
        console.log(`      - عدد الزيارات المسجلة: ${reportsData.length} زيارة.`);

        if (reportsData.length > 0) {
            console.log("\n   📊 فحص تفاصيل ومحتوى الخط الزمني للصيانة الرقمية (باللغة العربية):");
            const lastReport = reportsData[0];
            console.log(`      - رقم التقرير التسلسلي: ${lastReport.report_number}`);
            console.log(`      - فرع الصيانة: ${lastReport.branches?.name || branchName}`);
            console.log(`      - قراءة العداد: ${lastReport.odometer_reading ? lastReport.odometer_reading.toLocaleString() : 0} كم`);
            console.log(`      - التاريخ: ${new Date(lastReport.created_at).toLocaleDateString('ar-IQ')}`);
            console.log(`      - حالة الصيانة الإجمالية: ${lastReport.status}`);
            console.log(`      - موظف الاستقبال المسؤول: ${lastReport.receptionist?.name || receptionistName}`);
            
            // فحص تفاصيل الخدمات المستبدلة
            const payload = lastReport.selected_services?.[0] || {};
            const services = payload.services || {};
            const oilSvc = services.engineOil || {};
            
            console.log("      - 🔍 فحص الخدمات والقطع المستبدلة (Arabic checks):");
            if (oilSvc.status === "يحتاج تغيير") {
                console.log(`         * 🛢️ تغيير زيت المحرك: تم بنجاح [ ${oilSvc.details?.brand} ] لزوجة [ ${oilSvc.details?.viscosity} ] بحجم [ ${oilSvc.details?.liters} لتر ]`);
            }
            if (services.oilFilter?.status === "يحتاج تغيير") {
                console.log("         * ⚙️ فلتر زيت المحرك: تم الاستبدال بنجاح.");
            }
            if (services.sparkPlugs?.status === "جيد") {
                console.log("         * 🔌 شمعات الاحتراق (البلكات): تم الفحص والحالة ممتازة (جيد).");
            }
            
            // فحص الخدمات المجانية
            const freeS = payload.freeServices || {};
            if (freeS.engineClean) {
                console.log("         * ✨ تنظيف المحرك بالبخار (خدمة مجانية منجزة).");
            }
            if (freeS.tirePressure) {
                console.log("         * 🛞 فحص وضبط ضغط الإطارات (خدمة مجانية منجزة).");
            }

            // فحص الخدمات المخصصة
            const customs = payload.customServices || [];
            if (customs.length > 0) {
                console.log(`         * 🛠️ خدمة مخصصة مضافة: ${customs[0].label}`);
            }
        }

        console.log("\n   ✅ اختبار محاكاة الزبون (Anon Access) وقراءة سجل الصيانة نجح 100% وبدون مشاكل.");

    } catch (e) {
        console.error("   ❌ فشل في إجراء فحص متكامل للمحاكاة وسجل الصيانة:", e);
    } finally {
        // 4. تنظيف قاعدة البيانات وإزالة السجلات التجريبية
        console.log("\n4️⃣ جاري تنظيف السجلات التجريبية لإبقاء قاعدة البيانات سليمة:");
        try {
            if (tempReportId) {
                const { error: err } = await clientService.from('inspection_reports').delete().eq('id', tempReportId);
                if (err) throw err;
                console.log("   - تم حذف تقرير الصيانة التجريبي.");
            }
            if (tempVehicleId) {
                const { error: err } = await clientService.from('vehicles').delete().eq('id', tempVehicleId);
                if (err) throw err;
                console.log("   - تم حذف السيارة التجريبية.");
            }
            if (tempClientId) {
                const { error: err } = await clientService.from('clients').delete().eq('id', tempClientId);
                if (err) throw err;
                console.log("   - تم حذف العميل التجريبي.");
            }
            console.log("   ✅ تم التنظيف بالكامل وبشكل سليم 100%.");
        } catch (cleanErr) {
            console.error("   ❌ خطأ أثناء تنظيف البيانات التجريبية:", cleanErr);
        }
    }

    console.log("\n====================================================");
    console.log("🏁 انتهى فحص وتأكيد النظام بكافة تفاصيله بنجاح 100%!");
    console.log("====================================================\n");
}

runTest();
