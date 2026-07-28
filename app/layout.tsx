import type React from "react"
import type { Metadata } from "next"
import { Inter, DM_Mono } from "next/font/google"
import { SubscriptionProvider } from "@/contexts/subscription-context"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { Toaster } from "sonner"
import "./globals.css"

const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" })
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Recall.ai — AI Meeting & Lecture Note Taker",
  description: "Record your meetings and lectures, get instant AI-powered transcripts, summaries, and action items.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="antialiased flex flex-col min-h-screen font-sans">
        <AuthProvider>
          <ThemeProvider>
            <SubscriptionProvider>
              <div className="flex-1 flex flex-col">
                {children}
              </div>
            </SubscriptionProvider>
          </ThemeProvider>
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </body>
    </html>
  )
}
