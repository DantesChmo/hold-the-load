import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'cyrillic'] });
const mono = JetBrains_Mono({ variable: '--font-jb', subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: '503 — тренажёр System Design',
  description: 'Браузерная игра: достраивай архитектуру в реальном времени, пока растёт нагрузка.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden font-sans text-sm">{children}</body>
    </html>
  );
}
