/* ==========================================================================
   WHA SOL — Supabase Client
   ========================================================================== */

(function () {
  "use strict";

  window.WHASOL = window.WHASOL || {};

  var NS = window.WHASOL;
  var CONFIG = NS.SUPABASE_CONFIG;

  if (!CONFIG || !CONFIG.URL || !CONFIG.ANON_KEY) {
    console.error(
      "WHA SOL: Supabase configuration is missing."
    );
    return;
  }

  console.log("WHA SOL: Supabase configuration found.");

  function initializeSupabase() {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      console.error(
        "WHA SOL: Supabase library is not available."
      );
      return;
    }

    try {
      NS.supabase = window.supabase.createClient(
        CONFIG.URL,
        CONFIG.ANON_KEY
      );

      console.log(
        "WHA SOL: Supabase client initialized successfully."
      );

      document.dispatchEvent(
        new Event("whasol:supabase-ready")
      );

    } catch (error) {
      console.error(
        "WHA SOL: Failed to initialize Supabase:",
        error
      );
    }
  }

  /*
   * Supabase official CDN browser build.
   */
  var script = document.createElement("script");

  script.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  script.onload = function () {
    console.log(
      "WHA SOL: Supabase library loaded successfully."
    );

    initializeSupabase();
  };

  script.onerror = function () {
    console.error(
      "WHA SOL: Failed to load Supabase from jsDelivr."
    );

    /*
     * Try UNPKG as a backup CDN.
     */
    var backup = document.createElement("script");

    backup.src =
      "https://unpkg.com/@supabase/supabase-js@2";

    backup.onload = function () {
      console.log(
        "WHA SOL: Supabase library loaded from backup CDN."
      );

      initializeSupabase();
    };

    backup.onerror = function () {
      console.error(
        "WHA SOL: Both Supabase CDNs failed to load."
      );
    };

    document.head.appendChild(backup);
  };

  document.head.appendChild(script);

})();