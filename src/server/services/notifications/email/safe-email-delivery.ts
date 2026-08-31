export async function deliverEmailSafely(
  deliver: () => Promise<unknown>,
  logFailure: (code: "EMAIL_DELIVERY_FAILED") => void = (code) =>
    console.error(code),
): Promise<boolean> {
  try {
    await deliver();
    return true;
  } catch {
    logFailure("EMAIL_DELIVERY_FAILED");
    return false;
  }
}
