// This layout overrides the root layout for print pages,
// rendering ONLY the content without Sidebar, ThemeProvider, etc.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
    return children;
}
