"use client";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>OpenImpactLab - Making a Positive Impact</title>
        <meta name="description" content="A platform connecting students, teachers, and NGOs to create positive social impact through collaborative projects." />
      </head>
      <body className="antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
