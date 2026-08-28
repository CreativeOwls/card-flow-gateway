import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";


import { ConstellationBackdrop } from "@/components/ConstellationBackdrop";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";

const TITLE = "Card Flow";
const DESCRIPTION =
  "Card Flow — a DevFest hackathon scaffold. Enter to explore the lead pipeline demo.";


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
  const [entering, setEntering] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Warm the demo session so pressing Enter is instant.
    void supabase.auth.getSession();
  }, []);

  const handleEnter = async () => {
    setEntering(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          toast.error("Could not start the demo. Please try again.");
          setEntering(false);
          return;
        }
      }
      void navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setEntering(false);
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
          onClick={handleEnter}
          disabled={entering}
          aria-label="Enter the CardFlow demo"
          className="w-full max-w-xs sm:w-auto"
        >
          {entering ? "Entering…" : "Enter"}
        </Button>
      </div>
    </main>

  );
}
