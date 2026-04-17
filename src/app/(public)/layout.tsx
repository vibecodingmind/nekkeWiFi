import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "nekkeWiFi - ISP Billing & Network Management Platform",
  description: "Streamline your ISP operations with nekkeWiFi. Automated billing, real-time monitoring, device management, and Pesapal payments for Tanzanian ISPs.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
