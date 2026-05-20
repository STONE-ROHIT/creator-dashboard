import crypto from 'crypto';

/**
 * Verify Razorpay webhook signature
 * 
 * How it works:
 * 1. Razorpay creates payload
 * 2. Razorpay signs: signature = HMAC-SHA256(payload, secret)
 * 3. Razorpay sends: { payload, X-Razorpay-Signature: signature }
 * 4. We verify: does our calculation match their signature?
 * 5. If yes: it's from Razorpay ✓
 * 6. If no: it's fake, reject ✗
 * 
 * CRITICAL: body must be RAW STRING (not parsed JSON)
 * HMAC needs exact bytes Razorpay signed
 * 
 * @param {string} body - Raw body string (req.rawBody)
 * @param {string} signature - Signature from X-Razorpay-Signature header
 * @param {string} secret - Webhook secret from .env
 * @returns {boolean} True if signature is valid (from Razorpay)
 */
export const verifyWebhookSignature = (body, signature, secret) => {
  try {
    // Validate inputs
    if (!body || typeof body !== 'string') {
      console.error('Webhook verification failed: invalid body');
      return false;
    }

    if (!signature || typeof signature !== 'string') {
      console.error('Webhook verification failed: invalid signature');
      return false;
    }

    if (!secret || typeof secret !== 'string') {
      console.error('Webhook verification failed: invalid secret');
      return false;
    }

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)  // CRITICAL: body must be raw string
      .digest('hex');

    // Compare signatures
    const match = expectedSignature === signature;

    if (!match) {
      console.error(
        `Webhook signature mismatch\n` +
        `Expected: ${expectedSignature.substring(0, 32)}...\n` +
        `Got:      ${signature.substring(0, 32)}...`
      );
    }

    return match;
  } catch (err) {
    console.error('Webhook verification error:', err.message);
    return false;
  }
};