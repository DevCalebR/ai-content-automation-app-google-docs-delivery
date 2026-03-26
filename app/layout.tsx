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
    "Create polished monthly content plans from saved briefs, then export DOCX or PDF or deliver them to Google Docs.",
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
