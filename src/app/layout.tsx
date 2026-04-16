import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "مياه جبأ - مناديب",
  description: "نظام إدارة مناديب مياه جبأ - إدارة العملاء والفواتير",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} font-sans antialiased bg-[#f2f2f7] text-[#1c1c1e]`}
      >
        <ThemeProvider attribute="class" enableSystem={true} defaultTheme="light">
          {children}
        </ThemeProvider>
        <Toaster position="top-center" duration={3000} richColors closeButton />
      </body>
    </html>
  );
}
