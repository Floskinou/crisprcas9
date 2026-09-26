#!/usr/bin/env python3
"""Générateur statique du site CRISPR·CAS9.

Aucune dépendance externe. Lit les contenus dans content/ et les gabarits
dans templates/, puis écrit les pages HTML à la racine du dépôt, ainsi que
sitemap.xml et robots.txt.

Usage :
    python build.py            # régénère le site
    python build.py --check    # compare les fichiers générés à ceux présents
"""

from __future__ import annotations

import datetime as _dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
PAGES_DIR = CONTENT / "pages"
ARTICLES_DIR = CONTENT / "articles"
BLOG_DIR = ROOT / "blog"
BUILD_DATE_FILE = CONTENT / "build_date.txt"

SITE = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
LAYOUT = (ROOT / "templates" / "layout.html").read_text(encoding="utf-8")

VIDEO_CATEGORIES = {c["id"]: c["label"] for c in SITE["categories"]}
VIDEO_BY_ID = {v["id"]: v for v in SITE["videos"]}

TODAY_ISO = _dt.date.today().isoformat()


def build_date() -> str:
    """Date de dernière modification du contenu (stable entre deux exécutions)."""
    if BUILD_DATE_FILE.exists():
        value = BUILD_DATE_FILE.read_text(encoding="utf-8").strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return value
    BUILD_DATE_FILE.write_text(TODAY_ISO + "\n", encoding="utf-8")
    return TODAY_ISO


LASTMOD = build_date()


# ---------------------------------------------------------------- navigation
def nav_html(base: str, active: str) -> str:
    items = []
    for entry in SITE["nav"]:
        if "items" in entry:
            subs = "".join(
                '<li><a href="{b}{h}"{a}>{l}</a></li>'.format(
                    b=base, h=sub["href"], l=sub["label"],
                    a=' aria-current="page"' if sub["href"] == active else "",
                )
                for sub in entry["items"]
            )
            items.append(
                '<li class="navitem">'
                '<button class="navgrp" type="button" aria-expanded="false">{l}</button>'
                '<ul class="navpanel">{s}</ul></li>'.format(l=entry["label"], s=subs)
            )
        else:
            href, label = entry["href"], entry["label"]
            current = ' aria-current="page"' if href == active else ""
            if href == "blog/":
                items.append('<li><a class="navcta" href="{b}{h}">{l} ↗</a></li>'.format(b=base, h=href, l=label))
            else:
                items.append('<li><a href="{b}{h}"{c}>{l}</a></li>'.format(b=base, h=href, c=current, l=label))
    return "<ul>" + "".join(items) + "</ul>"


# --------------------------------------------------------------- vidéos
def video_card(video: dict, featured: bool = False, base: str = "") -> str:
    vid = video["id"]
    thumb = "https://i.ytimg.com/vi/{i}/maxresdefault.jpg".format(i=vid)
    fallback = "https://i.ytimg.com/vi/{i}/mqdefault.jpg".format(i=vid)
    label = VIDEO_CATEGORIES.get(video["cat"], video["cat"])
    note = ' <span class="chip">Sélection</span>' if featured else ""
    return (
        '<article class="video-card" data-vcat="{cat}">'
        '<button class="video-facade" type="button" data-video="{id}" data-title="{t}" '
        'aria-label="Lire la vidéo : {t}">'
        '<img src="{thumb}" alt="" loading="lazy" '
        "onerror=\"this.onerror=null;this.src='{fb}'\">"
        '<span class="play" aria-hidden="true">▶</span>'
        '<span class="chip">{cat}</span></button>'
        '<div class="video-body"><h3>{t}</h3><p>{d}</p>'
        '<div class="byline">Vidéo : {ch} · YouTube</div></div></article>'
    ).format(cat=label, id=vid, t=video["title"], thumb=thumb, fb=fallback, d=video["desc"], ch=video["channel"])


def video_cards_all(base: str = "") -> str:
    return "\n".join(video_card(v) for v in SITE["videos"])


def videos_featured(count: int = 3, base: str = "") -> str:
    picked = [v for v in SITE["videos"] if v["cat"] in ("fondamentaux", "sante")][:count]
    return "\n".join(video_card(v, featured=True) for v in picked)


def video_filters() -> str:
    buttons = ['<button class="btn sm secondary" type="button" data-vfilter="tout" aria-pressed="true">Tout</button>']
    for c in SITE["categories"]:
        buttons.append(
            '<button class="btn sm secondary" type="button" data-vfilter="{i}" aria-pressed="false">{l}</button>'.format(
                i=c["id"], l=c["label"]
            )
        )
    return '<div class="btnrow" role="group" aria-label="Filtrer par thème">' + "".join(buttons) + "</div>"


# --------------------------------------------------------------- articles
def article_meta(slug: str) -> dict:
    for a in SITE["articles"]:
        if a["slug"] == slug:
            return a
    raise KeyError(slug)


def pretty_date(iso: str) -> str:
    d = _dt.date.fromisoformat(iso)
    months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"]
    return "{j} {m} {y}".format(j=d.day, m=months[d.month - 1], y=d.year)


def post_card(meta: dict, base: str, feature: bool = False) -> str:
    cls = "postcard feature" if feature else "postcard"
    return (
        '<article class="{c}">'
        '<div class="tag">{tag}</div>'
        '<h3><a href="{b}blog/{s}.html">{t}</a></h3>'
        '<p>{lead}</p>'
        '<div class="meta">{d} · {reading}</div>'
        "</article>"
    ).format(c=cls, tag=meta["tag"], b=base, s=meta["slug"], t=meta["title"],
             lead=meta["lead"], d=pretty_date(meta["date"]),
             reading="Lecture ~" + str(meta.get("minutes", 6)) + " min")


def latest_posts(count: int = 3, base: str = "") -> str:
    arts = SITE["articles"][:count]
    return "\n".join(post_card(a, base, feature=(i == 0)) for i, a in enumerate(arts))


def all_posts(base: str = "../") -> str:
    return "\n".join(post_card(a, base, feature=(i == 0)) for i, a in enumerate(SITE["articles"]))


def blog_index_html() -> str:
    base = "../"
    body_path = PAGES_DIR / "blog-index.html"
    if not body_path.exists():
        raise SystemExit("Corps de page manquant : %s" % body_path)
    body = body_path.read_text(encoding="utf-8")
    body = render(body, {
        "ALL_POSTS": all_posts(base),
        "LATEST_POSTS": latest_posts(3, base),
        "VIDEO_CARDS": video_cards_all(base),
        "VIDEO_FEATURED": videos_featured(3, base),
        "VIDEO_FILTERS": video_filters(),
        "BASE": base,
        "YEAR": str(_dt.date.today().year),
    })
    return render(LAYOUT, {
        "TITLE": "Le journal — analyses sourcées sur l’édition génomique — CRISPR·CAS9",
        "DESCRIPTION": "Articles de fond sur CRISPR-Cas9 : thérapies autorisées, réglementation européenne, méthodes de mesure et éthique. Chaque article s’appuie sur des sources primaires citées.",
        "CANONICAL": SITE["site_url"] + "/blog/",
        "OG_TYPE": "website",
        "TOPLINE": "Articles de fond & veille",
        "NAV": nav_html(base, "blog/"),
        "BODY": body,
        "BASE": base,
        "YEAR": str(_dt.date.today().year),
        "EXTRA_HEAD": "",
        "EXTRA_BODY": "",
    })


# --------------------------------------------------------------- rendu
def render(template: str, mapping: dict) -> str:
    out = template
    for key, value in mapping.items():
        out = out.replace("{{%s}}" % key, value)
    leftovers = set(re.findall(r"\{\{([A-Z_]+)\}\}", out))
    if leftovers:
        raise SystemExit("Placeholders non résolus : %s" % ", ".join(sorted(leftovers)))
    return out


def page_html(page: dict) -> str:
    base = ""
    body_path = PAGES_DIR / page["body"]
    if not body_path.exists():
        raise SystemExit("Corps de page manquant : %s" % body_path)
    body = body_path.read_text(encoding="utf-8")
    body = render(body, {
        "LATEST_POSTS": latest_posts(3, base),
        "VIDEO_CARDS": video_cards_all(base),
        "VIDEO_FEATURED": videos_featured(3, base),
        "VIDEO_FILTERS": video_filters(),
        "BASE": base,
        "YEAR": str(_dt.date.today().year),
    })
    return render(LAYOUT, {
        "TITLE": page["title"],
        "DESCRIPTION": page["description"],
        "CANONICAL": "%s/%s" % (SITE["site_url"], "" if page["file"] == "index.html" else page["file"]),
        "OG_TYPE": page.get("og_type", "website"),
        "TOPLINE": page.get("topline", ""),
        "NAV": nav_html(base, page.get("active", "")),
        "BODY": body,
        "BASE": base,
        "YEAR": str(_dt.date.today().year),
        "EXTRA_HEAD": page.get("extra_head", ""),
        "EXTRA_BODY": page.get("extra_body", ""),
    })


def article_html(slug: str) -> str:
    meta = article_meta(slug)
    base = "../"
    body_path = ARTICLES_DIR / (slug + ".html")
    if not body_path.exists():
        raise SystemExit("Article manquant : %s" % body_path)
    body = body_path.read_text(encoding="utf-8")
    others = [a for a in SITE["articles"] if a["slug"] != slug]
    pager = ('<nav class="pager" aria-label="Autres articles"><a href="{b}blog/index.html">← Tous les articles</a>'
             '<a href="{b}blog/{s}.html">{t} →</a></nav>').format(
        b=base, s=others[0]["slug"], t=others[0]["title"])
    body = render(body, {"BASE": base, "PAGER": pager, "YEAR": str(_dt.date.today().year)})
    jsonld = (
        '<script type="application/ld+json">'
        '{"@context":"https://schema.org","@type":"Article",'
        '"headline":%s,"description":%s,"datePublished":%s,"dateModified":%s,'
        '"inLanguage":"fr-FR","author":{"@type":"Organization","name":"CRISPR·CAS9"},'
        '"publisher":{"@type":"Organization","name":"CRISPR·CAS9"},'
        '"mainEntityOfPage":%s}'
        "</script>"
    ) % (json.dumps(meta["title"], ensure_ascii=False), json.dumps(meta["lead"], ensure_ascii=False),
         json.dumps(meta["date"]), json.dumps(meta["date"]),
         json.dumps("%s/blog/%s.html" % (SITE["site_url"], slug), ensure_ascii=False))
    return render(LAYOUT, {
        "TITLE": meta["title"] + " — CRISPR·CAS9",
        "DESCRIPTION": meta["lead"],
        "CANONICAL": "%s/blog/%s.html" % (SITE["site_url"], slug),
        "OG_TYPE": "article",
        "TOPLINE": meta["tag"] + " · " + pretty_date(meta["date"]),
        "NAV": nav_html(base, "blog/"),
        "BODY": body,
        "BASE": base,
        "YEAR": str(_dt.date.today().year),
        "EXTRA_HEAD": jsonld,
        "EXTRA_BODY": "",
    })


def sitemap() -> str:
    urls = []
    for page in SITE["pages"]:
        if page["file"] == "404.html":
            continue
        loc = SITE["site_url"] + "/" + ("" if page["file"] == "index.html" else page["file"])
        prio = "1.0" if page["file"] == "index.html" else "0.8"
        urls.append((loc, LASTMOD, prio))
    urls.append((SITE["site_url"] + "/blog/", LASTMOD, "0.8"))
    for art in SITE["articles"]:
        urls.append(("%s/blog/%s.html" % (SITE["site_url"], art["slug"]), art["date"], "0.7"))
    body = "\n".join(
        "  <url>\n    <loc>{l}</loc>\n    <lastmod>{m}</lastmod>\n    <priority>{p}</priority>\n  </url>".format(l=l, m=m, p=p)
        for l, m, p in urls
    )
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n'
            .replace("sitemap.org", "sitemaps.org") + body + "\n</urlset>\n")


def robots() -> str:
    return "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE["site_url"]


def targets() -> dict:
    out = {}
    for page in SITE["pages"]:
        out[page["file"]] = page_html(page)
    for art in SITE["articles"]:
        out["blog/%s.html" % art["slug"]] = article_html(art["slug"])
    out["blog/index.html"] = blog_index_html()
    out["sitemap.xml"] = sitemap()
    out["robots.txt"] = robots()
    return out


def main() -> int:
    check = "--check" in sys.argv
    files = targets()
    problems = []
    for rel, content in files.items():
        path = ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        old = path.read_text(encoding="utf-8") if path.exists() else None
        if old == content:
            continue
        if check:
            problems.append(rel)
            continue
        path.write_text(content, encoding="utf-8")
        print(("maj   " if old is not None else "créé  ") + rel)
    if check:
        if problems:
            print("Fichiers désynchronisés : " + ", ".join(problems))
            return 1
        print("Tout est à jour (%d fichiers)." % len(files))
        return 0
    print("Généré : %d fichiers." % len(files))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
