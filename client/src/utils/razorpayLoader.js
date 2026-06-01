let loaded = false;
let loading = false;
let callbacks = [];

export function loadRazorpay() {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (loaded && window.Razorpay) {
      return resolve(window.Razorpay);
    }

    // Queue up while loading
    callbacks.push({ resolve, reject });
    if (loading) return;
    loading = true;

    // Script already in DOM (from index.html)
    if (window.Razorpay) {
      loaded = true;
      loading = false;
      callbacks.forEach(cb => cb.resolve(window.Razorpay));
      callbacks = [];
      return;
    }

    // Fallback: dynamically inject script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      loaded = true;
      loading = false;
      callbacks.forEach(cb => cb.resolve(window.Razorpay));
      callbacks = [];
    };

    script.onerror = () => {
      loading = false;
      const err = new Error('Failed to load Razorpay SDK. Check your internet connection.');
      callbacks.forEach(cb => cb.reject(err));
      callbacks = [];
    };

    document.head.appendChild(script);
  });
}
