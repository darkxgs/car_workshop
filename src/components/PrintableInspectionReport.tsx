import React, { forwardRef } from 'react';

interface PrintableInspectionReportProps {
    report: any;
}

export const PrintableInspectionReport = forwardRef<HTMLDivElement, PrintableInspectionReportProps>(({
    report
}, ref) => {

    const isPaperV2 = report?.selected_services?.[0]?.is_paper_v2_format === true;
    const data = isPaperV2 ? report.selected_services[0] : null;

    // Checkbox Helper
    const Check = ({ checked }: { checked?: boolean }) => (
        <span style={{
            display: 'inline-block',
            width: '18px',
            height: '18px',
            border: '2px solid black',
            marginRight: '5px',
            marginLeft: '5px',
            position: 'relative',
            top: '3px',
            textAlign: 'center',
            lineHeight: '18px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '14px',
        }}>
            {checked ? '✓' : ''}
        </span>
    );

    // Dotted line input helper
    const Dotted = ({ val, width = '80px' }: { val?: string | number, width?: string }) => (
        <span style={{
            display: 'inline-block',
            borderBottom: '1px dotted black',
            minWidth: width,
            margin: '0 5px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '13px'
        }}>
            {val ?? ''}
        </span>
    );

    // If it's the old format, show a fallback
    if (!isPaperV2) {
        return (
            <div ref={ref} dir="rtl" style={{ padding: '20px', fontFamily: 'Arial' }}>
                <h2>عذراً، هذا الطلب تم حفظه بالتنسيق القديم ولا يدعم النموذج المطبوع الجديد.</h2>
            </div>
        );
    }

    const s = data?.services || {};
    const fs = data?.freeServices || {};
    const p = data?.pricing || {};
    const v = Array.isArray(report?.vehicles) ? (report.vehicles[0] || {}) : (report?.vehicles || {});
    const client = Array.isArray(v?.clients) ? (v.clients[0] || {}) : (v?.clients || {});
    const openTimeValue = report?.start_time || report?.created_at;
    const closeTimeValue = report?.completed_at;
    const openTime = openTimeValue ? new Date(openTimeValue).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
    const closeTime = closeTimeValue ? new Date(closeTimeValue).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

    return (
        <div className="relative print-page-wrapper">
            <style type="text/css" media="print">
                {`
                    @page {
                        size: A4 portrait;
                        margin: 0 !important;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: white;
                    }
                    * {
                        font-family: Arial, sans-serif;
                    }
                    .print-page-wrapper {
                        width: 210mm;
                        height: 297mm;
                        overflow: hidden;
                        margin: 0 auto;
                    }
                    .print-page-content {
                        width: 100%;
                        transform-origin: top center;
                        transform: scale(0.9);
                        line-height: 1.15;
                    }
                `}
            </style>

            <div ref={ref} className="mx-auto text-black bg-white print-page-content" dir="rtl" style={{ maxWidth: '800px', padding: '8mm 8mm', boxSizing: 'border-box', fontSize: '13px' }}>

                {/* 1. Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ display: 'inline-block', backgroundColor: '#333', color: 'white', padding: '8px 20px', fontSize: '24px', fontWeight: 'bold' }}>
                            هندسة <span style={{ color: '#ff4d4d' }}>السيارات</span>
                        </div>
                    </div>
                </div>

                {/* 2. Top Info Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                    <div>
                        <div style={{ marginBottom: '10px' }}>
                            التاريخ <span style={{ fontSize: '16px', borderBottom: '1px solid black', padding: '0 10px' }}>
                                {new Date().toLocaleDateString('en-GB')}
                            </span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            رقم الطلب : <Dotted val={report.report_number?.toString()} width="100px" />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            موظف الاستقبال : <Dotted val={report.receptionist?.name} width="150px" />
                        </div>
                        <div>
                            اسم الفني : <Dotted width="200px" />
                        </div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '25px' }}>
                            وقت فتح الطلب: <Dotted val={openTime} width="120px" />
                        </div>
                        <div>
                            وقت الانتهاء: <Dotted val={closeTime} width="120px" />
                        </div>
                    </div>
                </div>

                <hr style={{ borderTop: '2px dashed black', margin: '15px 0' }} />

                {/* 3. Client & Vehicle Details */}
                <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>
                    <div style={{ marginBottom: '15px', fontSize: '15px' }}>بيانات العميل :</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '20px' }}>
                        <div>اسم العميل : <Dotted val={client.name} width="300px" /></div>
                        <div>رقم العميل : <Dotted val={client.phone} width="300px" /></div>
                        <div>نوع السيارة : <Dotted val={v.make} width="250px" /></div>
                        <div>موديل السيارة : <Dotted val={v.model} width="250px" /></div>
                        <div>حجم المحرك : <Dotted val={v.engine_size} width="250px" /></div>
                        <div>عداد الكيلومتر : <Dotted val={report.odometer_reading?.toString()} width="200px" /></div>
                    </div>
                </div>

                <hr style={{ borderTop: '1px solid #ccc', margin: '15px 0' }} />

                {/* 4. Free Services */}
                <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>
                    <div style={{ marginBottom: '10px' }}>خدمات الفحص المجاني :</div>
                    <div style={{ display: 'flex', gap: '40px', paddingRight: '20px' }}>
                        <div>ماء المساحات: <Check checked={fs.windshieldWater} /></div>
                        <div>ضغط الإطارات: <Check checked={fs.tirePressure} /></div>
                        <div>تنظيف محرك بالبخار: <Check checked={fs.engineClean} /></div>
                    </div>
                </div>

                {/* 5. Main Services Bordered Box */}
                <div style={{ border: '2px solid black', padding: '10px', backgroundColor: '#fafafa' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '15px', fontSize: '15px' }}>
                        خدمات العميل :- من 1-14 فحص دوري مع كل زيارة
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '13px', fontWeight: 'bold' }}>

                        {/* 1 */}
                        <div style={{ lineHeight: 1.4 }}>
                            1- زيت المحرك: &nbsp;&nbsp;جيد <Check checked={s.engineOil?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.engineOil?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع الزيت: <Dotted val={s.engineOil?.details?.brand} /> &nbsp;&nbsp;
                            درجة اللزوجة: <Dotted val={s.engineOil?.details?.viscosity} width="60px" /> &nbsp;&nbsp;
                            عدد اللترات: <Dotted val={s.engineOil?.details?.liters} width="60px" /> &nbsp;&nbsp;
                            سعر اللتر: <Dotted val={s.engineOil?.details?.unitPrice} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.engineOil?.price} width="60px" />
                        </div>

                        {/* 2 */}
                        <div style={{ lineHeight: 1.4 }}>
                            2- فلتر زيت المحرك: &nbsp;&nbsp;جيد <Check checked={s.oilFilter?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.oilFilter?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع الفلتر: <Dotted val={s.oilFilter?.details?.type} /> &nbsp;&nbsp;
                            رقم الفلتر: <Dotted val={s.oilFilter?.details?.filterNum} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.oilFilter?.price} width="60px" />
                        </div>

                        {/* 3 */}
                        <div style={{ lineHeight: 1.4 }}>
                            3- فلتر الهواء: &nbsp;&nbsp;جيد <Check checked={s.airFilter?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.airFilter?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع الفلتر: <Dotted val={s.airFilter?.details?.type} /> &nbsp;&nbsp;
                            رقم الفلتر: <Dotted val={s.airFilter?.details?.filterNum} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.airFilter?.price} width="60px" />
                        </div>

                        {/* 4 */}
                        <div style={{ lineHeight: 1.4 }}>
                            4- فلتر التكييف: &nbsp;&nbsp;جيد <Check checked={s.acFilter?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.acFilter?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع الفلتر: <Dotted val={s.acFilter?.details?.type} /> &nbsp;&nbsp;
                            رقم الفلتر: <Dotted val={s.acFilter?.details?.filterNum} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.acFilter?.price} width="60px" />
                        </div>

                        {/* 5 */}
                        <div style={{ lineHeight: 1.4 }}>
                            5- زيت الفتيس: &nbsp;&nbsp;جيد <Check checked={s.transOil?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.transOil?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع الزيت: <Dotted val={s.transOil?.details?.type} /> &nbsp;&nbsp;
                            عدد اللترات: <Dotted val={s.transOil?.details?.qty} width="60px" /> &nbsp;&nbsp;
                            سعر اللتر: <Dotted val={s.transOil?.details?.unitPrice} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.transOil?.price} width="60px" />
                        </div>

                        {/* 6 */}
                        <div style={{ lineHeight: 1.4 }}>
                            6- ماء الراديتر: &nbsp;&nbsp;جيد <Check checked={s.coolant?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.coolant?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع الماء: <Dotted val={s.coolant?.details?.type} /> &nbsp;&nbsp;
                            الكمية: <Dotted val={s.coolant?.details?.qty} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.coolant?.price} width="60px" />
                        </div>

                        {/* 7 */}
                        <div style={{ lineHeight: 1.4 }}>
                            7- البطارية: &nbsp;&nbsp;جيد <Check checked={s.battery?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.battery?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع البطارية والمقاس: <Dotted val={s.battery?.details?.type} width="120px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.battery?.price} width="60px" />
                        </div>

                        {/* 8 */}
                        <div style={{ lineHeight: 1.4 }}>
                            8- زيت الفرامل: &nbsp;&nbsp;جيد <Check checked={s.brakeFluid?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.brakeFluid?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.brakeFluid?.price} width="60px" />
                        </div>

                        {/* 9 */}
                        <div style={{ lineHeight: 1.4 }}>
                            9- تيل الفرامل: &nbsp;&nbsp;جيد <Check checked={s.brakeCable?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.brakeCable?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.brakeCable?.price} width="60px" />
                        </div>

                        {/* 10 */}
                        <div style={{ lineHeight: 1.4 }}>
                            10- شمعات الاحتراق: &nbsp;&nbsp;جيد <Check checked={s.sparkPlugs?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.sparkPlugs?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع الشمعات: <Dotted val={s.sparkPlugs?.details?.type} /> &nbsp;&nbsp;
                            العدد: <Dotted val={s.sparkPlugs?.details?.num} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.sparkPlugs?.price} width="60px" />
                        </div>

                        {/* 11 */}
                        <div style={{ lineHeight: 1.4 }}>
                            11- سيور المحرك: &nbsp;&nbsp;جيد <Check checked={s.engineBelts?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.engineBelts?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع السيور: <Dotted val={s.engineBelts?.details?.type} /> &nbsp;&nbsp;
                            العدد: <Dotted val={s.engineBelts?.details?.num} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.engineBelts?.price} width="60px" />
                        </div>

                        {/* 12 */}
                        <div style={{ lineHeight: 1.4 }}>
                            12- المساعدين: &nbsp;&nbsp;جيد <Check checked={s.shockAbsorbers?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.shockAbsorbers?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            نوع المساعدين: <Dotted val={s.shockAbsorbers?.details?.type} /> &nbsp;&nbsp;
                            العدد: <Dotted val={s.shockAbsorbers?.details?.num} width="60px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.shockAbsorbers?.price} width="60px" />
                        </div>

                        {/* 13 */}
                        <div style={{ lineHeight: 1.4 }}>
                            13- الهيدروليك والمصمات: &nbsp;&nbsp;جيد <Check checked={s.hydraulics?.status === 'جيد'} /> &nbsp; يحتاج تبديل <Check checked={s.hydraulics?.status === 'يحتاج تغيير'} /> &nbsp;&nbsp;
                            النوع والمقاس: <Dotted val={s.hydraulics?.details?.type} width="180px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.hydraulics?.price} width="60px" />
                        </div>

                        {/* 14 */}
                        <div style={{ lineHeight: 1.4 }}>
                            14- ملاحظة الصيانة: <Dotted val={s.workshopNotes?.details?.notes} width="300px" /> &nbsp;&nbsp;
                            السعر: <Dotted val={s.workshopNotes?.price} width="60px" />
                        </div>

                    </div>
                </div>

                {/* 6. Footer Totals & Signatures */}
                <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                        <div>المجموع الكلي: <Dotted val={p.totalPrice} width="80px" /></div>
                        <div>الواصل: <Dotted val={p.amountReceived} width="80px" /></div>
                        <div>مدين لنا: <Dotted val={p.amountOwedByClient} width="80px" /></div>
                        <div>دائن علينا: <Dotted val={p.amountOwedToClient} width="80px" /></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
                        <div style={{ textAlign: 'center' }}>
                            توقيع الزبون: <br /><br /><Dotted width="120px" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            توقيع موظف الاستقبال: <br /><br /><Dotted width="120px" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            توقيع مشرف الصيانة: <br /><br /><Dotted width="120px" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            توقيع الكاشير: <br /><br /><Dotted width="120px" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
});

PrintableInspectionReport.displayName = 'PrintableInspectionReport';
