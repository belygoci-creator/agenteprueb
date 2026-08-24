import Anthropic from "@anthropic-ai/sdk";

/** Cliente de la API de Claude. Se usa solo en el servidor (route handlers). */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = "claude-sonnet-5";
