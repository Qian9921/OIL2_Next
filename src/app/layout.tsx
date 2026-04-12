"use client";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseAuthBridge } from "@/components/auth/firebase-auth-bridge";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>OpenImpactLab - Making a Positive Impact</title>
        <meta name="description" content="A platform connecting students and NGOs to create positive social impact through collaborative projects." />
      </head>
      <body className="antialiased">
        <SessionProvider>
          <FirebaseAuthBridge>
            {children}
            <Toaster />
          </FirebaseAuthBridge>
        </SessionProvider>
      </body>
    </html>
  );
}
