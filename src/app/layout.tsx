import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getServerLocale } from "@/lib/i18n/locale.server";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const notoArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "RTA Innovation Program",
  description: "Idea Validation and Pitch Validation agents for the RTA Innovation Professional Program",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const user = await getCurrentUser();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${inter.variable} ${notoArabic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-ink-900">
        <LocaleProvider initialLocale={locale}>
          <AppShell currentUser={user}>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
