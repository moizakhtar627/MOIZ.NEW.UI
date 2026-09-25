/* ==========================================================================
   WHA SOL — Admin Content Store
   ---------------------------------------------------------------------------
   Single source of truth for admin-managed content.

   - Seeded content comes from data.js (read-only baseline in WHASOL.* arrays).
   - Admin-created / edited articles are persisted in localStorage under
     STORAGE_KEY so that edits to existing records survive page reloads.
   - The list pages merge the two: localStorage entries override seeded
     records that share the same stable record id, so there are never
     duplicates and the same id is preserved.

   A stable record id is derived from the record's OWN unique field:
     - records that already have `id`      -> use id            (admin-created)
     - error codes that have `code`        -> "ec:" + code
     - brands that have `slug`             -> "brand:" + slug
     - articles / blogs that have `link`   -> "art:" + link
   No new identifiers are invented.
   ========================================================================== */
(function () {
  "use strict";

  window.WHASOL = window.WHASOL || {};
  var NS = window.WHASOL;

  var STORAGE_KEY = "whasol_admin_articles";

  NS.ADMIN_STORAGE_KEY = STORAGE_KEY;

  /* --------------------------------------------------------------------------
     Local storage helpers
     --------------------------------------------------------------------------- */
  function storageGet() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function storageSet(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("WHA SOL: Failed to persist admin articles.", error);
    }
  }

  /* --------------------------------------------------------------------------
     Stable record id
     --------------------------------------------------------------------------- */
  function recordId(record) {
    if (!record) return null;
    if (record.id) {
      return String(record.id);
    }
    if (record.slug) {
      return "brand:" + String(record.slug);
    }
    if (record.code) {
      return "ec:" + String(record.code);
    }
    if (record.link) {
      return "art:" + String(record.link);
    }
    return null;
  }

  /* --------------------------------------------------------------------------
     Seeded (data.js) articles — troubleshooting + blog posts
     --------------------------------------------------------------------------- */
  function seedArticles() {
    if (!NS || !NS.troubleshootingArticles && !NS.blogPosts) return [];
    var articles = [];

    if (Array.isArray(NS.troubleshootingArticles)) {
      articles = articles.concat(NS.troubleshootingArticles);
    }

    if (Array.isArray(NS.blogPosts)) {
      /* Keep troubleshooting articles first, skip a blog that shares the
         same link (same physical article). */
      var seenLinks = {};
      articles.forEach(function (a) {
        if (a && a.link) {
          seenLinks[String(a.link)] = true;
        }
      });
      NS.blogPosts.forEach(function (b) {
        var dup = b && b.link && seenLinks[String(b.link)];
        if (!dup) {
          articles.push(b);
        }
      });
    }

    return articles;
  }

  /* --------------------------------------------------------------------------
     Admin-merged article list
     Returns all admin-created articles from localStorage (which override
     seeded records with the same id), followed by un-overridden seeded
     articles that have no admin-created counterpart.
     --------------------------------------------------------------------------- */
  function getAdminArticles() {
    var local = storageGet();
    var seed = seedArticles();

    var overrideIds = {};
    local.forEach(function (r) {
      var sid = recordId(r);
      if (sid) overrideIds[sid] = true;
    });

    var result = [];

    /* localStorage entries first (these include overrides) */
    local.forEach(function (r) {
      result.push(r);
    });

    /* seeded records that were not overridden */
    seed.forEach(function (r) {
      var sid = recordId(r);
      if (sid && !overrideIds[sid]) {
        result.push(r);
      }
    });

    return result;
  }

  /* --------------------------------------------------------------------------
     Find a record by id across localStorage and every WHASOL source.
     Returns { record: <obj>, source: "local" | "whasol", contentType: str }
     --------------------------------------------------------------------------- */
  function getArticleById(id) {
    if (!id) return null;
    var idStr = String(id);

    /* 1) admin localStorage store */
    var local = storageGet();
    for (var i = 0; i < local.length; i++) {
      if (String(recordId(local[i])) === idStr) {
        return { record: local[i], source: "local" };
      }
    }

    /* 2) seeded WHASOL content */
    if (NS) {
      var buckets = [
        { list: NS.troubleshootingArticles, type: "article" },
        { list: NS.blogPosts, type: "blog" },
        { list: NS.errorCodes, type: "error-code" },
        { list: NS.brands, type: "brand" }
      ];

      for (var b = 0; b < buckets.length; b++) {
        var list = buckets[b].list;
        if (!Array.isArray(list)) continue;
        for (var j = 0; j < list.length; j++) {
          var item = list[j];
          if (!item) continue;
          if (String(recordId(item)) === idStr) {
            return { record: item, source: "whasol", contentType: buckets[b].type };
          }
        }
      }
    }

    return null;
  }

  /* --------------------------------------------------------------------------
     Upsert an article.
     articleObj must already contain a stable `id`.
     --------------------------------------------------------------------------- */
  function upsertArticle(articleObj) {
    if (!articleObj || !articleObj.id) return null;

    var idStr = String(articleObj.id);
    var local = storageGet();

    for (var i = 0; i < local.length; i++) {
      if (String(local[i].id) === idStr) {
        /* update existing admin entry in place */
        Object.keys(articleObj).forEach(function (k) {
          local[i][k] = articleObj[k];
        });
        storageSet(local);
        return local[i];
      }
    }

    /* not in admin store yet — insert (this also overrides a seeded record */
    /* with the same id on subsequent merges)                                 */
    local.unshift(articleObj);
    storageSet(local);
    return articleObj;
  }

  /* --------------------------------------------------------------------------
     Delete an article from the admin store by id.
     --------------------------------------------------------------------------- */
  function deleteArticle(id) {
    if (!id) return;
    var idStr = String(id);
    var local = storageGet();
    var kept = local.filter(function (r) { return String(r.id) !== idStr; });
    storageSet(kept);
  }

  /* --------------------------------------------------------------------------
     Public API
     --------------------------------------------------------------------------- */
  NS.adminContent = {
    STORAGE_KEY: STORAGE_KEY,
    getStored: storageGet,
    setStored: storageSet,
    recordId: recordId,
    getAdminArticles: getAdminArticles,
    getArticleById: getArticleById,
    upsertArticle: upsertArticle,
    deleteArticle: deleteArticle,
    seedArticles: seedArticles
  };

  console.log("WHA SOL: Admin content store initialized.");
})();
