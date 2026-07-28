import { AppShell } from "@/components/layout/AppShell"

export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
