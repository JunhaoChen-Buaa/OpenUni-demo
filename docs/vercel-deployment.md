# OpenUni Vercel Deployment

This project is a Next.js app configured for Vercel Hobby deployment.

## Required variables

Set these in Vercel project environment variables for Production, Preview, and Development:

- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL=https://api.minimax.io/v1`
- `MINIMAX_MODEL=MiniMax-M3`

The app can still boot without these variables, but model-backed answers, source parsing, and PDF rule extraction will fall back to local demo behavior where available.

## Vercel settings

Vercel should auto-detect the project as Next.js.

- Build command: `npm run build`
- Output/runtime: Next.js default
- Health check URL after deploy: `/api/health`
- API function max duration: `100s` via `vercel.json`

## Why Vercel

Vercel Hobby is a better fit than Railway for this demo because it has native Next.js support and supports long enough serverless function duration for MiniMax-M3 calls. The current MiniMax client times out after `90s`, while Vercel functions are configured for `100s`.

MiniMax API usage is billed separately by MiniMax and is not included in Vercel's free plan.
