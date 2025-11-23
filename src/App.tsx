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
      <Title level={2}>Conversation Degeneration Metric 可视化解释器</Title>
      <Paragraph>
        这是一个面向技术读者的「对话退化」分析实验台。它把大模型在一次对话中的回复拆解为
        分词、信息熵、n-gram 重复率、跨轮重叠率以及拒答模板命中情况，并给出可视化解释。
      </Paragraph>

      <Card title="方法总览（阅读指引）" style={{ marginBottom: 16 }}>
        <Paragraph>
          整体上，我们把每一轮助手回复视作一个 token 序列{" "}
          <Text code>(x_1, x_2, ..., x_N)</Text>，然后从四个角度刻画退化：
        </Paragraph>

        <Paragraph>
          1）<Text strong>信息熵</Text>：把 token 当作离散随机变量{" "}
          <LatexInline>{String.raw`X`}</LatexInline> 的取值，经验概率为{" "}
          <LatexInline>{String.raw`p_i = \frac{\mathrm{count}(x_i)}{N}`}</LatexInline>。
          信息熵定义为：
        </Paragraph>
        <LatexBlock>
          {String.raw`H(X) = - \sum_{i=1}^{V} p_i \log_2 p_i`}
        </LatexBlock>
        <Paragraph>
          最小值为 0（所有概率集中在一个 token 上），最大值为{" "}
          <LatexInline>{String.raw`H_{\max} = \log_2 V`}</LatexInline>（所有
          token 等概率出现，<LatexInline>{String.raw`V = |{\mathcal V}|`}</LatexInline>{" "}
          为去重后的词表大小）。
          我们使用归一化熵{" "}
          <LatexInline>{String.raw`H_{\text{norm}} = \frac{H}{H_{\max}}`}</LatexInline>{" "}
          使其位于 [0,1] 区间，再以{" "}
          <LatexInline>{String.raw`1 - H_{\text{norm}}`}</LatexInline>{" "}
          作为「低多样性」退化特征。
        </Paragraph>

        <Paragraph>
          2）<Text strong>{ngramSize}-gram 重复率</Text>：仅考虑长度为 {ngramSize} 的固定窗口
          （例如「作为 / 一个 / AI」），统计所有 {ngramSize}-gram 中有多少个模式在同一轮中出现了两次及以上。
        </Paragraph>

        <Paragraph>
          3）<Text strong>跨轮重叠率</Text>：对连续两轮助手回复，计算去重后的 token 集合交并比
          （Jaccard 指数）：
        </Paragraph>
        <LatexBlock>
          {String.raw`J(A,B) = \frac{|A \cap B|}{|A \cup B|}`}
        </LatexBlock>
        <Paragraph>
          它刻画的是两轮回复在用词层面上的复用程度，我们还会用柱状图展示每个重复 token 在前后两轮中的出现频次。
        </Paragraph>

        <Paragraph>
          4）<Text strong>拒答退化（模板化拒绝回答）</Text>：
          预置一组典型的拒答短语（例如「作为一个 AI 语言模型…」「我不能提供…」），只要回复中命中任意一条，
          就认为存在明显的拒答退化倾向。
        </Paragraph>

        <Paragraph type="secondary">
          注意：所有统计量在内部都基于「去除句读标点后的 token 序列」计算（例如去掉中文逗号、句号、问号等），
          以避免标点本身对熵与重复指标的干扰；但界面展示的分词结果仍保留原始标点，以便对齐原文。
        </Paragraph>
      </Card>

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
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
              严重退化（经典 AI 拒绝式）
            </Tag>
          </Space>
        </Card>

        {/* 手动编辑对话 */}
        <Card title="对话记录（可编辑，支持粘贴实际对话）">
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
          <Alert type="error" message={result.error} />
        ) : (
          <>
            <Card title="整体退化概览">
              <Paragraph>
                对当前对话中的所有助手回复，我们计算了每一轮的退化得分，并给出了平均分与峰值。
              </Paragraph>
              <Space size="large">
                <div>
                  平均 Degeneration Score：{" "}
                  <Text code>{result.average_score.toFixed(3)}</Text>
                </div>
                <div>
                  最高 Degeneration Score：{" "}
                  <Text code>{result.peak_score.toFixed(3)}</Text>
                </div>
              </Space>
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                这里的综合得分简单地把四项子指标（{ngramSize}-gram 重复率、跨轮重叠率、
                拒答退化命中、低信息熵）做归一化之后求平均，取值范围为 [0,1]，
                越接近 1 表示退化越严重。
              </Paragraph>
            </Card>

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
                      direction="vertical"
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
                          本工具优先使用 wasm 版 jieba 进行中文分词；如果加载失败，则退回到一个简单的正则
                          tokenizer。首先在原文上获得 token 序列，然后再从 token 中剥离句号、逗号、问号等句读标点，
                          只保留真正承载语义的信息 token。
                        </Paragraph>
                        <Paragraph type="secondary">
                          下方高亮的是「原始 token」（包含标点），用于精确对齐模型输出；
                          后续所有指标与图表均基于「去标点后的 token 序列」计算。
                        </Paragraph>
                        <TokenHighlighter
                          text={turn.content}
                          tokens={turn.tokens}
                        />
                      </Card>

                      <Card title="信息熵分析（多样性）">
                        <Paragraph>
                          我们把每个 token 看作随机变量{" "}
                          <LatexInline>{String.raw`X`}</LatexInline> 的取值，估计其经验概率{" "}
                          <LatexInline>
                            {String.raw`p_i = \frac{\mathrm{count}(x_i)}{N}`}
                          </LatexInline>
                          ，其中 N 为本轮 token 总数。信息熵定义为：
                        </Paragraph>
                        <LatexBlock>
                          {String.raw`H(X) = - \sum_{i=1}^{V} p_i \log_2 p_i`}
                        </LatexBlock>
                        <Paragraph>
                          当所有概率集中在一个 token 上时，H(X) = 0；当所有 token
                          等概率出现时，熵取得最大值{" "}
                          <LatexInline>
                            {String.raw`H_{\max} = \log_2 V`}
                          </LatexInline>
                          ，其中 V 为词表大小。为了便于不同回复之间比较，我们使用归一化熵{" "}
                          <LatexInline>
                            {String.raw`H_{\text{norm}} = \frac{H}{H_{\max}}`}
                          </LatexInline>
                          ，并将{" "}
                          <LatexInline>
                            {String.raw`1 - H_{\text{norm}}`}
                          </LatexInline>{" "}
                          视为「低多样性」退化特征。
                        </Paragraph>
                        <Paragraph>
                          对本轮回复，去除句读标点后共有{" "}
                          <Text code>{turn.analysis_tokens.length}</Text> 个
                          token，词表大小 |V| ={" "}
                          <Text code>{vocabSize}</Text>。实测{" "}
                          <Text code>H(X) ≈ {turn.entropy.toFixed(3)} bit</Text>，
                          最大熵{" "}
                          <Text code>
                            H_max ≈ {turn.entropy_max.toFixed(3)} bit
                          </Text>
                          ，归一化熵{" "}
                          <Text code>
                            H_norm ≈ {turn.entropy_normalized.toFixed(3)}
                          </Text>
                          ，对应的「低多样性」分量为{" "}
                          <Text code>
                            1 - H_norm ≈ {turn.normalized_entropy.toFixed(3)}
                          </Text>
                          。
                        </Paragraph>
                        <Paragraph type="secondary">
                          下方的扇形图展示了去标点后 token 的经验分布：最多展示 25
                          个概率最大的 token，其余合并为「其他」。
                        </Paragraph>
                        <EntropyChart tokens={turn.analysis_tokens} />
                      </Card>

                      <Card title={`${ngramSize}-gram 重复率（局部模式复用）`}>
                        <Paragraph>
                          这里我们使用 {ngramSize}-gram（本例中为 3-gram）来刻画局部模式的复用情况。
                          对 token 序列滑动一个长度为 {ngramSize} 的窗口，形成所有
                          {ngramSize}-gram 片段，然后统计有多少个片段在同一轮中出现了两次及以上。
                        </Paragraph>
                        <Paragraph type="secondary">
                          简单说，就是回答中是否不断复用相同的局部短语模式，比如「作为 / 一个 / AI」「我 / 不能 / 提供」等。
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

