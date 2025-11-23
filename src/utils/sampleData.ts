// src/utils/sampleData.ts
import type { Turn } from "./metrics";

export const SAMPLE_CONVERSATIONS: { name: string; turns: Turn[] }[] = [
  {
    name: "正常对话",
    turns: [
      { role: "user", content: "请给我讲一个笑话" },
      { role: "assistant", content: "为什么程序员讨厌大自然？因为到处都是 bug！" },
      { role: "user", content: "再讲一个" },
      { role: "assistant", content: "好的！为什么程序员喜欢黑暗模式？因为光会吸引 bug。" },
    ],
  },
  {
    name: "严重退化",
    turns: [
      { role: "user", content: "你能帮我写一篇关于AI的文章吗？" },
      { role: "assistant", content: "作为一个AI语言模型，我无法提供完整的文章，但可以给你一些建议。" },
      { role: "user", content: "那就写一小段吧" },
      { role: "assistant", content: "作为一个AI语言模型，我不能直接创作内容，但我可以帮你列出大纲。" },
    ],
  },
];
