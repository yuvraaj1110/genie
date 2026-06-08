const CUSTOMER_HANGUP_REASONS = new Set(["customer-ended-call", "customer-hung-up", "hangup"]);

export type ToolCallArgs = {
  rpc_confirmed?: boolean;
  interest?: string;
  employment_type?: string;
  loan_amount_range?: string;
  unclear_count?: number;
  hard_timeout_fired?: boolean;
  exit_state?: string;
} | null;

export type CallData = {
  id?: string;
  createdAt?: string;
  endedAt?: string;
  endedReason?: string;
  customer?: { number?: string };
};

export function buildCrmPayload(callData: CallData, toolCall: ToolCallArgs) {
  const durationSeconds = computeDurationSeconds(callData);

  if (!toolCall) {
    return assemble({
      callData, durationSeconds, rpcConfirmed: false, interest: "NOT_INTERESTED",
      employmentType: "NOT_CAPTURED", loanAmountRange: "NOT_CAPTURED",
      unclearCount: 0, hardTimeoutFired: false, callTerminatedEarly: true,
    });
  }

  const employmentType = toolCall.employment_type ?? "NOT_CAPTURED";
  const loanAmountRange = toolCall.loan_amount_range ?? "NOT_CAPTURED";
  const hardTimeoutFired = toolCall.hard_timeout_fired ?? false;
  const callTerminatedEarly =
    CUSTOMER_HANGUP_REASONS.has(callData.endedReason ?? "") && toolCall.exit_state !== "HANDOFF";

  return assemble({
    callData, durationSeconds, rpcConfirmed: toolCall.rpc_confirmed ?? false,
    interest: toolCall.interest ?? "NOT_INTERESTED", employmentType, loanAmountRange,
    unclearCount: toolCall.unclear_count ?? 0, hardTimeoutFired, callTerminatedEarly,
  });
}

function computeDurationSeconds(callData: CallData): number | null {
  if (!callData.createdAt || !callData.endedAt) return null;
  const start = new Date(callData.createdAt).getTime();
  const end = new Date(callData.endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 1000);
}

function assemble(o: {
  callData: CallData; durationSeconds: number | null; rpcConfirmed: boolean; interest: string;
  employmentType: string; loanAmountRange: string; unclearCount: number; hardTimeoutFired: boolean; callTerminatedEarly: boolean;
}) {
  const qualificationComplete = o.employmentType !== "NOT_CAPTURED" && o.loanAmountRange !== "NOT_CAPTURED";
  return {
    call_id: o.callData.id ?? null,
    prospect_phone: o.callData.customer?.number ?? null,
    call_timestamp: o.callData.createdAt ?? null,
    call_duration_seconds: o.durationSeconds,
    rpc_confirmed: o.rpcConfirmed,
    interest: o.interest,
    employment_type: o.employmentType,
    loan_amount_range: o.loanAmountRange,
    qualification_complete: qualificationComplete,
    unclear_count: o.unclearCount,
    hard_timeout_fired: o.hardTimeoutFired,
    call_terminated_early: o.callTerminatedEarly,
    rep_priority_score: computeRepPriorityScore(o),
  };
}

function computeRepPriorityScore(o: {
  employmentType: string; loanAmountRange: string; hardTimeoutFired: boolean; callTerminatedEarly: boolean;
}): number {
  let score = 100;
  if (o.employmentType === "SELF_EMPLOYED") score -= 5;
  if (o.employmentType === "NOT_CAPTURED") score -= 20;
  if (o.loanAmountRange === "NOT_CAPTURED") score -= 20;
  if (o.hardTimeoutFired) score -= 10;
  if (o.callTerminatedEarly) score -= 15;
  return Math.max(0, score);
}
