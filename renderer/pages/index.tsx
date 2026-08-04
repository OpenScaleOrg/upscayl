"use client";
import { useEffect, useState } from "react";
import StudioShell from "@/components/studio/studio-shell";
import { OnboardingDialog } from "@/components/main-content/onboarding-dialog";
import { NewsModal } from "@/components/news-modal";

const Home = () => {
  // Defer all `window`/`window.electron` access to the client — the app is
  // statically exported, so nothing may touch `window` during prerender.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ height: "100vh", background: "#101216" }} />;
  }

  return (
    <>
      <StudioShell />
      <NewsModal />
      <OnboardingDialog />
    </>
  );
};

export default Home;
