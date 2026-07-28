import { AppShell } from "@/components/layout/AppShell"

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
