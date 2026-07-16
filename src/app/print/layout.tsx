// Minimal layout for /print/* routes — no nav, no sidebar, no theme provider overhead
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
