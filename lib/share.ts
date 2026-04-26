export async function shareOpenUniContent(input: {
  title: string;
  summary: string;
  href?: string;
}) {
  const shareText = [input.title, input.summary, input.href].filter(Boolean).join("\n");

  if (typeof navigator !== "undefined" && "share" in navigator && input.href) {
    await navigator.share({
      title: input.title,
      text: input.summary,
      url: input.href,
    });

    return "已打开系统分享面板，可以直接发给同学或群聊。";
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareText);
    return "已复制分享文案，可以直接转发给同学或群聊。";
  }

  return "这条内容适合转给同学一起看。";
}
