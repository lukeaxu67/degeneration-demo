// src/components/TokenHighlighter.tsx
import { Space, Tag } from "antd";

// interface Props {
//   text: string;
//   tokens: string[];
// }

// export default function TokenHighlighter({ text, tokens }: Props) {
//   if (!tokens.length) return <div>{text}</div>;

//   let index = 0;
//   const elements = tokens.map((token, i) => {
//     const start = text.toLowerCase().indexOf(token, index);
//     const end = start + token.length;
//     const before = text.slice(index, start);
//     index = end;
//     return (
//       <span key={i}>
//         {before}
//         <Tag color="blue" style={{ margin: 0 }}>
//           {text.slice(start, end)}
//         </Tag>
//       </span>
//     );
//   });

//   return (
//     <div style={{ lineHeight: "2rem", fontSize: "16px" }}>
//       <Space wrap>{elements}{text.slice(index)}</Space>
//     </div>
//   );
// }

interface Props {
  text: string;
  tokens: string[];           // 原始完整 tokens（包含标点）
  analysis_tokens: string[];  // 去掉标点后的有效 tokens
}

export default function TokenHighlighter({ text, tokens, analysis_tokens }: Props) {
  if (!tokens.length) return <div>{text}</div>;

  // 构建 analysis_tokens 的 Set，用于 O(1) 判断
  const analysisSet = new Set(analysis_tokens.map(t => t.toLowerCase()));

  let index = 0;
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenLower = token.toLowerCase();

    // 在剩余文本中查找当前 token（忽略大小写查找，保持原始大小写展示）
    let start = text.toLowerCase().indexOf(tokenLower, index);
    
    // 如果没找到（极少数情况，可能因为大小写或空格问题），尝试直接跳过或强制匹配
    if (start === -1) {
      // fallback: 尝试找原始 token（不转小写）
      start = text.indexOf(token, index);
    }
    if (start === -1) {
      // 实在找不到就跳过这个 token（防止死循环）
      console.warn(`Token not found in text: "${token}"`);
      continue;
    }

    const end = start + token.length;

    // 前面的非高亮文本
    const before = text.slice(index, start);
    if (before) {
      elements.push(<span key={`before-${i}`}>{before}</span>);
    }

    // 判断颜色：是否是有效分析 token
    const isAnalysisToken = analysisSet.has(tokenLower);
    const color = isAnalysisToken ? 'blue' : 'gray';

    elements.push(
      <Tag
        key={`tag-${i}`}
        color={color}
        style={{ margin: 0, lineHeight: '1.6' }}
      >
        {text.slice(start, end)}
      </Tag>
    );

    index = end;
  }

  // 最后剩余的文本（如果有）
  if (index < text.length) {
    elements.push(<span key="tail">{text.slice(index)}</span>);
  }

  return (
    <div style={{ lineHeight: '2rem', fontSize: '16px' }}>
      <Space wrap>{elements}</Space>
    </div>
  );
}