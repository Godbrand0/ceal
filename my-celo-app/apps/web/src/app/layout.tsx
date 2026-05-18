import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/wallet-provider";
import { ThemeProvider } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CEAL — On-Chain Dating",
  description: "Where every match is minted and every date has stakes.",
  manifest: "/manifest.json",
  themeColor: "#FF385C",
  other: {
    "talentapp:project_verification":
      "16f34faea44c463a4c589e4d640f1830f5900486bf18dc6337d29059f97fa553ae5dc2afdc9eea8dd042a9d34b42e9aff155c1cb0c7d40987bede32244f0533f",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        <ThemeProvider>
          <WalletProvider>
            <div className="relative mx-auto min-h-screen max-w-[430px] flex flex-col bg-gray-950">
              {children}
            </div>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
