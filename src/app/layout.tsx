import type { Metadata } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/outfit";
import "@fontsource-variable/nunito";
import "@fontsource-variable/montserrat";
import "./globals.css";

export const metadata: Metadata = {
  title: "Willow — Daily Buddy",
  description: "A personal life journal and productivity companion.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
