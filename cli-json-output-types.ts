/**
 * TypeScript types for all possible messages that the CLI can output in JSON mode
 * 
 * The CLI outputs different types of messages:
 * 1. Configuration summary (HashMap<String, String>)
 * 2. Prompt message ({"prompt": string})
 * 3. Event messages (serialized Event structure)
 */

// ============================================================================
// Core Event Structure
// ============================================================================

/**
 * Main event wrapper that contains all messages from the agent
 */
export interface Event {
  /** Submission ID that this event is correlated with */
  id: string;
  /** The event message payload */
  msg: EventMsg;
}

// ============================================================================
// Event Message Types
// ============================================================================

export type EventMsg =
  | { type: "error"; message: string }
  | { type: "task_started"; model_context_window?: number }
  | { type: "task_complete"; last_agent_message?: string }
  | { type: "token_count" } & TokenUsage
  | { type: "agent_message"; message: string }
  | { type: "agent_message_delta"; delta: string }
  | { type: "agent_reasoning"; text: string }
  | { type: "agent_reasoning_delta"; delta: string }
  | { type: "agent_reasoning_raw_content"; text: string }
  | { type: "agent_reasoning_raw_content_delta"; delta: string }
  | { type: "agent_reasoning_section_break" }
  | { type: "session_configured" } & SessionConfiguredEvent
  | { type: "mcp_tool_call_begin" } & McpToolCallBeginEvent
  | { type: "mcp_tool_call_end" } & McpToolCallEndEvent
  | { type: "web_search_begin"; call_id: string; query: string }
  | { type: "exec_command_begin" } & ExecCommandBeginEvent
  | { type: "exec_command_output_delta" } & ExecCommandOutputDeltaEvent
  | { type: "exec_command_end" } & ExecCommandEndEvent
  | { type: "exec_approval_request" } & ExecApprovalRequestEvent
  | { type: "apply_patch_approval_request" } & ApplyPatchApprovalRequestEvent
  | { type: "background_event"; message: string }
  | { type: "stream_error"; message: string }
  | { type: "patch_apply_begin" } & PatchApplyBeginEvent
  | { type: "patch_apply_end" } & PatchApplyEndEvent
  | { type: "turn_diff"; unified_diff: string }
  | { type: "get_history_entry_response" } & GetHistoryEntryResponseEvent
  | { type: "mcp_list_tools_response"; tools: Record<string, McpTool> }
  | { type: "plan_update" } & UpdatePlanArgs
  | { type: "turn_aborted"; reason: TurnAbortReason }
  | { type: "shutdown_complete" }
  | { type: "conversation_history" } & ConversationHistoryResponseEvent;

// ============================================================================
// Token Usage
// ============================================================================

export interface TokenUsage {
  input_tokens: number;
  cached_input_tokens?: number;
  output_tokens: number;
  reasoning_output_tokens?: number;
  total_tokens: number;
}

// ============================================================================
// Session Configuration
// ============================================================================

export interface SessionConfiguredEvent {
  /** Unique session ID (UUID) */
  session_id: string;
  /** Model being used */
  model: string;
  /** History log file identifier */
  history_log_id: number;
  /** Current number of entries in history */
  history_entry_count: number;
}

// ============================================================================
// MCP Tool Calls
// ============================================================================

export interface McpInvocation {
  /** Name of the MCP server as defined in config */
  server: string;
  /** Name of the tool as given by the MCP server */
  tool: string;
  /** Arguments to the tool call */
  arguments?: any;
}

export interface McpToolCallBeginEvent {
  /** Identifier to pair with McpToolCallEnd event */
  call_id: string;
  invocation: McpInvocation;
}

export interface McpToolCallEndEvent {
  /** Identifier for the corresponding McpToolCallBegin */
  call_id: string;
  invocation: McpInvocation;
  /** Duration in milliseconds */
  duration: {
    secs: number;
    nanos: number;
  };
  /** Result of the tool call (could be an error) */
  result: CallToolResult | { error: string };
}

export interface CallToolResult {
  content: ContentBlock[];
  isError?: boolean;
  structuredContent?: any;
}

export interface ContentBlock {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  name?: string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: ToolInputSchema;
  outputSchema?: ToolOutputSchema;
  title?: string;
}

export interface ToolInputSchema {
  type: string;
  properties?: any;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolOutputSchema {
  type: string;
  properties?: any;
  required?: string[];
}

// ============================================================================
// Command Execution
// ============================================================================

export interface ExecCommandBeginEvent {
  /** Identifier to pair with ExecCommandEnd event */
  call_id: string;
  /** Command to be executed */
  command: string[];
  /** Command's working directory */
  cwd: string;
  /** Parsed command information */
  parsed_cmd: ParsedCommand[];
}

export type ParsedCommand =
  | { type: "read"; cmd: string; name: string }
  | { type: "list_files"; cmd: string; path?: string }
  | { type: "search"; cmd: string; query?: string; path?: string }
  | { type: "format"; cmd: string; tool?: string; targets?: string[] }
  | { type: "test"; cmd: string }
  | { type: "lint"; cmd: string; tool?: string; targets?: string[] }
  | { type: "noop"; cmd: string }
  | { type: "unknown"; cmd: string };

export interface ExecCommandOutputDeltaEvent {
  /** Identifier for the ExecCommandBegin that produced this */
  call_id: string;
  /** Which stream produced this chunk */
  stream: "stdout" | "stderr";
  /** Raw bytes from the stream (base64 encoded in JSON) */
  chunk: string;
}

export interface ExecCommandEndEvent {
  /** Identifier for the ExecCommandBegin that finished */
  call_id: string;
  /** Captured stdout */
  stdout: string;
  /** Captured stderr */
  stderr: string;
  /** Captured aggregated output */
  aggregated_output: string;
  /** Command's exit code */
  exit_code: number;
  /** Duration of command execution */
  duration: {
    secs: number;
    nanos: number;
  };
  /** Formatted output as seen by the model */
  formatted_output: string;
}

export interface ExecApprovalRequestEvent {
  /** Identifier for the associated exec call */
  call_id: string;
  /** Command to be executed */
  command: string[];
  /** Command's working directory */
  cwd: string;
  /** Optional human-readable reason for approval */
  reason?: string;
}

// ============================================================================
// Patch Application
// ============================================================================

export interface ApplyPatchApprovalRequestEvent {
  /** Call ID for the associated patch apply call */
  call_id: string;
  /** File changes to be applied */
  changes: Record<string, FileChange>;
  /** Optional explanatory reason */
  reason?: string;
  /** When set, agent is asking to allow writes under this root */
  grant_root?: string;
}

export type FileChange =
  | { type: "add"; content: string }
  | { type: "delete" }
  | { type: "update"; unified_diff: string; move_path?: string };

export interface PatchApplyBeginEvent {
  /** Identifier to pair with PatchApplyEnd event */
  call_id: string;
  /** If true, no ApplyPatchApprovalRequest was sent */
  auto_approved: boolean;
  /** Changes to be applied */
  changes: Record<string, FileChange>;
}

export interface PatchApplyEndEvent {
  /** Identifier for the PatchApplyBegin that finished */
  call_id: string;
  /** Captured stdout (summary) */
  stdout: string;
  /** Captured stderr (errors) */
  stderr: string;
  /** Whether patch was applied successfully */
  success: boolean;
}

// ============================================================================
// History and Conversation
// ============================================================================

export interface GetHistoryEntryResponseEvent {
  offset: number;
  log_id: number;
  /** Entry at the requested offset, if available */
  entry?: HistoryEntry;
}

export interface HistoryEntry {
  session_id: string;
  ts: number;
  text: string;
}

export interface ConversationHistoryResponseEvent {
  conversation_id: string;
  entries: ResponseItem[];
}

export type ResponseItem =
  | {
      type: "message";
      id?: string;
      role: string;
      content: ContentItem[];
    }
  | {
      type: "reasoning";
      id: string;
      summary: ReasoningItemSummary[];
      content?: ReasoningItemContent[];
    }
  | {
      type: "function_call";
      call_id: string;
      name: string;
      arguments?: any;
    }
  | {
      type: "function_call_output";
      call_id: string;
      output: ContentItem[];
    };

export type ContentItem =
  | { type: "text"; text: string }
  | { type: "image"; source: ImageSource }
  | { type: "tool_use"; id: string; name: string; input: any }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface ImageSource {
  type: "base64";
  media_type: string;
  data: string;
}

export interface ReasoningItemSummary {
  type: "text";
  text: string;
}

export type ReasoningItemContent =
  | { type: "reasoning_text"; text: string }
  | { type: "output_text"; text: string };

// ============================================================================
// Plan Updates
// ============================================================================

export interface UpdatePlanArgs {
  explanation?: string;
  plan: PlanItem[];
}

export interface PlanItem {
  step: string;
  status: "pending" | "in_progress" | "completed";
}

// ============================================================================
// Other Types
// ============================================================================

export type TurnAbortReason = "interrupted" | "replaced";

// ============================================================================
// Initial JSON Output Types (Non-Event)
// ============================================================================

/**
 * Configuration summary output at the start
 * This is output as a plain JSON object (not wrapped in Event)
 */
export type ConfigSummary = Record<string, string>;

/**
 * Prompt message output after config summary
 * This is output as a plain JSON object (not wrapped in Event)
 */
export interface PromptMessage {
  prompt: string;
}

// ============================================================================
// Complete CLI JSON Output Union Type
// ============================================================================

/**
 * All possible JSON messages that the CLI can output in JSON mode
 * Note: ConfigSummary and PromptMessage are output first, followed by Event messages
 */
export type CliJsonOutput = ConfigSummary | PromptMessage | Event;