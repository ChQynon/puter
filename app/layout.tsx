import type React from "react"
import type { Metadata } from "next"
import { Inter, Alegreya } from "next/font/google"
import "./globals.css"
import "katex/dist/katex.min.css"
import "highlight.js/styles/github-dark.css"
import Script from "next/script"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const alegreya = Alegreya({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-alegreya",
})

export const metadata: Metadata = {
  title: "puter",
  description: "Чат с ИИ PUTER",
  generator: "samgay_nis",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${alegreya.variable} dark`}>
      <head></head>
      <body className="font-sans antialiased">
        {/* Puter.js SDK: provides puter.ai (cloud AI models) and puter.ui utilities */}
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
