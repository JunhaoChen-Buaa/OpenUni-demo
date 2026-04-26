import { PrimaryButton, SecondaryButton, TextButton } from "@/components/ui";

type ActionBarProps = {
  primaryLabel: string;
  secondaryLabel: string;
  tertiaryLabel?: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
  onTertiaryClick?: () => void;
};

export function ActionBar({
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimaryClick,
  onSecondaryClick,
  onTertiaryClick,
}: ActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[780px] px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3 sm:sticky sm:bottom-5 sm:px-0 sm:pb-0">
      <div className="rounded-[28px] border border-white/80 bg-white/88 p-3 shadow-[0_18px_38px_rgba(35,77,163,0.14)] backdrop-blur-xl">
        <div className="grid gap-3 sm:grid-cols-[1.25fr_1fr_auto]">
          <PrimaryButton onClick={onPrimaryClick}>{primaryLabel}</PrimaryButton>
          <SecondaryButton onClick={onSecondaryClick}>{secondaryLabel}</SecondaryButton>
          {tertiaryLabel && onTertiaryClick ? (
            <TextButton onClick={onTertiaryClick}>{tertiaryLabel}</TextButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
