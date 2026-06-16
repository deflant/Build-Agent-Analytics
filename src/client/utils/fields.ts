export const display = (field: any): string => {
  if (typeof field === "string") {
    return field;
  }
  return field?.display_value || "";
};

export const value = (field: any): string => {
  if (typeof field === "string") {
    return field;
  }
  return field?.value || "";
};

export type MessageSender = "user" | "assistant" | "assistant-thinking" | "assistant-tool";

export interface ParsedMessage {
  id: string;
  sender: MessageSender;
  text: string;
  toolName?: string;
  complete?: boolean;
}

/**
 * Parse the content JSON from a message record to extract sender info.
 */
export function parseMessageContent(contentField: any): ParsedMessage | null {
  const raw = value(contentField);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      id: parsed.id || "",
      sender: parsed.sender || "assistant",
      text: parsed.text || "",
      toolName: parsed.toolName,
      complete: parsed.complete,
    };
  } catch {
    return null;
  }
}

/**
 * Determines if a sender type is from the human user.
 */
export function isUserMessage(sender: MessageSender): boolean {
  return sender === "user";
}

/**
 * Determines if a sender type is from the assistant (any variant).
 */
export function isAssistantMessage(sender: MessageSender): boolean {
  return sender === "assistant" || sender === "assistant-thinking" || sender === "assistant-tool";
}

/**
 * Counts messages by sender type from an array of message records.
 */
export function countMessagesBySender(messages: any[]): { user: number; assistant: number; total: number } {
  let user = 0;
  let assistant = 0;
  for (const msg of messages) {
    const parsed = parseMessageContent(msg.content);
    if (!parsed) continue;
    if (isUserMessage(parsed.sender)) {
      user++;
    } else {
      assistant++;
    }
  }
  return { user, assistant, total: user + assistant };
}

/**
 * Returns a human-friendly label for a sender type.
 */
export function senderLabel(sender: MessageSender): string {
  switch (sender) {
    case "user": return "User";
    case "assistant": return "Assistant";
    case "assistant-thinking": return "Thinking";
    case "assistant-tool": return "Tool Call";
    default: return "Unknown";
  }
}
