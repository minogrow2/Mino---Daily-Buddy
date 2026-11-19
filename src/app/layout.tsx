import type { Metadata } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/outfit";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/nunito";
import "@fontsource-variable/montserrat";
import "./willow.css";
import "./globals.css";
import "./willow-settings.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LOOK_BOOT_SCRIPT } from "@/components/theme/look";

export const metadata: Metadata = {
  title: "Willow — Daily Buddy",
  description: "A personal life journal and productivity companion.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOOK_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div id="scene" aria-hidden="true" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
