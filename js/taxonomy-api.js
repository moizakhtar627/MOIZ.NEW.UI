/* ==========================================================================
   WHA SOL — Taxonomy API
   --------------------------------------------------------------------------
   Supabase-backed data access for the two content types that are NOT
   articles: error codes and brands/models.

   These stay deliberately separate from public.articles. An error code or a
   brand is never an article, is never counted as one, and is never rendered
   in an article list.

   Responsibilities:
   - Wait for the Supabase client created by js/supabase.js
   - Map database rows onto the shape js/data.js and js/listing.js already use,
     so the public pages need no changes to render them
   - Provide public reads and authenticated editor/admin writes
   - Fail gracefully: if the tables have not been created yet (002 / 003 not
     run in the Supabase SQL editor) every call reports `available: false`
     instead of inventing data

   Row shape (public.error_codes) -> site shape (WHASOL.errorCodes):
     code                -> code
     title               -> title
     brand               -> brand
     model               -> model
     category            -> category
     explanation         -> explanation
     image               -> image
     link                -> link
     keywords            -> keywords
     source_article_id   -> sourceArticleId   (the article that mentioned it)
     source_article_title-> sourceArticleTitle

   Row shape (public.brands + public.brand_models) -> site shape
   (WHASOL.brands):
     brand_models.name   -> models[]
     logo                -> logo
     article_*           -> articleTitle / articleDescription / ...

   Public API: WHASOL.taxonomyApi
   ========================================================================== */

(function () {
  "use strict";

  window.WHASOL = window.WHASOL || {};

  var NS = window.WHASOL;

  var CODES_TABLE = "error_codes";
  var BRANDS_TABLE = "brands";
  var MODELS_TABLE = "brand_models";

  /* --------------------------------------------------------------------------
     Client access
  --------------------------------------------------------------------------- */

  function client() {
    return NS.supabase || null;
  }

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
     Seeded baseline
  ---------------------------------------------------------------------------
     js/data.js stays the fallback so the public pages are never blank when
     the database cannot be reached. Nothing is fabricated: these are the
     records the project already ships.
  --------------------------------------------------------------------------- */

  function seedCodes() {
    return Array.isArray(NS.errorCodes) ? NS.errorCodes.slice() : [];
  }

  function seedBrands() {
    return Array.isArray(NS.brands) ? NS.brands.slice() : [];
  }

  /* Merge database records over the seeded ones so an article that has
     already been imported is not listed twice. Match on the natural key of
     each content type: code+brand for a code, slug for a brand. */
  function mergeByKey(db, seed, keyOf) {
    if (!seed.length) return db;

    var taken = {};

    db.forEach(function (row) {
      taken[keyOf(row)] = true;
    });

    var kept = seed.filter(function (row) {
      return !taken[keyOf(row)];
    });

    return db.concat(kept);
  }

  function codeKey(row) {
    return (
      String(row.brand || "").trim().toLowerCase() +
      "::" +
      String(row.code || "").trim().toLowerCase()
    );
  }

  function brandKey(row) {
    return String(row.slug || row.name || "").trim().toLowerCase();
  }

  /* --------------------------------------------------------------------------
     Row mapping
  --------------------------------------------------------------------------- */

  function toCode(row) {
    if (!row) return null;

    return {
      id: row.id,
      code: row.code || "",
      title: row.title || "",
      brand: row.brand || "",
      model: row.model || "",
      category: row.category || "Inverter",
      explanation: row.explanation || "",
      image: row.image || "",
      link: row.link || "",
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      sourceArticleId: row.source_article_id || "",
      sourceArticleTitle: row.source_article_title || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
    };
  }

  function toBrand(row, models) {
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug || "",
      name: row.name || "",
      description: row.description || "",
      image: row.image || "",
      /* Brand logo, copied into an article's featured image by the editor. */
      logo: row.logo || "",
      models: Array.isArray(models) ? models : [],
      articleTitle: row.article_title || "",
      articleDescription: row.article_description || "",
      articleImage: row.article_image || "",
      articleLink: row.article_link || "",
      articleTitle2: row.article_title2 || "",
      articleDescription2: row.article_description2 || "",
      articleImage2: row.article_image2 || "",
      articleLink2: row.article_link2 || "",
      sourceArticleId: row.source_article_id || "",
      sourceArticleTitle: row.source_article_title || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
    };
  }

  /* --------------------------------------------------------------------------
     Public reads
  --------------------------------------------------------------------------- */

  /* Every documented error code. Always resolves. Falls back to the seeded
     codes when Supabase is unavailable or the table does not exist. */
  async function fetchErrorCodes() {
    var c = client();

    if (!c) {
      await waitForClient();
      c = client();
    }

    if (!c) {
      return { codes: seedCodes(), source: "seed", available: false, error: null };
    }

    try {
      var res = await c
        .from(CODES_TABLE)
        .select("*")
        .order("code", { ascending: true });

      if (res.error) throw res.error;

      var rows = (res.data || []).map(toCode);

      return {
        codes: mergeByKey(rows, seedCodes(), codeKey),
        source: "supabase",
        available: true,
        error: null,
      };
    } catch (error) {
      /* The table is missing until 002_create_error_codes_table.sql is run.
         That is a configuration gap, not a reason to show wrong numbers. */
      console.warn("WHA SOL: error_codes unavailable.", error && error.message);

      return {
        codes: seedCodes(),
        source: "seed",
        available: false,
        error: error,
      };
    }
  }

  /* Every brand with its models. Always resolves, same fallback contract. */
  async function fetchBrands() {
    var c = client();

    if (!c) {
      await waitForClient();
      c = client();
    }

    if (!c) {
      return { brands: seedBrands(), source: "seed", available: false, error: null };
    }

    try {
      var res = await c
        .from(BRANDS_TABLE)
        .select("*")
        .order("name", { ascending: true });

      if (res.error) throw res.error;

      var rows = res.data || [];

      /* Models are a separate table. One extra query keeps the mapping
         correct without an N+1 loop over the brands. */
      var modelsByBrand = {};

      if (rows.length) {
        var brandIds = rows.map(function (r) {
          return r.id;
        });

        var modelsRes = await c
          .from(MODELS_TABLE)
          .select("brand_id, name")
          .in("brand_id", brandIds);

        if (modelsRes.error) throw modelsRes.error;

        (modelsRes.data || []).forEach(function (m) {
          if (!modelsByBrand[m.brand_id]) modelsByBrand[m.brand_id] = [];
          modelsByBrand[m.brand_id].push(m.name);
        });
      }

      var brands = rows.map(function (row) {
        return toBrand(row, modelsByBrand[row.id] || []);
      });

      return {
        brands: mergeByKey(brands, seedBrands(), brandKey),
        source: "supabase",
        available: true,
        error: null,
      };
    } catch (error) {
      console.warn("WHA SOL: brands unavailable.", error && error.message);

      return {
        brands: seedBrands(),
        source: "seed",
        available: false,
        error: error,
      };
    }
  }

  /* One brand by name, case-insensitive. Returns null when not found. */
  async function findBrandByName(name) {
    var wanted = String(name || "").trim().toLowerCase();

    if (!wanted) return null;

    var result = await fetchBrands();

    if (!result.brands) return null;

    for (var i = 0; i < result.brands.length; i++) {
      var brand = result.brands[i];

      if (
        String(brand.name || "").trim().toLowerCase() === wanted ||
        String(brand.slug || "").trim().toLowerCase() === wanted
      ) {
        return brand;
      }
    }

    return null;
  }

  /* Lifetime counts for the dashboard. Each content type is counted on its
     own so an error code is never included in an article total. */
  async function fetchCounts() {
    var c = client();

    if (!c) {
      await waitForClient();
      c = client();
    }

    if (!c) {
      return {
        errorCodes: 0,
        brands: 0,
        models: 0,
        available: false,
        errorCodesAvailable: false,
        brandsAvailable: false,
        modelsAvailable: false,
      };
    }

    try {
      var results = await Promise.all([
        c.from(CODES_TABLE).select("id", { count: "exact", head: true }),
        c.from(BRANDS_TABLE).select("id", { count: "exact", head: true }),
        c.from(MODELS_TABLE).select("id", { count: "exact", head: true }),
      ]);

      var codes = results[0];
      var brands = results[1];
      var models = results[2];

      return {
        errorCodes: codes.count || 0,
        brands: brands.count || 0,
        models: models.count || 0,
        available: !codes.error && !brands.error && !models.error,
        errorCodesAvailable: !codes.error,
        brandsAvailable: !brands.error,
        modelsAvailable: !models.error,
        error: codes.error || brands.error || models.error || null,
      };
    } catch (error) {
      console.error("WHA SOL: Failed to load taxonomy counts.", error);
      return {
        errorCodes: 0,
        brands: 0,
        models: 0,
        available: false,
        errorCodesAvailable: false,
        brandsAvailable: false,
        modelsAvailable: false,
        error: error,
      };
    }
  }

  /* --------------------------------------------------------------------------
     Editor writes
  --------------------------------------------------------------------------- */

  /* Create an error code. Idempotent: the (brand, code) unique constraint
     means a second attempt updates the existing row instead of failing or
     creating a duplicate. Returns { code } or { error }. */
  async function saveErrorCode(input) {
    var c = client();

    if (!c) {
      await waitForClient();
      c = client();
    }

    if (!c) {
      return { code: null, error: new Error("Supabase is not ready.") };
    }

    var code = String(input.code || "").trim();
    var brand = String(input.brand || "").trim();

    if (!code) {
      return { code: null, error: new Error("Error code is required.") };
    }

    var row = {
      code: code,
      title: String(input.title || ("Error " + code)).trim(),
      brand: brand,
      model: String(input.model || "").trim(),
      category: String(input.category || "Inverter").trim(),
      explanation: String(input.explanation || "").trim(),
      image: String(input.image || "").trim(),
      link: String(input.link || "").trim(),
      keywords: Array.isArray(input.keywords) ? input.keywords : [],
      source_article_id: input.sourceArticleId || null,
      source_article_title: String(input.sourceArticleTitle || "").trim(),
    };

    var res = await c
      .from(CODES_TABLE)
      .upsert(row, { onConflict: "brand,code" })
      .select()
      .single();

    if (res.error) {
      console.error("WHA SOL: Failed to save error code.", res.error);
      return { code: null, error: res.error };
    }

    return { code: toCode(res.data), error: null };
  }

  /* Find a brand by name, or create it. `logo` and the featured-guide fields
     are only written on insert, so linking a later article never overwrites
     a guide an editor already chose. Returns { brand, created } or { error }. */
  async function ensureBrand(input) {
    var c = client();

    if (!c) {
      await waitForClient();
      c = client();
    }

    if (!c) return { brand: null, created: false, error: new Error("Supabase is not ready.") };

    var name = String(input.name || "").trim();

    if (!name) {
      return { brand: null, created: false, error: new Error("Brand name is required.") };
    }

    var existing = await findBrandByName(name);

    if (existing && existing.id) {
      var models = [];

      if (input.model) models.push(String(input.model).trim());

      if (models.length) {
        await addModels(existing.id, models);
        existing.models = (existing.models || []).concat(
          models.filter(function (m) {
            return existing.models.indexOf(m) === -1;
          })
        );
      }

      return { brand: existing, created: false, error: null };
    }

    var slug = String(input.slug || createSlug(name)).trim() || "brand";

    var res = await c
      .from(BRANDS_TABLE)
      .insert({
        slug: slug,
        name: name,
        description: String(input.description || "").trim(),
        image: String(input.image || "").trim(),
        logo: String(input.logo || "").trim(),
        article_title: String(input.articleTitle || "").trim(),
        article_description: String(input.articleDescription || "").trim(),
        article_image: String(input.articleImage || "").trim(),
        article_link: String(input.articleLink || "").trim(),
        source_article_id: input.sourceArticleId || null,
        source_article_title: String(input.sourceArticleTitle || "").trim(),
      })
      .select()
      .single();

    if (res.error) {
      console.error("WHA SOL: Failed to create brand.", res.error);
      return { brand: null, created: false, error: res.error };
    }

    var created = toBrand(res.data, []);

    if (input.model) {
      await addModels(created.id, [String(input.model).trim()]);
      created.models = [String(input.model).trim()];
    }

    return { brand: created, created: true, error: null };
  }

  /* Add models to a brand, ignoring ones already present. */
  async function addModels(brandId, names) {
    var c = client();

    if (!c || !brandId) return { error: new Error("Supabase is not ready.") };

    var list = (Array.isArray(names) ? names : [names])
      .map(function (n) {
        return String(n || "").trim();
      })
      .filter(Boolean);

    if (!list.length) return { error: null };

    var res = await c
      .from(MODELS_TABLE)
      .upsert(
        list.map(function (name) {
          return { brand_id: brandId, name: name };
        }),
        { onConflict: "brand_id,name", ignoreDuplicates: true }
      );

    if (res.error) {
      console.error("WHA SOL: Failed to save brand models.", res.error);
      return { error: res.error };
    }

    return { error: null };
  }

  /* Point a brand at an article as its featured guide, but only while the
     guide slot is still empty. */
  async function linkBrandArticle(brandId, article) {
    var c = client();

    if (!c || !brandId || !article) return { error: null };

    var current = await c
      .from(BRANDS_TABLE)
      .select("article_title, article_title2")
      .eq("id", brandId)
      .maybeSingle();

    if (current.error || !current.data) return { error: current.error || null };

    var patch = {
      updated_at: new Date().toISOString(),
    };

    if (!current.data.article_title) {
      patch.article_title = article.title || "";
      patch.article_description = article.metaDescription || article.description || "";
      patch.article_image = article.image || "";
      patch.article_link = article.link || "";
    } else if (!current.data.article_title2) {
      patch.article_title2 = article.title || "";
      patch.article_description2 = article.metaDescription || article.description || "";
      patch.article_image2 = article.image || "";
      patch.article_link2 = article.link || "";
    } else {
      /* Both guide slots are filled; the article still belongs to the brand
         but there is nowhere to show it on the brand card. */
      return { error: null };
    }

    var res = await c.from(BRANDS_TABLE).update(patch).eq("id", brandId);

    if (res.error) {
      console.error("WHA SOL: Failed to link brand guide.", res.error);
      return { error: res.error };
    }

    return { error: null };
  }

  /* --------------------------------------------------------------------------
     Slug helper
     Same rule as articles-api.js so both content types produce identical
     slugs for the same words.
  --------------------------------------------------------------------------- */

  function createSlug(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /* --------------------------------------------------------------------------
     Public API
  --------------------------------------------------------------------------- */

  NS.taxonomyApi = {
    /* Public reads */
    fetchErrorCodes: fetchErrorCodes,
    fetchBrands: fetchBrands,
    findBrandByName: findBrandByName,
    fetchCounts: fetchCounts,

    /* Editor writes */
    saveErrorCode: saveErrorCode,
    ensureBrand: ensureBrand,
    addModels: addModels,
    linkBrandArticle: linkBrandArticle,

    /* Utilities */
    createSlug: createSlug,
    waitForClient: waitForClient,
  };

  console.log("WHA SOL: Taxonomy API initialized.");
})();
