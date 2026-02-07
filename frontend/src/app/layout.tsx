import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import '@/styles/globals.css';
import { SessionProvider } from '@/store/sessionStore';
import { ConfigProvider } from '@/store/configStore';
import { NegotiationProvider } from '@/store/negotiationStore';
import { Header } from '@/components/Header';
import { ToastProvider } from '@/components/ToastProvider';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sans',
});

const soraDisplay = Sora({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'DealForge',
  description: 'Real-time AI negotiation across multiple sellers with transparent deal analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${soraDisplay.variable} font-sans`}>
        <ToastProvider>
          <SessionProvider>
            <ConfigProvider>
              <NegotiationProvider>
                <Header />
                {children}
              </NegotiationProvider>
            </ConfigProvider>
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

