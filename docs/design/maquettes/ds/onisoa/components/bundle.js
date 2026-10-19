/* @ds-bundle: {"format":4,"namespace":"Onisoa","components":[{"name":"Button"},{"name":"Tag"},{"name":"Status"},{"name":"SectionHeader"},{"name":"ProjectCard"},{"name":"NavBar"},{"name":"Field"}]} */
(function () {
  var React = window.React, h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }

  function Button(p) {
    var variant = p.variant || "ghost";
    var rest = omit(p, ["variant", "arrow", "className", "children", "href"]);
    var kids = [p.children, p.arrow ? h("span", { key: "a", className: "on-arrow", "aria-hidden": "true" }, "→") : null];
    var cls = cx("on-btn", "on-btn-" + variant, p.className);
    return p.href ? h("a", Object.assign({ href: p.href, className: cls }, rest), kids)
                  : h("button", Object.assign({ type: "button", className: cls }, rest), kids);
  }

  function Tag(p) {
    var cls = cx("on-tag", p.active && "on-tag-active", p.className);
    if (p.onClick) return h("button", { type: "button", className: cls, onClick: p.onClick, "aria-pressed": !!p.active }, p.children);
    return h("span", { className: cls }, p.children);
  }

  function Status(p) {
    return h("span", { className: cx("on-status", "on-status-" + (p.tone || "neutral"), p.className) }, p.children);
  }

  function SectionHeader(p) {
    return h("header", { className: cx("on-sh", p.className) },
      h("span", { className: "on-sh-index", "aria-hidden": "true" }, p.index),
      h("h2", { className: "on-sh-title" }, p.title),
      p.meta ? h("span", { className: "on-sh-meta on-label" }, p.meta) : h("span"));
  }

  function ProjectCard(p) {
    var meta = p.meta || [];
    var body = [
      h("span", { key: "i", className: "on-card-index" }, p.index),
      h("div", { key: "b" },
        h("h3", { className: "on-card-title" }, p.title),
        p.summary ? h("p", { className: "on-card-summary" }, p.summary) : null,
        meta.length ? h("dl", { className: "on-card-meta on-label", style: { margin: "0 0 16px" } },
          meta.map(function (m, i) { return h("div", { key: i }, h("dt", null, m.label), h("dd", { style: { margin: 0 } }, h("b", null, m.value))); })) : null,
        (p.tags || []).length ? h("div", { className: "on-row", style: { gap: "8px" } },
          p.tags.map(function (t) { return h(Tag, { key: t }, t); })) : null)
    ];
    return p.href ? h("a", { href: p.href, className: cx("on-card", p.className) }, body)
                  : h("article", { className: cx("on-card", p.className) }, body);
  }

  function NavBar(p) {
    var links = p.links || [];
    return h("nav", { className: cx("on-nav", p.className), "aria-label": "Main" },
      h("a", { className: "on-nav-name", href: p.homeHref || "#" }, p.name, h("span", null, p.suffix == null ? "_" : p.suffix)),
      h("ul", { className: "on-label" }, links.map(function (l) {
        return h("li", { key: l.href || l.label }, h("a", { href: l.href || "#", "aria-current": l.label === p.current ? "page" : undefined }, l.label));
      })),
      p.action || null);
  }

  var fid = 0;
  function Field(p) {
    var idRef = React.useRef(null); if (!idRef.current) idRef.current = "on-f-" + (++fid);
    var id = p.id || idRef.current, hintId = id + "-hint";
    var rest = omit(p, ["label", "hint", "error", "multiline", "className", "id"]);
    var ctl = h(p.multiline ? "textarea" : "input", Object.assign({ id: id, className: "on-input", "aria-invalid": p.error ? true : undefined, "aria-describedby": (p.error || p.hint) ? hintId : undefined }, rest));
    return h("div", { className: cx("on-field", p.error && "on-field-error", p.className) },
      h("label", { htmlFor: id, className: "on-label", style: { color: "var(--ink-muted)" } }, p.label),
      ctl,
      (p.error || p.hint) ? h("span", { id: hintId, className: "on-field-hint" }, p.error || p.hint) : null);
  }

  window.Onisoa = Object.assign(window.Onisoa || {}, { Button: Button, Tag: Tag, Status: Status, SectionHeader: SectionHeader, ProjectCard: ProjectCard, NavBar: NavBar, Field: Field });
})();
