/* ==========================================================================
   WHA SOL — Content data store
   ==========================================================================
   This is the single source of truth for all dynamic content.
   Add your own original posts here and they will automatically appear on
   the related pages, become searchable, and be included in filters.

   Page routes:
   - Home            -> index.html
   - Troubleshooting -> troubleshooting.html
   - Error Codes     -> error-codes.html
   - Brands & Models -> brands-models.html
   - Blog            -> blog.html
   - About Us        -> about.html
   - Contact         -> contact.html

   Expected item shapes:

   WHASOL.troubleshootingArticles.push({
     title: "...",                      // string
     description: "...",                // string
     category: "solar-panel",           // solar-panel | battery | inverter | wiring | voltage
     brand: "Growatt",                  // optional
     models: ["MIN 2500-6000TL-X"],     // optional array
     keywords: ["mc4", "voltage drop"], // optional array of searchable words
     image: "assets/example.jpg",       // optional
     link: "contact.html",              // optional
   });

   WHASOL.errorCodes.push({
     code: "F01",                       // string
     title: "...",                      // string
     brand: "Growatt",                  // string
     model: "MIN 2500-6000TL-X",        // optional
     explanation: "...",                // string
     image: "assets/example.jpg",       // optional
     link: "contact.html",              // optional
   });

WHASOL.brands.push({
      slug: "growatt",                   // used in brands-models.html?brand=growatt
      name: "Growatt",                   // string
      description: "...",                // string
      models: ["MIN 2500-6000TL-X"],     // array
      image: "assets/example.jpg",       // optional
      articleTitle: "...",               // optional featured guide
      articleDescription: "...",         // optional
      articleImage: "assets/example.jpg",// optional
      articleLink: "blog.html",          // optional
    });

   WHASOL.blogPosts.push({
     title: "...",                      // string
     metaTitle: "...",                  // optional
     metaDescription: "...",            // optional
     description: "...",                // string
     brand: "Growatt",                  // optional
     category: "battery",               // optional
     keywords: ["battery", "lifepo4"],  // optional array
     image: "assets/example.jpg",       // optional
     date: "2026-09-01",                // optional
     link: "blog.html",                 // optional
   });
   ========================================================================== */

window.WHASOL = window.WHASOL || {};

/* --------------------------------------------------------------------------
   Troubleshooting articles
   category: "solar-panel" | "battery" | "inverter" | "wiring" | "voltage"
--------------------------------------------------------------------------- */
WHASOL.troubleshootingArticles = [];

/* --------------------------------------------------------------------------
   Error codes
   brand: string, code: string, model: string
--------------------------------------------------------------------------- */
WHASOL.errorCodes = [];

WHASOL.errorCodes.push({
  code: "102",
  title: "Consistent Fault",
  brand: "Growatt",
  model: "All Models",
  explanation:
    "A mismatch between the data reported by the inverter's master and slave processors. The system halts operation and the red fault indicator lights up. Usually requires professional repair or inverter replacement.",
  image: "assets/inverter-error.jpg",
  link: "growatt-error-102.html",
});

/* --------------------------------------------------------------------------
   Brands & models
   slug is used for URLs like brands-models.html?brand=growatt
--------------------------------------------------------------------------- */
WHASOL.brands = [];

WHASOL.brands.push({
  slug: "growatt",
  name: "Growatt",
  description:
    "A leading global manufacturer of solar string inverters, hybrid inverters and energy storage systems trusted in residential and commercial installations worldwide.",
  models: ["MIN 2500-6000TL-X", "SPH 3000-6000TL BL-UP", "MID 15-25K TL3-X"],
  image: "assets/growatt-inverter.png",
  articleTitle: "How to Shut Down and Restart Your Solar Inverter",
  articleDescription: "Follow the correct AC and DC switch order to safely shut down and restart your Growatt inverter.",
  articleImage: "assets/growatt-inverter.png",
  articleLink: "growatt-inverter-restart.html",
  articleTitle2: "How to Fix Growatt Error 102 on Your Inverter",
  articleDescription2: "How to Fix Growatt Error 102 with clear steps for fault checks and inverter reset tips.",
  articleImage2: "assets/inverter-error.jpg",
  articleLink2: "growatt-error-102.html",
});

/* --------------------------------------------------------------------------
   Blog posts
--------------------------------------------------------------------------- */
WHASOL.blogPosts = [];

WHASOL.blogPosts.push({
  title: "How to Shut Down and Restart Your Solar Inverter",
  metaTitle: "How to Shut Down and Restart Your Solar Inverter",
  metaDescription:
    "Learn how to safely shut down and restart your solar inverter during faults, system checks, or maintenance. Follow the correct switch order and restore normal operation.",
  description:
    "Follow the correct AC and DC switch order to safely shut down and restart your solar inverter during faults or maintenance.",
  brand: "Growatt",
  category: "Inverter",
  keywords: ["solar inverter", "restart", "shutdown", "DC isolator", "AC isolator", "reboot", "power cycle", "inverter reset"],
  image: "assets/growatt-inverter.png",
  date: "2026-09-17",
  link: "growatt-inverter-restart.html",
});

WHASOL.blogPosts.push({
  title: "How to Fix Growatt Error 102 on Your Inverter",
  metaTitle: "How to Fix Growatt Error 102 on Your Inverter | WHA Sol",
  metaDescription:
    "How to Fix Growatt Error 102 with clear steps for fault checks and inverter reset tips. Find the cause and get your system running safely again.",
  description:
    "Growatt Error 102 is a Consistent Fault indicating a mismatch between the inverter's master and slave processors. Learn what causes it, how to attempt a power cycle, and when to call a technician.",
  brand: "Growatt",
  category: "Inverter",
  keywords: ["growatt error 102", "consistent fault", "inverter error", "processor mismatch", "fault fix", "growatt pakistan"],
  image: "assets/inverter-error.jpg",
  date: "2026-09-19",
  link: "growatt-error-102.html",
});

/* --------------------------------------------------------------------------
   Growatt troubleshooting article (linked to the same full article)
--------------------------------------------------------------------------- */
WHASOL.troubleshootingArticles.push({
  title: "How to Shut Down and Restart Your Solar Inverter",
  description:
    "Learn how to safely shut down and restart your solar inverter during faults, system checks, or maintenance. Follow the correct switch order and restore normal operation.",
  category: "inverter",
  brand: "Growatt",
  models: ["MIN 2500-6000TL-X"],
  keywords: ["restart", "shutdown", "DC isolator", "AC isolator", "reboot", "power cycle"],
  image: "assets/growatt-inverter.png",
  link: "growatt-inverter-restart.html",
});

WHASOL.troubleshootingArticles.push({
  title: "How to Fix Growatt Error 102 on Your Inverter",
  description:
    "How to Fix Growatt Error 102 with clear steps for fault checks and inverter reset tips. Find the cause and get your system running safely again.",
  category: "inverter",
  brand: "Growatt",
  models: ["MIN 2500-6000TL-X", "SPH 3000-6000TL BL-UP", "MID 15-25K TL3-X"],
  keywords: ["growatt error 102", "consistent fault", "inverter error", "processor mismatch", "fault fix"],
  image: "assets/inverter-error.jpg",
  link: "growatt-error-102.html",
});