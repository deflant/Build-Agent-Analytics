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

export interface ToolDetails {
  toolActualName: string;
  toolInput: Record<string, any>;
  toolUseId: string;
  success: boolean;
  duration: number;
  result: string;
}

export interface FileAttachment {
  url: string;
  name: string;
  type?: string;
  size?: number;
}

export interface ParsedMessage {
  id: string;
  sender: MessageSender;
  text: string;
  toolName?: string;
  complete?: boolean;
  toolDetails?: ToolDetails;
  images?: Array<{ url: string }>;
  files?: FileAttachment[];
}

/**
 * Parse the content JSON from a message record to extract sender info.
 * For tool messages, extracts full tool details (input, output, duration, success).
 */
export function parseMessageContent(contentField: any): ParsedMessage | null {
  const raw = value(contentField);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const msg: ParsedMessage = {
      id: parsed.id || "",
      sender: parsed.sender || "assistant",
      text: parsed.text || "",
      toolName: parsed.toolName,
      complete: parsed.complete,
      images: Array.isArray(parsed.images) ? parsed.images : undefined,
      files: Array.isArray(parsed.files) ? parsed.files : undefined,
    };

    // Extract full tool details for tool messages
    if (parsed.sender === "assistant-tool" && parsed.toolActualName) {
      msg.toolDetails = {
        toolActualName: parsed.toolActualName || "",
        toolInput: parsed.toolInput || {},
        toolUseId: parsed.toolUseId || "",
        success: parsed.success ?? true,
        duration: parsed.duration || 0,
        result: parsed.result || "",
      };
    }

    return msg;
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
