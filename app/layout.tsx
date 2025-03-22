import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Civalgo Punch - Worker Check-In System",
  description: "A real-time check-in/out system for construction workers",
  icons: {
    icon: [
      { url: '/images/punch.webp', type: 'image/webp' },
      { url: '/images/punch.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/images/punch.webp', sizes: '180x180', type: 'image/webp' }
    ],
    shortcut: '/images/punch.webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-stone-50 min-h-screen"
      >
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-stone-200 bg-white">
            <div className="container mx-auto flex justify-between items-center h-16 px-4">
              <Link href="/" className="font-semibold text-xl flex items-center gap-2">
                <Image 
                  src="/images/punch.webp"
                  width={412}
                  height={371}
                  alt="Civalgo Punch Logo"
                  style={{ width: 'auto', height: '30px' }}
                />
                <span>Civalgo Punch</span>
              </Link>
              <nav className="flex items-center space-x-4">
                <Link href="/" className="text-stone-600 hover:text-stone-900">Home</Link>
                <Link href="/dashboard" className="text-stone-600 hover:text-stone-900">Dashboard</Link>
                <Link href="/history" className="text-stone-600 hover:text-stone-900">History</Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="py-6 border-t border-stone-200 bg-white">
            <div className="container mx-auto px-4">
              <p className="text-center text-stone-500 text-sm">© {new Date().getFullYear()} Civalgo Punch. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
