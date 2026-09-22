/* ==========================================================================
   WHA SOL — Authentication Foundation
   --------------------------------------------------------------------------
   Features:
   - Get current user
   - Get user profile
   - Get user role
   - Role checking
   - Owner / Admin / Editor / Viewer checks
   - Sign up
   - Sign in
   - Sign out
   - Password reset email
   - Password recovery redirect
   - Authentication protection
   - Supabase readiness handling

   Security:
   - Uses the public Supabase client only.
   - Never uses a service-role key.
   - Database security must be enforced with Supabase RLS.
   ========================================================================== */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     WHA SOL namespace
     -------------------------------------------------------------------------- */

  var NS = window.WHASOL;

  if (!NS) {
    console.error(
      "WHA SOL: WHASOL namespace missing. Load data.js before auth.js."
    );
    return;
  }

  /* --------------------------------------------------------------------------
     Role hierarchy
     -------------------------------------------------------------------------- */

  var ROLE_RANK = {
    viewer: 1,
    editor: 2,
    admin: 3,
    owner: 4
  };

  function rank(role) {
    return ROLE_RANK[role] || 0;
  }

  /* --------------------------------------------------------------------------
     Get Supabase client
     -------------------------------------------------------------------------- */

  function client() {
    return NS.supabase || null;
  }

  /* --------------------------------------------------------------------------
     Wait until Supabase is ready
     -------------------------------------------------------------------------- */

  function whenReady(cb) {
    if (NS.supabase) {
      cb();
      return;
    }

    document.addEventListener(
      "whasol:supabase-ready",
      cb,
      {
        once: true
      }
    );
  }

  /* --------------------------------------------------------------------------
     Wait for Supabase
     -------------------------------------------------------------------------- */

  function waitForSupabase(timeout) {
    timeout = timeout || 10000;

    return new Promise(function (resolve) {

      if (client()) {
        resolve(true);
        return;
      }

      var finished = false;

      function finish(success) {

        if (finished) {
          return;
        }

        finished = true;

        resolve(success);
      }

      document.addEventListener(
        "whasol:supabase-ready",
        function () {

          finish(!!client());

        },
        {
          once: true
        }
      );

      setTimeout(
        function () {

          finish(!!client());

        },
        timeout
      );

    });
  }

  /* --------------------------------------------------------------------------
     Get current user
     -------------------------------------------------------------------------- */

  async function getCurrentUser() {

    var c = client();

    if (!c) {

      await waitForSupabase();

      c = client();

    }

    if (!c) {

      console.error(
        "WHA SOL: Supabase client is not ready."
      );

      return null;

    }

    try {

      var res =
        await c.auth.getUser();

      return (
        res &&
        res.data &&
        res.data.user
      ) || null;

    } catch (error) {

      console.error(
        "WHA SOL: Failed to get current user:",
        error
      );

      return null;

    }
  }

  /* --------------------------------------------------------------------------
     Synchronous current user helper
     -------------------------------------------------------------------------- */

  function getCurrentUserSync() {
    return null;
  }

  /* --------------------------------------------------------------------------
     Get user profile
     -------------------------------------------------------------------------- */

  async function getUserProfile(userId) {

    var c = client();

    if (!c) {

      await waitForSupabase();

      c = client();

    }

    if (!c) {

      console.error(
        "WHA SOL: Supabase client is not ready."
      );

      return null;

    }

    try {

      var id = userId;

      if (!id) {

        var user =
          await getCurrentUser();

        if (!user) {
          return null;
        }

        id = user.id;

      }

      var res =
        await c
          .from("profiles")
          .select("*")
          .eq("id", id)
          .maybeSingle();

      if (res.error) {

        console.error(
          "WHA SOL: Failed to get user profile:",
          res.error
        );

        return null;

      }

      return res.data || null;

    } catch (error) {

      console.error(
        "WHA SOL: Profile request failed:",
        error
      );

      return null;

    }
  }

  /* --------------------------------------------------------------------------
     Get current user profile
     -------------------------------------------------------------------------- */

  async function getCurrentUserProfile() {

    var user =
      await getCurrentUser();

    if (!user) {
      return null;
    }

    return getUserProfile(user.id);
  }

  /* --------------------------------------------------------------------------
     Get user role
     -------------------------------------------------------------------------- */

  async function getUserRole() {

    var profile =
      await getCurrentUserProfile();

    if (!profile) {
      return null;
    }

    return profile.role || null;
  }

  /* --------------------------------------------------------------------------
     Authentication status
     -------------------------------------------------------------------------- */

  async function isAuthenticated() {

    var user =
      await getCurrentUser();

    return !!user;
  }

  /* --------------------------------------------------------------------------
     Exact role check
     -------------------------------------------------------------------------- */

  async function hasRole(role) {

    var r =
      await getUserRole();

    return r === role;
  }

  /* --------------------------------------------------------------------------
     Minimum role check
     -------------------------------------------------------------------------- */

  async function hasRoleOrHigher(minRole) {

    var r =
      await getUserRole();

    if (!r) {
      return false;
    }

    return rank(r) >= rank(minRole);
  }

  /* --------------------------------------------------------------------------
     Role helpers
     -------------------------------------------------------------------------- */

  async function isOwner() {

    return hasRole("owner");

  }

  async function isAdmin() {

    return hasRoleOrHigher("admin");

  }

  async function isEditor() {

    return hasRoleOrHigher("editor");

  }

  async function isViewer() {

    return hasRoleOrHigher("viewer");

  }

  /* --------------------------------------------------------------------------
     Sign up
     -------------------------------------------------------------------------- */

  async function signIn(email, password) {

    var c = client();

    if (!c) {

      await waitForSupabase();

      c = client();

    }

    if (!c) {

      return {
        error: {
          message:
            "Supabase client is not ready."
        }
      };

    }

    try {

      return await c.auth.signUp({
        email: email,
        password: password
      });

    } catch (error) {

      console.error(
        "WHA SOL: Sign up failed:",
        error
      );

      return {
        error: error
      };

    }
  }

  /* --------------------------------------------------------------------------
     Sign in with email/password
     -------------------------------------------------------------------------- */

  async function signInWithPassword(
    email,
    password
  ) {

    var c = client();

    if (!c) {

      await waitForSupabase();

      c = client();

    }

    if (!c) {

      return {
        error: {
          message:
            "Supabase client is not ready."
        }
      };

    }

    try {

      return await c.auth.signInWithPassword({
        email: email,
        password: password
      });

    } catch (error) {

      console.error(
        "WHA SOL: Sign in failed:",
        error
      );

      return {
        error: error
      };

    }
  }

  /* --------------------------------------------------------------------------
     PASSWORD RESET EMAIL
     --------------------------------------------------------------------------
     
     IMPORTANT:
     If redirectTo is not supplied by the login page,
     WHA SOL automatically sends the recovery link to:

       http://localhost:3000/admin/reset-password.html

     On your deployed website it automatically becomes:

       https://your-domain.com/admin/reset-password.html

     -------------------------------------------------------------------------- */

  async function resetPasswordForEmail(
    email,
    options
  ) {

    /* ------------------------------------------------------------------------
       Wait for Supabase
       ------------------------------------------------------------------------ */

    var c = client();

    if (!c) {

      console.log(
        "WHA SOL: Waiting for Supabase client..."
      );

      await waitForSupabase(10000);

      c = client();

    }

    /* ------------------------------------------------------------------------
       Supabase unavailable
       ------------------------------------------------------------------------ */

    if (!c) {

      console.error(
        "WHA SOL: Supabase client is not ready after waiting."
      );

      return {
        error: {
          message:
            "Authentication system is not ready. Please refresh the page and try again."
        }
      };

    }

    /* ------------------------------------------------------------------------
       Validate email
       ------------------------------------------------------------------------ */

    if (
      !email ||
      !String(email).trim()
    ) {

      return {
        error: {
          message:
            "Please enter your email address."
        }
      };

    }

    /* ------------------------------------------------------------------------
       Create reset options
       ------------------------------------------------------------------------ */

    var resetOptions =
      Object.assign(
        {},
        options || {}
      );

    /* ------------------------------------------------------------------------
       IMPORTANT PASSWORD RECOVERY REDIRECT
       ------------------------------------------------------------------------

       If the login page does not provide a redirectTo,
       explicitly send the recovery email to the reset page.

       This prevents Supabase from using the Site URL:

         http://localhost:3000

       which would send the user to the WHA SOL homepage.
       ------------------------------------------------------------------------ */

    if (!resetOptions.redirectTo) {

      resetOptions.redirectTo =
        window.location.origin +
        "/admin/reset-password.html";

    }

    /* ------------------------------------------------------------------------
       Debug information
       ------------------------------------------------------------------------ */

    console.log(
      "WHA SOL: Sending password reset email..."
    );

    console.log(
      "WHA SOL: Reset email:",
      String(email).trim()
    );

    console.log(
      "WHA SOL: Reset redirect:",
      resetOptions.redirectTo
    );

    /* ------------------------------------------------------------------------
       Send request
       ------------------------------------------------------------------------ */

    try {

      var result =
        await c.auth.resetPasswordForEmail(
          String(email).trim(),
          resetOptions
        );

      /* ----------------------------------------------------------------------
         Supabase returned an error
         ---------------------------------------------------------------------- */

      if (
        result &&
        result.error
      ) {

        console.error(
          "WHA SOL: Password reset error:",
          result.error
        );

        return {
          error:
            result.error
        };

      }

      /* ----------------------------------------------------------------------
         Success
         ---------------------------------------------------------------------- */

      console.log(
        "WHA SOL: Password reset email request successful."
      );

      return {

        data:
          result &&
          result.data
            ? result.data
            : null,

        error: null

      };

    } catch (error) {

      console.error(
        "WHA SOL: Password reset exception:",
        error
      );

      return {

        error: {

          message:
            error &&
            error.message
              ? error.message
              : "Password reset failed."

        }

      };

    }
  }

  /* --------------------------------------------------------------------------
     Sign out
     -------------------------------------------------------------------------- */

  async function signOut() {

    var c = client();

    if (!c) {

      await waitForSupabase();

      c = client();

    }

    if (!c) {

      return {
        error: {
          message:
            "Supabase client is not ready."
        }
      };

    }

    try {

      return await c.auth.signOut();

    } catch (error) {

      console.error(
        "WHA SOL: Sign out failed:",
        error
      );

      return {
        error: error
      };

    }
  }

  /* --------------------------------------------------------------------------
     Require role
     -------------------------------------------------------------------------- */

  async function requireRole(
    minRole,
    redirectPath
  ) {

    redirectPath =
      redirectPath ||
      "admin/login.html";

    var ok =
      await hasRoleOrHigher(minRole);

    if (!ok) {

      window.location.href =
        redirectPath;

      return false;

    }

    return true;
  }

  /* --------------------------------------------------------------------------
     Require authentication
     -------------------------------------------------------------------------- */

  async function requireAuth(
    redirectPath
  ) {

    redirectPath =
      redirectPath ||
      "admin/login.html";

    var ok =
      await isAuthenticated();

    if (!ok) {

      window.location.href =
        redirectPath;

      return false;

    }

    return true;
  }

  /* --------------------------------------------------------------------------
     Public WHA SOL authentication API
     -------------------------------------------------------------------------- */

  NS.auth = {

    /* User */

    getCurrentUser:
      getCurrentUser,

    getCurrentUserSync:
      getCurrentUserSync,

    /* Profile */

    getUserProfile:
      getUserProfile,

    getCurrentUserProfile:
      getCurrentUserProfile,

    /* Role */

    getUserRole:
      getUserRole,

    isAuthenticated:
      isAuthenticated,

    hasRole:
      hasRole,

    hasRoleOrHigher:
      hasRoleOrHigher,

    isOwner:
      isOwner,

    isAdmin:
      isAdmin,

    isEditor:
      isEditor,

    isViewer:
      isViewer,

    /* Authentication */

    signIn:
      signIn,

    signInWithPassword:
      signInWithPassword,

    signOut:
      signOut,

    /* Password recovery */

    resetPasswordForEmail:
      resetPasswordForEmail,

    /* Protection */

    requireRole:
      requireRole,

    requireAuth:
      requireAuth,

    /* Utilities */

    whenReady:
      whenReady,

    ROLE_RANK:
      ROLE_RANK

  };

  /* --------------------------------------------------------------------------
     Debug message
     -------------------------------------------------------------------------- */

  console.log(
    "WHA SOL: Authentication system initialized."
  );

})();