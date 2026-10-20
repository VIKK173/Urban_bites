import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Urban Bites — Bold Flavours, Delivered Fast",
    template: "%s · Urban Bites",
  },
  description:
    "Premium burgers, pizzas, fried chicken and more — bold flavours, fresh ingredients, delivered to your door in minutes. Order now on Urban Bites.",
  keywords: ["food delivery", "burgers", "pizza", "Urban Bites", "order food online", "Mumbai"],
  openGraph: {
    title: "Urban Bites — Cravings? We got you.",
    description: "Bold flavours. Fresh ingredients. Delivered to your door.",
    url: SITE,
    siteName: "Urban Bites",
    type: "website",
    images: [{ url: "/images/hero-burger.png", width: 1024, height: 1024, alt: "Urban Bites signature burger" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Urban Bites — Cravings? We got you.",
    description: "Bold flavours. Fresh ingredients. Delivered to your door.",
    images: ["/images/hero-burger.png"],
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#090909",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${oswald.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#151515",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}
