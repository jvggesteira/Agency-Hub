import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import AuthGuard from "@/components/custom/auth-guard";
import "./globals.css";
import { ThemeProvider } from "@/context/theme-context";
import SessionProvider from "@/components/providers/session-provider"; // <--- 1. NOVO IMPORT

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agency Hub",
  description: "Sistema de Gestão",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider> 
            {/* 2. ADICIONADO AQUI: Monitora a renovação do token */}
            <SessionProvider>
                <AuthProvider>
                    <AuthGuard>
                        {children}
                    </AuthGuard>
                </AuthProvider>
            </SessionProvider>
        </ThemeProvider>   
        <Toaster />
      </body>
    </html>
  );
}