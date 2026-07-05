import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Cognitive Loop — AI Thinking Companion',
  description: 'Capture, connect, reflect on, and rediscover your thoughts, ideas, learnings, and decisions over time.',
  keywords: ['second brain', 'thinking companion', 'AI notes', 'knowledge graph', 'cognitive reflection'],
  authors: [{ name: 'Cognitive Loop team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#050409] text-[#f4f4f7] selection:bg-[#6366f1]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
