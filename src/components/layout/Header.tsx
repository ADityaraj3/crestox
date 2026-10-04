"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Compass,
  Info,
  Moon,
  Sun,
  SunMoon,
  WandSparkles,
} from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "../ui/dock";
import { useTheme } from "next-themes";
import { useThemeToggle } from "@/components/ui/skiper/skiper26";
import GradientButton from "../ui/gradiant-button";
import ProfileDropdown from "../ui/profile";
import { clearCookie, getCookie } from "@/utils/cookieUtils";
import { useUserStore } from "@/store/useUserStore";
import { Skeleton } from "../ui/skeleton";
import { SignupModal } from "../ui/signup-modal";

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);
  const { toggleTheme } = useThemeToggle({
    variant: "circle",
    start: "top-left",
    blur: true,
  });

  const token = getCookie("token");
  const { initialize, clearUser, user, isLoggedIn } = useUserStore();

  React.useEffect(() => {
    // `initialize` reads the token cookie itself, so re-running on token change
    // covers both login (cookie set) and logout (cookie cleared).
    initialize();
  }, [token, initialize]);

  React.useEffect(() => {
    const syncAuthOnFocus = () => {
      if (getCookie("token")) {
        initialize();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncAuthOnFocus();
      }
    };

    window.addEventListener("focus", syncAuthOnFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", syncAuthOnFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [initialize]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const hasToken = token !== "";

  // While we hold a credential but the profile hasn't resolved yet, show a skeleton
  // rather than flashing the "Sign Up" button or rendering nothing.
  const profilePending = (hasToken || isLoggedIn) && !user;

  const data = [
    {
      title: "Explore",
      icon: (
        <Compass className="h-full w-full text-foreground/80" />
      ),
      href: "/explore",
    },
    {
      title: "Crea AI",
      icon: (
        <WandSparkles className="h-full w-full text-foreground/80" />
      ),
      href: "/crea-ai",
    },
    {
      title: "About Us",
      icon: (
        <Info className="h-full w-full text-foreground/80" />
      ),
      href: "/about-us",
    },
    {
      title: "Theme",
      icon:
        mounted ?
          theme === "dark" ?
            <Moon className="h-full w-full text-foreground/80" />
            : <Sun className="h-full w-full text-foreground/80" />
          : <SunMoon className="h-full w-full text-foreground/80" />,
      type: "theme",
    },
  ];

  return (
    <>
      <nav className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 px-6 py-3 md:py-4 bg-card/90 dark:bg-background/80 backdrop-blur-lg border border-border dark:border-border/50 rounded-2xl shadow-lg shadow-foreground/5 dark:shadow-sm dark:shadow-transparent">
        <div className="flex justify-between items-center w-full">
          <Link
            href="/"
            className="flex-shrink-0 cursor-pointer flex items-center gap-2"
          >
            <Image
              src="/logo.png"
              alt="Crestox Logo"
              width={36}
              height={36}
              className="w-8 h-8 md:w-9 md:h-9"
              priority
            />
            <h1 className="text-foreground text-xl font-bold tracking-[0.3em] font-mono">
              CRESTOX
            </h1>
          </Link>

          {/* <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                    <Link
                        href="/"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Explore
                    </Link>
                    <Link
                        href="/ai-curator"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        AI Curator
                    </Link>
                    <Link
                        href="/about"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        About Us
                    </Link>
                    </div> */}

          <div className="absolute top-1/2 left-1/2 max-w-full -translate-x-1/2 -translate-y-1/2 hidden lg:flex">
            <Dock direction="middle" className="items-center">
              {data.map((item, idx) =>
                item.href ? (
                  <Link key={idx} href={item.href} prefetch>
                    <DockItem
                      className="aspect-square rounded-full bg-background dark:bg-card border border-border dark:border-border/60 hover:bg-accent dark:hover:bg-card transition-colors"
                    >
                      <DockLabel>{item.title}</DockLabel>
                      <DockIcon>{item.icon}</DockIcon>
                    </DockItem>
                  </Link>
                ) : (
                  <DockItem
                    key={idx}
                    className="aspect-square rounded-full bg-background dark:bg-card border border-border dark:border-border/60 hover:bg-accent dark:hover:bg-card transition-colors"
                    onClick={() => {
                      if (item.type === "theme") toggleTheme();
                    }}
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon>{item.icon}</DockIcon>
                  </DockItem>
                )
              )}
            </Dock>
          </div>

          <div className="flex items-center gap-4">
            {/* <ThemeToggle /> */}

            {!mounted || profilePending ?
              // Skeleton placeholder for the auth area — matches the profile dropdown's
              // avatar (+ name on md) so layout doesn't shift once the profile loads.
              <div className="flex items-center gap-3">
                <Skeleton className="hidden md:block h-4 w-20 rounded" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
              : user ?
                <ProfileDropdown
                  logout={() => {
                    clearCookie("token");
                    clearUser();
                    window.location.href = "/";
                  }}
                />
                : <div className="flex items-center gap-2">
                {/* <GradientButton
                  label="Sign In"
                  variant="primary"
                  className="h-10 px-3 md:h-12 md:px-6 text-xs md:text-sm"
                  onClick={() => router.push("/login")}
                ></GradientButton> */}
                <GradientButton
                  label="Sign Up"
                  variant="primary"
                  className="h-10 px-3 md:h-12 md:px-6 text-xs md:text-sm"
                  onClick={() => setSignupOpen(true)}
                ></GradientButton>
                {/* <GradientButton
                                    variant="secondary"
                                    className="flex text-[10px] md:text-xs h-10 px-2 md:h-12 md:px-3 whitespace-nowrap"
                                    onClick={() => setIsLoggedIn(true)}
                                >
                                </GradientButton> */}
              </div>
            }
          </div>
        </div>
      </nav>
      {/* Mobile/Tablet Bottom Nav — below lg */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[200]">
        <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-card/90 dark:bg-background/80 backdrop-blur-lg border border-border dark:border-border/50 shadow-lg shadow-foreground/5 dark:shadow-sm dark:shadow-transparent">
          {data.map((item, idx) =>
            item.href ? (
              <Link
                key={idx}
                href={item.href}
                prefetch
                className="flex flex-col items-center gap-1 shrink-0 w-12"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-background dark:bg-card border border-border dark:border-border/60">
                  <div className="w-5 h-5 text-foreground dark:text-foreground/80">
                    {item.icon}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground leading-none text-center w-full">
                  {item.title}
                </span>
              </Link>
            ) : (
              <button
                key={idx}
                onClick={() => {
                  if (item.type === "theme") toggleTheme();
                }}
                className="flex flex-col items-center gap-1 shrink-0 w-12"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-background dark:bg-card border border-border dark:border-border/60">
                  <div className="w-5 h-5 text-foreground dark:text-foreground/80">
                    {item.icon}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground leading-none text-center w-full">
                  {item.title}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      <SignupModal isOpen={signupOpen} onClose={() => setSignupOpen(false)} />
    </>
  );
}
