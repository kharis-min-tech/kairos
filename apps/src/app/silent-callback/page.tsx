"use client";

import { useEffect } from "react";

export default function SilentCallbackPage() {
  useEffect(() => {
    // This page handles silent token renewal
    // The OIDC client will automatically handle the callback
    if (window.parent !== window) {
      // We're in an iframe, let the parent handle this
      try {
        // Only post message to same origin to prevent data leakage
        window.parent.postMessage(
          { type: 'oidc-silent-callback', url: window.location.href },
          window.location.origin
        );
      } catch (error) {
        // Silently fail — don't expose error details
        if (process.env.NODE_ENV === 'development') {
          console.error('Silent callback error:', error);
        }
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}