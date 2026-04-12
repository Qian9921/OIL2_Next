"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import {
  onIdTokenChanged,
  signInWithCustomToken,
  signOut as signOutFromFirebase,
} from "firebase/auth";
import { useSession } from "next-auth/react";

import { LoadingState } from "@/components/ui/loading-state";
import { auth } from "@/lib/firebase";

export function FirebaseAuthBridge({ children }: PropsWithChildren) {
  const { data: session, status } = useSession();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const syncFirebaseAuth = async () => {
      if (status === "loading") {
        return;
      }

      if (!session?.user?.id || session.user.needsRoleSelection) {
        if (auth.currentUser) {
          await signOutFromFirebase(auth);
        }
        if (!isCancelled) {
          setIsReady(true);
        }
        return;
      }

      if (auth.currentUser?.uid === session.user.id) {
        await auth.currentUser.getIdToken();
        if (!isCancelled) {
          setIsReady(true);
        }
        return;
      }

      if (auth.currentUser && auth.currentUser.uid !== session.user.id) {
        await signOutFromFirebase(auth);
      }

      if (!isCancelled) {
        setIsReady(false);
      }

      const response = await fetch("/api/firebase/custom-token", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to create Firebase custom token");
      }

      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        throw new Error("Firebase custom token missing from response");
      }

      const credential = await signInWithCustomToken(auth, data.token);
      await credential.user.getIdToken();

      await new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          unsubscribe();
          reject(new Error("Timed out waiting for Firebase auth state"));
        }, 10000);

        const unsubscribe = onIdTokenChanged(auth, async (user) => {
          if (user?.uid !== session.user.id) {
            return;
          }

          try {
            await user.getIdToken();
            window.clearTimeout(timeoutId);
            unsubscribe();
            resolve();
          } catch (error) {
            window.clearTimeout(timeoutId);
            unsubscribe();
            reject(error);
          }
        });
      });

      if (!isCancelled) {
        setIsReady(true);
      }
    };

    void syncFirebaseAuth().catch((error) => {
      console.error("Error syncing Firebase auth:", error);
      if (!isCancelled) {
        setIsReady(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [session?.user?.id, session?.user?.needsRoleSelection, status]);

  if (status === "authenticated" && session?.user?.id && !session.user.needsRoleSelection && !isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState text="Securing your workspace..." />
      </div>
    );
  }

  return <>{children}</>;
}
