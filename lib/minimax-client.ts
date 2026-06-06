export type MiniMaxMessage = {
  role: "system" | "user";
  content: string;
};

type MiniMaxResponseContent =
  | string
  | Array<{
      text?: string;
      type?: string;
    }>;

type MiniMaxChatResponse = {
  choices?: Array<{
    text?: string;
    message?: {
      content?: MiniMaxResponseContent;
      reasoning_content?: string;
    };
  }>;
};

type MiniMaxReasoningMode = "decision" | "discovery_extraction" | "source_resolution" | "rule_extraction";

type MiniMaxChatOptions = {
  messages: MiniMaxMessage[];
  maxTokens: number;
  temperature?: number;
  reasoningMode: MiniMaxReasoningMode;
  jsonMode?: boolean;
  timeoutMs?: number;
};

export type MiniMaxConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

const DEFAULT_MINIMAX_MODEL = "MiniMax-M3";
const REQUEST_TIMEOUT_MS = 90_000;

export function getMiniMaxConfig(options: { optional: true }): MiniMaxConfig | null;
export function getMiniMaxConfig(options?: { optional?: false }): MiniMaxConfig;
export function getMiniMaxConfig({ optional = false }: { optional?: boolean } = {}) {
  const apiKey = process.env.MINIMAX_API_KEY?.trim();
  const baseUrl = process.env.MINIMAX_BASE_URL?.trim();
  const model = process.env.MINIMAX_MODEL?.trim() || DEFAULT_MINIMAX_MODEL;

  if (!apiKey || !baseUrl) {
    if (optional) {
      return null;
    }

    throw new Error("Missing MiniMax environment configuration.");
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    model,
  };
}

function buildMiniMaxEndpoint(config: MiniMaxConfig, path: string) {
  if (config.baseUrl.endsWith(path)) {
    return config.baseUrl;
  }

  return `${config.baseUrl}${path}`;
}

function buildMiniMaxRequestBody({
  model,
  messages,
  maxTokens,
  temperature,
  jsonMode,
}: MiniMaxChatOptions & { model: string }) {
  return {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: typeof temperature === "number" ? temperature : 0.2,
    stream: false,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };
}

function normalizeMiniMaxContent(content: MiniMaxResponseContent | undefined) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function stripMiniMaxThinking(content: string) {
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = withoutThinking.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return (fenced?.[1] ?? withoutThinking).trim();
}

export async function requestMiniMaxChat({
  messages,
  maxTokens,
  temperature,
  reasoningMode,
  jsonMode = false,
  timeoutMs,
}: MiniMaxChatOptions) {
  const config = getMiniMaxConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildMiniMaxEndpoint(config, "/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(
        buildMiniMaxRequestBody({
          model: config.model,
          messages,
          maxTokens,
          temperature,
          reasoningMode,
          jsonMode,
        }),
      ),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `MiniMax ${reasoningMode} request failed with status ${response.status}: ${detail.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as MiniMaxChatResponse;
    const choice = data.choices?.[0];
    const content = normalizeMiniMaxContent(choice?.message?.content) || choice?.text || "";

    if (!content) {
      throw new Error("MiniMax response content was empty.");
    }

    return stripMiniMaxThinking(content);
  } finally {
    clearTimeout(timeoutId);
  }
}
