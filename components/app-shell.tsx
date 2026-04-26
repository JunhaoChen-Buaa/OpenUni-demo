import { ReactNode } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { FloatingAskButton } from "@/components/floating-ask-button";
import { ShellLabel } from "@/components/shell-label";

type AppShellProps = {
  children: ReactNode;
  contentClassName?: string;
  withProductChrome?: boolean;
  showShellLabel?: boolean;
  askHref?: string;
};

export function AppShell({
  children,
  contentClassName = "",
  withProductChrome = false,
  showShellLabel = false,
  askHref = "/signal/swim/ask",
}: AppShellProps) {
  const shellWidthClass = withProductChrome ? "max-w-[780px]" : "max-w-[820px]";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-6xl px-0 sm:px-5 sm:py-6 lg:py-8">
      <div className={["mx-auto", shellWidthClass].join(" ")}>
        <div className="app-surface relative flex min-h-[100dvh] flex-col overflow-hidden rounded-none border-x-0 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[36px] sm:border sm:border-white/75">
          <div
            className={[
              "flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-7 lg:py-7",
              withProductChrome
                ? "pb-[var(--openuni-content-safe-bottom)] sm:pb-[calc(var(--openuni-content-safe-bottom)-1rem)]"
                : "",
              contentClassName,
            ].join(" ")}
          >
            {showShellLabel ? (
              <div className="mb-5 sm:mb-6">
                <ShellLabel />
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>

      {withProductChrome ? (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="mx-auto h-full w-full max-w-[780px] px-4 sm:px-5">
            <div className="relative h-full">
              <FloatingAskButton href={askHref}>问一问 OpenUni</FloatingAskButton>
              <BottomNavigation />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
