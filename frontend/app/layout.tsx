import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rolla — Save together, the African way. Onchain.",
  description:
    "Rolla brings ajo & esusu rotating savings onchain. Join trusted savings circles, earn yield on idle funds, and grow your money with your community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-charcoal">
        {children}
      </body>
    </html>
  );
}
