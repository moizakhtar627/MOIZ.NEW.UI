/* ============================================================================
   WHA SOL — Reusable SEO Planner Vercel Serverless Endpoint

   Environment variables:
   GOOGLE_CUSTOM_SEARCH_API_KEY
   GOOGLE_CUSTOM_SEARCH_ENGINE_ID
   OPENAI_API_KEY
   OPENAI_MODEL                 (optional, defaults to gpt-4o-mini)

   GET:
     /api/seo-planner?q=growatt+error+02
     /api/seo-planner?q=growatt+error+02&provider=google
     /api/seo-planner?q=growatt+error+02&provider=llm
     /api/seo-planner?q=growatt+error+02&provider=combined

   POST:
     { "action": "analyze", ...content fields }
     { "action": "ai_analyze", ...content fields }
     { "action": "full_analyze", ...content fields }

   IMPORTANT:
   - SEO score is an internal WHA SOL optimization score.
   - It is NOT a Google ranking prediction.
   - Search volume, competition and ranking data are never fabricated.
============================================================================ */

export default async function handler(request, response) {
  var method = String(request.method || "GET").toUpperCase();

  try {
    if (method === "GET") {
      await handleGet(request, response);
      return;
    }

    if (method === "POST") {
      await handlePost(request, response);
      return;
    }

    response.status(405).json({
      error: "Method not allowed."
    });
  } catch (error) {
    console.error("WHA SOL SEO Planner error:", error);

    response.status(500).json({
      error: "SEO Planner request failed."
    });
  }
}

/* ============================================================================
   GET HANDLER
============================================================================ */

async function handleGet(request, response) {
  var query = String(
    request.query && request.query.q || ""
  ).trim();

  var provider = String(
    request.query && request.query.provider || "google"
  ).toLowerCase();

  if (!query) {
    response.status(400).json({
      error: "A keyword is required."
    });
    return;
  }

  if (provider === "google") {
    var googleData = await googleResearch(query);
    response.status(200).json(googleData);
    return;
  }

  if (provider === "llm") {
    var llmData = await llmResearch(query);
    response.status(200).json(llmData);
    return;
  }

  if (provider === "combined") {
    var combined = await combinedResearch(query);

    response.status(200).json(combined);
    return;
  }

  response.status(400).json({
    error: "Unsupported provider. Use google, llm, or combined."
  });
}

/* ============================================================================
   POST HANDLER
============================================================================ */

async function handlePost(request, response) {
  var body = request.body || {};

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      response.status(400).json({
        error: "Invalid JSON request body."
      });
      return;
    }
  }

  body = body || {};

  var action = String(body.action || "analyze").toLowerCase();

  if (action === "analyze") {
    var analysis = analyzeOnPageSEO(body);

    response.status(200).json({
      success: true,
      provider: "local",
      contentType: normalizeContentType(body.contentType),
      keyword: normalizeKeyword(body),
      ...analysis
    });

    return;
  }

  if (action === "ai_analyze") {
    var aiAnalysis = analyzeOnPageSEO(body);
    var aiResult = await aiContentAnalysis(body);

    response.status(200).json({
      success: true,
      provider: "openai",
      contentType: normalizeContentType(body),
      keyword: normalizeKeyword(body),
      seo: aiAnalysis,
      ai: aiResult
    });

    return;
  }

  if (action === "full_analyze") {
    var fullSEO = analyzeOnPageSEO(body);

    var keyword = normalizeKeyword(body);

    var requests = [
      aiContentAnalysis(body)
    ];

    if (keyword) {
      requests.push(combinedResearch(keyword));
    } else {
      requests.push(Promise.resolve({
        provider: "none",
        keyword: "",
        searchVolume: "Unavailable",
        paidCompetition: "Unavailable",
        organicDifficulty: "Unavailable",
        intent: "Unavailable",
        relatedKeywords: [],
        questions: [],
        notes: [],
        results: [],
        estimatedTotalResults: "Unavailable"
      }));
    }

    var fullResults = await Promise.all(requests);

    response.status(200).json({
      success: true,
      contentType: normalizeContentType(body),
      keyword: keyword,
      seo: fullSEO,
      ai: fullResults[0],
      research: fullResults[1]
    });

    return;
  }

  response.status(400).json({
    error: "Unsupported SEO Planner action."
  });
}

/* ============================================================================
   GOOGLE CUSTOM SEARCH
============================================================================ */

async function googleResearch(query) {
  var key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  var engine = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!key || !engine) {
    return {
      provider: "google",
      keyword: query,
      configured: false,
      error: "Google research is not configured. Add GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID.",
      searchVolume: "Unavailable",
      paidCompetition: "Unavailable",
      organicDifficulty: "Unavailable",
      intent: "Unavailable",
      relatedKeywords: [],
      questions: [],
      results: [],
      estimatedTotalResults: "Unavailable"
    };
  }

  var url =
    "https://www.googleapis.com/customsearch/v1" +
    "?key=" + encodeURIComponent(key) +
    "&cx=" + encodeURIComponent(engine) +
    "&q=" + encodeURIComponent(query);

  var result = await fetch(url);
  var data = await result.json();

  if (!result.ok) {
    console.error("Google Custom Search error:", data);

    return {
      provider: "google",
      keyword: query,
      configured: true,
      error: "Google Custom Search returned an error.",
      searchVolume: "Unavailable",
      paidCompetition: "Unavailable",
      organicDifficulty: "Unavailable",
      intent: "Unavailable",
      relatedKeywords: [],
      questions: [],
      results: [],
      estimatedTotalResults: "Unavailable"
    };
  }

  var items = Array.isArray(data.items)
    ? data.items
    : [];

  return {
    provider: "google",
    keyword: query,
    configured: true,

    /* Google Custom Search does not provide Keyword Planner search volume. */
    searchVolume: "Unavailable",

    /* Google Ads paid competition is a separate dataset. */
    paidCompetition: "Unavailable",

    /* Organic difficulty requires SERP/SEO data, not Custom Search count. */
    organicDifficulty: "Unavailable",

    intent: "Informational / research",

    /* Do not pretend SERP titles are keyword-volume data. */
    relatedKeywords: [],

    searchResultTitles: items
      .slice(0, 8)
      .map(function (item) {
        return item.title || "";
      })
      .filter(Boolean),

    questions: [],

    results: items
      .slice(0, 10)
      .map(function (item) {
        return {
          title: item.title || "",
          url: item.link || "",
          snippet: item.snippet || "",
          displayLink: item.displayLink || ""
        };
      }),

    estimatedTotalResults:
      data.searchInformation &&
      data.searchInformation.formattedTotalResults
        ? data.searchInformation.formattedTotalResults
        : "Unavailable"
  };
}

/* ============================================================================
   OPENAI EDITORIAL RESEARCH
============================================================================ */

async function llmResearch(query) {
  var key = process.env.OPENAI_API_KEY;
  var model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!key) {
    return {
      provider: "llm",
      keyword: query,
      configured: false,
      error: "LLM research is not configured. Add OPENAI_API_KEY.",
      searchVolume: "Unavailable",
      paidCompetition: "Unavailable",
      organicDifficulty: "Unavailable",
      intent: "Unavailable",
      relatedKeywords: [],
      questions: [],
      notes: [],
      results: []
    };
  }

  var result = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,

        response_format: {
          type: "json_object"
        },

        messages: [
          {
            role: "system",
            content:
              "You are the WHA SOL SEO editorial research assistant. " +
              "Return valid JSON only. " +
              "Never invent search volume, competition, rankings, traffic, " +
              "CTR, or other numeric SEO metrics. " +
              "Return useful related keywords, search questions, intent, " +
              "and editorial notes."
          },
          {
            role: "user",
            content:
              "Research editorial topics related to this WHA SOL solar-content keyword:\n\n" +
              query +
              "\n\nReturn JSON with exactly these keys:" +
              "\nrelatedKeywords: array of strings" +
              "\nquestions: array of strings" +
              "\nintent: string" +
              "\nnotes: array of strings"
          }
        ]
      })
    }
  );

  var data = await result.json();

  if (!result.ok) {
    console.error("OpenAI research error:", data);

    return {
      provider: "llm",
      keyword: query,
      configured: true,
      error: "The LLM research provider returned an error.",
      searchVolume: "Unavailable",
      paidCompetition: "Unavailable",
      organicDifficulty: "Unavailable",
      intent: "Unavailable",
      relatedKeywords: [],
      questions: [],
      notes: [],
      results: []
    };
  }

  var content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  var parsed = {};

  try {
    parsed = JSON.parse(content || "{}");
  } catch (error) {
    console.error("OpenAI JSON parsing failed:", error);

    return {
      provider: "llm",
      keyword: query,
      configured: true,
      error: "The LLM returned invalid JSON.",
      searchVolume: "Unavailable",
      paidCompetition: "Unavailable",
      organicDifficulty: "Unavailable",
      intent: "Unavailable",
      relatedKeywords: [],
      questions: [],
      notes: [],
      results: []
    };
  }

  return {
    provider: "llm",
    keyword: query,
    configured: true,

    searchVolume: "Unavailable",
    paidCompetition: "Unavailable",
    organicDifficulty: "Unavailable",

    intent:
      typeof parsed.intent === "string"
        ? parsed.intent
        : "Informational",

    relatedKeywords:
      Array.isArray(parsed.relatedKeywords)
        ? parsed.relatedKeywords
            .map(function (item) {
              return String(item || "").trim();
            })
            .filter(Boolean)
            .slice(0, 20)
        : [],

    questions:
      Array.isArray(parsed.questions)
        ? parsed.questions
            .map(function (item) {
              return String(item || "").trim();
            })
            .filter(Boolean)
            .slice(0, 12)
        : [],

    notes:
      Array.isArray(parsed.notes)
        ? parsed.notes
            .map(function (item) {
              return String(item || "").trim();
            })
            .filter(Boolean)
            .slice(0, 12)
        : [],

    results: []
  };
}

/* ============================================================================
   COMBINED KEYWORD RESEARCH
============================================================================ */

async function combinedResearch(query) {
  var results = await Promise.all([
    googleResearch(query),
    llmResearch(query)
  ]);

  var google = results[0];
  var llm = results[1];

  return {
    provider: "combined",
    keyword: query,

    searchVolume:
      llm.searchVolume !== "Unavailable"
        ? llm.searchVolume
        : google.searchVolume,

    paidCompetition:
      llm.paidCompetition !== "Unavailable"
        ? llm.paidCompetition
        : google.paidCompetition,

    organicDifficulty:
      llm.organicDifficulty !== "Unavailable"
        ? llm.organicDifficulty
        : google.organicDifficulty,

    intent:
      llm.intent !== "Unavailable"
        ? llm.intent
        : google.intent,

    relatedKeywords: uniqueStrings(
      (llm.relatedKeywords || []).concat(
        google.relatedKeywords || []
      )
    ).slice(0, 20),

    searchResultTitles:
      google.searchResultTitles || [],

    questions:
      llm.questions || [],

    notes:
      llm.notes || [],

    results:
      google.results || [],

    estimatedTotalResults:
      google.estimatedTotalResults || "Unavailable",

    providers: {
      google: google,
      llm: llm
    }
  };
}

/* ============================================================================
   UNIVERSAL ON-PAGE SEO ANALYSIS
============================================================================ */

function analyzeOnPageSEO(input) {
  input = input || {};

  var contentType = normalizeContentType(
    input.contentType
  );

  var title = getField(input, [
    "title",
    "name"
  ]);

  var slug = getField(input, [
    "slug"
  ]);

  var metaTitle = getField(input, [
    "metaTitle",
    "meta_title"
  ]);

  var metaDescription = getField(input, [
    "metaDescription",
    "meta_description"
  ]);

  var keyword = normalizeKeyword(input);

  var category = getField(input, [
    "category"
  ]);

  var brand = getField(input, [
    "brand",
    "brandName"
  ]);

  var model = getField(input, [
    "model",
    "modelName"
  ]);

  var code = getField(input, [
    "code",
    "errorCode",
    "error_code"
  ]);

  var content = getField(input, [
    "content",
    "body",
    "description",
    "explanation"
  ]);

  var image = getField(input, [
    "image",
    "mainImage"
  ]);

  var featuredImage = getField(input, [
    "featuredImage",
    "featured_image",
    "thumbnail"
  ]);

  var altText = getField(input, [
    "altText",
    "alt_text",
    "imageAltText",
    "image_alt"
  ]);

  var plainContent = stripHtml(content);

  var wordCount = countWords(plainContent);

  var headings = getHeadingStats(content);

  var internalLinks = countInternalLinks(content);

  var checks = [];

  var breakdown = {
    title: 0,
    metaTitle: 0,
    metaDescription: 0,
    slug: 0,
    contentDepth: 0,
    primaryKeyword: 0,
    context: 0,
    images: 0,
    headings: 0,
    internalLinks: 0
  };

  /* ------------------------------------------------------------
     TITLE — 15
  ------------------------------------------------------------ */

  if (title) {
    breakdown.title += 10;

    if (keyword && containsPhrase(title, keyword)) {
      breakdown.title += 5;

      checks.push({
        key: "title_keyword",
        category: "Title",
        status: "pass",
        points: 5,
        message: "Primary keyword appears naturally in the title."
      });
    } else if (keyword) {
      checks.push({
        key: "title_keyword",
        category: "Title",
        status: "warning",
        points: 0,
        message: "Consider including the primary keyword naturally in the title."
      });
    } else {
      checks.push({
        key: "title",
        category: "Title",
        status: "pass",
        points: 10,
        message: "A clear title is present."
      });
    }
  } else {
    checks.push({
      key: "title",
      category: "Title",
      status: "fail",
      points: 0,
      message: "Add a clear, descriptive title."
    });
  }

  /* ------------------------------------------------------------
     META TITLE — 10
  ------------------------------------------------------------ */

  if (metaTitle) {
    breakdown.metaTitle = 10;

    checks.push({
      key: "meta_title",
      category: "Meta",
      status: "pass",
      points: 10,
      message: "Meta title is present."
    });

    if (metaTitle.length < 30 || metaTitle.length > 65) {
      checks.push({
        key: "meta_title_length",
        category: "Meta",
        status: "warning",
        points: 0,
        message: "Review the meta title for clarity and appropriate length."
      });
    }
  } else {
    checks.push({
      key: "meta_title",
      category: "Meta",
      status: "fail",
      points: 0,
      message: "Add a descriptive meta title."
    });
  }

  /* ------------------------------------------------------------
     META DESCRIPTION — 10
  ------------------------------------------------------------ */

  if (metaDescription) {
    breakdown.metaDescription = 10;

    checks.push({
      key: "meta_description",
      category: "Meta",
      status: "pass",
      points: 10,
      message: "Meta description is present."
    });

    if (
      metaDescription.length < 70 ||
      metaDescription.length > 165
    ) {
      checks.push({
        key: "meta_description_length",
        category: "Meta",
        status: "warning",
        points: 0,
        message: "Review the meta description for clarity and usefulness."
      });
    }
  } else {
    checks.push({
      key: "meta_description",
      category: "Meta",
      status: "fail",
      points: 0,
      message: "Add a useful meta description."
    });
  }

  /* ------------------------------------------------------------
     SLUG — 5
  ------------------------------------------------------------ */

  if (slug) {
    breakdown.slug = 5;

    checks.push({
      key: "slug",
      category: "URL",
      status: "pass",
      points: 5,
      message: "A URL slug is present."
    });

    if (
      slug.indexOf(" ") !== -1 ||
      slug.indexOf("..") !== -1
    ) {
      checks.push({
        key: "slug_quality",
        category: "URL",
        status: "warning",
        points: 0,
        message: "Review the slug so it remains clean and descriptive."
      });
    }
  } else {
    checks.push({
      key: "slug",
      category: "URL",
      status: "warning",
      points: 0,
      message: "Add a clean descriptive URL slug."
    });
  }

  /* ------------------------------------------------------------
     CONTENT DEPTH — 20
  ------------------------------------------------------------ */

  if (wordCount >= 700) {
    breakdown.contentDepth = 20;

    checks.push({
      key: "content_depth",
      category: "Content",
      status: "pass",
      points: 20,
      message: "The page contains substantial content for analysis."
    });
  } else if (wordCount >= 400) {
    breakdown.contentDepth = 15;

    checks.push({
      key: "content_depth",
      category: "Content",
      status: "warning",
      points: 15,
      message: "The page has useful content but may benefit from more topic-specific detail."
    });
  } else if (wordCount >= 200) {
    breakdown.contentDepth = 10;

    checks.push({
      key: "content_depth",
      category: "Content",
      status: "warning",
      points: 10,
      message: "Consider adding more useful, topic-specific information."
    });
  } else if (wordCount > 0) {
    breakdown.contentDepth = 5;

    checks.push({
      key: "content_depth",
      category: "Content",
      status: "warning",
      points: 5,
      message: "The content appears short; add useful details where appropriate."
    });
  } else {
    checks.push({
      key: "content_depth",
      category: "Content",
      status: "fail",
      points: 0,
      message: "Add the main content."
    });
  }

  /* ------------------------------------------------------------
     PRIMARY KEYWORD — 10
  ------------------------------------------------------------ */

  if (keyword) {
    breakdown.primaryKeyword += 5;

    if (containsPhrase(plainContent, keyword)) {
      breakdown.primaryKeyword += 5;

      checks.push({
        key: "keyword_content",
        category: "Keyword",
        status: "pass",
        points: 5,
        message: "Primary keyword appears naturally in the content."
      });
    } else {
      checks.push({
        key: "keyword_content",
        category: "Keyword",
        status: "warning",
        points: 0,
        message: "Consider covering the primary topic naturally in the content."
      });
    }

    checks.push({
      key: "keyword_present",
      category: "Keyword",
      status: "pass",
      points: 5,
      message: "A primary keyword has been selected."
    });
  } else {
    checks.push({
      key: "keyword",
      category: "Keyword",
      status: "warning",
      points: 0,
      message: "Add a primary keyword or clearly defined search topic."
    });
  }

  /* ------------------------------------------------------------
     CONTEXT / ENTITIES — 10
  ------------------------------------------------------------ */

  var contextPoints = 0;

  if (category) contextPoints += 3;
  if (brand) contextPoints += 3;
  if (model) contextPoints += 2;
  if (contentType) contextPoints += 2;

  breakdown.context = Math.min(10, contextPoints);

  if (contentType === "error_code" && code) {
    checks.push({
      key: "error_code",
      category: "Context",
      status: "pass",
      points: 0,
      message: "Error code context is present: " + code + "."
    });
  }

  if (contextPoints >= 7) {
    checks.push({
      key: "context",
      category: "Context",
      status: "pass",
      points: breakdown.context,
      message: "Useful content context is present."
    });
  } else {
    checks.push({
      key: "context",
      category: "Context",
      status: "warning",
      points: breakdown.context,
      message: "Add relevant category, brand, model, or content context where appropriate."
    });
  }

  /* ------------------------------------------------------------
     IMAGES — 5
  ------------------------------------------------------------ */

  if (image || featuredImage) {
    breakdown.images += 2;

    if (altText) {
      breakdown.images += 3;

      checks.push({
        key: "image_alt",
        category: "Images",
        status: "pass",
        points: 5,
        message: "Relevant image and descriptive alt text are present."
      });
    } else {
      checks.push({
        key: "image_alt",
        category: "Images",
        status: "warning",
        points: 2,
        message: "Add accurate descriptive alt text to the relevant image."
      });
    }
  } else {
    checks.push({
      key: "image",
      category: "Images",
      status: "warning",
      points: 0,
      message: "Consider adding a relevant image where it improves the page."
    });
  }

  /* ------------------------------------------------------------
     HEADINGS — 10
  ------------------------------------------------------------ */

  if (headings.h2 >= 2) {
    breakdown.headings = 10;

    checks.push({
      key: "headings",
      category: "Structure",
      status: "pass",
      points: 10,
      message: "Content has useful subheading structure."
    });
  } else if (headings.h2 === 1 || headings.h3 >= 1) {
    breakdown.headings = 6;

    checks.push({
      key: "headings",
      category: "Structure",
      status: "warning",
      points: 6,
      message: "Heading structure exists but could be expanded."
    });
  } else {
    checks.push({
      key: "headings",
      category: "Structure",
      status: "warning",
      points: 0,
      message: "Add useful subheadings to organize the content."
    });
  }

  /* ------------------------------------------------------------
     INTERNAL LINKS — 5
  ------------------------------------------------------------ */

  if (internalLinks >= 2) {
    breakdown.internalLinks = 5;

    checks.push({
      key: "internal_links",
      category: "Links",
      status: "pass",
      points: 5,
      message: "Internal links were detected."
    });
  } else if (internalLinks === 1) {
    breakdown.internalLinks = 3;

    checks.push({
      key: "internal_links",
      category: "Links",
      status: "warning",
      points: 3,
      message: "Consider adding another relevant internal link."
    });
  } else {
    checks.push({
      key: "internal_links",
      category: "Links",
      status: "warning",
      points: 0,
      message: "Consider adding relevant internal links where useful."
    });
  }

  /* ------------------------------------------------------------
     CONTENT-TYPE SPECIFIC RECOMMENDATIONS
  ------------------------------------------------------------ */

  var recommendations = [];

  if (contentType === "troubleshooting") {
    if (
      plainContent.toLowerCase().indexOf("symptom") === -1
    ) {
      recommendations.push({
        priority: "medium",
        message: "Consider adding a clear symptoms section."
      });
    }

    if (
      plainContent.toLowerCase().indexOf("cause") === -1
    ) {
      recommendations.push({
        priority: "medium",
        message: "Consider explaining likely causes."
      });
    }

    if (
      plainContent.toLowerCase().indexOf("solution") === -1 &&
      plainContent.toLowerCase().indexOf("fix") === -1
    ) {
      recommendations.push({
        priority: "high",
        message: "Make the practical fix or solution easy to find."
      });
    }
  }

  if (contentType === "error_code") {
    if (!code) {
      recommendations.push({
        priority: "high",
        message: "Add the actual error code."
      });
    }

    if (!brand) {
      recommendations.push({
        priority: "medium",
        message: "Add the affected brand when known."
      });
    }

    if (!model) {
      recommendations.push({
        priority: "low",
        message: "Add the affected model when applicable."
      });
    }

    if (
      plainContent.toLowerCase().indexOf("solution") === -1 &&
      plainContent.toLowerCase().indexOf("fix") === -1
    ) {
      recommendations.push({
        priority: "high",
        message: "Include clear solution/fix information."
      });
    }
  }

  if (contentType === "brand") {
    if (!brand && !title) {
      recommendations.push({
        priority: "high",
        message: "Add a clear brand/entity name."
      });
    }

    if (!model) {
      recommendations.push({
        priority: "low",
        message: "Link relevant models where appropriate."
      });
    }
  }

  if (contentType === "model") {
    if (!brand) {
      recommendations.push({
        priority: "high",
        message: "Associate the model with its brand."
      });
    }
  }

  if (contentType === "blog") {
    if (
      plainContent.toLowerCase().indexOf("faq") === -1 &&
      plainContent.length > 1200
    ) {
      recommendations.push({
        priority: "low",
        message: "Consider adding useful frequently asked questions if readers commonly ask them."
      });
    }
  }

  return {
    score: calculateScore(breakdown),

    scoreLabel: getScoreLabel(
      calculateScore(breakdown)
    ),

    breakdown: breakdown,

    checks: checks,

    recommendations: recommendations,

    metrics: {
      wordCount: wordCount,
      h2Count: headings.h2,
      h3Count: headings.h3,
      internalLinkCount: internalLinks
    }
  };
}

/* ============================================================================
   AI CONTENT ANALYSIS
============================================================================ */

async function aiContentAnalysis(input) {
  var key = process.env.OPENAI_API_KEY;
  var model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!key) {
    return {
      configured: false,
      error: "AI analysis is not configured. Add OPENAI_API_KEY.",
      relatedKeywords: [],
      questions: [],
      intent: "Unavailable",
      recommendations: [],
      contentGaps: [],
      internalLinkSuggestions: []
    };
  }

  var content = stripHtml(
    getField(input, [
      "content",
      "body",
      "description",
      "explanation"
    ])
  );

  var existingLinks = Array.isArray(
    input.existingLinks
  )
    ? input.existingLinks.slice(0, 30)
    : [];

  var contentPayload = {
    contentType: normalizeContentType(
      input.contentType
    ),

    title: getField(input, ["title", "name"]),

    slug: getField(input, ["slug"]),

    metaTitle: getField(input, [
      "metaTitle",
      "meta_title"
    ]),

    metaDescription: getField(input, [
      "metaDescription",
      "meta_description"
    ]),

    primaryKeyword: normalizeKeyword(input),

    category: getField(input, ["category"]),

    brand: getField(input, [
      "brand",
      "brandName"
    ]),

    model: getField(input, [
      "model",
      "modelName"
    ]),

    code: getField(input, [
      "code",
      "errorCode",
      "error_code"
    ]),

    content: content.slice(0, 14000),

    existingLinks: existingLinks
  };

  var result = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key
      },

      body: JSON.stringify({
        model: model,
        temperature: 0.2,

        response_format: {
          type: "json_object"
        },

        messages: [
          {
            role: "system",

            content:
              "You are the WHA SOL SEO editorial assistant. " +
              "Analyze content for usefulness, clarity, search intent, topical completeness, " +
              "related search topics, internal-link opportunities, and practical SEO improvements. " +
              "Do NOT invent search volume, competition, rankings, traffic, CTR, or numeric SEO metrics. " +
              "Do NOT recommend keyword stuffing. " +
              "Do NOT guarantee Google rankings. " +
              "Return valid JSON only."
          },

          {
            role: "user",

            content:
              "Analyze this WHA SOL content:\n\n" +
              JSON.stringify(contentPayload) +
              "\n\nReturn JSON with exactly these keys:" +
              "\nintent: string" +
              "\nrelatedKeywords: array of strings" +
              "\nquestions: array of strings" +
              "\nrecommendations: array of objects with priority and message" +
              "\ncontentGaps: array of strings" +
              "\ninternalLinkSuggestions: array of objects with anchor, reason, and target if known"
          }
        ]
      })
    }
  );

  var data = await result.json();

  if (!result.ok) {
    console.error("OpenAI AI analysis error:", data);

    return {
      configured: true,
      error: "The AI analysis provider returned an error.",
      relatedKeywords: [],
      questions: [],
      intent: "Unavailable",
      recommendations: [],
      contentGaps: [],
      internalLinkSuggestions: []
    };
  }

  var contentResponse =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  var parsed = {};

  try {
    parsed = JSON.parse(
      contentResponse || "{}"
    );
  } catch (error) {
    console.error(
      "OpenAI AI analysis JSON parsing failed:",
      error
    );

    return {
      configured: true,
      error: "The AI returned invalid JSON.",
      relatedKeywords: [],
      questions: [],
      intent: "Unavailable",
      recommendations: [],
      contentGaps: [],
      internalLinkSuggestions: []
    };
  }

  return {
    configured: true,

    intent:
      typeof parsed.intent === "string"
        ? parsed.intent
        : "Informational",

    relatedKeywords:
      Array.isArray(parsed.relatedKeywords)
        ? parsed.relatedKeywords
            .map(function (item) {
              return String(item || "").trim();
            })
            .filter(Boolean)
            .slice(0, 20)
        : [],

    questions:
      Array.isArray(parsed.questions)
        ? parsed.questions
            .map(function (item) {
              return String(item || "").trim();
            })
            .filter(Boolean)
            .slice(0, 12)
        : [],

    recommendations:
      Array.isArray(parsed.recommendations)
        ? parsed.recommendations
            .slice(0, 12)
            .map(function (item) {
              return {
                priority:
                  String(
                    item &&
                    item.priority ||
                    "medium"
                  ).toLowerCase(),

                message:
                  String(
                    item &&
                    item.message ||
                    ""
                  ).trim()
              };
            })
            .filter(function (item) {
              return item.message;
            })
        : [],

    contentGaps:
      Array.isArray(parsed.contentGaps)
        ? parsed.contentGaps
            .map(function (item) {
              return String(item || "").trim();
            })
            .filter(Boolean)
            .slice(0, 15)
        : [],

    internalLinkSuggestions:
      Array.isArray(
        parsed.internalLinkSuggestions
      )
        ? parsed.internalLinkSuggestions
            .slice(0, 12)
            .map(function (item) {
              return {
                anchor:
                  String(
                    item &&
                    item.anchor ||
                    ""
                  ).trim(),

                reason:
                  String(
                    item &&
                    item.reason ||
                    ""
                  ).trim(),

                target:
                  String(
                    item &&
                    item.target ||
                    ""
                  ).trim()
              };
            })
            .filter(function (item) {
              return item.anchor ||
                item.reason ||
                item.target;
            })
        : []
  };
}

/* ============================================================================
   HELPERS
============================================================================ */

function getField(input, names) {
  input = input || {};

  for (var i = 0; i < names.length; i++) {
    var value = input[names[i]];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function normalizeKeyword(input) {
  return getField(input, [
    "primaryKeyword",
    "primary_keyword",
    "keyword",
    "keywords"
  ]).toLowerCase();
}

function normalizeContentType(value) {
  var type = String(
    value || "blog"
  )
    .trim()
    .toLowerCase();

  var aliases = {
    article: "blog",
    articles: "blog",
    blog_post: "blog",
    troubleshooting_article: "troubleshooting",
    error: "error_code",
    errorcode: "error_code",
    errors: "error_code",
    brands: "brand",
    models: "model"
  };

  return aliases[type] || type;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value) {
  var text = String(value || "").trim();

  if (!text) {
    return 0;
  }

  return text
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function containsPhrase(text, phrase) {
  text = String(text || "").toLowerCase();
  phrase = String(phrase || "").toLowerCase().trim();

  if (!text || !phrase) {
    return false;
  }

  return text.indexOf(phrase) !== -1;
}

function getHeadingStats(content) {
  var html = String(content || "");

  var h2Matches = html.match(/<h2\b[^>]*>/gi) || [];
  var h3Matches = html.match(/<h3\b[^>]*>/gi) || [];

  return {
    h2: h2Matches.length,
    h3: h3Matches.length
  };
}

function countInternalLinks(content) {
  var html = String(content || "");

  var links = html.match(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi
  ) || [];

  var count = 0;

  links.forEach(function (link) {
    var match = link.match(
      /href=["']([^"']+)["']/i
    );

    if (!match) {
      return;
    }

    var href = String(match[1] || "")
      .trim()
      .toLowerCase();

    if (
      href &&
      href.indexOf("http://") !== 0 &&
      href.indexOf("https://") !== 0 &&
      href.indexOf("mailto:") !== 0 &&
      href.indexOf("#") !== 0
    ) {
      count++;
    }
  });

  return count;
}

function calculateScore(breakdown) {
  var total =
    Number(breakdown.title || 0) +
    Number(breakdown.metaTitle || 0) +
    Number(breakdown.metaDescription || 0) +
    Number(breakdown.slug || 0) +
    Number(breakdown.contentDepth || 0) +
    Number(breakdown.primaryKeyword || 0) +
    Number(breakdown.context || 0) +
    Number(breakdown.images || 0) +
    Number(breakdown.headings || 0) +
    Number(breakdown.internalLinks || 0);

  return Math.max(
    0,
    Math.min(100, Math.round(total))
  );
}

function getScoreLabel(score) {
  if (score >= 90) {
    return "Excellent";
  }

  if (score >= 80) {
    return "Strong";
  }

  if (score >= 70) {
    return "Good";
  }

  if (score >= 50) {
    return "Needs improvement";
  }

  return "Needs work";
}

function uniqueStrings(values) {
  var seen = {};
  var output = [];

  (Array.isArray(values) ? values : [])
    .forEach(function (value) {
      var text = String(value || "").trim();

      if (!text) {
        return;
      }

      var key = text.toLowerCase();

      if (seen[key]) {
        return;
      }

      seen[key] = true;
      output.push(text);
    });

  return output;
}