# UI & Theme Rules
1. The application MUST strictly reuse the visual aesthetics from the "Finance" project.
2. Core styles: Deep forest mesh pattern, glass-card aesthetics (`rgba(8, 35, 22, 0.75)` with blur), emerald/amber glowing text and metrics, and Recharts animations.
3. The primary language of the application must be Arabic (RTL support baked in natively) with English translations available via a global LanguageProvider context.
4. Ensure animations like `slide-up`, `fade-in`, and delays are used when mounting lists or dashboard cards.
5. All UI must be fully responsive (iPad compatibility is explicitly required for workshop floor use).

# Tech Stack Rules
1. Core framework: Next.js (App Router)
2. Language: TypeScript (strict mode)
3. Styling: TailwindCSS (with the custom configuration from the previous project)
4. UI Icons: lucide-react
5. Database & Auth: Supabase (PostgreSQL) + Supabase Storage for iPads photo uploads.
6. WhatsApp API integration for automated SMS.
7. Printables: Use `react-to-print` for strictly formatted A4 inspection PDFs.
