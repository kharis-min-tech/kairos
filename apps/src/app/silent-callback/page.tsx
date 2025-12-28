"use client";

import { useEffect } from "react";

export default function SilentCallbackPage() {
  useEffect(() => {
    // This page handles silent token renewal
    // The OIDC client will automatically handle the callback
    if (window.parent !== window) {
      // We're in an iframe, let the parent handle this
      try {
        window.parent.postMessage(window.location.href, window.location.origin);
      } catch (error) {
        console.error('Silent callback error:', error);
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