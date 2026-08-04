import "../styles/globals.css";
import Head from "next/head";
import { AppProps } from "next/app";
import { Provider } from "jotai";
import { useEffect } from "react";
import { themeChange } from "theme-change";
import "react-tooltip/dist/react-tooltip.css";
import { Toaster } from "@/components/ui/toaster";
import { Tooltip } from "react-tooltip";
import PostHogProviderWrapper from "@/components/posthog-provider-wrapper";

const MyApp = ({ Component, pageProps }: AppProps) => {
  useEffect(() => {
    // Default to the dark "upscayl" theme so all daisyUI surfaces (Preferences,
    // onboarding, dialogs) match the dark Studio chrome. Respect a saved choice.
    const saved = localStorage.getItem("theme");
    document.documentElement.setAttribute("data-theme", saved || "upscayl");
    themeChange(false);
  }, []);

  return (
    <>
      <Head>
        <title>OpenScayl</title>
      </Head>
      <base href="./" />

      <Provider>
        <PostHogProviderWrapper>
          <Component {...pageProps} data-theme="upscayl" />
          <Toaster />
          <Tooltip
            className="z-[999] max-w-sm break-words !bg-secondary"
            id="tooltip"
          />
        </PostHogProviderWrapper>
      </Provider>
    </>
  );
};

export default MyApp;
