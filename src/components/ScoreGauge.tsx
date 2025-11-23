// src/components/ScoreGauge.tsx
import ReactECharts from "echarts-for-react";
import type {} from "echarts";   // 关键就这一行！！！

interface Props {
  score: number;
  title: string;
}

export default function ScoreGauge({ score, title }: Props) {
  const color = score < 0.3 ? "#52c41a" : score < 0.6 ? "#faad14" : "#ff4d4f";

  const option = {
    series: [
      {
        type: "gauge",
        center: ["50%", "60%"],
        radius: "100%",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 1,
        splitNumber: 8,
        axisLine: { lineStyle: { width: 6, color: [[0.3, "#52c41a"], [0.6, "#faad14"], [1, "#ff4d4f"]] } },
        pointer: { width: 5, length: "80%", itemStyle: { color: color } },
        axisTick: { distance: -30, length: 8, lineStyle: { color: "#fff" } },
        splitLine: { distance: -35, length: 12, lineStyle: { color: "#fff" } },
        axisLabel: { distance: -60, color: "#999", fontSize: 12 },
        title: { offsetCenter: [0, "-30%"], fontSize: 16, color: "#333" },
        detail: {
          fontSize: 30,
          offsetCenter: [0, "-10%"],
          valueAnimation: true,
          formatter: "{value|.2f}",
          color: color,
        },
        data: [{ value: score.toFixed(3), name: title }],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 260 }} />;
}