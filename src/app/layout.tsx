import type { Metadata } from 'next';
import { Onest, Unbounded } from 'next/font/google';
import './globals.css';

// Onest — весь интерфейс, Unbounded — только крупные заголовки.
const onest = Onest({ variable: '--font-onest', subsets: ['latin', 'cyrillic'] });
const unbounded = Unbounded({ variable: '--font-unbounded', subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: '503 — тренажёр System Design',
  description: 'Браузерная игра: достраивай архитектуру в реальном времени, пока растёт нагрузка.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden font-sans text-sm">{children}</body>
    </html>
  );
}
