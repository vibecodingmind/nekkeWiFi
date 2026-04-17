import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from 'next-themes';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nekkeWiFi - ISP Billing & Network Management",
  description: "Multi-tenant ISP billing platform with universal device management for MikroTik, TP-Link, Huawei, ZTE, Airtel 5G, ONT/OLT and Pesapal payments.",
  keywords: ["nekkeWiFi", "ISP Billing", "Network Management", "MikroTik", "Pesapal", "5G Router", "ONT", "OLT", "Tanzania ISP"],
  authors: [{ name: "nekkeWiFi Team" }],
  openGraph: {
    title: "nekkeWiFi - ISP Billing & Network Management",
    description: "Multi-tenant ISP billing platform with universal device management and Pesapal payments",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "nekkeWiFi - ISP Billing & Network Management",
    description: "Multi-tenant ISP billing platform with universal device management and Pesapal payments",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
