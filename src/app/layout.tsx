import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter, Space_Grotesk } from 'next/font/google';
import { cn } from '@/lib/utils';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Compliance Navigator',
  description: 'Streamline your financial compliance operations.',
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});


import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import { LegalBasesProvider } from "@/contexts/LegalBasesContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className={cn(inter.variable, spaceGrotesk.variable)}>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.min.js" strategy="afterInteractive" />
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js" strategy="afterInteractive" />
        <ThemeProvider>
          <ActivityLogProvider>
            <UserProvider>
              <LegalBasesProvider>
                {children}
                <Toaster />
              </LegalBasesProvider>
            </UserProvider>
          </ActivityLogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
