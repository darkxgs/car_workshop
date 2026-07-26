import React, { forwardRef } from "react";
import { INSPECTION_SECTIONS, ComprehensiveInspection, InspectionStatus } from "@/lib/comprehensiveInspection";

// Printed "تقرير الفحص الفني" — mirrors تقرير فحص المركبة التفصيلي.pdf.
// Reads report.selected_services[0].comprehensiveInspection for the marked
// statuses/notes; blank rows render as empty checkboxes (a printable template).

const RED = "#9b1c1c";

export const ComprehensiveInspectionReport = forwardRef<HTMLDivElement, { report: any }>(({ report }, ref) => {
    const payload = Array.isArray(report?.selected_services) ? report.selected_services[0] : report?.selected_services;
    const insp: ComprehensiveInspection | undefined = payload?.comprehensiveInspection;
    const v = Array.isArray(report?.vehicles) ? (report.vehicles[0] || {}) : (report?.vehicles || {});
    const client = Array.isArray(v?.clients) ? (v.clients[0] || {}) : (v?.clients || {});
    const dateStr = report?.created_at ? new Date(report.created_at).toLocaleDateString("en-GB") : "";
    const tech = payload?.technicianName || (Array.isArray(payload?.technicians) ? payload.technicians.map((t: any) => t?.name).filter(Boolean).join("، ") : "");

    const Box = ({ on }: { on?: boolean }) => (
        <span style={{ display: "inline-block", width: 11, height: 11, border: "1.3px solid #555", borderRadius: 2, background: on ? RED : "#fff", position: "relative", verticalAlign: "middle" }}>
            {on ? <span style={{ position: "absolute", top: -4, left: 0, color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span> : null}
        </span>
    );

    const InfoCell = ({ label, value }: { label: string; value?: string }) => (
        <td style={{ padding: "3px 8px", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
            <div style={{ color: RED, fontWeight: 800, fontSize: 11, marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 12, minHeight: 14, borderBottom: "1px dotted #bbb" }}>{value || ""}</div>
        </td>
    );

    const Section = ({ num, title, items }: { num: number; title: string; items: { key: string; label: string }[] }) => (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 5, tableLayout: "fixed" }}>
            <thead>
                <tr>
                    <td colSpan={5} style={{ background: "#fbeaea", color: RED, fontWeight: 800, fontSize: 12, padding: "4px 8px", borderRight: `3px solid ${RED}` }}>{num}- {title}</td>
                </tr>
                <tr style={{ background: "#faf5f5" }}>
                    <th style={{ ...th, width: "34%", textAlign: "right" }}>اسم القطعة</th>
                    <th style={{ ...th, width: 42 }}>سليم</th>
                    <th style={{ ...th, width: 48 }}>صيانة</th>
                    <th style={{ ...th, width: 42 }}>تالف</th>
                    <th style={{ ...th, textAlign: "right" }}>ملاحظات الفني</th>
                </tr>
            </thead>
            <tbody>
                {items.map((it) => {
                    const st: InspectionStatus = insp?.items?.[it.key]?.status || "";
                    const note = insp?.items?.[it.key]?.note || "";
                    return (
                        <tr key={it.key} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{it.label}</td>
                            <td style={{ ...td, textAlign: "center" }}><Box on={st === "سليم"} /></td>
                            <td style={{ ...td, textAlign: "center" }}><Box on={st === "صيانة"} /></td>
                            <td style={{ ...td, textAlign: "center" }}><Box on={st === "تالف"} /></td>
                            <td style={{ ...td, textAlign: "right", color: "#333", borderBottom: "1px dotted #ccc" }}>{note}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const Header = () => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${RED}`, paddingBottom: 5, marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: "#444" }}>
                <div>رقم التقرير: <strong>{report?.report_number ?? "________"}</strong></div>
                <div>التاريخ: <strong>{dateStr || "____ / ____ / 202__"}</strong></div>
            </div>
            <div style={{ background: RED, color: "#fff", fontWeight: 800, fontSize: 15, padding: "6px 16px", borderRadius: 6 }}>تقرير الفحص الفني</div>
            <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: RED }}>هندسة السيارات</div>
                <div style={{ fontSize: 9, letterSpacing: 1, color: "#777" }}>CARS ENGINEERING CENTER</div>
            </div>
        </div>
    );

    const first = INSPECTION_SECTIONS.slice(0, 4);
    const second = INSPECTION_SECTIONS.slice(4);

    return (
        <div ref={ref} dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif", color: "#1a1a1a", background: "#fff" }}>
            {/* Page 1 */}
            <div style={{ ...page }}>
                <Header />
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #eee", marginBottom: 4 }}>
                    <tbody>
                        <tr>
                            <InfoCell label="نوع المركبة" value={v?.make} />
                            <InfoCell label="الموديل / السنة" value={v?.model} />
                            <InfoCell label="رقم اللوحة" value={v?.plate_number} />
                            <InfoCell label="عداد المسافة" value={report?.odometer_reading ? String(report.odometer_reading) : ""} />
                        </tr>
                        <tr>
                            <InfoCell label="اسم الزبون" value={client?.name} />
                            <InfoCell label="رقم الهاتف" value={client?.phone} />
                            <InfoCell label="حجم المحرك" value={v?.engine_size} />
                            <InfoCell label="الفني المسؤول" value={tech} />
                        </tr>
                    </tbody>
                </table>
                {first.map((s, i) => <Section key={s.key} num={i + 1} title={s.title} items={s.items} />)}
                <div style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 10 }}>الصفحة 1 من 2 - هندسة السيارات</div>
            </div>

            {/* Page 2 */}
            <div style={{ ...page, pageBreakBefore: "always" }}>
                <Header />
                {second.map((s, i) => <Section key={s.key} num={i + 5} title={s.title} items={s.items} />)}

                <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
                    <div style={{ border: `2px solid ${RED}`, borderRadius: 8, padding: "10px 16px", textAlign: "center", minWidth: 210 }}>
                        <div style={{ color: RED, fontWeight: 800, fontSize: 12, marginBottom: 6 }}>التقييم الفني</div>
                        <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: 12 }}>
                            {(["سليم", "صيانة", "تالف"] as InspectionStatus[]).map((r) => (
                                <span key={r} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                    <Box on={insp?.rating === r} /> {r}
                                </span>
                            ))}
                        </div>
                        <div style={{ marginTop: 8, fontWeight: 800, fontSize: 13 }}>النسبة: {insp?.percentage ? `${insp.percentage} %` : "________ %"}</div>
                    </div>
                    <div style={{ flex: 1, border: "1px dashed #bbb", borderRadius: 8, padding: "8px 12px" }}>
                        <div style={{ color: RED, fontWeight: 800, fontSize: 12, textDecoration: "underline" }}>الملاحظات النهائية:</div>
                        <div style={{ fontSize: 12, minHeight: 60, whiteSpace: "pre-wrap" }}>{insp?.finalNotes || ""}</div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 34, fontSize: 12, fontWeight: 700, textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #999", paddingTop: 4, width: 180 }}>توقيع الفني المسؤول</div>
                    <div style={{ borderTop: "1px solid #999", paddingTop: 4, width: 180 }}>مصادقة مدير المركز</div>
                    <div style={{ borderTop: "1px solid #999", paddingTop: 4, width: 180 }}>توقيع المستلم</div>
                </div>
                <div style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 10 }}>الصفحة 2 من 2 - هندسة السيارات</div>
            </div>
        </div>
    );
});
ComprehensiveInspectionReport.displayName = "ComprehensiveInspectionReport";

const page: React.CSSProperties = { width: "210mm", minHeight: "297mm", padding: "8mm 9mm", boxSizing: "border-box" };
const th: React.CSSProperties = { padding: "2px 6px", fontSize: 11, fontWeight: 800, color: "#444", textAlign: "center", borderBottom: "1px solid #eee" };
const td: React.CSSProperties = { padding: "2px 6px", fontSize: 11 };

export default ComprehensiveInspectionReport;
