/* ==========================================================================
   WHA SOL — Listing pages logic
   Handles search, filters, dynamic rendering and empty states for the
   Troubleshooting, Error Codes, Brands & Models and Blog pages.
   ========================================================================== */

(function () {
  "use strict";

  var body = document.body;
  var page = body.getAttribute("data-page");

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function readParam(key) {
    var m = new RegExp("[?&]" + key + "=([^&#]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function imagePath(src) {
    return src || "";
  }

  /* ------------------------------------------------------------------------
     Config per page
  ------------------------------------------------------------------------- */
  var config = {
    troubleshooting: {
      type: "articles",
      hydrate: "troubleshooting",
      data: WHASOL.troubleshootingArticles,
      searchFields: ["title", "description", "category", "brand", "models", "keywords"],
      stateEmpty: {
        heading: "No Troubleshooting Guides Found",
        text:
          "We are continuously adding practical solar troubleshooting resources. Check back soon for new guides and solutions.",
      },
      filters: [
        { label: "All Problems", value: "all" },
        { label: "Solar Panel Problems", value: "solar-panel" },
        { label: "Battery Problems", value: "battery" },
        { label: "Inverter Problems", value: "inverter" },
        { label: "Wiring & Electrical", value: "wiring" },
        { label: "Voltage & Frequency", value: "voltage" },
      ],
      paramMap: {
        "solar-panels": "solar-panel",
        battery: "battery",
        wiring: "wiring",
      },
    },
    "error-codes": {
      type: "codes",
      /* Error codes live in their own table, separate from articles. */
      hydrate: "error-codes",
      data: WHASOL.errorCodes,
      searchFields: ["code", "title", "brand", "model", "explanation"],
      stateEmpty: {
        heading: "No Error Codes Found",
        text:
          "We couldn't find a matching error code in our current knowledge base. Please check the code and try again.",
      },
    },
    "brands-models": {
      type: "brands",
      /* Brands and models live in their own tables, separate from articles. */
      hydrate: "brands-models",
      data: WHASOL.brands,
      searchFields: ["name", "description", "models"],
      stateEmpty: {
        heading: "No Brands or Models Found",
        text:
          "Brand and model information will appear here as our solar knowledge library grows.",
      },
    },
    blog: {
      type: "posts",
      /* Articles live in Supabase, so this list is re-rendered from the
         database once the client is ready. */
      hydrate: "blog",
      data: WHASOL.blogPosts,
      searchFields: ["title", "metaTitle", "metaDescription", "description", "brand", "model", "category", "keywords"],
      stateEmpty: {
        heading: "No Blog Articles Found",
        text:
          "We are preparing practical solar knowledge and troubleshooting articles. New content will appear here as it becomes available.",
      },
    },
  };

  if (!config[page]) return;

  var cfg = config[page];
  var grid = $("#data-grid");
  var searchInput = $("#search-input");
  var filterBar = $("#filter-bar");
  var resultsCount = $("#results-count");
  var stateEl = $("#state-empty");
  var setupId = stateEl ? stateEl.id : "state-empty";

  var state = {
    query: "",
    filter: readParam("category") ? (cfg.paramMap && cfg.paramMap[readParam("category")]) || readParam("category") : "all",
    brand: readParam("brand"),
    fromUrl: !!(readParam("category") || readParam("brand")),
  };

  /* ------------------------------------------------------------------------
     If a URL filter/brand matches nothing, fall back to showing all content
     so visitors always see the articles without having to clear filters.
  ------------------------------------------------------------------------- */
  function normalizeInitialView() {
    if (!state.fromUrl) return;
    var items = cfg.data.filter(matches);
    if (items.length === 0) {
      state.filter = "all";
      state.brand = "";
    }
    state.fromUrl = false;
  }

  /* ------------------------------------------------------------------------
     Card renderers
  ------------------------------------------------------------------------- */
  /* ------------------------------------------------------------------------
     Category slug
  --------------------------------------------------------------------------
     The filter chips and the homepage links use canonical slugs ("inverter",
     "solar-panel", ...). Articles saved through the admin editor may carry a
     friendly title instead ("Inverter", "Wiring & Electrical"), so both sides
     of the comparison are normalized before matching.

     js/articles-api.js owns the canonical mapping; the fallback below keeps
     the page working if that script is ever absent.
  ------------------------------------------------------------------------- */
  function categorySlug(value) {
    var api = window.WHASOL && window.WHASOL.articlesApi;

    if (api && typeof api.normalizeCategory === "function") {
      return api.normalizeCategory(value);
    }

    var text = String(value == null ? "" : value).trim().toLowerCase();

    if (!text) return "general";

    var slug = text
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    return slug || "general";
  }

  function categoryLabel(value) {
    var labels = {
      "solar-panel": "Solar Panel Problems",
      battery: "Battery Problems",
      inverter: "Inverter Problems",
      wiring: "Wiring & Electrical",
      voltage: "Voltage & Frequency",
      troubleshooting: "Troubleshooting",
      "solar-battery-guide": "Solar Battery Guide",
      general: "General",
    };
    return labels[categorySlug(value)] || value || "General";
  }

  function cardMeta(tags) {
    return (
      '<div class="card-meta">' +
      tags
        .map(function (t) {
          return '<span class="card-tag">' + escapeHtml(t) + "</span>";
        })
        .join("") +
      "</div>"
    );
  }

  function timeLabel(date) {
    if (!date) return "";
    var t = new Date(date);
    if (isNaN(t.getTime())) return escapeHtml(date);
    var diff = Date.now() - t.getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 60) {
      return mins < 1 ? "Just now" : mins + " minute" + (mins === 1 ? "" : "s") + " ago";
    }
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
    return t.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function articleCard(item) {
    return (
      '<article class="card list-card reveal">' +
      '<div class="card-media"><img src="' +
      imagePath(item.image) +
      '" alt="' +
      escapeHtml(item.title) +
      '" loading="lazy" /></div>' +
      '<div class="card-body">' +
      cardMeta(
        [categoryLabel(item.category), item.brand].filter(function (x) {
          return x;
        })
      ) +
      "<h3>" +
      escapeHtml(item.title) +
      "</h3>" +
      "<p>" +
      escapeHtml(item.description) +
      "</p>" +
      '<a href="' +
      escapeHtml(item.link || "contact.html") +
      '" class="card-link">Read More <span aria-hidden="true">→</span></a>' +
      "</div></article>"
    );
  }

  function codeCard(item) {
    return (
      '<article class="card list-card code-card reveal">' +
      '<div class="card-media"><img src="' +
      imagePath(item.image) +
      '" alt="' +
      escapeHtml(item.title || item.code) +
      '" loading="lazy" /></div>' +
      '<div class="card-body">' +
      cardMeta([item.brand, item.model].filter(function (x) { return x; })) +
      '<div class="code-number">' +
      escapeHtml(item.code) +
      "</div>" +
      "<h3>" +
      escapeHtml(item.title) +
      "</h3>" +
      "<p>" +
      escapeHtml(item.explanation) +
      "</p>" +
      '<a href="' +
      escapeHtml(item.link || "contact.html") +
      '" class="card-link">View Fix <span aria-hidden="true">→</span></a>' +
      "</div></article>"
    );
  }

  function brandCard(item) {
    var guide = "";
    if (item.articleTitle && item.articleLink) {
      guide =
        '<div class="card-guide">' +
        '<div class="card-guide-media"><img src="' +
        imagePath(item.articleImage) +
        '" alt="' +
        escapeHtml(item.articleTitle) +
        '" loading="lazy" /></div>' +
        '<div class="card-guide-body">' +
        '<span class="card-guide-label">Featured Guide</span>' +
        "<h4>" +
        escapeHtml(item.articleTitle) +
        "</h4>" +
        "<p>" +
        escapeHtml(item.articleDescription || "") +
        "</p>" +
        '<a href="' +
        escapeHtml(item.articleLink) +
        '" class="card-link">Read Guide <span aria-hidden="true">→</span></a>' +
        "</div></div>";
    }
    if (item.articleTitle2 && item.articleLink2) {
      guide +=
        '<div class="card-guide">' +
        '<div class="card-guide-media"><img src="' +
        imagePath(item.articleImage2) +
        '" alt="' +
        escapeHtml(item.articleTitle2) +
        '" loading="lazy" /></div>' +
        '<div class="card-guide-body">' +
        '<span class="card-guide-label">Featured Guide</span>' +
        "<h4>" +
        escapeHtml(item.articleTitle2) +
        "</h4>" +
        "<p>" +
        escapeHtml(item.articleDescription2 || "") +
        "</p>" +
        '<a href="' +
        escapeHtml(item.articleLink2) +
        '" class="card-link">Read Guide <span aria-hidden="true">→</span></a>' +
        "</div></div>";
    }

    /* Also render every published article that names this brand. The two
       legacy featured-guide fields remain unchanged, while newer articles
       continue to appear in the same brand card. */
    if (Array.isArray(item.relatedArticles)) {
      var featuredTitles = [item.articleTitle, item.articleTitle2]
        .filter(Boolean)
        .map(function (title) { return String(title).toLowerCase(); });

      item.relatedArticles.forEach(function (article) {
        var title = String(article.title || "");

        if (!title || !article.link || featuredTitles.indexOf(title.toLowerCase()) !== -1) {
          return;
        }

        featuredTitles.push(title.toLowerCase());
        guide +=
          '<div class="card-guide">' +
          '<div class="card-guide-media"><img src="' +
          imagePath(article.image) +
          '" alt="' +
          escapeHtml(title) +
          '" loading="lazy" /></div>' +
          '<div class="card-guide-body">' +
          '<span class="card-guide-label">Related Article</span>' +
          "<h4>" +
          escapeHtml(title) +
          "</h4>" +
          "<p>" +
          escapeHtml(article.description || "") +
          "</p>" +
          '<a href="' +
          escapeHtml(article.link) +
          '" class="card-link">Read Guide <span aria-hidden="true">â†’</span></a>' +
          "</div></div>";
      });
    }

    return (
      '<article class="card list-card brand-card reveal">' +
      '<div class="card-media"><img src="' +
      imagePath(item.image) +
      '" alt="' +
      escapeHtml(item.name) +
      '" loading="lazy" /></div>' +
      '<div class="card-body">' +
      "<h3>" +
      escapeHtml(item.name) +
      "</h3>" +
      guide +
      "</div></article>"
    );
  }

  function postCard(item) {
    return (
      '<article class="card list-card reveal">' +
      '<div class="card-media"><img src="' +
      imagePath(item.image) +
      '" alt="' +
      escapeHtml(item.title) +
      '" loading="lazy" /></div>' +
      '<div class="card-body">' +
      cardMeta(
        [item.brand, item.category].filter(function (x) {
          return x;
        })
      ) +
      '<div class="card-time">' +
      timeLabel(item.date) +
      "</div>" +
      "<h3>" +
      escapeHtml(item.title) +
      "</h3>" +
      "<p>" +
      escapeHtml(item.metaDescription || item.description) +
      "</p>" +
      '<a href="' +
      escapeHtml(item.link || "contact.html") +
      '" class="card-link">Read More <span aria-hidden="true">→</span></a>' +
      "</div></article>"
    );
  }

  var renderers = {
    articles: articleCard,
    codes: codeCard,
    brands: brandCard,
    posts: postCard,
  };

  /* ------------------------------------------------------------------------
     Empty states
  ------------------------------------------------------------------------- */
  function showState(kind) {
    var heading = "";
    var text = "";

    if (kind === "data" || kind === "filter") {
      if (kind === "data" && cfg.stateEmpty) {
        heading = cfg.stateEmpty.heading;
        text = cfg.stateEmpty.text;
      } else {
        heading = "No Results Found";
        text =
          "We couldn't find any content matching your search. Try another keyword or check back soon for new resources.";
      }
    } else {
      heading = "Result Not Found";
      text =
        "Sorry, we couldn't find anything matching your search. Try a different keyword, check the spelling, or browse another topic below.";
    }

    if (grid) {
      grid.innerHTML = "";
      grid.hidden = true;
    }
    if (stateEl) {
      stateEl.hidden = false;
      stateEl.querySelector("[data-state-heading]").textContent = heading;
      stateEl.querySelector("[data-state-text]").textContent = text;
    }
  }

  function showGrid(html) {
    if (grid) {
      grid.hidden = false;
      grid.innerHTML = html;
      /* Hydrated Supabase cards are inserted after main.js has registered its
         initial reveal observer. Ensure dynamically loaded cards do not stay
         at opacity: 0 when that event was missed or IntersectionObserver is
         unavailable. */
      grid.querySelectorAll(".reveal").forEach(function (card) {
        card.classList.add("in");
      });
      window.dispatchEvent(new Event("whasol:rendered"));
    }
    if (stateEl) {
      stateEl.hidden = true;
    }
    if (resultsCount) {
      resultsCount.textContent = (cfg.data.length > 0 ? html.match(/class="card /g).length : 0) + " result" + (html.match(/class="card /g).length === 1 ? "" : "s");
    }
  }

  /* ------------------------------------------------------------------------
     Filtering
  ------------------------------------------------------------------------- */
  function matches(item) {
    var haystack = (
      cfg.searchFields
        .map(function (f) {
          var v = item[f];
          return Array.isArray(v) ? v.join(" ") : v || "";
        })
        .join(" ") || ""
    ).toLowerCase();

    if (state.query && haystack.indexOf(state.query) === -1) return false;

    if (cfg.type === "articles" && state.filter !== "all") {
      if (categorySlug(item.category) !== categorySlug(state.filter)) return false;
    }

    if (cfg.type === "brands" && state.brand) {
      if (String(item.slug || item.id).toLowerCase() !== state.brand.toLowerCase()) return false;
    }

    return true;
  }

  function apply() {
    var items = cfg.data.filter(matches);

    if (cfg.data.length === 0) {
      showState("data");
      if (resultsCount) resultsCount.textContent = "0 results";
      return;
    }

    if (items.length === 0) {
      showState("filter");
      if (resultsCount) resultsCount.textContent = "0 results";
      return;
    }

    var html = items.map(renderers[cfg.type]).join("");
    showGrid(html);
  }

  /* ------------------------------------------------------------------------
     Search + filters + UI
  ------------------------------------------------------------------------- */
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value.trim().toLowerCase();
      apply();
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        state.query = searchInput.value.trim().toLowerCase();
        apply();
        if (grid && !grid.hidden) {
          grid.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
    var searchBtn = $("#search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        state.query = searchInput.value.trim().toLowerCase();
        apply();
      });
    }
  }

  function buildFilters() {
    if (!filterBar || !cfg.filters) return;
    cfg.filters.forEach(function (f) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (state.filter === f.value ? " is-active" : "");
      chip.textContent = f.label;
      chip.setAttribute("data-filter", f.value);
      chip.addEventListener("click", function () {
        state.filter = f.value;
        $all(".chip", filterBar).forEach(function (c) {
          c.classList.toggle("is-active", c === chip);
        });
        apply();
      });
      filterBar.appendChild(chip);
    });
  }

  var clearBtn = $("#clear-filters");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      state.query = "";
      state.filter = "all";
      state.brand = "";
      if (searchInput) searchInput.value = "";
      $all(".chip", filterBar).forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-filter") === "all");
      });
      apply();
      var cleanUrl = window.location.pathname;
      history.replaceState(null, "", cleanUrl);
    });
  }

  /* Re-trigger reveal for rendered cards */
  window.addEventListener("whasol:rendered", function () {
    var els = $all(".reveal:not(.in)");
    if (window.whasolReveal) {
      els.forEach(window.whasolReveal);
    }
  });

  /* ------------------------------------------------------------------------
     Supabase hydration
  --------------------------------------------------------------------------
     Seeded content in js/data.js renders immediately so the page is never
     blank. Once Supabase answers, the database records for this page's
     content type are merged in and the list re-renders.

     Each content type is read from its own table, so an error code or a
     brand is never rendered as an article and never counted as one. Drafts
     never arrive here: the RLS policies only let the public read published
     articles.
  ------------------------------------------------------------------------- */
  function hydrateFromSupabase() {
    var mode = cfg.hydrate;

    if (mode === "error-codes") {
      var taxonomy = window.WHASOL && window.WHASOL.taxonomyApi;

      if (!taxonomy || typeof taxonomy.fetchErrorCodes !== "function") return;

      taxonomy.fetchErrorCodes().then(function (result) {
        if (!result || !result.codes || !result.available) return;

        cfg.data = result.codes;

        normalizeInitialView();
        apply();
      });

      return;
    }

    if (mode === "brands-models") {
      var brandsApi = window.WHASOL && window.WHASOL.taxonomyApi;

      if (!brandsApi || typeof brandsApi.fetchBrands !== "function") return;

      brandsApi.fetchBrands().then(function (result) {
        if (!result || !result.brands || !result.available) return;

        cfg.data = result.brands;

        normalizeInitialView();
        apply();
      });

      return;
    }

    var api = window.WHASOL && window.WHASOL.articlesApi;

    if (!api || typeof api.fetchPublishedArticles !== "function") return;

    api.fetchPublishedArticles(mode === "troubleshooting" ? "troubleshooting" : "blog").then(function (result) {
      if (!result || !result.articles) return;

      cfg.data = result.articles;

      /* A URL filter may not match the freshly loaded set. */
      normalizeInitialView();
      apply();
    });
  }

  normalizeInitialView();
  buildFilters();
  apply();

  if (cfg.hydrate) {
    hydrateFromSupabase();
  }
})();
