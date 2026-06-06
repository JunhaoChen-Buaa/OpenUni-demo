import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "openuni-prototype",
      version: process.env.npm_package_version ?? "0.1.0",
      checked_at: new Date().toISOString(),
      minimax_configured: Boolean(
        process.env.MINIMAX_API_KEY?.trim() &&
          process.env.MINIMAX_BASE_URL?.trim(),
      ),
      model_provider: "minimax",
      model: process.env.MINIMAX_MODEL?.trim() || "MiniMax-M3",
    },
    { status: 200 },
  );
}
