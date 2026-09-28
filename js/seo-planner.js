/* WHA SOL — reusable SEO Planner component
   Local analysis is always available. External keyword/Search Console values
   are deliberately not fabricated; a secure backend can provide them later. */
(function () {
  "use strict";

  window.WHASOL = window.WHASOL || {};

  var TYPE_LABELS = {
    blog: "Blog",
    troubleshooting: "Troubleshooting",
    error_code: "Error Code",
    brand: "Brand",
    model: "Model",
    brand_model: "Brand / Model",
  };

  function text(value) {
    return String(value == null ? "" : value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function element(selector) {
    if (!selector) return null;
    return document.querySelector(selector);
  }

  function valueOf(selector) {
    var el = element(selector);
    if (!el) return "";
    return el.isContentEditable ? el.innerHTML : el.value || el.textContent || "";
  }

  function slugify(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  function readFields(config) {
    var fields = config.fields || {};
    return {
      contentType: config.contentType || "blog",
      title: text(valueOf(fields.title)),
      slug: text(valueOf(fields.slug)),
      metaTitle: text(valueOf(fields.metaTitle)),
      metaDescription: text(valueOf(fields.metaDescription)),
      keyword: text(valueOf(fields.keyword)),
      category: text(valueOf(fields.category)),
      brand: text(valueOf(fields.brand)),
      model: text(valueOf(fields.model)),
      content: text(valueOf(fields.content)),
      description: text(valueOf(fields.description)),
      explanation: text(valueOf(fields.explanation)),
      image: text(valueOf(fields.image)),
      featuredImage: text(valueOf(fields.featuredImage)),
      altText: text(valueOf(fields.altText)),
      status: text(valueOf(fields.status)),
      errorCode: text(valueOf(fields.errorCode)),
    };
  }

  function intent(data) {
    var type = data.contentType;
    if (type === "error_code") return { label: "Informational / Problem-solving", why: "Error-code searches usually seek a meaning, cause, safe fix, or recovery step." };
    if (type === "model") return { label: "Informational / Commercial", why: "Model searches commonly combine product information with evaluation or setup questions." };
    if (type === "brand" || type === "brand_model") return { label: "Navigational / Informational", why: "Brand and model searches usually seek entity information, products, support, or compatibility." };
    if (type === "troubleshooting") return { label: "Informational / Problem-solving", why: "Troubleshooting searches usually describe a symptom and seek a safe resolution." };
    return { label: "Informational", why: "The content appears to answer a knowledge or maintenance question." };
  }

  function relatedKeywords(data) {
    var base = data.keyword || data.title || data.errorCode || data.brand || data.model;
    var terms = [];
    function add(value) {
      value = text(value);
      if (value && terms.indexOf(value.toLowerCase()) === -1) terms.push(value);
    }
    add(base);
    if (data.brand && data.model) { add(data.brand + " " + data.model); add(data.brand + " " + data.model + " troubleshooting"); }
    if (data.brand) { add(data.brand + " inverter"); add(data.brand + " solar inverter"); }
    if (data.errorCode) { add(data.brand + " error code " + data.errorCode); add("inverter error code " + data.errorCode); }
    if (data.category) add(data.category + " troubleshooting");
    return terms.slice(0, 8);
  }

  function internalLinks(data) {
    var links = [];
    if (data.brand) links.push({ label: data.brand + " brand page", url: "../brands-models.html?brand=" + encodeURIComponent(slugify(data.brand)) });
    if (data.contentType === "error_code") links.push({ label: "Error Codes", url: "../error-codes.html" });
    if (data.contentType === "troubleshooting") links.push({ label: "Troubleshooting guides", url: "../troubleshooting.html" });
    if (data.contentType === "blog") links.push({ label: "Blog", url: "../blog.html" });
    if (data.model && data.brand) links.push({ label: data.brand + " models", url: "../brands-models.html?brand=" + encodeURIComponent(slugify(data.brand)) });
    return links;
  }

  function analyze(data) {
    var checks = [];
    function check(label, pass, detail, weight) { checks.push({ label: label, pass: !!pass, detail: detail, weight: weight || 1 }); }
    var mainContent = data.content || data.explanation || data.description;
    check("Title is clear", data.title.length >= 20 && data.title.length <= 70, "Use a clear, visitor-focused title.", 12);
    check("Slug is available", !!(data.slug || data.title), "Add a readable URL slug before publishing.", 8);
    check("Meta title", data.metaTitle.length >= 30 && data.metaTitle.length <= 65, "Guidance: approximately 50–60 characters.", 10);
    check("Meta description", data.metaDescription.length >= 100 && data.metaDescription.length <= 170, "Guidance: approximately 140–160 characters.", 10);
    check("Primary keyword", !!data.keyword || !!data.errorCode || !!data.brand || !!data.model, "Add one natural editorial keyword or entity.", 8);
    check("Content depth", mainContent.length >= (data.contentType === "error_code" ? 250 : 500), "Add useful, specific information for the visitor.", 18);
    check("Heading structure", /<h[1-6]\b/i.test(data.content), "Use headings to organize long-form content.", 8);
    check("Brand/model context", data.contentType === "blog" || data.contentType === "troubleshooting" ? (!!data.brand || !!data.category) : (!!data.brand || data.contentType === "error_code"), "Add the relevant entity or category where supported.", 8);
    check("Image information", !!(data.image || data.featuredImage), "Add a relevant main or thumbnail image.", 6);
    check("Image alt text", !!data.altText, "Add natural descriptive alt text when the schema supports it.", 5);
    check("Internal links", internalLinks(data).length > 0, "Review relevant WHA SOL internal links.", 5);
    var total = checks.reduce(function (sum, item) { return sum + item.weight; }, 0);
    var earned = checks.reduce(function (sum, item) { return sum + (item.pass ? item.weight : 0); }, 0);
    var score = Math.round((earned / total) * 100);
    var missing = checks.filter(function (item) { return !item.pass; });
    var good = checks.filter(function (item) { return item.pass; });
    return {
      score: score,
      checks: checks,
      good: good,
      issues: missing,
      keywords: relatedKeywords(data),
      intent: intent(data),
      links: internalLinks(data),
      recommendations: missing.slice(0, 5).map(function (item) { return item.detail; }),
      liveData: "Live keyword volume, competition, organic difficulty, and Search Console data unavailable.",
    };
  }

  function mount(config) {
    var host = typeof config.host === "string" ? document.querySelector(config.host) : config.host;
    if (!host) return null;
    var fields = config.fields || {};
    host.innerHTML = '<section class="seo-planner-panel"><div class="seo-planner-head"><div><strong>SEO PLANNER</strong><small>Internal optimization guidance</small></div><div class="seo-planner-score" data-seo-score>— / 100</div></div><div class="seo-planner-keyword"><label>Primary Keyword</label><div class="seo-planner-inline"><input type="text" data-seo-research-input placeholder="Enter a keyword or entity"><button type="button" data-seo-research>Research Keyword</button></div></div><div class="seo-planner-overview"><div><span>Search Volume</span><strong data-seo-volume>Unavailable</strong></div><div><span>Paid Competition</span><strong data-seo-paid>Unavailable</strong></div><div><span>Organic Difficulty</span><strong data-seo-organic>Unavailable</strong></div><div><span>Intent</span><strong data-seo-intent>—</strong></div></div><div class="seo-planner-section"><h4>Content Analysis</h4><div data-seo-checks>Click Analyze Content to begin.</div></div><div class="seo-planner-section"><h4>Related Keywords</h4><div data-seo-keywords>—</div></div><div class="seo-planner-section"><h4>Internal Links</h4><div data-seo-links>—</div></div><div class="seo-planner-section"><h4>Google Search Performance</h4><p class="seo-planner-muted">Connect Google Search Console to view actual search performance. No ranking data is fabricated.</p></div><div class="seo-planner-section"><h4>AI Recommendations</h4><div class="seo-planner-actions"><button type="button" data-seo-action="title">Improve Title</button><button type="button" data-seo-action="meta">Improve Meta Description</button><button type="button" data-seo-action="headings">Suggest Headings</button><button type="button" data-seo-action="faq">Suggest FAQ</button><button type="button" data-seo-analyze>Analyze Content</button></div><div class="seo-planner-proposal" data-seo-proposal>Suggestions are proposed only; published content will never be overwritten automatically.</div></div></section>';
    host.classList.add("seo-planner-dock", "open");
    var provider = document.createElement("select");
    provider.setAttribute("data-seo-provider", "");
    provider.setAttribute("aria-label", "Research provider");
    provider.innerHTML = '<option value="google">Google Search</option><option value="llm">LLM Research</option>';
    var researchButton = host.querySelector("[data-seo-research]");
    if (researchButton && researchButton.parentNode) researchButton.parentNode.insertBefore(provider, researchButton);
    var questions = document.createElement("div");
    questions.className = "seo-planner-section";
    questions.innerHTML = '<h4>Questions &amp; Search Results</h4><div data-seo-questions class="seo-planner-muted">Research a keyword to load verified results or provider suggestions.</div>';
    var linksSection = host.querySelector("[data-seo-links]");
    if (linksSection && linksSection.parentNode) linksSection.parentNode.parentNode.insertBefore(questions, linksSection.parentNode);
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "seo-planner-toggle";
    toggle.setAttribute("data-seo-toggle", "");
    toggle.textContent = "SEO Planner";
    host.insertBefore(toggle, host.firstChild);
    toggle.addEventListener("click", function () { host.classList.toggle("open"); });
    var map = {};
    Object.keys(fields).forEach(function (key) { map[key] = fields[key]; });
    var keywordInput = host.querySelector("[data-seo-research-input]");
    var initialData = readFields({ contentType: config.contentType, fields: map });
    var initialKeyword = text(valueOf(map.keyword)) || initialData.keyword;
    if (!initialKeyword && initialData.errorCode) initialKeyword = [initialData.brand, "error code", initialData.errorCode].filter(Boolean).join(" ");
    if (!initialKeyword && (initialData.brand || initialData.model)) initialKeyword = [initialData.brand, initialData.model].filter(Boolean).join(" ");
    if (!initialKeyword) initialKeyword = initialData.title;
    if (keywordInput && initialKeyword) keywordInput.value = initialKeyword;
    var score = host.querySelector("[data-seo-score]");
    function run() {
      var data = readFields({ contentType: config.contentType, fields: map });
      if (keywordInput && keywordInput.value.trim()) data.keyword = keywordInput.value.trim();
      var result = analyze(data);
      score.textContent = result.score + " / 100";
      host.querySelector("[data-seo-intent]").textContent = result.intent.label;
      host.querySelector("[data-seo-checks]").innerHTML = result.checks.map(function (item) { return '<div class="seo-planner-check ' + (item.pass ? "pass" : "warn") + '"><span>' + (item.pass ? "✓" : "⚠") + '</span><span>' + escapeHtml(item.label) + '</span></div>'; }).join("");
      host.querySelector("[data-seo-keywords]").innerHTML = result.keywords.length ? result.keywords.map(function (item) { return '<span class="seo-planner-chip">' + escapeHtml(item) + '<small>Live data unavailable</small></span>'; }).join("") : "—";
      host.querySelector("[data-seo-links]").innerHTML = result.links.length ? result.links.map(function (item) { return '<a class="seo-planner-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + escapeHtml(item.label) + '</a>'; }).join("") : "No verified internal links found yet.";
      host.querySelector("[data-seo-proposal]").textContent = result.recommendations.length ? result.recommendations.join(" ") : "Good baseline. Review the content manually before publishing.";
      return result;
    }
    host.querySelector("[data-seo-analyze]").addEventListener("click", async function () {
  var button = host.querySelector("[data-seo-analyze]");
  var data = readFields({
    contentType: config.contentType,
    fields: map
  });

  if (keywordInput && keywordInput.value.trim()) {
    data.keyword = keywordInput.value.trim();
  }

  button.disabled = true;
  button.textContent = "Analyzing...";

  host.querySelector("[data-seo-proposal]").textContent =
    "AI SEO analysis is running...";

  try {
    var response = await fetch("/api/seo-research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        action: "full_analyze",

        contentType: data.contentType,
        title: data.title,
        slug: data.slug,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        primaryKeyword: data.keyword,
        category: data.category,
        brand: data.brand,
        model: data.model,
        errorCode: data.errorCode,
        content: data.content,
        description: data.description,
        explanation: data.explanation,
        image: data.image,
        featuredImage: data.featuredImage,
        altText: data.altText
      })
    });

    var result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "SEO analysis failed."
      );
    }

    if (result.seo) {
      score.textContent =
        String(result.seo.score || 0) + " / 100";

      host.querySelector("[data-seo-intent]").textContent =
        result.ai && result.ai.intent
          ? result.ai.intent
          : "—";

      var checks = Array.isArray(result.seo.checks)
        ? result.seo.checks
        : [];

      host.querySelector("[data-seo-checks]").innerHTML =
        checks.map(function (item) {
          return (
            '<div class="seo-planner-check ' +
            (item.status === "pass" ? "pass" : "warn") +
            '">' +
            "<span>" +
            (item.status === "pass" ? "✓" : "⚠") +
            "</span>" +
            "<span>" +
            escapeHtml(item.message || "") +
            "</span>" +
            "</div>"
          );
        }).join("");

      var recommendations = [];

      if (Array.isArray(result.seo.recommendations)) {
        recommendations =
          recommendations.concat(
            result.seo.recommendations.map(function (item) {
              return item.message || "";
            })
          );
      }

      if (
        result.ai &&
        Array.isArray(result.ai.recommendations)
      ) {
        recommendations =
          recommendations.concat(
            result.ai.recommendations.map(function (item) {
              return item.message || "";
            })
          );
      }

      if (
        result.ai &&
        Array.isArray(result.ai.contentGaps) &&
        result.ai.contentGaps.length
      ) {
        recommendations.push(
          "Content gaps: " +
          result.ai.contentGaps.join(", ")
        );
      }

      host.querySelector("[data-seo-proposal]").textContent =
        recommendations.length
          ? recommendations.slice(0, 8).join(" ")
          : "No major recommendations returned.";
    }

    if (result.research) {
      renderResearch(result.research);
    }

  } catch (error) {
    console.error(
      "WHA SOL SEO Planner analysis failed:",
      error
    );

    host.querySelector("[data-seo-proposal]").textContent =
      error.message ||
      "SEO analysis failed. Local analysis remains available.";

    run();
  } finally {
    button.disabled = false;
    button.textContent = "Analyze Content";
  }
});
    host.querySelector("[data-seo-research]").addEventListener("click", function () { host.querySelector("[data-seo-proposal]").textContent = "Live keyword data unavailable. Connect a secure keyword provider to research volume, paid competition, and organic difficulty."; run(); });
    host.querySelectorAll("[data-seo-action]").forEach(function (button) { button.addEventListener("click", function () { var action = button.getAttribute("data-seo-action"); host.querySelector("[data-seo-proposal]").textContent = action === "faq" ? "Suggested FAQ topics require editorial review: What symptoms occur? What causes the issue? What safe checks should be performed?" : action === "headings" ? "Suggested heading outline: Overview, Symptoms, Causes, Safe Checks, Solution, Verification, FAQ." : action === "title" ? "Proposed title: make the entity and visitor problem explicit without keyword stuffing." : "Proposed meta description: summarize the useful answer and entity naturally within the existing field."; }); });
    host.querySelectorAll("[data-seo-action]").forEach(function (button) { button.addEventListener("click", function () {
      var data = readFields({ contentType: config.contentType, fields: map });
      var action = button.getAttribute("data-seo-action");
      var entity = [data.brand, data.model, data.errorCode ? "error code " + data.errorCode : ""].filter(Boolean).join(" ");
      var proposal = action === "title" ? "Proposed title: " + (entity ? entity + " — " : "") + (data.title || "Practical troubleshooting guide") : action === "meta" ? "Proposed meta description: Learn " + (data.title || entity || "this solar topic") + ". Follow clear, safe steps, understand the cause, and verify the fix." : action === "headings" ? "Suggested heading outline: Overview; Symptoms; Causes; Safe checks; Step-by-step solution; Verification; FAQ." : "Suggested FAQ topics: What does this issue mean? What causes it? What safe checks should be performed? When should a qualified technician help?";
      host.querySelector("[data-seo-proposal]").textContent = proposal + " Review and copy the proposal manually; no field is overwritten automatically.";
    }); });
    function renderResearch(data) {
      host.querySelector("[data-seo-volume]").textContent = data.searchVolume || "Unavailable";
      host.querySelector("[data-seo-paid]").textContent = data.paidCompetition || "Unavailable";
      host.querySelector("[data-seo-organic]").textContent = data.organicDifficulty || "Unavailable";
      if (data.intent) host.querySelector("[data-seo-intent]").textContent = data.intent;
      var terms = Array.isArray(data.relatedKeywords) ? data.relatedKeywords.filter(Boolean) : [];
      host.querySelector("[data-seo-keywords]").innerHTML = terms.length ? terms.map(function (item) { return '<span class="seo-planner-chip">' + escapeHtml(item) + '<small>' + escapeHtml(data.provider === "google" ? "Google result topic" : "LLM suggestion") + '</small></span>'; }).join("") : "No related keywords returned.";
      var questionsList = Array.isArray(data.questions) ? data.questions : [];
      var notes = Array.isArray(data.notes) ? data.notes : [];
      var results = Array.isArray(data.results) ? data.results : [];
      var html = questionsList.length ? "<strong>Questions</strong>" + questionsList.map(function (item) { return "<div>• " + escapeHtml(item) + "</div>"; }).join("") : "";
      if (results.length) html += "<strong class=\"seo-planner-result-label\">Google results</strong>" + results.map(function (item) { return '<a class="seo-planner-result" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener"><b>' + escapeHtml(item.title) + '</b><small>' + escapeHtml(item.snippet) + '</small></a>'; }).join("");
      if (notes.length) html += "<strong class=\"seo-planner-result-label\">Provider notes</strong>" + notes.map(function (item) { return "<div>• " + escapeHtml(item) + "</div>"; }).join("");
      host.querySelector("[data-seo-questions]").innerHTML = html || "No questions or results returned.";
    }
    host.querySelector("[data-seo-research]").addEventListener("click", async function () {
      var button = host.querySelector("[data-seo-research]");
      var selectedProvider = provider.value;
      var keyword = (keywordInput && keywordInput.value.trim()) || initialKeyword;
      if (!keyword) { host.querySelector("[data-seo-proposal]").textContent = "Enter a keyword, title, brand, model, or error code first."; return; }
      button.disabled = true;
      button.textContent = "Researching…";
      host.querySelector("[data-seo-proposal]").textContent = "Contacting the secure " + (selectedProvider === "google" ? "Google" : "LLM") + " research provider…";
      try {
        var response = await fetch("/api/seo-research?q=" + encodeURIComponent(keyword) + "&provider=" + encodeURIComponent(selectedProvider), { headers: { Accept: "application/json" } });
        var data = await response.json();
        if (!response.ok) throw new Error(data.error || "Research provider unavailable.");
        run();
        renderResearch(data);
        host.querySelector("[data-seo-proposal]").textContent = data.provider === "google" ? "Google results loaded. Unsupported volume, competition, difficulty, and Search Console values remain unavailable." : "LLM topic research loaded. It does not provide fabricated volume, competition, rankings, or Search Console data.";
      } catch (error) {
        host.querySelector("[data-seo-proposal]").textContent = error.message || "Research provider unavailable. Local analysis remains available.";
      } finally {
        button.disabled = false;
        button.textContent = "Research Keyword";
      }
    });
    run();
    return { analyze: run, read: function () { return readFields({ contentType: config.contentType, fields: map }); } };
  }

  function injectStyles() {
    if (document.getElementById("seo-planner-styles")) return;
    var style = document.createElement("style"); style.id = "seo-planner-styles";
    style.textContent = ".seo-planner-panel{margin-top:18px;padding:18px;border:1px solid rgba(143,211,255,.16);border-radius:12px;background:rgba(10,24,35,.72);color:var(--admin-text,#edf4f7)}.seo-planner-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.seo-planner-head strong{display:block;letter-spacing:.12em;font-size:12px}.seo-planner-head small,.seo-planner-muted,.seo-planner-section span{color:var(--admin-muted,#91a4b1)}.seo-planner-score{font-size:20px;font-weight:800;color:var(--admin-accent,#8ed8ff)}.seo-planner-keyword{margin-top:16px}.seo-planner-keyword label{display:block;margin-bottom:6px;font-size:12px}.seo-planner-inline{display:flex;gap:8px}.seo-planner-inline input{flex:1}.seo-planner-inline button,.seo-planner-actions button{border:1px solid rgba(143,211,255,.25);border-radius:6px;padding:8px 10px;background:rgba(255,255,255,.04);color:inherit;cursor:pointer}.seo-planner-overview{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.seo-planner-overview div{padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:7px}.seo-planner-overview span,.seo-planner-overview strong{display:block;font-size:11px}.seo-planner-overview strong{margin-top:5px;color:var(--admin-text,#edf4f7)}.seo-planner-section{margin-top:16px}.seo-planner-section h4{margin:0 0 8px;font-size:12px}.seo-planner-check{display:inline-flex;gap:6px;margin:3px 12px 3px 0;font-size:12px}.seo-planner-check.pass span:first-child{color:#80e0a3}.seo-planner-check.warn span:first-child{color:#ffd37c}.seo-planner-chip,.seo-planner-link{display:inline-flex;flex-direction:column;margin:3px 5px 3px 0;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,.06);font-size:12px}.seo-planner-chip small{color:var(--admin-muted,#91a4b1);font-size:9px;margin-top:3px}.seo-planner-link{color:var(--admin-accent,#8ed8ff)}.seo-planner-actions{display:flex;flex-wrap:wrap;gap:6px}.seo-planner-proposal{margin-top:10px;color:var(--admin-muted,#91a4b1);font-size:12px;line-height:1.5}@media(max-width:640px){.seo-planner-overview{grid-template-columns:repeat(2,1fr)}.seo-planner-inline{display:block}.seo-planner-inline button{margin-top:8px}}";
    document.head.appendChild(style);
    var dockStyle = document.createElement("style");
    dockStyle.id = "seo-planner-dock-styles";
    dockStyle.textContent = ".seo-planner-dock{position:fixed;right:20px;top:88px;width:365px;z-index:120;pointer-events:none}.seo-planner-dock .seo-planner-panel{display:none;max-height:calc(100vh - 108px);overflow:auto;margin-top:8px;pointer-events:auto;box-shadow:0 18px 50px rgba(0,0,0,.42);backdrop-filter:blur(18px)}.seo-planner-dock.open .seo-planner-panel{display:block}.seo-planner-toggle{pointer-events:auto;display:block;margin-left:auto;border:1px solid rgba(143,211,255,.3);border-radius:999px;padding:10px 15px;background:linear-gradient(135deg,#17384b,#10222f);color:#edf4f7;font-weight:700;letter-spacing:.04em;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.24)}.seo-planner-dock.open .seo-planner-toggle{background:linear-gradient(135deg,#22546d,#163244)}.seo-planner-dock select{min-width:112px;background:#112735;color:#edf4f7;border:1px solid rgba(143,211,255,.25);border-radius:6px;padding:7px}.seo-planner-result-label{display:block;margin:10px 0 5px}.seo-planner-result{display:block;padding:7px 0;color:var(--admin-accent,#8ed8ff);text-decoration:none}.seo-planner-result small{display:block;color:var(--admin-muted,#91a4b1);margin-top:3px;line-height:1.35}.seo-planner-result:hover{text-decoration:underline}@media(max-width:1200px){.seo-planner-dock{position:relative;right:auto;top:auto;width:auto;margin-top:18px;pointer-events:auto}.seo-planner-dock .seo-planner-panel{display:block;max-height:none;box-shadow:none}.seo-planner-toggle{display:none}}";
    document.head.appendChild(dockStyle);
  }

  function autoMount() {
    document.querySelectorAll("[data-seo-planner]").forEach(function (host) {
      if (host.getAttribute("data-seo-mounted")) return;
      var fields = {};
      ["title", "slug", "metaTitle", "metaDescription", "keyword", "category", "brand", "model", "content", "description", "explanation", "image", "featuredImage", "altText", "status", "errorCode"].forEach(function (key) {
        var attr = "data-seo-" + key.replace(/[A-Z]/g, function (letter) { return "-" + letter.toLowerCase(); });
        if (host.getAttribute(attr)) fields[key] = host.getAttribute(attr);
      });
      host.setAttribute("data-seo-mounted", "true");
      var contentType = host.getAttribute("data-content-type") || "blog";
      if (contentType === "blog" && new URLSearchParams(window.location.search).get("contentType") === "troubleshooting") contentType = "troubleshooting";
      window.WHASOL.SEOPlanner.mount({ host: host, contentType: contentType, fields: fields });
    });
  }

  window.WHASOL.SEOPlanner = { mount: function (config) { injectStyles(); return mount(config); }, analyze: analyze };
  window.WHASOL.seoPlanner = window.WHASOL.SEOPlanner;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoMount);
  else autoMount();
}());
