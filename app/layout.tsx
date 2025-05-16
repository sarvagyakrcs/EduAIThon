import { type Metadata } from "next";
import { Poppins } from "next/font/google";
import clsx from "clsx";
import { Toaster } from "react-hot-toast";

import "@/styles/tailwind.css";
import { Providers } from "@/components/providers/theme-providers";
import { QueryClientProvider } from "@/components/providers/query-client-provider";

const font = Poppins({
  subsets: ["latin"],
  weight: ["200", "400"],
});

export const metadata: Metadata = {
  title: "Commit - Open-source Git client for macOS minimalists",
  description:
    "Commit is a lightweight Git client you can open from anywhere any time you’re ready to commit your work with a single keyboard shortcut. It’s fast, beautiful, and completely unnecessary.",
  alternates: {
    types: {
      "application/rss+xml": `${process.env.NEXT_PUBLIC_SITE_URL}/feed.xml`,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={clsx("h-full antialiased", font.className)}
      suppressHydrationWarning
    >
      <QueryClientProvider>
        <body className="flex min-h-full flex-col bg-gray-50 dark:bg-gray-950">
          <Providers>{children}</Providers>
          <Toaster position="top-center" reverseOrder={false} />
        </body>
      </QueryClientProvider>
    </html>
  );
}
