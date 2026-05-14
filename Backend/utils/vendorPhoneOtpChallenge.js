const crypto = require("crypto");
const config = require("../config");

function generateSixDigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Log or send SMS. Replace with your provider (MSG91, Twilio, etc.) in production.
 */
function deliverOtpToPhone(phone, plainOtp) {
  if (config.nodeEnv !== "production") {
    console.info(`[vendor OTP] ${phone}: ${plainOtp}`);
  }
}

module.exports = {
  generateSixDigitOtp,
  deliverOtpToPhone,
};
