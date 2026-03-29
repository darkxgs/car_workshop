import React, { forwardRef, useState } from 'react';

type ReportServiceResult = {
    id: string;
    category: string;
    status: string;
    notes: string | null;
    service_price: number | null;
};

interface PrintableInspectionReportProps {
    report: any;
    services: ReportServiceResult[];
}

export const PrintableInspectionReport = forwardRef<HTMLDivElement, PrintableInspectionReportProps>(({
    report, services
}, ref) => {

    const [calibrateMode, setCalibrateMode] = useState(false);

    const [cfg, setCfg] = useState({
        h1Top: 3.27, reportX: 89.54, dateX: 83.98,
        h2Top: 10.42, h3Top: 14,
        col1X: 6.46, col2X: 28.94, col3X: 50.69, col4X: 72.69,

        sec1Start: 22.25, sec1Gap: 2.48,
        sec2Start: 49.94, sec2Gap: 2.48,
        sec3Start: 65.46, sec3Gap: 2.48,
        sec4Start: 83.32, sec4Gap: 2.48,
        sec5Start: 13.08, sec5Gap: 2.48,
        sec6Start: 31.05, sec6Gap: 2.48,
        sec7Start: 54.03, sec7Gap: 2.48,

        checkX1: 29.49, checkX2: 35.1, checkX3: 40.5, notesX: 47.62,

        evalDamY: 150, evalDamX: 15,
        evalMainY: 68.37, evalMainX: 35.03,
        evalHealY: 75, evalHealX: 15,
        evalPercY: 78.36, evalPercX: 82.81
    });

    const updateCfg = (key: keyof typeof cfg, val: number) => {
        setCfg(prev => ({ ...prev, [key]: val }));
    };

    const activeReport = calibrateMode ? {
        report_number: '10029',
        created_at: new Date().toISOString(),
        odometer_reading: 55000,
        total_price: 1500,
        vehicles: {
            make: 'لكزس', model: 'LX570', plate_number: '1234 ا ب ج', engine_size: '5.7L',
            clients: { name: 'تجربة معايرة', phone: '0500000000' }
        },
        employees: { name: 'مهندس المعايرة' }
    } : report;

    // Draggable point renderer with 2D bounds and tooltip!
    const pt = (
        top: number, right: number, text: any, isCheck = false, isNotes = false,
        dragKeyY?: keyof typeof cfg, dragKeyX?: keyof typeof cfg, tooltipText?: string
    ) => {
        if (!text) return null;

        const handlePointerDown = (e: React.PointerEvent) => {
            if (!calibrateMode || (!dragKeyY && !dragKeyX)) return;
            e.preventDefault();

            const parent = (e.currentTarget as HTMLElement).closest('.pdf-page') as HTMLElement;
            if (!parent) return;

            const startX = e.clientX;
            const startY = e.clientY;
            const initialTop = dragKeyY ? cfg[dragKeyY] : top;
            const initialRight = dragKeyX ? cfg[dragKeyX] : right;
            const rect = parent.getBoundingClientRect();

            const onPointerMove = (moveEvent: PointerEvent) => {
                if (dragKeyY) {
                    const dy = moveEvent.clientY - startY;
                    const newTop = initialTop + (dy / rect.height * 100);
                    updateCfg(dragKeyY, parseFloat(newTop.toFixed(2)));
                }
                if (dragKeyX) {
                    const dx = moveEvent.clientX - startX;
                    const newRight = initialRight - (dx / rect.width * 100);
                    updateCfg(dragKeyX, parseFloat(newRight.toFixed(2)));
                }
            };

            const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
            };

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        };

        const draggableStyle = calibrateMode && (dragKeyY || dragKeyX)
            ? 'cursor-grab hover:ring-2 hover:ring-indigo-500 hover:bg-indigo-500/20 rounded z-50 transition-colors shadow-sm group relative inline-flex items-center justify-center'
            : '';

        const Tooltip = () => tooltipText && calibrateMode ? (
            <span className="absolute -top-10 left-1/2 rtl:translate-x-1/2 ltr:-translate-x-1/2 whitespace-nowrap bg-indigo-600 text-white text-[10.5px] font-bold py-1.5 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-indigo-400">
                {tooltipText}
            </span>
        ) : null;

        if (isCheck) {
            return (
                <div
                    onPointerDown={handlePointerDown}
                    style={{ position: 'absolute', top: `${top}%`, right: `${right}%`, fontSize: '15px', fontWeight: 'bold', color: '#111' }}
                    className={draggableStyle}
                >
                    <Tooltip />
                    ✓
                </div>
            );
        }
        return (
            <div
                onPointerDown={handlePointerDown}
                style={{
                    position: 'absolute', top: `${top}%`, right: `${right}%`,
                    width: isNotes ? '45%' : 'auto', textAlign: 'right',
                    fontSize: '11px', fontWeight: '600', color: '#111', lineHeight: '1.4'
                }}
                className={draggableStyle}
            >
                <Tooltip />
                {text}
            </div>
        );
    };

    const renderTable = (startKeyY: keyof typeof cfg, gapKeyY: keyof typeof cfg, items: string[], parentKeys: string[], sectionName: string) => {
        const parentMatch = services.find(s => parentKeys.some(k => s.category.includes(k)));
        const startY = cfg[startKeyY];
        const gapY = cfg[gapKeyY];

        return items.map((itemLabel, idx) => {
            const y = startY + (idx * gapY);
            let printStatus = '';
            let printNotes = '';

            if (calibrateMode) {
                if (idx % 3 === 0) printStatus = 'سليم';
                else if (idx % 3 === 1) printStatus = 'يحتاج صيانة';
                else printStatus = 'تالف';

                printNotes = 'ملاحظات تجريبية';
            } else {
                const exactSub = services.find(s => s.category.includes(itemLabel) || itemLabel.includes(s.category));
                printStatus = exactSub ? exactSub.status : (parentMatch ? parentMatch.status : '');
                // The user explicitly requested notes for ALL rows if available globally.
                printNotes = exactSub ? (exactSub.notes || '') : (parentMatch ? (parentMatch.notes || '') : '');
            }

            // Only the FIRST row items are draggable explicitly to adjust entire section / column layout 
            return (
                <React.Fragment key={itemLabel}>
                    {pt(y, cfg.checkX1, printStatus === 'سليم' ? '✓' : '', true, false, idx === 0 ? startKeyY : undefined, idx === 0 ? 'checkX1' : undefined, idx === 0 ? `فوق/تحت: الجدول | يسار/يمين: عمود الصح (سليم)` : undefined)}
                    {pt(y, cfg.checkX2, printStatus === 'يحتاج صيانة' || printStatus === 'يحتاج صيانه' ? '✓' : '', true, false, idx === 0 ? startKeyY : undefined, idx === 0 ? 'checkX2' : undefined, idx === 0 ? `فوق/تحت: الجدول | يسار/يمين: عمود الصح (صيانة)` : undefined)}
                    {pt(y, cfg.checkX3, printStatus === 'تالف' ? '✓' : '', true, false, idx === 0 ? startKeyY : undefined, idx === 0 ? 'checkX3' : undefined, idx === 0 ? `فوق/تحت: الجدول | يسار/يمين: عمود الصح (تالف)` : undefined)}

                    {/* Notes item controls Y offset and X offset for entire section and notes column */}
                    {pt(y, cfg.notesX, printNotes, false, true, idx === 0 ? startKeyY : undefined, idx === 0 ? 'notesX' : undefined, idx === 0 ? `أعلى/اسفل: بداية جدول ${sectionName} | يسار/يمين: عمود الملاحظات` : undefined)}
                </React.Fragment>
            );
        });
    };

    // Calculate final score
    const calculateScore = () => {
        if (!services || services.length === 0) return { percent: 100, status: 'سليم' };

        let healthyCount = 0;
        let totalItems = 0;

        services.forEach(s => {
            if (['سليم', 'جيد', 'ممتاز', 'يحتاج صيانة', 'يحتاج صيانه', 'تالف'].includes(s.status)) {
                totalItems++;
                if (['سليم', 'جيد', 'ممتاز'].includes(s.status)) healthyCount++;
            }
        });

        if (totalItems === 0) return { percent: 100, status: 'سليم' };

        const percent = Math.round((healthyCount / totalItems) * 100);
        let status = 'سليم';
        if (percent < 50) status = 'تالف';
        else if (percent < 90) status = 'يحتاج صيانة';

        return { percent, status };
    };

    const finalResult = calculateScore();
    const evaluatedStatus = calibrateMode ? 'يحتاج صيانة' : finalResult.status;
    const evaluatedPercent = calibrateMode ? 85 : finalResult.percent;

    return (
        <div className="relative">
            {/* Calibration Control Panel */}
            <div className="print:hidden bg-slate-900 text-white p-5 mb-4 rounded-xl shadow-xl sticky top-4 z-50 border border-slate-700 w-full" dir="rtl">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-indigo-400">نمط السحب الدقيق 2D الحُر</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            يمكنك الآن سحب <strong className="text-white">أيييي عنصر</strong> يمين/يسار وأعلى/أسفل في نفس الوقت بحرية تامة!
                        </p>
                    </div>
                    <button
                        onClick={() => setCalibrateMode(!calibrateMode)}
                        className={`px-5 py-2.5 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] ${calibrateMode ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {calibrateMode ? 'حفظ وإيقاف السحب والإفلات' : 'تفعيل نمط السحب والإفلات 2D'}
                    </button>
                </div>

                {calibrateMode && (
                    <div className="mt-4 p-4 bg-black/50 border border-emerald-500/30 rounded-lg" dir="ltr">
                        <p className="text-emerald-400 text-sm mb-2 font-bold flex items-center gap-2">
                            <span>✅</span> When perfect, copy this JSON and send it in chat:
                        </p>
                        <code className="text-[11px] text-green-300 font-mono select-all break-words max-w-full block whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(cfg)}
                        </code>
                    </div>
                )}
            </div>

            <div ref={ref} className="w-[210mm] mx-auto text-black" dir="rtl">
                {/* Page 1 */}
                <div className="pdf-page w-[210mm] h-[297mm] relative overflow-hidden bg-[url('/page1.png')] bg-[length:100%_100%] print:break-after-page mb-8 print:mb-0 shadow-lg print:shadow-none bg-white font-sans">

                    {/* Header Information Map */}
                    {pt(cfg.h1Top, cfg.reportX, activeReport?.report_number, false, false, 'h1Top', 'reportX', 'رقم التقرير (أفقي وعمودي)')}
                    {pt(cfg.h1Top + 1.7, cfg.dateX, activeReport?.created_at ? new Date(activeReport.created_at).toLocaleDateString('ar-SA') : '', false, false, 'h1Top', 'dateX', 'تاريخ التقرير (أفقي، وعمودي السطر الأول)')}

                    {/* Header Row 1 - Move vertically together, AND horizontally independent! */}
                    {pt(cfg.h2Top, cfg.col1X, activeReport?.vehicles?.make, false, false, 'h2Top', 'col1X', 'نوع المركبة (السحب يتحكم بعامود 1 وفوق/تحت للسطر كله)')}
                    {pt(cfg.h2Top, cfg.col2X, activeReport?.vehicles?.model, false, false, 'h2Top', 'col2X', 'الموديل (يتحكم بعامود 2 وفوق/تحت للسطر)')}
                    {pt(cfg.h2Top, cfg.col3X, activeReport?.vehicles?.plate_number, false, false, 'h2Top', 'col3X', 'رقم اللوحة (يتحكم بعامود 3 وفوق/تحت للسطر)')}
                    {pt(cfg.h2Top, cfg.col4X, activeReport?.odometer_reading ? `${activeReport.odometer_reading} KM` : '', false, false, 'h2Top', 'col4X', 'العداد (يتحكم بعامود 4 وفوق/تحت للسطر)')}

                    {/* Header Row 2 */}
                    {pt(cfg.h3Top, cfg.col1X, activeReport?.vehicles?.clients?.name, false, false, 'h3Top', 'col1X', 'اسم الزبون (يتحكم بعامود 1 وفوق/تحت للسطر الثاني)')}
                    {pt(cfg.h3Top, cfg.col2X, activeReport?.vehicles?.clients?.phone, false, false, 'h3Top', 'col2X', '(يتحكم بعامود 2 وفوق/تحت)')}
                    {pt(cfg.h3Top, cfg.col3X, activeReport?.vehicles?.engine_size || '-', false, false, 'h3Top', 'col3X', '(يتحكم بعامود 3)')}
                    {pt(cfg.h3Top, cfg.col4X, activeReport?.employees?.name || 'فني الصيانة', false, false, 'h3Top', 'col4X', '(يتحكم بعامود 4)')}

                    {/* Section 1: Engine Exact Spelling */}
                    {renderTable('sec1Start', 'sec1Gap', [
                        'البلكات (شمعات الاشتعال)', 'نوذلات', 'حساسات', 'قايش', 'بكرات',
                        'تسريب زيت (نضوج)', 'الفيول بم', 'دهن المحرك', 'التوربو'
                    ], ['محرك', 'Engine'], 'المحرك')}

                    {/* Section 2: Transmission */}
                    {renderTable('sec2Start', 'sec2Gap', [
                        'فحص كهربائي بالجهاز', 'فحص او تغيير زيت الكير', 'تسريب الكير', 'فلتر الكير'
                    ], ['ناقل', 'جير', 'قير', 'كير'], 'الكير')}

                    {/* Section 3: Brakes */}
                    {renderTable('sec3Start', 'sec3Gap', [
                        'فحص فلنجات امامي', 'فحص فلنجات خلفي', 'فحص دسكات امامي', 'فحص دسكات خلفي', 'فحص دهن البريك'
                    ], ['فرامل', 'بريك'], 'البريك')}

                    {/* Section 4: Suspension */}
                    {renderTable('sec4Start', 'sec4Gap', [
                        'هزة امامي', 'هزة خلفي', 'فحص الاجزاء المتحركة', 'ميزانية الكترونية'
                    ], ['حدادية', 'عفشة', 'مقصات', 'سسبنشن'], 'الحدادية')}
                </div>

                {/* Page 2 */}
                <div className="pdf-page w-[210mm] h-[297mm] relative overflow-hidden bg-[url('/page2.png')] bg-[length:100%_100%] print:break-after-page shadow-lg print:shadow-none bg-white mt-4 font-sans">

                    {/* Section 5: Filters */}
                    {renderTable('sec5Start', 'sec5Gap', [
                        'فلتر هواء', 'فلتر تبريد', 'فلتر بانزين', 'فلتر زيت', 'فلتر بطارية'
                    ], ['فلتر', 'فلاتر'], 'الفلاتر')}

                    {/* Section 6: Cooling */}
                    {renderTable('sec6Start', 'sec6Gap', [
                        'الراديتور', 'ضغط الجوينات', 'الدببة', 'قبق الراديتور', 'ماء الراديتور', 'التسريب', 'فحص الفان كهربائياً'
                    ], ['تبريد', 'راديتور'], 'التبريد')}

                    {/* Section 7 & 8: Tires & Electricity */}
                    {renderTable('sec7Start', 'sec7Gap', [
                        'الاطارات الامامية', 'الاطارات الخلفية', 'ضغط الاطارات', 'عمر البطارية', 'الداينمو', 'الدنارة الامامية', 'الدنارة الخلفية'
                    ], ['كهرباء', 'بطارية', 'إطارات', 'انارة'], 'الاطارات')}

                    {/* Final Evaluaton Block (Bottom Left) -- Mathematical % and Checkbox */}
                    {pt(cfg.evalDamY, cfg.evalDamX, evaluatedStatus === 'تالف' ? '✓' : '', true, false, 'evalDamY', 'evalDamX', 'صح التالف')}
                    {pt(cfg.evalMainY, cfg.evalMainX, evaluatedStatus === 'يحتاج صيانة' || evaluatedStatus === 'يحتاج صيانه' ? '✓' : '', true, false, 'evalMainY', 'evalMainX', 'صح الصيانة')}
                    {pt(cfg.evalHealY, cfg.evalHealX, evaluatedStatus === 'سليم' ? '✓' : '', true, false, 'evalHealY', 'evalHealX', 'صح السليم')}

                    {pt(cfg.evalPercY, cfg.evalPercX, `${evaluatedPercent}%`, false, true, 'evalPercY', 'evalPercX', 'نسبة التقييم')}
                </div>
            </div>
        </div>
    );
});

PrintableInspectionReport.displayName = 'PrintableInspectionReport';
