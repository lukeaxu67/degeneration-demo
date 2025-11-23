// src/utils/tokenizer.ts
// Tokenization helper: prefer wasm jieba, fallback to a simple regex tokenizer.

import { ready, init, cut } from "@congcongcai/jieba.js";

let jiebaReady = false;
let jiebaInitPromise: Promise<void> | null = null;

// Explicit init; call once from App on startup.
export const initJieba = () => {
  if (!jiebaInitPromise) {
    jiebaInitPromise = ready()
      .then(() => {
        init(); // use built-in dictionaries
        jiebaReady = true;
        console.log("[tokenizer] jieba ready");
      })
      .catch((err) => {
        console.error("[tokenizer] failed to init jieba wasm", err);
        jiebaReady = false;
      });
  }
  return jiebaInitPromise;
};

// Very simple Chinese-oriented tokenizer as a safe fallback.
const fallbackTokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[\u3000-\u303F\uFF00-\uFFEF\s\n\r]+/g, " ")
    .split(/[\s,，。！!?？！“”'"（）()【】[\]、\\\/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

// Main synchronous API used by metrics.ts.
export const tokenize = (text: string): string[] => {
  if (!text?.trim()) return [];

  if (!jiebaReady) {
    // wasm not ready yet; use fallback so UI still works.
    return fallbackTokenize(text);
  }

  try {
    const words = cut(text);
    return words.map((w) => w.toLowerCase().trim()).filter((w) => w.length > 0);
  } catch (err) {
    console.warn("[tokenizer] jieba wasm failed, fallback to regex", err);
    return fallbackTokenize(text);
  }
};

