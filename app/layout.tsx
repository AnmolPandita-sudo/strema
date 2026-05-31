import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Streamable',
    template: '%s • Streamable',
  },
  description: 'Watch movies and TV shows with a clean streaming experience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-[#0b0b0f] text-white antialiased">{children}</div>
      </body>
    </html>
  );
}