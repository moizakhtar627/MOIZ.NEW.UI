(function () {
  "use strict";

  window.WHASOL = window.WHASOL || {};

  var allowedTags = {
    A: 1, B: 1, BLOCKQUOTE: 1, BR: 1, CODE: 1, EM: 1, H1: 1, H2: 1,
    H3: 1, H4: 1, HR: 1, I: 1, IMG: 1, LI: 1, OL: 1, P: 1, PRE: 1,
    S: 1, STRONG: 1, U: 1, UL: 1
  };

  function safeUrl(value, allowImage) {
    var url = String(value || "").trim();
    if (!url || /^javascript:/i.test(url) || /^data:/i.test(url) || /^vbscript:/i.test(url)) return "";
    if (allowImage && /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(url)) return url;
    if (/^(https?:|mailto:|tel:|\/|#|\.?\.?\/)/i.test(url)) return url;
    return "";
  }

  function sanitizeHtml(value) {
    var source = String(value || "");
    if (!source) return "";
    var parser = new DOMParser();
    var doc = parser.parseFromString(source, "text/html");
    var root = doc.body;
    Array.prototype.slice.call(root.querySelectorAll("script,style,iframe,object,embed,form,meta,link,svg,math")).forEach(function (node) {
      node.remove();
    });
    Array.prototype.slice.call(root.querySelectorAll("*"))
      .reverse()
      .forEach(function (node) {
        if (!allowedTags[node.tagName]) {
          node.replaceWith.apply(node, Array.prototype.slice.call(node.childNodes));
          return;
        }
        Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
          var name = attribute.name.toLowerCase();
          if (name.indexOf("on") === 0 || name === "style" || name === "class" || name === "id") node.removeAttribute(attribute.name);
        });
        if (node.tagName === "A") {
          var href = safeUrl(node.getAttribute("href"), false);
          if (href) node.setAttribute("href", href); else node.removeAttribute("href");
          if (node.getAttribute("target") === "_blank") node.setAttribute("rel", "noopener noreferrer");
          else node.removeAttribute("target");
        }
        if (node.tagName === "IMG") {
          var src = safeUrl(node.getAttribute("src"), true);
          if (src) node.setAttribute("src", src); else node.remove();
          node.setAttribute("loading", "lazy");
          Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
            if (["src", "alt", "loading", "width", "height"].indexOf(attribute.name.toLowerCase()) === -1) node.removeAttribute(attribute.name);
          });
        }
      });
    return root.innerHTML;
  }

  window.WHASOL.sanitizeHtml = sanitizeHtml;
}());
