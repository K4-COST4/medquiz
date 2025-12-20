import type { Metadata } from "next";
import "./globals.css"; // Mantém o estilo funcionando

export const metadata: Metadata = {
  title: "MediLingo",
  description: "Seu mentor de medicina com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-900 text-white">
        {children}
      </body>
    </html>
  );
}