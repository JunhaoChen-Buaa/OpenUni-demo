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
      deployment_provider: process.env.VERCEL === "1" ? "vercel" : "local",
      runtime_cache: process.env.VERCEL === "1" ? "tmp" : "local_data_runtime",
      discovery_sync_mode:
        process.env.VERCEL === "1" && process.env.OPENUNI_DISCOVERY_MODEL_SYNC === "true"
          ? "vercel_model_assisted_light"
          : process.env.VERCEL === "1"
            ? "vercel_demo_lightweight"
            : "model_assisted",
    },
    { status: 200 },
  );
}
