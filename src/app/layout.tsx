import type { Metadata } from "next";
import "./globals.css";
import ErrorCapture from "@/components/ErrorCapture";
import Script from "next/script";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import { CartProvider } from "@/context/CartContext";
import VisualEditsWrapper from "@/components/VisualEditsWrapper";

export const metadata: Metadata = {
  title: "Cafe Republic | Fresh Coffee. Cozy Vibes.",
  description: "Experience premium coffee and elegant dining at Cafe Republic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="1386a895-339f-41fb-bc36-75e69a4e8ae4"
        />
        <ErrorCapture />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        <CartProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <ConditionalFooter />
          <BottomNav />
        </CartProvider>
        <VisualEditsWrapper />
      </body>
    </html>
  );
}
