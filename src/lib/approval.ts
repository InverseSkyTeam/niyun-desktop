import type { ToolApprovalResponse } from "ai";

export const REQUEUE_REASON =
    "用户一次只确认一个工具调用。不要继续并行请求，改为在后续步骤中逐个重新发起该请求。";


export function buildApprovalResponses(
    firstApprovalId: string,
    restApprovalIds: string[],
    approved: boolean,
): ToolApprovalResponse[] {
    return [
        {
            type: "tool-approval-response",
            approvalId: firstApprovalId,
            approved,
            reason: approved
                ? undefined
                : "用户明确拒绝了此工具调用，请勿重试，改用其他方式完成目标。",
        },
        ...restApprovalIds.map((id) => ({
            type: "tool-approval-response" as const,
            approvalId: id,
            approved: false,
            reason: REQUEUE_REASON,
        })),
    ];
}
