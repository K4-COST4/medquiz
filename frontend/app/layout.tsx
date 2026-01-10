import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | MedQuiz',
    default: 'MedQuiz - Estude Medicina Jogando',
  },
  description: "Sua plataforma de estudo gamificada. Prepare-se para a residência.",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
      {/* Removemos flex, sidebar e nav daqui. Agora é só o corpo puro. */}
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}