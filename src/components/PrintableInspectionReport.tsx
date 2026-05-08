import React, { forwardRef } from 'react';

interface PrintableInspectionReportProps {
    report: any;
}

export const PrintableInspectionReport = forwardRef<HTMLDivElement, PrintableInspectionReportProps>(({ report }, ref) => {

    const isPaperV2 = report?.selected_services?.[0]?.is_paper_v2_format === true;
    const data      = isPaperV2 ? report.selected_services[0] : null;

    if (!isPaperV2) {
        return (
            <div ref={ref} dir="rtl" style={{ padding: '20px', fontFamily: 'Arial' }}>
                <h2>عذراً، هذا الطلب تم حفظه بالتنسيق القديم ولا يدعم النموذج المطبوع الجديد.</h2>
            </div>
        );
    }

    const s       = data?.services     || {};
    const fs      = data?.freeServices || {};
    const p       = data?.pricing      || {};
    const customs = data?.customServices || [];
    const booklet = data?.booklet      || {};

    const v      = Array.isArray(report?.vehicles) ? (report.vehicles[0] || {}) : (report?.vehicles || {});
    const client = Array.isArray(v?.clients)       ? (v.clients[0]       || {}) : (v?.clients       || {});

    const openTime  = report?.start_time    ? new Date(report.start_time).toLocaleTimeString('ar-IQ',  { hour: '2-digit', minute: '2-digit' }) : '___________';
    const closeTime = report?.completed_at  ? new Date(report.completed_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : '___________';
    const dateStr   = report?.created_at    ? new Date(report.created_at).toLocaleDateString('ar-IQ') : new Date().toLocaleDateString('ar-IQ');

    /* ── Reusable helpers ── */
    const Val = ({ v: val, w = 80 }: { v?: string | number; w?: number }) => (
        <span style={{
            display: 'inline-block',
            borderBottom: '1.5px solid #1a1a2e',
            minWidth: `${w}px`,
            padding: '0 4px',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '12px',
            color: val ? '#1a1a2e' : '#888',
        }}>
            {val ?? ''}
        </span>
    );

    const Tick = ({ ok }: { ok?: boolean }) => (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            border: '1.5px solid',
            borderColor: ok ? '#16a34a' : '#9ca3af',
            borderRadius: '3px',
            backgroundColor: ok ? '#dcfce7' : 'transparent',
            color: '#16a34a',
            fontWeight: 900,
            fontSize: '11px',
            marginRight: '2px',
        }}>
            {ok ? '✓' : ''}
        </span>
    );

    const StatusBadge = ({ status }: { status?: string }) => {
        const isGood   = status === 'جيد';
        const isChange = status === 'يحتاج تغيير';
        return (
            <span style={{ display: 'inline-flex', gap: '10px' }}>
                <span style={{
                    padding: '1px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    backgroundColor: isGood ? '#dcfce7' : '#f3f4f6',
                    color: isGood ? '#15803d' : '#6b7280',
                    border: `1px solid ${isGood ? '#86efac' : '#d1d5db'}`,
                }}>
                    <Tick ok={isGood} /> جيد
                </span>
                <span style={{
                    padding: '1px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    backgroundColor: isChange ? '#fee2e2' : '#f3f4f6',
                    color: isChange ? '#dc2626' : '#6b7280',
                    border: `1px solid ${isChange ? '#fca5a5' : '#d1d5db'}`,
                }}>
                    <Tick ok={isChange} /> يحتاج تغيير
                </span>
            </span>
        );
    };

    const SvcRow = ({
        num, label, svcKey, fields,
    }: {
        num: number;
        label: string;
        svcKey: string;
        fields?: { key: string; label: string }[];
    }) => {
        const svc = (s as any)[svcKey] || {};
        return (
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, fontSize: '12px', color: '#6b7280', width: '22px', verticalAlign: 'top', paddingTop: '7px' }}>{num}</td>
                <td style={{ padding: '5px 8px', fontWeight: 700, fontSize: '12px', width: '115px', verticalAlign: 'top', paddingTop: '7px', whiteSpace: 'nowrap' }}>{label}</td>
                <td style={{ padding: '5px 8px', verticalAlign: 'top', paddingTop: '7px' }}>
                    <StatusBadge status={svc.status} />
                </td>
                <td style={{ padding: '5px 8px', verticalAlign: 'top' }}>
                    {fields && fields.length > 0 && (
                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                            {fields.map(f => (
                                <span key={f.key} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                                    {f.label}: <Val v={svc.details?.[f.key]} w={55} />
                                </span>
                            ))}
                        </span>
                    )}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, fontSize: '12px', width: '65px', verticalAlign: 'top', paddingTop: '7px', whiteSpace: 'nowrap' }}>
                    <Val v={svc.price} w={55} />
                </td>
            </tr>
        );
    };

    const SERVICES = [
        { key: 'engineOil',        label: 'زيت المحرك',          fields: [{ key: 'brand', label: 'نوع الزيت' }, { key: 'viscosity', label: 'اللزوجة' }, { key: 'liters', label: 'اللترات' }, { key: 'unitPrice', label: 'س/لتر' }] },
        { key: 'oilFilter',        label: 'فلتر زيت المحرك',     fields: [{ key: 'type', label: 'النوع' }, { key: 'filterNum', label: 'الرقم' }] },
        { key: 'airFilter',        label: 'فلتر الهواء',          fields: [{ key: 'type', label: 'النوع' }, { key: 'filterNum', label: 'الرقم' }] },
        { key: 'acFilter',         label: 'فلتر التبريد',         fields: [{ key: 'type', label: 'النوع' }, { key: 'filterNum', label: 'الرقم' }] },
        { key: 'brakeFluid',       label: 'زيت المكابح',          fields: [{ key: 'type', label: 'النوع' }, { key: 'qty', label: 'العدد' }] },
        { key: 'coolant',          label: 'ماء الراديتر',         fields: [{ key: 'type', label: 'النوع' }, { key: 'qty', label: 'العدد' }, { key: 'size', label: 'الحجم' }] },
        { key: 'battery',          label: 'البطارية',              fields: [{ key: 'type', label: 'النوع والسعة' }] },
        { key: 'engineBelts',      label: 'قايش المحرك',          fields: [{ key: 'type', label: 'النوع' }, { key: 'num', label: 'الرقم' }] },
        { key: 'brakePads',        label: 'دسكات السيارة',         fields: [{ key: 'type', label: 'النوع' }, { key: 'num', label: 'الرقم' }] },
        { key: 'sparkPlugs',       label: 'شمعات الاحتراق',       fields: [{ key: 'type', label: 'النوع' }, { key: 'num', label: 'الرقم' }] },
        { key: 'gearboxHydraulic', label: 'هايدروليك الكير',      fields: [{ key: 'type', label: 'النوع' }, { key: 'qty', label: 'اللترات' }] },
        { key: 'wipers',           label: 'الماسحات',              fields: [{ key: 'type', label: 'النوع' }] },
        { key: 'additives',        label: 'المضافات والمحسنات',   fields: [{ key: 'notes', label: 'المنتج' }] },
        { key: 'maintenanceUnits', label: 'حدات الصيانة',         fields: [{ key: 'notes', label: 'الوصف' }] },
    ];

    return (
        <div className="relative print-page-wrapper">
            <style type="text/css" media="print">{`
                @page { size: A4 portrait; margin: 0 !important; }
                body  { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                * { font-family: 'Segoe UI', Arial, sans-serif; }
                .print-page-wrapper { width: 210mm; min-height: 297mm; overflow: hidden; margin: 0 auto; }
                .print-page-content { width: 100%; transform-origin: top center; transform: scale(0.92); line-height: 1.3; }
            `}</style>

            <div ref={ref} dir="rtl" className="print-page-content"
                style={{ maxWidth: '800px', margin: '0 auto', padding: '6mm 8mm', boxSizing: 'border-box', fontSize: '12px', color: '#1a1a2e', backgroundColor: '#fff' }}>

                {/* ══ HEADER ══ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>رقم الطلب</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', letterSpacing: '-0.5px' }}>
                            #{report.report_number ?? '—'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#2d2d5e 100%)', color: 'white', padding: '8px 24px', borderRadius: '10px', display: 'inline-block' }}>
                            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1px' }}>
                                هندسة <span style={{ color: '#f87171' }}>السيارات</span>
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>Car Engineering Center</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>التاريخ</div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{dateStr}</div>
                    </div>
                </div>

                {/* ══ META STRIP ══ */}
                <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '7px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px', flexWrap: 'wrap', gap: '4px' }}>
                    <span>وقت الفتح: <strong>{openTime}</strong></span>
                    <span>وقت الانتهاء: <strong>{closeTime}</strong></span>
                    <span>موظف الاستقبال: <strong>{report.receptionist?.name || '___________'}</strong></span>
                    <span>اسم الفني: <strong>___________</strong></span>
                </div>

                {/* ══ BOOKLET ══ */}
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '6px 14px', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#92400e' }}>دفتر الخدمة :</strong>
                    {['جديد', 'قديم', 'لا يوجد'].map(opt => (
                        <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                                width: '14px', height: '14px', border: '1.5px solid #92400e', borderRadius: '3px', display: 'inline-flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900,
                                backgroundColor: booklet.type === opt ? '#fef08a' : 'transparent',
                            }}>
                                {booklet.type === opt ? '✓' : ''}
                            </span>
                            دفتر {opt}
                        </span>
                    ))}
                    {booklet.type && booklet.type !== 'لا يوجد' && booklet.changes && (
                        <span style={{ marginRight: '10px' }}>عدد التبديلات: <strong style={{ color: '#92400e' }}>{booklet.changes}</strong></span>
                    )}
                </div>

                {/* ══ CLIENT + VEHICLE ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                        <div style={{ fontWeight: 800, fontSize: '11px', color: '#dc2626', borderBottom: '1px solid #fca5a5', paddingBottom: '4px', marginBottom: '6px' }}>
                            👤 بيانات العميل
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                            <div>الاسم: <Val v={client.name} w={130} /></div>
                            <div>رقم الهاتف: <Val v={client.phone} w={115} /></div>
                        </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                        <div style={{ fontWeight: 800, fontSize: '11px', color: '#dc2626', borderBottom: '1px solid #fca5a5', paddingBottom: '4px', marginBottom: '6px' }}>
                            🚗 بيانات السيارة
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                            <div>النوع: <Val v={v.make} w={60} /></div>
                            <div>الموديل: <Val v={v.model} w={60} /></div>
                            <div>المحرك: <Val v={v.engine_size} w={50} /></div>
                            <div>الكيلومتر: <Val v={report.odometer_reading} w={50} /></div>
                        </div>
                    </div>
                </div>

                {/* ══ FREE SERVICES ══ */}
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '6px 14px', display: 'flex', gap: '24px', marginBottom: '10px', fontSize: '11px', alignItems: 'center' }}>
                    <strong style={{ color: '#166534', whiteSpace: 'nowrap' }}>✅ خدمات مجانية:</strong>
                    {[{ key: 'windshieldWater', label: 'ماء المساحات' }, { key: 'tirePressure', label: 'ضغط الإطارات' }, { key: 'engineClean', label: 'تنظيف المحرك بالبخار' }].map(f => (
                        <span key={f.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: (fs as any)[f.key] ? '#15803d' : '#9ca3af' }}>
                            <Tick ok={(fs as any)[f.key]} /> {f.label}
                        </span>
                    ))}
                </div>

                {/* ══ MAIN SERVICES TABLE ══ */}
                <div style={{ border: '1.5px solid #1a1a2e', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ background: 'linear-gradient(90deg,#1a1a2e,#2d2d5e)', color: 'white', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '12px' }}>خدمات العميل — الفحص الدوري مع كل زيارة</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>14 خدمة أساسية</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
                                <th style={{ padding: '4px 6px', width: '22px' }}>#</th>
                                <th style={{ padding: '4px 8px', textAlign: 'right' }}>الخدمة</th>
                                <th style={{ padding: '4px 8px', textAlign: 'right' }}>الحالة</th>
                                <th style={{ padding: '4px 8px', textAlign: 'right' }}>التفاصيل</th>
                                <th style={{ padding: '4px 8px', width: '65px', textAlign: 'center' }}>السعر (د.ع)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SERVICES.map((svc, i) => (
                                <SvcRow key={svc.key} num={i + 1} label={svc.label} svcKey={svc.key} fields={svc.fields} />
                            ))}
                            {/* Custom extra services */}
                            {customs.filter((c: any) => c.label).map((c: any, i: number) => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb', background: '#fffbeb' }}>
                                    <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, fontSize: '12px', color: '#92400e' }}>{SERVICES.length + i + 1}</td>
                                    <td style={{ padding: '5px 8px', fontWeight: 700, fontSize: '12px', color: '#92400e' }}>{c.label}</td>
                                    <td style={{ padding: '5px 8px' }}><StatusBadge status={c.status} /></td>
                                    <td style={{ padding: '5px 8px', fontSize: '11px', color: '#6b7280' }}>خدمة إضافية</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}>
                                        <Val v={c.price} w={55} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ══ TOTALS ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '12px' }}>
                    {[
                        { label: 'المجموع الكلي', val: p.totalPrice,          color: '#1a1a2e' },
                        { label: 'المبلغ الواصل', val: p.amountReceived,       color: '#15803d' },
                        { label: 'مدين لنا',       val: p.amountOwedByClient,  color: '#dc2626' },
                        { label: 'دائن علينا',     val: p.amountOwedToClient,  color: '#2563eb' },
                    ].map(item => (
                        <div key={item.label} style={{ border: `1.5px solid ${item.color}22`, borderRadius: '8px', padding: '6px 10px', textAlign: 'center', background: `${item.color}08` }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>{item.label}</div>
                            <div style={{ fontWeight: 900, fontSize: '14px', color: item.color }}>
                                {item.val || '—'}
                            </div>
                            {item.val && <div style={{ fontSize: '9px', color: '#9ca3af' }}>د.ع</div>}
                        </div>
                    ))}
                </div>

                {/* ══ NOTES ══ */}
                {report.notes && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', marginBottom: '10px', fontSize: '11px' }}>
                        <strong>ملاحظات:</strong> {report.notes}
                    </div>
                )}

                {/* ══ SIGNATURES ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginTop: '10px' }}>
                    {['توقيع الزبون', 'موظف الاستقبال', 'مشرف الصيانة', 'الكاشير'].map(sig => (
                        <div key={sig} style={{ textAlign: 'center', borderTop: '1px dashed #9ca3af', paddingTop: '8px' }}>
                            <div style={{ height: '28px' }} />
                            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>{sig}</div>
                        </div>
                    ))}
                </div>

                {/* ══ FOOTER ══ */}
                <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#9ca3af' }}>
                    <span>Car Engineering Center — نظام إدارة الورشة</span>
                    <span>طُبع بتاريخ: {new Date().toLocaleDateString('ar-IQ')} {new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        </div>
    );
});

PrintableInspectionReport.displayName = 'PrintableInspectionReport';
