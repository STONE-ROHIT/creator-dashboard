// Validate email format
export const validateEmail = (email) => {
  // Simple regex for email validation
  // Not perfect, but good enough for MVP
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  // At least 8 characters
  // You can add more rules later (uppercase, numbers, etc.)
  return password && password.length >= 8;
};

// Validate username
export const validateUsername = (username) => {
  // At least 3 characters, alphanumeric and underscores
  const regex = /^[a-zA-Z0-9_]{3,}$/;
  return regex.test(username);
};