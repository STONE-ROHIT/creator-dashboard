import Razorpay from 'razorpay';

/**
 * Initialize Razorpay client with API credentials
 * 
 * Environment variables required:
 * - RAZORPAY_KEY_ID: Public key (identifies account)
 * - RAZORPAY_KEY_SECRET: Secret key (signs API requests)
 * 
 * Both must be present to initialize
 */

// Validate environment variables exist
if (!process.env.RAZORPAY_KEY_ID) {
  throw new Error('RAZORPAY_KEY_ID not set in .env');
}

if (!process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_SECRET not set in .env');
}

// Initialize Razorpay client
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default razorpayInstance;