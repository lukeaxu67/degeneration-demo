// src/components/NgramChart.tsx
import ReactECharts from "echarts-for-react";

interface Ngram {
  ngram: string;
  count: number;
}

interface Props {
  tokens: string[];
  n: number;
}

export default function NgramChart({ tokens, n }: Props) {
  if (tokens.length < n) return <div>长度不足，无法生成 {n}-gram。</div>;

  // 构造 n-gram 频次
  const freq: Record<string, number> = {};
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    freq[gram] = (freq[gram] || 0) + 1;
  }

  const ngrams: Ngram[] = Object.entries(freq).map(([ngram, count]) => ({
    ngram,
    count,
  }));

  const totalNgrams = ngrams.length;
  const repeatedNgrams = ngrams.filter((g) => g.count > 1).length;

  const treemapData = ngrams
    .sort((a, b) => b.count - a.count)
    .map((g) => ({
      name: g.ngram,
      value: g.count,
    }));

  const option = {
    tooltip: {
      formatter: (params: any) => {
        return `${params.name}: 出现 ${params.value} 次`;
      },
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        label: {
          show: true,
          formatter: (info: any) => {
            const name: string = info.name || "";
            const count: number = info.value || 0;
            const short =
              name.length > 20 ? name.slice(0, 20) + "…" : name;
            return `${short}\n(${count})`;
          },
        },
        upperLabel: { show: false },
        data: treemapData,
      },
    ],
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        本轮共生成 {totalNgrams} 个 {n}-gram，其中 {repeatedNgrams} 个模式出现了两次及以上，对应的复读率为。矩形树图中的矩形越大，表示该 {n}-gram 在回复中的重复越严重。
      </div>
      <ReactECharts option={option} style={{ height: 320 }} />
    </div>
  );
}

