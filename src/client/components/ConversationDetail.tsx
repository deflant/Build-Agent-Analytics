import React, { useEffect, useState } from "react";
import { display, value, parseMessageContent, senderLabel, countMessagesBySender } from "../utils/fields.ts";
import { fetchConversation, fetchMessages, fetchCheckpoints } from "../services/api.ts";
import { analyzeConversation, analyzeMessage, formatEstimate, formatTokenCount } from "../utils/tokenEstimation.ts";
import type { ConversationTokenUsage, MessageTokenInfo } from "../utils/tokenEstimation.ts";
import KpiCard from "./KpiCard.tsx";
import DataTable from "./DataTable.tsx";
import MarkdownRenderer from "./MarkdownRenderer.tsx";

interface ConversationDetailProps {
  conversationId: string;
  onNavigate: (view: string, id?: string) => void;
}

/** Represents a grouped block of behind-the-scenes messages */
interface BehindTheScenesBlock {
  type: "behind-the-scenes";
  messages: Array<{ sender: string; text: string; toolName?: string; tokenInfo?: MessageTokenInfo | null }>;
}

/** Represents a visible chat message (user or assistant) */
interface ChatBubble {
  type: "user" | "assistant";
  text: string;
  tokenInfo?: MessageTokenInfo | null;
}

type ConversationItem = BehindTheScenesBlock | ChatBubble;

/**
 * Groups raw messages into conversation items with token info:
 * - user/assistant messages become ChatBubbles
 * - consecutive thinking/tool messages are grouped into BehindTheScenesBlocks
 */
function groupMessages(rawMessages: any[]): ConversationItem[] {
  const items: ConversationItem[] = [];
  let pendingBTS: BehindTheScenesBlock["messages"] = [];

  function flushBTS() {
    if (pendingBTS.length > 0) {
      items.push({ type: "behind-the-scenes", messages: [...pendingBTS] });
      pendingBTS = [];
    }
  }

  for (const msg of rawMessages) {
    const parsed = parseMessageContent(msg.content);
    if (!parsed) continue;

    const tokenInfo = analyzeMessage(msg);

    if (parsed.sender === "user") {
      flushBTS();
      items.push({ type: "user", text: parsed.text, tokenInfo });
    } else if (parsed.sender === "assistant") {
      flushBTS();
      items.push({ type: "assistant", text: parsed.text, tokenInfo });
    } else {
      // assistant-thinking or assistant-tool
      pendingBTS.push({
        sender: parsed.sender,
        text: parsed.text,
        toolName: parsed.toolName,
        tokenInfo,
      });
    }
  }
  flushBTS();
  return items;
}

/** Inline token badge component */
function TokenBadge({ info }: { info: MessageTokenInfo | null | undefined }) {
  if (!info || info.tokens === 0) return null;
  return (
    <span className={`token-badge token-badge--${info.bucket}`}>
      {info.bucket}: ~{formatTokenCount(info.tokens)}
    </span>
  );
}

/** Token usage summary tree component */
function TokenUsageSummary({ usage }: { usage: ConversationTokenUsage }) {
  return (
    <div className="token-summary">
      <div className="token-summary__header">
        <span className="token-summary__icon">📊</span>
        <span className="token-summary__title">Token Usage (est.)</span>
        <span className="token-summary__total">{formatEstimate(usage.total)} tokens</span>
      </div>
      <div className="token-summary__tree">
        <div className="token-summary__row">
          <span className="token-summary__branch">├─</span>
          <span className="token-summary__label">input:</span>
          <span className="token-summary__value token-summary__value--input">{formatTokenCount(usage.input)}</span>
        </div>
        <div className="token-summary__row">
          <span className="token-summary__branch">├─</span>
          <span className="token-summary__label">output:</span>
          <span className="token-summary__value token-summary__value--output">{formatTokenCount(usage.output)}</span>
        </div>
        <div className="token-summary__row">
          <span className="token-summary__branch">└─</span>
          <span className="token-summary__label">thinking:</span>
          <span className="token-summary__value token-summary__value--thinking">{formatTokenCount(usage.thinking)}</span>
        </div>
      </div>
    </div>
  );
}

/** Collapsible "behind the scenes" block */
function BehindTheScenes({ messages }: { messages: BehindTheScenesBlock["messages"] }) {
  const [expanded, setExpanded] = useState(false);

  const thinkingCount = messages.filter(m => m.sender === "assistant-thinking").length;
  const toolCount = messages.filter(m => m.sender === "assistant-tool").length;

  // Sum tokens in this block
  const blockTokens = messages.reduce((sum, m) => sum + (m.tokenInfo?.tokens || 0), 0);

  let summary = "";
  if (thinkingCount > 0 && toolCount > 0) {
    summary = `${thinkingCount} reasoning · ${toolCount} tool call${toolCount > 1 ? "s" : ""}`;
  } else if (thinkingCount > 0) {
    summary = `${thinkingCount} reasoning step${thinkingCount > 1 ? "s" : ""}`;
  } else {
    summary = `${toolCount} tool call${toolCount > 1 ? "s" : ""}`;
  }

  return (
    <div className="chat-bts">
      <button
        className="chat-bts__toggle"
        onClick={() => setExpanded(!expanded)}
        type="button"
        aria-expanded={expanded}
      >
        <span className="chat-bts__icon">{expanded ? "▾" : "▸"}</span>
        <span className="chat-bts__label">⚙️ Agent Processing</span>
        <span className="chat-bts__summary">{summary}</span>
        {blockTokens > 0 && (
          <span className="chat-bts__tokens">~{formatTokenCount(blockTokens)} tok</span>
        )}
      </button>
      {expanded && (
        <div className="chat-bts__content">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bts__item chat-bts__item--${m.sender === "assistant-thinking" ? "thinking" : "tool"}`}>
              <span className="chat-bts__item-icon">
                {m.sender === "assistant-thinking" ? "🧠" : "🔧"}
              </span>
              <div className="chat-bts__item-body">
                <span className="chat-bts__item-label">
                  {m.sender === "assistant-thinking" ? "Thinking" : (m.toolName || "Tool Call")}
                  {m.tokenInfo && m.tokenInfo.tokens > 0 && (
                    <TokenBadge info={m.tokenInfo} />
                  )}
                </span>
                {m.text && (
                  <p className="chat-bts__item-text">{m.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConversationDetail({
  conversationId,
  onNavigate,
}: ConversationDetailProps) {
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [assistantCount, setAssistantCount] = useState(0);
  const [tokenUsage, setTokenUsage] = useState<ConversationTokenUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [conversationId]);

  async function loadData() {
    try {
      const [convo, msgs, chks] = await Promise.all([
        fetchConversation(conversationId),
        fetchMessages(conversationId),
        fetchCheckpoints(conversationId),
      ]);
      setConversation(convo);
      setMessages(msgs);
      setCheckpoints(chks);

      const counts = countMessagesBySender(msgs);
      setUserCount(counts.user);
      setAssistantCount(counts.assistant);

      // Compute token usage
      const usage = analyzeConversation(msgs);
      setTokenUsage(usage);
    } catch (e) {
      console.error("ConversationDetail load error:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="ba-loading">Loading conversation...</div>;
  if (!conversation) return <div className="ba-empty">Conversation not found</div>;

  const conversationItems = groupMessages(messages);

  const chkColumns = [
    { key: "sequence", label: "Seq", render: (r: any) => display(r.sequence) },
    { key: "name", label: "Name", render: (r: any) => display(r.name) || "—" },
    { key: "status", label: "Status", render: (r: any) => display(r.status) },
  ];

  // Determine back navigation based on whether we know the app
  const appId = value(conversation.application_id);
  const backTarget = appId ? "app-detail" : "applications";
  const backId = appId || undefined;
  const backLabel = appId ? "← Back to Application" : "← Back to Applications";

  return (
    <div className="ba-view">
      <button
        className="ba-back-btn"
        onClick={() => onNavigate(backTarget, backId)}
        type="button"
      >
        {backLabel}
      </button>
      <h1 className="ba-view__title">{display(conversation.title) || "Untitled"}</h1>
      <div className="ba-detail-grid">
        <div className="ba-detail-item">
          <span className="ba-detail-item__label">Application</span>
          <span className="ba-detail-item__value">{display(conversation.application_name) || "—"}</span>
        </div>
        <div className="ba-detail-item">
          <span className="ba-detail-item__label">User</span>
          <span className="ba-detail-item__value">{display(conversation.user)}</span>
        </div>
        <div className="ba-detail-item">
          <span className="ba-detail-item__label">State</span>
          <span className="ba-detail-item__value">{display(conversation.state)}</span>
        </div>
        <div className="ba-detail-item">
          <span className="ba-detail-item__label">Client</span>
          <span className="ba-detail-item__value">{display(conversation.client)}</span>
        </div>
        <div className="ba-detail-item">
          <span className="ba-detail-item__label">Created</span>
          <span className="ba-detail-item__value">{display(conversation.sys_created_on)}</span>
        </div>
      </div>
      <div className="ba-kpi-row">
        <KpiCard title="User Messages" value={userCount} icon="user" />
        <KpiCard title="Assistant Messages" value={assistantCount} icon="assistant" />
        <KpiCard title="Total Messages" value={messages.length} />
        <KpiCard title="Checkpoints" value={checkpoints.length} />
      </div>

      {/* Token Usage Summary */}
      {tokenUsage && tokenUsage.total > 0 && (
        <div className="ba-section">
          <TokenUsageSummary usage={tokenUsage} />
        </div>
      )}

      {/* Chat-style conversation */}
      <div className="ba-section">
        <h2 className="ba-section__title">Conversation</h2>
        <div className="chat-container">
          {conversationItems.map((item, idx) => {
            if (item.type === "behind-the-scenes") {
              return <BehindTheScenes key={idx} messages={item.messages} />;
            }
            if (item.type === "user") {
              return (
                <div key={idx} className="chat-row chat-row--user">
                  <div className="chat-bubble chat-bubble--user">
                    <p className="chat-bubble__text">{item.text || <em>Empty message</em>}</p>
                    <TokenBadge info={item.tokenInfo} />
                  </div>
                </div>
              );
            }
            // assistant
            return (
              <div key={idx} className="chat-row chat-row--assistant">
                <div className="chat-bubble chat-bubble--assistant">
                  {item.text ? (
                    <MarkdownRenderer content={item.text} />
                  ) : (
                    <p className="chat-bubble__text"><em>Empty message</em></p>
                  )}
                  <TokenBadge info={item.tokenInfo} />
                </div>
              </div>
            );
          })}
          {conversationItems.length === 0 && (
            <div className="chat-empty">No messages in this conversation</div>
          )}
        </div>
      </div>

      <div className="ba-section">
        <h2 className="ba-section__title">Checkpoints ({checkpoints.length})</h2>
        <DataTable columns={chkColumns} rows={checkpoints} emptyMessage="No checkpoints" />
      </div>
    </div>
  );
}
