const path = require("path");

const VERSION = "0.3.0";
const PORT = Number(process.env.PORT || 4173);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const CONTENT_ROOT = process.env.ENGLISH_TIPS_ROOT
  ? path.resolve(process.env.ENGLISH_TIPS_ROOT)
  : path.resolve(PROJECT_ROOT, "..", "English-level-up-tips", "docs");

const DATA_ROOT = process.env.ENGLISH_COACH_DATA_ROOT
  ? path.resolve(process.env.ENGLISH_COACH_DATA_ROOT)
  : path.join(PROJECT_ROOT, ".data");

const PUBLIC_ROOT = path.join(PROJECT_ROOT, "public");

const COACH_MODE = (process.env.COACH_MODE || "local").toLowerCase();
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);
const RAG_TOP_K = Number(process.env.RAG_TOP_K || 5);

const OPENAI_COMPATIBLE_BASE_URL = process.env.OPENAI_COMPATIBLE_BASE_URL || "https://api.openai.com/v1";
const OPENAI_COMPATIBLE_API_KEY = process.env.OPENAI_COMPATIBLE_API_KEY || "";
const OPENAI_COMPATIBLE_MODEL = process.env.OPENAI_COMPATIBLE_MODEL || "gpt-4o-mini";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

module.exports = {
  VERSION,
  PORT,
  PROJECT_ROOT,
  CONTENT_ROOT,
  DATA_ROOT,
  PUBLIC_ROOT,
  COACH_MODE,
  LLM_TIMEOUT_MS,
  RAG_TOP_K,
  OPENAI_COMPATIBLE_BASE_URL,
  OPENAI_COMPATIBLE_API_KEY,
  OPENAI_COMPATIBLE_MODEL,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL
};
