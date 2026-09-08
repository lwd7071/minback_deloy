export type EvaluationStatus = "pending" | "graded" | "returned";

export function shouldSendEvaluationEmail(input: {
  type: "evaluation_created" | "evaluation_updated";
  currentStatus: EvaluationStatus;
  latestOldStatus: EvaluationStatus | null;
}): boolean {
  if (input.currentStatus !== "returned") return false;
  if (input.type === "evaluation_created") return true;
  return input.latestOldStatus !== null && input.latestOldStatus !== "returned";
}

export function shouldAttemptEvaluationEmail(input: {
  type: "evaluation_created" | "evaluation_updated";
  currentStatus: EvaluationStatus;
  latestOldStatus: EvaluationStatus | null;
  emailEnabled: boolean;
  studentEmail: string | null;
  emailConfigured?: boolean;
  brevoConfigured?: boolean;
}): boolean {
  const isConfigured = input.emailConfigured ?? input.brevoConfigured ?? false;
  return (
    input.emailEnabled &&
    Boolean(input.studentEmail) &&
    isConfigured &&
    shouldSendEvaluationEmail(input)
  );
}
