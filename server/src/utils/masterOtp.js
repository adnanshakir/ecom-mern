import { config } from "../config/config.js";

// ============================================================================
// WARNING: DEV/TESTING MASTER OTP BYPASS.
// MUST BE DISABLED (ALLOW_MASTER_OTP=false or unset) BEFORE ANY REAL CUSTOMER TRAFFIC!
// ============================================================================

/**
 * Checks if Master OTP is enabled via environment variables and if the submitted code matches.
 *
 * @param {string} submittedCode - The OTP code provided by the user.
 * @param {string} [targetIdentifier] - Optional phone/email identifier for audit logging.
 * @returns {boolean} True if Master OTP is enabled and code matches; false otherwise.
 */
export function isMasterOtpMatch(submittedCode, targetIdentifier) {
  const isAllowed = config.masterOtp.isAllowed;
  const masterCode = config.masterOtp.masterCode;
  const env = (config.nodeEnv || "").toLowerCase();
  const isDevOrTest = env === "development" || env === "test" || config.isTest === true;

  if (!isAllowed || !isDevOrTest || !masterCode || !submittedCode || typeof submittedCode !== "string") {
    return false;
  }

  if (submittedCode.trim() === masterCode.trim()) {
    console.log(
      `\n========================================================\n` +
        `[MASTER OTP USED] target: ${targetIdentifier || "unknown"}, timestamp: ${new Date().toISOString()}\n` +
        `========================================================\n`
    );
    return true;
  }

  return false;
}
