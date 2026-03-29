// Legacy component - not used in current workshop ERP app
import { forwardRef } from "react";

export const PrintableReport = forwardRef<HTMLDivElement>((_, ref) => {
    return <div ref={ref} />;
});

PrintableReport.displayName = "PrintableReport";
