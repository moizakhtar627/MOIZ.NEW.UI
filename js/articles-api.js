/* ==========================================================================
   WHA SOL — Articles API
   --------------------------------------------------------------------------
   Supabase-backed data access for articles. This is the shared source of
   truth for the admin panel and the public blog.

   Responsibilities:
   - Wait for the Supabase client created by js/supabase.js
   - Map database rows onto the shape the rest of the site already uses
   - Provide public reads (published only) and authenticated admin CRUD
   - Fall back to the seeded js/data.js content when the database is
     unreachable, so the public site never renders an empty blog

   Row shape (public.articles) -> site shape (WHASOL.blogPosts):
     meta_title        -> metaTitle
     meta_description  -> metaDescription
     published_at      -> date
     image             -> image  (also kept as featuredImage for the editor)
     content           -> content (also exposed as description when the row
                         has no description of its own)

   Public API: WHASOL.articlesApi
   ========================================================================== */

(function () {
  "use strict";

  window.WHASOL = window.WHASOL || {};

  var NS = window.WHASOL;
  var TABLE = "articles";

  /* --------------------------------------------------------------------------
     Client access
  --------------------------------------------------------------------------- */

  function client() {
    return NS.supabase || null;
  }

  /* Wait for the client, but never longer than the caller's patience allows. */
  function waitForClient(timeout) {
    timeout = timeout || 8000;

    return new Promise(function (resolve) {
      if (client()) {
        resolve(true);
        return;
      }

      var done = false;

      function finish() {
        if (done) return;
        done = true;
        resolve(!!client());
      }

      document.addEventListener("whasol:supabase-ready", finish, { once: true });
      setTimeout(finish, timeout);
    });
  }

  /* --------------------------------------------------------------------------
     Category normalization
  ---------------------------------------------------------------------------
     The public site filters with canonical kebab-case slugs — js/listing.js
     compares item.category against "inverter", "solar-panel", "battery",
     "wiring" and "voltage", and the homepage links to those same slugs.

     Titles typed by an admin ("Inverter", "Solar Panel", "Wiring &
     Electrical") therefore never matched a category filter. Every value is
     mapped to a canonical slug on the way in and on the way out, so the
     editor can keep its friendly labels while storage stays filterable.
  --------------------------------------------------------------------------- */

  var CATEGORY_ALIASES = {
    inverter: "inverter",
    "inverter problem": "inverter",
    "inverter problems": "inverter",
    battery: "battery",
    "battery problem": "battery",
    "battery problems": "battery",
    "solar panel": "solar-panel",
    "solar panels": "solar-panel",
    "solar-panel": "solar-panel",
    "solar-panel problem": "solar-panel",
    "solar panel problem": "solar-panel",
    "solar panel problems": "solar-panel",
    "solar panel cleaning": "solar-panel",
    wiring: "wiring",
    "wiring & electrical": "wiring",
    "wiring and electrical": "wiring",
    "wiring & electricals": "wiring",
    "electrical wiring": "wiring",
    voltage: "voltage",
    "voltage & frequency": "voltage",
    "voltage and frequency": "voltage",
    troubleshooting: "troubleshooting",
    "solar battery guide": "solar-battery-guide",
    general: "general",
  };

  function normalizeCategory(value) {
    var text = String(value == null ? "" : value).trim().toLowerCase();

    if (!text) return "general";

    if (CATEGORY_ALIASES[text]) return CATEGORY_ALIASES[text];

    /* An unknown label still gets a stable slug rather than being dropped. */
    var slug = text
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    return slug || "general";
  }

  /* Human-readable label for a stored slug, for places that show the raw
     value (admin tables, article pages). Mirrors listing.js categoryLabel. */
  var CATEGORY_LABELS = {
    "solar-panel": "Solar Panel",
    battery: "Battery",
    inverter: "Inverter",
    wiring: "Wiring & Electrical",
    voltage: "Voltage & Frequency",
    troubleshooting: "Troubleshooting",
    "solar-battery-guide": "Solar Battery Guide",
    general: "General",
  };

  function categoryLabel(value) {
    var slug = normalizeCategory(value);

    return CATEGORY_LABELS[slug] || String(value || "").trim() || "General";
  }

  /* --------------------------------------------------------------------------
     Row mapping
  --------------------------------------------------------------------------- */

  /* Database row -> site shape */
  function toArticle(row) {
    if (!row) return null;

    var description = row.description || "";
    var content = row.content || "";

    return {
      id: row.id,
      slug: row.slug || "",
      title: row.title || "",
      metaTitle: row.meta_title || "",
      metaDescription: row.meta_description || "",
      description: description,
      /* The editor stores long-form HTML in `content`; the listing pages read
       `description`. Fall back to plain text so a card is never blank. */
      content: content,
      cardText: stripHtml(description) || stripHtml(content).slice(0, 220),
      brand: row.brand || "",
      model: row.model || "",
      models: row.model ? [row.model] : [],
      /* Stored as a canonical slug; keep the label for display. */
      category: normalizeCategory(row.category),
      categoryLabel: categoryLabel(row.category),
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      image: row.image || "",
      featuredImage: row.image || "",
      link: "article.html?slug=" + encodeURIComponent(row.slug || ""),
      status: row.status || "draft",
      date: row.published_at || row.created_at || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
    };
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Site shape -> database columns. Only the keys we actually write. */
  function toRow(article) {
    var row = {
      title: (article.title || "").trim(),
      slug: (article.slug || "").trim(),
      description: (article.description || "").trim(),
      brand: (article.brand || "").trim(),
      model: (article.model || "").trim(),
      category: normalizeCategory(article.category),
      meta_title: (article.metaTitle || "").trim(),
      meta_description: (article.metaDescription || "").trim(),
      content: article.content || "",
      image: (article.image || article.featuredImage || "").trim(),
      keywords: Array.isArray(article.keywords) ? article.keywords : [],
      status: article.status === "published" ? "published" : "draft",
    };

    if (!row.title) throw new Error("Article title is required.");
    if (!row.slug) throw new Error("Article slug is required.");

    return row;
  }

  /* --------------------------------------------------------------------------
     Seeded fallback
  ---------------------------------------------------------------------------
     js/data.js posts stay available when the database cannot be reached, so a
     Supabase outage never blanks the public blog. Seeded entries whose slug
     matches a database row are dropped by mergeSeedPosts().
  --------------------------------------------------------------------------- */

  function seedPosts() {
    return Array.isArray(NS.blogPosts) ? NS.blogPosts.slice() : [];
  }

  /* A seeded post links to a static page, e.g. "growatt-error-102.html".
     That file name is the same identifier the database row uses as its slug,
     so a seeded post whose link matches a database slug is the same article
     and must not be listed twice. */
  function slugFromLink(link) {
    if (!link) return "";

    var file = String(link).split("?")[0].split("#")[0];
    file = file.substring(file.lastIndexOf("/") + 1);

    return file.replace(/\.(html?|php|aspx?)$/i, "").toLowerCase();
  }

  /* Merge database posts over the seeded ones:
     - a database row replaces a seed with the same slug, link, or link filename
     - database rows come first, newest first
  --------------------------------------------------------------------------- */
  function mergeSeedPosts(posts) {
    var seed = seedPosts();

    if (!seed.length) return posts;

    var taken = {};

    posts.forEach(function (p) {
      if (p.slug) taken[p.slug.toLowerCase()] = true;
    });

    var kept = seed.filter(function (s) {
      if (s.slug && taken[String(s.slug).toLowerCase()]) return false;

      if (s.link) {
        var linkKey = String(s.link).toLowerCase();

        if (taken[linkKey]) return false;
        if (taken[slugFromLink(s.link)]) return false;
      }

      return true;
    });

    return posts.concat(kept);
  }

  /* --------------------------------------------------------------------------
     Public reads
  --------------------------------------------------------------------------- */

  /* Published articles for the public blog. Always resolves — falls back to
     the seeded posts if Supabase is unavailable or errors. */
  async function fetchPublishedArticles() {
    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c) {
      return { articles: mergeSeedPosts([]), source: "seed", error: null };
    }

    try {
      var res = await c
        .from(TABLE)
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (res.error) throw res.error;

      var posts = (res.data || []).map(toArticle);

      return { articles: mergeSeedPosts(posts), source: "supabase", error: null };
    } catch (error) {
      console.error("WHA SOL: Failed to load published articles.", error);

      return {
        articles: mergeSeedPosts([]),
        source: "seed",
        error: error,
      };
    }
  }

  /* One published article by slug. Returns null when missing. */
  async function fetchArticleBySlug(slug) {
    if (!slug) return null;

    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c) return null;

    var res = await c
      .from(TABLE)
      .select("*")
      .eq("slug", String(slug).trim())
      .eq("status", "published")
      .maybeSingle();

    if (res.error) {
      console.error("WHA SOL: Failed to load article by slug.", res.error);
      return null;
    }

    return toArticle(res.data);
  }

  /* --------------------------------------------------------------------------
     Admin reads
  --------------------------------------------------------------------------- */

  /* Every article, drafts included. Authenticated + editor role required by
     RLS; returns [] when the caller lacks access. */
  async function fetchAdminArticles() {
    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c) return [];

    var res = await c
      .from(TABLE)
      .select("*")
      .order("updated_at", { ascending: false });

    if (res.error) {
      console.error("WHA SOL: Failed to load admin articles.", res.error);
      return [];
    }

    return (res.data || []).map(toArticle);
  }

  /* One article by its database UUID. Drafts included. */
  async function fetchArticleById(id) {
    if (!id) return null;

    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c) return null;

    var res = await c.from(TABLE).select("*").eq("id", String(id)).maybeSingle();

    if (res.error) {
      console.error("WHA SOL: Failed to load article by id.", res.error);
      return null;
    }

    return toArticle(res.data);
  }

  /* One article by slug, drafts included — for the editor previewing a draft. */
  async function fetchArticleBySlugAdmin(slug) {
    if (!slug) return null;

    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c) return null;

    var res = await c.from(TABLE).select("*").eq("slug", String(slug).trim()).maybeSingle();

    if (res.error) {
      console.error("WHA SOL: Failed to load article by slug.", res.error);
      return null;
    }

    return toArticle(res.data);
  }

  /* --------------------------------------------------------------------------
     Admin writes
  --------------------------------------------------------------------------- */

  /* Create a new article. Returns { article } or { error }. */
  async function createArticle(article) {
    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c) return { article: null, error: new Error("Supabase is not ready.") };

    var row;

    try {
      row = toRow(article);
    } catch (error) {
      return { article: null, error: error };
    }

    var user = NS.auth ? await NS.auth.getCurrentUser() : null;

    if (user && user.id) row.author_id = user.id;

    var res = await c.from(TABLE).insert(row).select().single();

    if (res.error) {
      console.error("WHA SOL: Failed to create article.", res.error);
      return { article: null, error: res.error };
    }

    return { article: toArticle(res.data), error: null };
  }

  /* Update an existing article by id. Returns { article } or { error }. */
  async function updateArticle(id, article) {
    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c || !id) {
      return { article: null, error: new Error("Supabase is not ready.") };
    }

    var row;

    try {
      row = toRow(article);
    } catch (error) {
      return { article: null, error: error };
    }

    var res = await c.from(TABLE).update(row).eq("id", String(id)).select().single();

    if (res.error) {
      console.error("WHA SOL: Failed to update article.", res.error);
      return { article: null, error: res.error };
    }

    return { article: toArticle(res.data), error: null };
  }

  /* Create when there is no id, update otherwise. */
  async function saveArticle(id, article) {
    return id ? updateArticle(id, article) : createArticle(article);
  }

  /* Delete an article by id. */
  async function deleteArticle(id) {
    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    if (!c || !id) return { ok: false, error: new Error("Supabase is not ready.") };

    var res = await c.from(TABLE).delete().eq("id", String(id));

    if (res.error) {
      console.error("WHA SOL: Failed to delete article.", res.error);
      return { ok: false, error: res.error };
    }

    return { ok: true, error: null };
  }

  /* --------------------------------------------------------------------------
     Counters for the dashboard
  --------------------------------------------------------------------------- */

  async function fetchCounts() {
    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    var fallback = {
      total: seedPosts().length,
      published: seedPosts().length,
      drafts: 0,
    };

    if (!c) return fallback;

    try {
      var total = await c
        .from(TABLE)
        .select("id", { count: "exact", head: true });

      var published = await c
        .from(TABLE)
        .select("id", { count: "exact", head: true })
        .eq("status", "published");

      var drafts = await c
        .from(TABLE)
        .select("id", { count: "exact", head: true })
        .eq("status", "draft");

      return {
        total: total.count || 0,
        published: published.count || 0,
        drafts: drafts.count || 0,
      };
    } catch (error) {
      console.error("WHA SOL: Failed to load article counts.", error);
      return fallback;
    }
  }

  /* --------------------------------------------------------------------------
     Slug helper
  --------------------------------------------------------------------------- */

  function createSlug(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /* Slug must be unique. Appends -2, -3, ... until it is free.
     `excludeId` keeps the article's own slug available when re-saving. */
  async function uniqueSlug(slug, excludeId) {
    var c = client();

    if (!c) {
      await waitForClient();

      c = client();
    }

    var base = String(slug || "").trim() || "article";
    if (!c) return base;

    var candidate = base;
    var suffix = 1;

    /* Bounded so a pathological collision cannot spin forever. */
    while (suffix < 50) {
      var q = c.from(TABLE).select("id").eq("slug", candidate);

      if (excludeId) q = q.neq("id", String(excludeId));

      var res = await q.maybeSingle();

      if (res.error || !res.data) return candidate;

      suffix += 1;
      candidate = base + "-" + suffix;
    }

    return candidate + "-" + Date.now();
  }

  /* --------------------------------------------------------------------------
     Public API
  --------------------------------------------------------------------------- */

  NS.articlesApi = {
    /* Public */
    fetchPublishedArticles: fetchPublishedArticles,
    fetchArticleBySlug: fetchArticleBySlug,

    /* Admin */
    fetchAdminArticles: fetchAdminArticles,
    fetchArticleById: fetchArticleById,
    fetchArticleBySlugAdmin: fetchArticleBySlugAdmin,
    createArticle: createArticle,
    updateArticle: updateArticle,
    saveArticle: saveArticle,
    deleteArticle: deleteArticle,
    fetchCounts: fetchCounts,

    /* Utilities */
    toArticle: toArticle,
    toRow: toRow,
    stripHtml: stripHtml,
    createSlug: createSlug,
    uniqueSlug: uniqueSlug,
    waitForClient: waitForClient,
    normalizeCategory: normalizeCategory,
    categoryLabel: categoryLabel,
  };

  console.log("WHA SOL: Articles API initialized.");
})();
