import type { Metadata } from "next";
import { Funnel_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import { auth } from "@/auth";

const font = Funnel_Display({
  weight: ["300" , "400" , "500" , "600" , "700" , "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LoganLifts",
  description: "Fitness tracker & planner",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {

  const session = await auth();

  return (
    <html lang="en" className={`${font.className} h-full antialiased`}>
      <body className="h-full flex flex-col">
        <Providers session={session}>
          <Navbar/>
          <main className="flex-1 flex flex-col items-center overflow-y-auto bg-stone-400 text-black">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
