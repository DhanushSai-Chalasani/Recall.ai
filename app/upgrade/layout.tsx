import { AppShell } from "@/components/layout/AppShell"

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
