import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { authOptions } from "@/lib/auth/options";
import { Providers } from "@/components/providers";

const sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AI Content Automation App with Google Docs Delivery",
  description:
    "Production-ready content automation workspace for briefs, presets, generation runs, and Google Docs delivery readiness.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-[var(--surface)] text-[var(--ink)]">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
