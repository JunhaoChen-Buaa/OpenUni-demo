"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { OptionGroup } from "@/components/option-group";
import { PrimaryButton } from "@/components/ui";
import { defaultProfile, onboardingOptions, type UserProfile } from "@/lib/mock-data";
import { getStoredProductMode, saveProfile } from "@/lib/storage";

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  const stageSummary = useMemo(() => {
    return `${profile.grade} · ${profile.college} · ${profile.focus}`;
  }, [profile]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProfile(profile);
    const mode = getStoredProductMode();
    router.push(mode ? "/discover" : "/entry");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="OpenUni 初始设置"
          title={"告诉我你现在处于什么阶段，\n我来帮你判断什么值得做。"}
          description="你不需要自己翻十几个入口。OpenUni 会根据你的阶段和目标，优先筛出真正值得关注的事项。"
        />

        <form className="space-y-5" onSubmit={handleSubmit}>
          <OptionGroup
            label="你的年级"
            value={profile.grade}
            options={onboardingOptions.grades}
            onChange={(value) => setProfile((current) => ({ ...current, grade: value }))}
          />
          <OptionGroup
            label="你的学院"
            value={profile.college}
            options={onboardingOptions.colleges}
            onChange={(value) => setProfile((current) => ({ ...current, college: value }))}
          />
          <OptionGroup
            label="你最近更关注什么"
            value={profile.focus}
            options={onboardingOptions.focuses}
            onChange={(value) => setProfile((current) => ({ ...current, focus: value }))}
          />
          <OptionGroup
            label="你更希望 OpenUni 帮你发现哪类机会"
            value={profile.preference}
            options={onboardingOptions.preferences}
            onChange={(value) => setProfile((current) => ({ ...current, preference: value }))}
          />

          <div className="card-panel rounded-[28px] p-5">
            <p className="text-sm font-medium text-slate-500">你的当前画像</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[profile.grade, profile.college, profile.focus, profile.preference].map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[15px] leading-7 text-slate-600">
              OpenUni 将优先帮你识别适合 <span className="font-semibold text-ink">{stageSummary}</span>{" "}
              的高价值信号，减少你在多个群聊和通知入口之间来回切换。
            </p>
          </div>

          <PrimaryButton className="w-full" type="submit">
            开始使用
          </PrimaryButton>
        </form>
      </div>
    </AppShell>
  );
}
