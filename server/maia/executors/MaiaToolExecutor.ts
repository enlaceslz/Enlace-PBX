export interface ToolExecutionContext {
  tenantId: string;
  sessionId?: string;
  callerNumber: string;
  asteriskChannelId?: string;
  userRole?: string;
  agentId?: string;
  correlationId: string;
}

export interface ToolExecutionOutput {
  status: 'success' | 'failed' | 'pending';
  data: Record<string, unknown>;
  message?: string;
  action?: 'none' | 'transfer' | 'hangup';
  transferDestination?: string;
}

export interface IMaiaExecutor {
  execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput>;
}
