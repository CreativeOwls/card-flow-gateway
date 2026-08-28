import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";


import { ConstellationBackdrop } from "@/components/ConstellationBackdrop";
import { GoogleIcon } from "@/components/GoogleIcon";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";

const TITLE = "Card Flow";
const DESCRIPTION =
  "Card Flow — a DevFest hackathon scaffold. Sign in with Google to get started.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${TITLE} — DevFest Hackathon Scaffold` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: `${TITLE} — DevFest Hackathon Scaffold` },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [signingIn, setSigningIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const goToDashboard = () => {
      if (active) void navigate({ to: "/dashboard", replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goToDashboard();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goToDashboard();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("Could not sign in with Google. Please try again.");
        setSigningIn(false);
        return;
      }

      if (result.redirected) return;

      toast.success("You're signed in.");
      void navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Something went wrong signing in. Please try again.");
      setSigningIn(false);
    }
  };


  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      <ConstellationBackdrop />

      <div
        aria-hidden="true"
        className="ambient-glow pointer-events-none absolute left-1/2 top-1/2 h-[55vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
      />
      <div aria-hidden="true" className="vignette pointer-events-none absolute inset-0" />

      <div className="relative flex w-full flex-col items-center gap-8 px-4 sm:gap-10 sm:px-6">
        <Wordmark word="CARD FLOW" />

        <Button
          variant="google"
          size="pill"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          aria-label="Sign in with Google"
          className="w-full max-w-xs sm:w-auto"
        >
          <GoogleIcon className="size-5" />
          {signingIn ? "Signing in…" : "Sign in with Google"}
        </Button>
      </div>
    </main>
  );
}
