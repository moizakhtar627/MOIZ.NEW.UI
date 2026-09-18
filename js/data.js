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

/* --------------------------------------------------------------------------
   Brands & models
   slug is used for URLs like brands-models.html?brand=growatt
--------------------------------------------------------------------------- */
WHASOL.brands = [];

/* --------------------------------------------------------------------------
   Blog posts
--------------------------------------------------------------------------- */
WHASOL.blogPosts = [];