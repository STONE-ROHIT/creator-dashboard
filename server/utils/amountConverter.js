/**
 * Amount conversion utilities for INR
 * 
 * CRITICAL: All conversions happen here ONLY
 * 
 * Database: DECIMAL(10,2) in rupees
 * Razorpay: Integer paise
 * 
 * 1 rupee = 100 paise
 * ₹499.00 = 49900 paise
 */

/**
 * Convert rupees to paise
 * Used before sending to Razorpay API
 * 
 * @param {number} rupees - Amount in rupees
 * @returns {number} Amount in paise (integer)
 * @throws {Error} If amount is invalid
 */
export const rupeesToPaise = (rupees) => {
  // Type validation
  if (typeof rupees !== 'number') {
    throw new Error(`Amount must be number, got ${typeof rupees}`);
  }

  // NaN validation
  if (isNaN(rupees)) {
    throw new Error('Amount is NaN');
  }

  // Negative validation
  if (rupees < 0) {
    throw new Error('Amount cannot be negative');
  }

  // Convert with rounding
  // CRITICAL: Math.round prevents floating-point errors
  // Example: 100.10 * 100 = 10009.999999999998
  // Math.round fixes to 10010
  const paise = Math.round(rupees * 100);

  return paise;
};

/**
 * Convert paise to rupees
 * Used when reading from Razorpay webhook
 * 
 * @param {number} paise - Amount in paise
 * @returns {number} Amount in rupees
 */
export const paiseToRupees = (paise) => {
  if (typeof paise !== 'number' || paise < 0) {
    throw new Error('Paise must be non-negative number');
  }

  return paise / 100;
};

/**
 * Format rupees for display
 * Used in API responses, emails, etc.
 * 
 * @param {number} rupees - Amount in rupees
 * @returns {string} Formatted string with rupee symbol
 */
export const formatRupees = (rupees) => {
  if (typeof rupees !== 'number' || isNaN(rupees)) {
    return '₹0.00';
  }

  return `₹${rupees.toFixed(2)}`;
};

/**
 * Validate amount is acceptable for payment
 * Used before creating Razorpay order
 * 
 * @param {number} amount - Amount in rupees
 * @returns {boolean} True if valid for payment
 */
export const isValidPaymentAmount = (amount) => {
  if (typeof amount !== 'number') {
    return false;
  }

  // Minimum: ₹1.00
  if (amount < 1) {
    return false;
  }

  // Maximum: ₹999,999.00
  if (amount > 999999) {
    return false;
  }

  // Max 2 decimal places (paise precision)
  // Allow both 499 (integer) and 499.00 (float)
  const paise = Math.round(amount * 100);
  const reconstructed = paise / 100;
  
  // Check difference (account for floating-point errors)
  if (Math.abs(amount - reconstructed) > 0.01) {
    return false;
  }

  return true;
};

/**
 * Verify webhook payment amount matches expected
 * Used to prevent underpayment/overpayment attacks
 * 
 * @param {number} expectedRupees - Expected amount from content.price
 * @param {number} receivedPaise - Amount received from webhook
 * @returns {boolean} True if amounts match (within 1 paise tolerance)
 */
export const verifyPaymentAmount = (expectedRupees, receivedPaise) => {
  const expectedPaise = rupeesToPaise(expectedRupees);
  
  // Allow 1 paise tolerance for rounding
  const difference = Math.abs(expectedPaise - receivedPaise);
  
  return difference <= 1;
};