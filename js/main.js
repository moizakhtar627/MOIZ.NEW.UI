/* ==========================================================================
   WHA SOL — interactions
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Header scroll state ---------- */
  var header = document.querySelector(".header");

  function updateHeader() {
    if (window.scrollY > 10) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  /* ---------- Active nav link for current page ---------- */
  var currentPage = document.body.getAttribute("data-page");
  if (currentPage) {
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-nav") === currentPage);
    });
  }

  /* ---------- Mobile navigation ---------- */
  var toggle = document.getElementById("nav-toggle");
  var closeBtn = document.getElementById("nav-close");
  var drawer = document.getElementById("mobile-nav");
  var overlay = document.getElementById("nav-overlay");

  function openNav() {
    drawer.classList.add("open");
    overlay.classList.add("show");
    document.body.classList.add("nav-locked");
    toggle.classList.add("toggle-on");
    toggle.setAttribute("aria-expanded", "true");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeNav() {
    drawer.classList.remove("open");
    overlay.classList.remove("show");
    document.body.classList.remove("nav-locked");
    toggle.classList.remove("toggle-on");
    toggle.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
  }

  toggle.addEventListener("click", openNav);
  closeBtn.addEventListener("click", closeNav);
  overlay.addEventListener("click", closeNav);

  drawer.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ---------- Active nav link on scroll ---------- */
  var navLinks = document.querySelectorAll(".nav-link");
  var mobileLinks = document.querySelectorAll(".mobile-link");
  var sections = [];

  document.querySelectorAll("main section[id]").forEach(function (s) {
    sections.push(s);
  });

  var spy = function () {
    var pos = window.scrollY + 140;
    var current = "top";

    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= pos) {
        current = sections[i].id;
      }
    }

    navLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      var on = href.indexOf(".html") === -1 && href === "#" + current;
      link.classList.toggle("active", on);
    });
    mobileLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      var on = href.indexOf(".html") === -1 && href === "#" + current;
      link.classList.toggle("active", on);
    });
  };

  window.addEventListener("scroll", spy, { passive: true });
  spy();

  /* ---------- Diagnostic modal ---------- */
  var modal = document.getElementById("diagnostic-modal");
  var modalContent = document.getElementById("modal-content");

  var content = {
    panel: {
      kicker: "Diagnostics · Solar Panels",
      title: "Common Solar Panel Problems",
      intro:
        "Most panels lose performance gradually. Catching the cause early protects production and panel lifetime.",
      list: [
        "Hotspots from shading, soiling or cell damage — visible on thermal scans",
        "Micro-cracks and snail trails from thermal cycling or transport",
        "Output drop vs. expected yield — string imbalance or bypass diode failure",
        "Delamination, yellowing or water ingress at the junction box",
        "Inverter mismatch or MPPT tracking error under partial shade",
      ],
      callout:
        "Need a check? Bring your daily yield figures and any inverter alerts — we'll compare them against expected performance.",
    },
    battery: {
      kicker: "Diagnostics · Storage",
      title: "Battery Problems",
      intro:
        "Batteries fail early when deeply discharged, overheated or mismatched. Here's what we look for.",
      list: [
        "Capacity fade — bank holds far less than rated capacity",
        "Low / persistent low-voltage state from chronic undercharging",
        "BMS fault codes and cell imbalance between series strings",
        "Swelling, heat or thermal-runaway warning signs",
        "Wrong charge curve for the chemistry (lead-acid vs. LiFePO4)",
      ],
      callout:
        "We run a full capacity test and BMS log review before recommending repair, replacement or rebalancing.",
    },
    codes: {
      kicker: "Diagnostics · Fault Codes",
      title: "Error Code Fix",
      intro:
        "Inverter and controller codes point straight at the fault — they just need decoding and a safe response.",
      list: [
        "Grid fault / over & under voltage codes — utility-side or earthing issue",
        "Ground fault & RISO alarms — insulation breakdown in DC cabling",
        "Fan or temperature alarms — blocked fins, worn fans, high ambient heat",
        "Communication / connection-loss errors — network or MODBUS wiring",
        "Arc fault & DC isolator trips — arcing in MC4 connectors or fuses",
      ],
      callout:
        "Send us the exact code with the model number. We'll explain what it means and the fix priority.",
    },
    wiring: {
      kicker: "Diagnostics · Connections",
      title: "Wiring Connections",
      intro:
        "Loose or wrong wiring causes most unexplained power loss and is a fire risk. We inspect every joint.",
      list: [
        "Loose MC4 terminals — the #1 cause of voltage drop and arcs",
        "Undersized cables causing heating and voltage drop over long runs",
        "Bad or missing earthing / grounding bond",
        "Reverse polarity or crossed strings at the combiner box",
        "Improper fusing and loose breaker terminations",
      ],
      callout:
        "We torque-check every connection, test continuity and verify polarity before re-energising your system.",
    },
  };

  function openModal(key) {
    var data = content[key];
    if (!data) return;

    var list = data.list
      .map(function (item) {
        return "<li>" + item + "</li>";
      })
      .join("");

    modalContent.innerHTML =
      '<span class="modal-kicker">' +
      data.kicker +
      "</span>" +
      '<h3 class="modal-title">' +
      data.title +
      "</h3>" +
      '<p class="modal-intro">' +
      data.intro +
      "</p>" +
      '<ul class="modal-list">' +
      list +
      "</ul>" +
      '<div class="modal-callout">' +
      data.callout +
      "</div>";

    modal.hidden = false;
    document.body.classList.add("nav-locked");
    document.addEventListener("keydown", onModalKey);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("nav-locked");
    document.removeEventListener("keydown", onModalKey);
  }

  function onModalKey(e) {
    if (e.key === "Escape") closeModal();
  }

  document.querySelectorAll("[data-modal]").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      openModal(trigger.getAttribute("data-modal"));
    });
  });

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-modal-close]")) closeModal();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  var revealIO = null;

  if ("IntersectionObserver" in window) {
    revealIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
  }

  window.whasolReveal = function (el) {
    if (el._observed) return;
    el._observed = true;
    if (revealIO) {
      revealIO.observe(el);
    } else {
      el.classList.add("in");
    }
  };

  revealEls.forEach(window.whasolReveal);

  /* ---------- Hero text reveal on scroll ---------- */
  var hero = document.querySelector(".hero");
  var heroAnimEls = null;
  var heroAnimated = false;

  function heroAnimReset() {
    if (!heroAnimEls) return;
    heroAnimEls.forEach(function (el) {
      el.classList.remove("in");
    });
    heroAnimated = false;
  }

  function heroAnimTrigger() {
    if (heroAnimated || !heroAnimEls) return;
    heroAnimated = true;
    heroAnimEls.forEach(function (el, i) {
      el.style.transitionDelay = (i * 90) + "ms";
      requestAnimationFrame(function () {
        el.classList.add("in");
      });
    });
  }

  if (hero) {
    heroAnimEls = hero.querySelectorAll(".hero .badge, .hero .hero-title, .hero .hero-title span, .hero .hero-sub, .hero .btn-explore, .hero .hero-media");
    heroAnimEls.forEach(function (el) {
      el.classList.add("reveal");
    });
    window.addEventListener("scroll", function () {
      if (window.scrollY > 60) {
        heroAnimTrigger();
      } else {
        heroAnimReset();
      }
    }, { passive: true });
    heroAnimTrigger();
  }

  /* ---------- Hero carousel ---------- */
  var carousel = document.querySelector(".hero-carousel");

  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".hero-carousel-slide"));
    var dotsWrap = carousel.querySelector(".carousel-dots");
    var current = 0;
    var carouselTimer = null;
    var dots = [];

    function carouselGo(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === current);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === current);
      });
    }

    function carouselRestart() {
      carouselStop();
      carouselTimer = setInterval(function () {
        carouselGo(current + 1);
      }, 2000);
    }

    function carouselStop() {
      if (carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
      }
    }

    if (dotsWrap) {
      slides.forEach(function (slide, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = i === 0 ? "is-active" : "";
        dot.setAttribute("aria-label", "Show slide " + (i + 1));
        dot.addEventListener("click", function () {
          carouselGo(i);
          carouselRestart();
        });
        dots.push(dot);
        dotsWrap.appendChild(dot);
      });
    }

    if (slides.length > 1) {
      carouselRestart();
      carousel.addEventListener("mouseenter", carouselStop);
      carousel.addEventListener("mouseleave", carouselRestart);
      carousel.addEventListener("touchstart", carouselStop, { passive: true });
      carousel.addEventListener("touchend", carouselRestart, { passive: true });
    }
  }

  /* ---------- Hero 3D tilt (desktop only) ---------- */
  var heroMedia = document.querySelector(".hero-media");
  var tiltSupported = window.matchMedia && window.matchMedia("(min-width: 1025px)").matches;
  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (heroMedia && tiltSupported && !prefersReduced) {
    var tiltRect = null;
    var tiltFrame = null;

    function heroTiltReset() {
      if (tiltFrame) {
        cancelAnimationFrame(tiltFrame);
        tiltFrame = null;
      }
      heroMedia.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
    }

    function onHeroMove(e) {
      if (!tiltRect) return;
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(function () {
        tiltFrame = null;
        var x = (e.clientX - tiltRect.left) / tiltRect.width;
        var y = (e.clientY - tiltRect.top) / tiltRect.height;
        var rx = (y - 0.5) * -10;
        var ry = (x - 0.5) * 12;
        heroMedia.style.transform = "perspective(1100px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
      });
    }

    function onHeroEnter() {
      tiltRect = heroMedia.getBoundingClientRect();
    }

    heroMedia.addEventListener("mouseenter", onHeroEnter);
    heroMedia.addEventListener("mousemove", onHeroMove);
    heroMedia.addEventListener("mouseleave", heroTiltReset);
    window.addEventListener("resize", heroTiltReset);
  }

  /* ---------- EmailJS init ---------- */
  if (window.emailjs) {
    emailjs.init("cT7Qw3j_nlgcMit9t");
  }

  /* ---------- Contact form ---------- */
  var contactForm = document.getElementById("contact-form");

  if (contactForm) {
    var formSuccess = document.getElementById("form-success");
    var formReset = document.getElementById("form-reset");
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var formFields = [contactForm.name, contactForm.email, contactForm.message];

    function setFieldError(input, message) {
      var err = contactForm.querySelector('[data-error-for="' + input.name + '"]');
      input.classList.toggle("is-invalid", !!message);
      if (err) err.textContent = message || "";
    }

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;

      formFields.forEach(function (input) {
        var val = (input.value || "").trim();
        var msg = "";
        if (!val) {
          msg = "This field is required.";
        } else if (input.type === "email" && !emailRe.test(val)) {
          msg = "Please enter a valid email address.";
        }
        setFieldError(input, msg);
        if (msg) valid = false;
      });

      if (!valid) return;

      var submitBtn = document.getElementById("contact-submit");
      if (submitBtn) {
        submitBtn.disabled = true;
        var origHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = "Sending...";
      }

      if (window.emailjs) {
        emailjs
          .send("service_dwio7tw", "template_pimfqxo", {
            name: (contactForm.name && contactForm.name.value) || "",
            email: (contactForm.email && contactForm.email.value) || "",
            equipment: (contactForm.equipment && contactForm.equipment.value) || "",
            message: (contactForm.message && contactForm.message.value) || "",
            reply_to: (contactForm.email && contactForm.email.value) || "",
          })
          .then(function () {
            if (contactForm.hidden === false) {
              contactForm.hidden = true;
              if (formSuccess) formSuccess.hidden = false;
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = origHTML;
            }
            contactForm.reset();
          })
          .catch(function (error) {
            console.error("EmailJS error:", error);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = origHTML;
            }
            alert("Sorry, something went wrong. Please try again.");
          });
      } else {
        if (contactForm.hidden === false) {
          contactForm.hidden = true;
          if (formSuccess) formSuccess.hidden = false;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origHTML;
        }
        contactForm.reset();
      }
    });

    contactForm.addEventListener("input", function (e) {
      if (e.target.classList && e.target.classList.contains("field-input")) {
        setFieldError(e.target, "");
      }
    });

    if (formReset) {
      formReset.addEventListener("click", function () {
        contactForm.reset();
        contactForm.hidden = false;
        if (formSuccess) formSuccess.hidden = true;
        formFields.forEach(function (input) {
          setFieldError(input, "");
        });
      });
    }
  }

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();