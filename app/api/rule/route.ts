import { NextRequest, NextResponse } from "next/server";
import { getCollegeRuleState, saveCollegeRule } from "@/lib/college-rule-store";

export const runtime = "nodejs";

export async function GET() {
  const state = await getCollegeRuleState();
  return NextResponse.json(state, { status: 200 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请先选择一份学院规则 PDF 文件。" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "当前 MVP 仅支持上传 PDF 规则文件。" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!buffer.length) {
    return NextResponse.json({ error: "上传的 PDF 为空，请重新选择文件。" }, { status: 400 });
  }

  try {
    const { extractCollegeRuleFromPdf } = await import("@/lib/college-rule-extractor");

    const extraction = await extractCollegeRuleFromPdf({
      fileName: file.name,
      pdfBuffer: buffer,
    });

    const rule = await saveCollegeRule({
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      fileSize: file.size,
      pdfBuffer: buffer,
      facts: extraction.facts,
    });

    return NextResponse.json(
      {
        has_rule: true,
        basis_label: rule.basis_label,
        rule,
        notice:
          extraction.source === "fallback"
            ? "规则已导入，当前先使用本地提取结果作为判断依据。"
            : "规则已导入，并已完成结构化提取。",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Rule import failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "规则导入失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
