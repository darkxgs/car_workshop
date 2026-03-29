# Real-Time Dashboard Data Plan

This plan outlines replacing the placeholder information on the Dashboard (`src/app/page.tsx`) with genuine live data from Supabase, mirroring the accuracy of the Accounting page.

## User Review Required
No major architectural decisions needing debate, just confirming the data sources below match your expectations.

## Proposed Changes

### 1. Update Auth Provider (`src/lib/AuthProvider.tsx`)
- Enhance the `fetchRole` capability to fetch both `role` and  `name` from the `employees` table simultaneously.
- Expose `employeeName` in the Context Provider globally.

### 2. Update Dashboard Data Fetching (`src/app/page.tsx`)
- **Navigation Navbar:**
  - Consume `employeeName` accurately to display the user's name instead of the default "أحمد المدير" or "admin".
  - Change the Settings icon to physically route to `/settings` using `<Link>`.
- **Low Stock Calculations:**
  - Implement an `inventory` fetch aggregating items where `quantity` is generally low (e.g., `<= min_quantity` or `< 5` if minimum isn't set).
  - Inject this real count into the Purple "Low Stock Items" KPI Card.
- **Dynamic Tasks List (المهام اليوم):**
  - Render a live list of the latest `inspection_reports` that are active today (e.g. `قيد العمل` or recent entries), extracting real client names, car models, priority inference based on status, and time of creation.
- **Dynamic Activity Alerts (تنبيهات ونشاط):**
  - Create genuine alert cards combining the top low-stock inventory items alongside any urgent status updates from the reports.
- **Live 7-Day Performance Chart:**
  - Map genuine `recharts` arrays by tracking the actual daily orders and daily total revenue over the preceding 7 days dynamically rather than iterating a static object.

## Verification Plan

### Manual Verification
1. I will boot the Next.js app natively.
2. Ensure the top right user tag accurately reflects the local database `employees.name`.
3. Certify that the Dashboard Tasks tab correctly outputs any car profiles located in the `inspection_reports` database.
4. Verify the Settings cog routes optimally.
