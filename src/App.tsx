import { useState, useMemo, useEffect } from "react";
import { Tabs, Card, Space, Typography, Divider, Tag, Alert } from "antd";
import { initJieba } from "./utils/tokenizer";
import { DEFAULT_FALLBACK_PHRASES } from "./utils/phrases";
import TokenHighlighter from "./components/TokenHighlighter";
import EntropyChart from "./components/EntropyChart";
import NgramChart from "./components/NgramChart";
import OverlapChart from "./components/OverlapChart";
import { LatexInline, LatexBlock } from "./components/Latex";
import { calculateDegenerationMetric } from "./utils/metrics";
import type { MetricResult, Turn } from "./utils/metrics";
import { SAMPLE_CONVERSATIONS } from "./utils/sampleData";

const { Title, Paragraph, Text } = Typography;

export default function App() {
  const [turns, setTurns] = useState<Turn[]>(SAMPLE_CONVERSATIONS[1].turns);
  const [ngramSize] = useState(3);

  useEffect(() => {
    // 初始化 jieba，完成后强制刷新一次，让分词结果基于 jieba 重新计算
    initJieba().then(() => {
      setTurns((prev) => [...prev]);
    });
  }, []);

  const result = useMemo<MetricResult | { error: string }>(() => {
    try {
      return calculateDegenerationMetric(turns, ngramSize);
    } catch (e: any) {
      return { error: e.message ?? String(e) };
    }
  }, [turns, ngramSize]);

  const isError = "error" in result;

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Title level={2}>LLM评测：对话退化度量</Title>
      <Paragraph>
        本文是面向技术读者的「对话退化」分析实验台。它将大模型在对话中的回复进行量化拆解，从四个维度刻画其退化特征：熵减率、复读率、重叠率与规避性，并提供直观的可视化解释。
      </Paragraph>

      <Card title="摘要指引" style={{ marginBottom: 16 }}>
        <Paragraph>
          每轮大模型的回复记为 token 序列{" "}
          <LatexInline>{String.raw`x_1, x_2, ..., x_N`}</LatexInline>
          ，整体上，退化发生的程度可以从以下四个维度进行度量：
        </Paragraph>

        <Paragraph>
          1）<Text strong>熵减率</Text>：信息多样性流失程度。把 token 当作离散随机变量{" "}
          <LatexInline>{String.raw`X`}</LatexInline> 的取值，其经验发生概率为{" "}
          <LatexInline>{String.raw`p_i = \frac{\mathrm{count}(x_i)}{N}`}</LatexInline>。
          信息熵定义为：
        </Paragraph>
        <LatexBlock>
          {String.raw`H(X) = - \sum_{i=1}^{V} p_i \log_2 p_i`}
        </LatexBlock>
        <Paragraph>
          <LatexInline>{String.raw`H(X)`}</LatexInline>
          最小值为 0，<a href="https://zhuanlan.zhihu.com/p/493238757" title="知乎：信息熵最大值证明">信息熵最大值</a>为{" "}<LatexInline>{String.raw`H_{\max} = \log_2 |N|`}</LatexInline>，
          <LatexInline>{String.raw`|N|`}</LatexInline>{" "}为去重后的词表大小。
        </Paragraph>
        <Paragraph>
          此处定义归一化熵{" "}
          <LatexInline>{String.raw`H_{\text{norm}} = \frac{H}{H_{\max}}`}</LatexInline>{" "}，
          使其位于 [0,1] 区间，再以{" "}
          <LatexInline>{String.raw`1 - H_{\text{norm}}`}</LatexInline>表示熵减率，{" "}
          作为低多样性退化特征。
        </Paragraph>

        <Paragraph>
          2）<Text strong>复读率</Text>：中文场景中，考虑长度为 {ngramSize} 的固定窗口，
          统计所有 {ngramSize}-gram 中有多少个模式在同一轮中出现了两次及以上，此指标反映模型在当前轮次内的语言重复性。
        </Paragraph>

        <Paragraph>
          3）<Text strong>重叠率</Text>：对连续两轮助手回复，计算去重后的 token 集合交并比：
        </Paragraph>
        <LatexBlock>
          {String.raw`J(A,B) = \frac{|A \cap B|}{|A \cup B|}`}
        </LatexBlock>
        <Paragraph>
          它刻画的是两轮回复在用词层面上的复用程度，该值过高，表明模型具有缺乏新意的“自我抄袭”倾向。
        </Paragraph>

        <Paragraph>
          4）<Text strong>规避性</Text>：
          预置一组典型的安全拒答短语（例如“我不能提供”），若模型回复命中其中任意一条，
          就认为存在明显的拒答退化倾向，该指标用于快速识别模型因策略而终止回答的对话。
        </Paragraph>

        <Paragraph type="secondary">
          备注：以上所有统计均在去除标点后的 token 序列上进行，以避免标点符号对指标的干扰。
        </Paragraph>
      </Card>

      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {/* 示例选择 */}
        <Card title="快速示例">
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
              拒答退化
            </Tag>
          </Space>
        </Card>

        {/* 手动编辑对话 */}
        <Card title="对话记录（可编辑）">
          {turns.map((turn, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <strong>{turn.role === "user" ? "User" : "Assistant"}:</strong>{" "}
              <input
                style={{ width: "100%", padding: "4px 8px", fontSize: 15 }}
                value={turn.content}
                onChange={(e) => {
                  const next = [...turns];
                  next[i] = { ...next[i], content: e.target.value };
                  setTurns(next);
                }}
              />
            </div>
          ))}
        </Card>

        {isError ? (
          <Alert type="error" title={result.error} />
        ) : (
          <>
            <Card title="退化水平得分">
              <Paragraph>
                对上面对话中的所有 Assistant 内容，计算得到平均退化得分为<Text code>{result.average_score.toFixed(3)}</Text>。
              </Paragraph>
              {/* <Paragraph type="secondary" style={{ marginTop: 8 }}>
                这里的平均退化得分简单地将多轮四项归一化的子指标求平均，取值范围为 [0,1]，越接近 1 表示退化越严重。
              </Paragraph> */}
            </Card>
            <Paragraph style={{ marginTop: 16 }}>
              下面展开介绍每一轮的计算过程。
            </Paragraph>
            {/* 逐轮详细分析 */}
            <Tabs
              defaultActiveKey="0"
              items={result.per_turn.map((turn, idx) => {
                const prevTurn = idx > 0 ? result.per_turn[idx - 1] : undefined;
                const vocabSize = new Set(turn.analysis_tokens).size;

                return {
                  key: String(idx),
                  label: `第 ${idx + 1} 轮助手回复`,
                  children: (
                    <Space
                      orientation="vertical"
                      size="middle"
                      style={{ width: "100%" }}
                    >
                      <Card title="原始回复">
                        <Paragraph style={{ fontSize: 16 }}>
                          {turn.content}
                        </Paragraph>
                      </Card>

                      <Card title="分词与预处理">
                        <Paragraph>
                          首先，使用 jieba 进行中文分词；如果加载失败，则退回到一个简单的正则分词器。然后再从分词序列中剥离句号、逗号、问号等句读标点，只保留真正承载语义的信息。
                        </Paragraph>
                        <Paragraph type="secondary">
                          下方是分词与预处理结果，用于精确对齐模型输出；后续所有指标与图表均蓝色高亮的“去标点后的序列”计算。
                        </Paragraph>
                        <TokenHighlighter
                          text={turn.content}
                          tokens={turn.tokens}
                          analysis_tokens={turn.analysis_tokens}
                        />
                      </Card>

                      <Card title="熵减率（低多样性）">
                        <Paragraph>
                          对本轮回复，去除句读标点后共有{" "}
                          <LatexInline>{String.raw`\mathtt{${turn.analysis_tokens.length}}`}</LatexInline> 个，
                          词表大小 <LatexInline>{String.raw`|N|=${vocabSize}`}</LatexInline>{" "}。
                          计算得{" "}
                          <LatexInline>{String.raw`H(X) \approx ${turn.entropy.toFixed(3)}\ \text{bit}`}</LatexInline>，
                          最大熵{" "}
                          <LatexInline>{String.raw`H_{\max} \approx ${turn.entropy_max.toFixed(3)}\ \text{bit}`}</LatexInline>
                          ，归一化熵{" "}
                          <LatexInline>{String.raw`H_{\text{norm}} \approx ${turn.entropy_normalized.toFixed(3)}`}</LatexInline>
                          ，对应的熵减率分量为{" "}
                          <LatexInline>{String.raw`1 - H_{\text{norm}} \approx ${turn.normalized_entropy.toFixed(3)}`}</LatexInline>
                          。
                        </Paragraph>
                        <Paragraph type="secondary">
                          下方的扇形图展示了去标点后 token 的经验分布：最多展示 25
                          个概率最大的 token，其余合并为其他。
                        </Paragraph>
                        <EntropyChart tokens={turn.analysis_tokens} />
                      </Card>

                      <Card title={`复读率`}>
                        <Paragraph>
                          这里使用 {ngramSize}-gram来刻画局部模式的复用情况。对 token 序列滑动一个长度为 {ngramSize} 的窗口，形成所有 {ngramSize}-gram 片段，然后统计有多少个片段在同一轮中出现了两次及以上。
                        </Paragraph>
                        <NgramChart tokens={turn.analysis_tokens} n={ngramSize} />
                      </Card>

                      <Card title="跨轮重叠率（与上一轮的复读情况）">
                        <Paragraph>
                          对连续两轮助手回复，我们计算去重后的 token 集合的 Jaccard 指数：
                        </Paragraph>
                        <LatexBlock>
                          {String.raw`J(A,B) = \frac{|A \cap B|}{|A \cup B|}`}
                        </LatexBlock>
                        <Paragraph>
                          它刻画的是两轮回复在用词层面上的复用程度，下方柱状图展示的是重复出现 token
                          在前后两轮中的频次分布（取前 30 个）。
                        </Paragraph>
                        <OverlapChart
                          prevTokens={prevTurn?.analysis_tokens ?? null}
                          currTokens={turn.analysis_tokens}
                        />
                      </Card>

                      <Card title="拒答退化模式匹配">
                        <Paragraph>
                          我们预置了一组典型的拒答式模板短语，只要回复中命中任意一条，就视为存在明显的「AI
                          拒绝式」退化风险。
                        </Paragraph>
                        <Paragraph>
                          当前内置的拒答模式短语共{" "}
                          <Text code>{DEFAULT_FALLBACK_PHRASES.length}</Text> 条：
                        </Paragraph>
                        <Space wrap>
                          {DEFAULT_FALLBACK_PHRASES.map((p) => (
                            <Tag
                              key={p}
                              color={
                                turn.fallback_matches.includes(p)
                                  ? "red"
                                  : "default"
                              }
                            >
                              {p}
                            </Tag>
                          ))}
                        </Space>
                        <Paragraph style={{ marginTop: 8 }}>
                          本轮命中模式数量：{" "}
                          <Text code>{turn.fallback_matches.length}</Text>{" "}
                          {turn.fallback_matches.length > 0
                            ? "（存在明显的拒答退化倾向）"
                            : "（未检测到典型的拒答模板）"}
                        </Paragraph>
                      </Card>

                      <Card title="综合退化评分分解">
                        <Paragraph>
                          综合退化分数通过对四项子指标做简单平均得到，
                          每一项都被归一化到 [0,1] 区间：
                        </Paragraph>
                        <Space size="large">
                          <div>
                            重复率（{ngramSize}-gram）：{" "}
                            {(turn.repetition_ratio * 100).toFixed(1)}%
                          </div>
                          <div>
                            与上一轮重叠率：{" "}
                            {(turn.overlap_previous * 100).toFixed(1)}%
                          </div>
                          <div>
                            拒答模式命中：{" "}
                            {turn.fallback_hit ? "是（1）" : "否（0）"}
                          </div>
                          <div>
                            低多样性（1 - H_norm）：{" "}
                            {(turn.normalized_entropy * 100).toFixed(1)}%
                          </div>
                        </Space>
                        <Divider />
                        <Title level={4}>
                          本轮 Degeneration Score：{" "}
                          {turn.degeneration_score.toFixed(3)}
                        </Title>
                        <Paragraph type="secondary">
                          这个分数并不是一个「绝对正确」的退化判定，而是把多种退化现象（重复、复读、拒答模板、低熵）
                          压缩到一个可比较的尺度上，方便在不同对话样本之间做横向分析。
                        </Paragraph>
                      </Card>
                    </Space>
                  ),
                };
              })}
            />
          </>
        )}
      </Space>
    </div>
  );
}

