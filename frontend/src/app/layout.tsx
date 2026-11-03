import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { ProvidersWrapper } from './providers-wrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Le Portail Immobilier | Agence immobilière',
  description: 'Découvrez notre portefeuille de biens immobiliers : appartements, villas, terrains, locaux commerciaux. Vente et location.',
};

export const viewport = {
  themeColor: '#1e293b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning : la classe motion-ready est ajoutée par le script ci-dessous
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Active les apparitions au défilement avant l'affichage (sans JS : contenu visible) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion-ready')",
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        <ProvidersWrapper>{children}</ProvidersWrapper>
      </body>
    </html>
  );
}