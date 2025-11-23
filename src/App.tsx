import { useState, useMemo, useEffect } from "react";
import { initJieba } from "./utils/tokenizer";
import { Tabs, Card, Space, Typography, Divider, Tag, Alert } from "antd";
import TokenHighlighter from "./components/TokenHighlighter";
import EntropyChart from "./components/EntropyChart";
import NgramChart from "./components/NgramChart";
import ScoreGauge from "./components/ScoreGauge";
import { calculateDegenerationMetric } from "./utils/metrics";
import { SAMPLE_CONVERSATIONS } from "./utils/sampleData";

const { Title, Paragraph } = Typography;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [turns, setTurns] = useState<Turn[]>(SAMPLE_CONVERSATIONS[1].turns);
  const [ngramSize] = useState(3);

  useEffect(() => {
    // 初始化 jieba，完成后强制刷新一次，让分词结果基于 jieba 重新计算
    initJieba().then(() => {
      setTurns((prev) => [...prev]);
    });
  }, []);

  const result = useMemo(() => {
    try {
      return calculateDegenerationMetric(turns, ngramSize);
    } catch (e: any) {
      return { error: e.message };
    }
  }, [turns, ngramSize]);

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Title level={2}>Conversation Degeneration Metric 可视化解释器</Title>
      <Paragraph>实时展示 LLM 对话退化（degeneration）指标的完整计算过程</Paragraph>

      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {/* 示例选择 */}
        <Card title="快速体验示例">
          <Space>
            <Tag
              color={turns === SAMPLE_CONVERSATIONS[0].turns ? "green" : "default"}
              style={{ cursor: "pointer" }}
              onClick={() => setTurns(SAMPLE_CONVERSATIONS[0].turns)}
            >
              正常对话
            </Tag>
            <Tag
              color={turns === SAMPLE_CONVERSATIONS[1].turns ? "red" : "default"}
              style={{ cursor: "pointer" }}
              onClick={() => setTurns(SAMPLE_CONVERSATIONS[1].turns)}
            >
              严重退化（经典 AI 拒绝式）
            </Tag>
          </Space>
        </Card>

        {/* 手动编辑对话（可选） */}
        <Card title="对话记录（可编辑）">
          {turns.map((turn, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <strong>{turn.role === "user" ? "用户" : "助手"}:</strong>{" "}
              <input
                style={{ width: "100%", padding: "4px 8px", fontSize: 15 }}
                value={turn.content}
                onChange={(e) => {
                  const newTurns = [...turns];
                  newTurns[i].content = e.target.value;
                  setTurns(newTurns);
                }}
              />
            </div>
          ))}
        </Card>

        {"error" in result ? (
          <Alert type="error" message={result.error} />
        ) : (
          <>
            {/* 核心评分 */}
            <Card>
              <Space size="large" wrap>
                fdjsklqk 
                <ScoreGauge score={result.peak_score} title="Peak Degeneration" />
                <ScoreGauge score={result.average_score} title="Average Score" />
              </Space>
            </Card>

            {/* 逐轮详细分析 */}
            <Tabs
              defaultActiveKey="0"
              items={result.per_turn.map((turn, idx) => ({
                key: String(idx),
                label: `第${idx + 1} 轮助手回复`,
                children: (
                  <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                    <Card title="原始回复">
                      <Paragraph style={{ fontSize: 16 }}>{turn.content}</Paragraph>
                    </Card>

                    <Card title="分词结果（jieba）">
                      <TokenHighlighter text={turn.content} tokens={turn.tokens} />
                    </Card>

                    <Card title="信息熵分析">
                      <EntropyChart tokens={turn.tokens} />
                    </Card>

                    <Card title={`${ngramSize}-gram 重复情况`}>
                      <NgramChart tokens={turn.tokens} n={ngramSize} />
                    </Card>

                    <Card title="四项子指标">
                      <Space size="large">
                        <div>重复度 {(turn.repetition_ratio * 100).toFixed(1)}%</div>
                        <div>与上轮重合 {(turn.overlap_previous * 100).toFixed(1)}%</div>
                        <div>拒绝词命中 {turn.fallback_hit ? "是" : "否"}</div>
                        <div>低多样性 {(turn.normalized_entropy * 100).toFixed(1)}%</div>
                      </Space>
                      <Divider />
                      <Title level={4}>
                        本轮 Degeneration Score: {turn.degeneration_score.toFixed(3)}
                      </Title>
                    </Card>
                  </Space>
                ),
              }))}
            />
          </>
        )}
      </Space>
    </div>
  );
}

