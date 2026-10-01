(function () {
  "use strict";

  window.WHASOL = window.WHASOL || {};
  var sanitize = window.WHASOL.sanitizeHtml || function (value) { return String(value || ""); };
  var activeEditor = null;
  var savedRange = null;

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (html != null) node.innerHTML = html;
    return node;
  }

  function restoreSelection() {
    if (!savedRange || !window.getSelection) return;
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }

  function rememberSelection() {
    if (!activeEditor || !window.getSelection) return;
    var selection = window.getSelection();
    if (selection.rangeCount && activeEditor.contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
  }

  function openLinkDialog(editor) {
    rememberSelection();
    var rangeText = savedRange ? savedRange.toString() : "";
    var dialog = el("div", { class: "rich-link-dialog", role: "dialog", "aria-modal": "true" });
    dialog.innerHTML = '<div class="rich-link-card"><div class="rich-link-title">Insert link</div><label>Link text<input data-link-text type="text"></label><label>Link type<select data-link-type><option value="internal">Internal Page</option><option value="external">External URL</option></select></label><label data-link-search-label>Search existing content<input data-link-search type="search" placeholder="Search articles, brands, models..."></label><div class="rich-link-results" data-link-results>Search WHA SOL content to select an internal page.</div><label data-link-url-label hidden>URL<input data-link-url type="url" placeholder="https://example.com"></label><label class="rich-link-check"><input data-link-blank type="checkbox"> Open in new tab</label><div class="rich-link-actions"><button type="button" data-link-cancel>Cancel</button><button type="button" data-link-apply>Insert link</button></div></div>';
    dialog.querySelector("[data-link-text]").value = rangeText;
    document.body.appendChild(dialog);
    var type = dialog.querySelector("[data-link-type]");
    var search = dialog.querySelector("[data-link-search]");
    var results = dialog.querySelector("[data-link-results]");
    var selectedUrl = "";
    var timer;
    function renderResults(items) {
      results.innerHTML = items.length ? items.map(function (item, index) { return '<button type="button" class="rich-link-result" data-result-index="' + index + '"><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.kind) + ' · ' + escapeHtml(item.url) + '</small></button>'; }).join("") : "No matching WHA SOL content found.";
      results.querySelectorAll("[data-result-index]").forEach(function (button) { button.addEventListener("click", function () { var item = items[Number(button.getAttribute("data-result-index"))]; selectedUrl = item.url; search.value = item.title; results.querySelectorAll(".rich-link-result").forEach(function (entry) { entry.classList.remove("selected"); }); button.classList.add("selected"); }); });
    }
    async function searchContent() {
      var query = search.value.trim().toLowerCase();
      if (!query) { results.textContent = "Search WHA SOL content to select an internal page."; return; }
      var items = [];
      try {
        var api = window.WHASOL.articlesApi;
        if (api && api.fetchAdminArticles) {
          var blogs = await api.fetchAdminArticles("blog");
          var troubleshooting = await api.fetchAdminArticles("troubleshooting");
          (blogs || []).concat(troubleshooting || []).forEach(function (item) { if (String(item.title || "").toLowerCase().indexOf(query) !== -1 || String(item.brand || "").toLowerCase().indexOf(query) !== -1) items.push({ title: item.title || "Untitled article", kind: item.contentType === "troubleshooting" ? "Troubleshooting" : "Article", url: "/article.html?slug=" + encodeURIComponent(item.slug || "") }); });
        }
        var taxonomy = window.WHASOL.taxonomyApi;
        if (taxonomy && taxonomy.fetchErrorCodes) {
          var codes = await taxonomy.fetchErrorCodes();
          (codes.codes || []).forEach(function (item) { if ((String(item.title || "") + " " + String(item.code || "") + " " + String(item.brand || "")).toLowerCase().indexOf(query) !== -1) items.push({ title: (item.brand ? item.brand + " " : "") + "Error " + item.code, kind: "Error Code", url: "/error-codes.html?code=" + encodeURIComponent(item.code || "") + (item.brand ? "&brand=" + encodeURIComponent(item.brand) : "") }); });
        }
        if (taxonomy && taxonomy.fetchBrands) {
          var brands = await taxonomy.fetchBrands();
          (brands.brands || []).forEach(function (item) { if ((String(item.name || "") + " " + String(item.slug || "")).toLowerCase().indexOf(query) !== -1) items.push({ title: item.name || "Brand", kind: "Brand", url: "/brands-models.html?brand=" + encodeURIComponent(item.slug || item.name || "") }); });
        }
        renderResults(items.slice(0, 12));
      } catch (error) { results.textContent = "Content search is temporarily unavailable."; }
    }
    search.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(searchContent, 250); });
    type.addEventListener("change", function () { var internal = type.value === "internal"; dialog.querySelector("[data-link-search-label]").hidden = !internal; dialog.querySelector("[data-link-url-label]").hidden = internal; });
    dialog.querySelector("[data-link-cancel]").addEventListener("click", function () { dialog.remove(); });
    dialog.querySelector("[data-link-apply]").addEventListener("click", function () {
      restoreSelection();
      var url = type.value === "internal" ? selectedUrl : dialog.querySelector("[data-link-url]").value.trim();
      if (!url) { results.textContent = "Select an internal page or enter a valid URL."; return; }
      var text = dialog.querySelector("[data-link-text]").value.trim() || url;
      editor.focus();
      document.execCommand("insertHTML", false, '<a href="' + escapeAttribute(url) + '"' + (dialog.querySelector("[data-link-blank]").checked ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + escapeHtml(text) + '</a>');
      sync(editor);
      dialog.remove();
    });
  }

  function escapeHtml(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
  function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }
  function sync(editor) { var value = sanitize(editor.innerHTML); if (editor.innerHTML !== value) editor.innerHTML = value; if (editor._richTextSource) editor._richTextSource.value = value; editor.dispatchEvent(new Event("change", { bubbles: true })); }

  function mount(target) {
    var source = typeof target === "string" ? document.querySelector(target) : target;
    if (!source || source.getAttribute("data-rich-text-mounted")) return source;
    var editor = source;
    var initial = "";
    if (source.tagName === "TEXTAREA") { initial = source.value; source.hidden = true; editor = el("div", { contenteditable: "true", spellcheck: "true", class: "rich-text-surface", "data-rich-text-content": "" }); source.parentNode.insertBefore(editor, source); editor._richTextSource = source; }
    else { initial = source.innerHTML; var oldToolbar = source.previousElementSibling; if (oldToolbar && oldToolbar.classList.contains("toolbar")) oldToolbar.remove(); }
    editor.innerHTML = sanitize(initial);
    var shell = el("div", { class: "rich-text-shell", "data-rich-text-shell": "" });
    editor.parentNode.insertBefore(shell, editor); shell.appendChild(editor);
    var toolbar = el("div", { class: "rich-text-toolbar", role: "toolbar", "aria-label": "Formatting toolbar" });
    var buttons = [
      ["bold", "B", "Bold"], ["italic", "I", "Italic"], ["underline", "U", "Underline"], ["strikeThrough", "S", "Strikethrough"],
      ["formatBlock", "H1", "Heading 1", "h1"], ["formatBlock", "H2", "Heading 2", "h2"], ["formatBlock", "H3", "Heading 3", "h3"], ["formatBlock", "H4", "Heading 4", "h4"],
      ["insertUnorderedList", "•", "Bulleted list"], ["insertOrderedList", "1.", "Numbered list"], ["formatBlock", "❝", "Blockquote", "blockquote"], ["code", "CODE", "Inline code"], ["link", "A", "Insert link"], ["undo", "↶", "Undo"], ["redo", "↷", "Redo"], ["removeFormat", "CLEAR", "Clear formatting"]
    ];
    buttons.forEach(function (item) { var button = el("button", { type: "button", class: "rich-text-button", title: item[2], "aria-label": item[2] }, item[1]); button.addEventListener("mousedown", function (event) { event.preventDefault(); }); button.addEventListener("click", function () { editor.focus(); if (item[0] === "link") return openLinkDialog(editor); if (item[0] === "code") document.execCommand("formatBlock", false, "code"); else if (item[0] === "formatBlock") document.execCommand("formatBlock", false, item[3]); else document.execCommand(item[0], false, null); sync(editor); }); toolbar.appendChild(button); });
    shell.insertBefore(toolbar, editor);
    source.setAttribute("data-rich-text-mounted", "true");
    editor.addEventListener("focus", function () { activeEditor = editor; });
    editor.addEventListener("keyup", function () { activeEditor = editor; sync(editor); });
    editor.addEventListener("input", function () { activeEditor = editor; sync(editor); });
    editor.addEventListener("mouseup", rememberSelection);
    sync(editor);
    source._richTextEditor = editor;
    if (source.form) source.form.addEventListener("reset", function () { setTimeout(function () { editor.innerHTML = ""; sync(editor); }, 0); });
    return editor;
  }

  function setValue(target, value) {
    var source = typeof target === "string" ? document.querySelector(target) : target;
    if (!source) return;
    var editor = source._richTextEditor || source;
    editor.innerHTML = sanitize(value || "");
    sync(editor);
  }

  function injectStyles() {
    if (document.getElementById("rich-text-editor-styles")) return;
    var style = document.createElement("style"); style.id = "rich-text-editor-styles";
    style.textContent = ".rich-text-shell{border:1px solid var(--editor-border,rgba(255,255,255,.12));border-radius:10px;overflow:visible;background:var(--editor-card-2,#14181e)}.rich-text-toolbar{display:flex;flex-wrap:wrap;gap:5px;padding:9px;border-bottom:1px solid var(--editor-border,rgba(255,255,255,.12));background:rgba(255,255,255,.035)}.rich-text-button{min-width:34px;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:6px 8px;background:transparent;color:inherit;cursor:pointer;font-weight:700}.rich-text-button:hover,.rich-text-button:focus{border-color:var(--editor-accent,#d8ff3e);color:var(--editor-accent,#d8ff3e)}.rich-text-surface{min-height:270px;padding:16px;outline:0;line-height:1.7;color:inherit}.rich-text-surface h1,.rich-text-surface h2,.rich-text-surface h3,.rich-text-surface h4{margin:1em 0 .45em}.rich-text-surface blockquote{border-left:3px solid var(--editor-accent,#d8ff3e);padding-left:14px;color:var(--editor-muted,#8d96a3)}.rich-link-dialog{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.62)}.rich-link-card{width:min(520px,100%);padding:20px;border:1px solid rgba(255,255,255,.15);border-radius:14px;background:#101a24;box-shadow:0 20px 70px rgba(0,0,0,.5);color:#edf4f7}.rich-link-title{font-size:18px;font-weight:800;margin-bottom:15px}.rich-link-card label{display:block;margin:11px 0;font-size:12px;color:#aab9c5}.rich-link-card input,.rich-link-card select{display:block;width:100%;margin-top:6px;padding:10px;border:1px solid rgba(255,255,255,.15);border-radius:7px;background:#0b141d;color:inherit}.rich-link-check{display:flex!important;align-items:center;gap:8px}.rich-link-check input{width:auto;margin:0}.rich-link-results{max-height:180px;overflow:auto;padding:5px;border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#94a6b4}.rich-link-result{display:block;width:100%;padding:8px;text-align:left;border:0;border-bottom:1px solid rgba(255,255,255,.08);background:transparent;color:#edf4f7;cursor:pointer}.rich-link-result small{display:block;color:#8fa1ad;margin-top:3px}.rich-link-result:hover,.rich-link-result.selected{background:rgba(216,255,62,.1)}.rich-link-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.rich-link-actions button{padding:9px 13px;border:1px solid rgba(255,255,255,.18);border-radius:7px;background:#172733;color:inherit;cursor:pointer}.rich-link-actions button:last-child{background:#d8ff3e;color:#101318}@media(max-width:600px){.rich-text-toolbar{gap:3px}.rich-text-button{min-width:30px;padding:6px}.rich-text-surface{min-height:220px}}";
    document.head.appendChild(style);
  }

  function autoMount() { injectStyles(); document.querySelectorAll("[data-rich-text-editor]").forEach(mount); }
  window.WHASOL.RichTextEditor = { mount: mount, setValue: setValue, sanitize: sanitize };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoMount); else autoMount();
}());
