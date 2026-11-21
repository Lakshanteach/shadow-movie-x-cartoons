const BASE_URL = "https://cartoons.lk/";
const CREATOR = "👨‍💻 CREATOR BY  SHADOW MOVIE X MAIN OWNER 👨‍💻";

const CATEGORY_MAP = {
  series: "https://cartoons.lk/category/tv-series/",
  "tv-series": "https://cartoons.lk/category/tv-series/",
  tvseries: "https://cartoons.lk/category/tv-series/",
  cartoons: "https://cartoons.lk/category/cartoons/",
  cartoon: "https://cartoons.lk/category/cartoons/",
  movies: "https://cartoons.lk/category/movies/",
  movie: "https://cartoons.lk/category/movies/",
  kdrama: "https://cartoons.lk/category/korean-dramas/",
  kdramas: "https://cartoons.lk/category/korean-dramas/",
  "korean-dramas": "https://cartoons.lk/category/korean-dramas/",
  korean: "https://cartoons.lk/category/korean-dramas/"
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "si-LK,si;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: BASE_URL,
  "Cache-Control": "no-cache"
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify({ creator: CREATOR, ...payload }, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function decodeHtml(str = "") {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;|&#8230;/gi, "…")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function stripTags(html = "") {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function hasTelegramSignature(str = "") {
  if (!str) return false;
  const s = decodeHtml(String(str)).toLowerCase();
  if (/t\s*e\s*l\s*(?:e\s*)?g\s*r\s*a\s*m/i.test(s)) return true;
  if (/(?:^|[\s/:?=&@])t\s*\.\s*m\s*e(?:\/|$|\s|\?|&)/i.test(s)) return true;
  if (/telegram\s*\.\s*(?:me|dog|org)|tg\s*:/i.test(s)) return true;
  return false;
}

function isCommentOrJunkLink(href = "", label = "") {
  const combined = `${href} ${label}`.toLowerCase();
  return /#comments\b|\bdiscuss\b|\bdiscussion\b|\bcomments?\b|\breply\b|\blogin\b|\bregister\b/i.test(
    combined
  );
}

function isAllowedTarget(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    return u.hostname === "cartoons.lk" || u.hostname.endsWith(".cartoons.lk");
  } catch (_) {
    return false;
  }
}

function isNavOrCategoryPath(rawUrl = "") {
  try {
    const u = new URL(rawUrl);
    const p = u.pathname.toLowerCase();
    if (!p || p === "/") return true;
    return (
      /^\/(?:category|categories|tag|tags|genre|genres|about-us|contact-us|privacy-policy|terms|wp-admin|wp-login|feed|author)\b/i.test(
        p
      ) ||
      /\/page\/\d+\/?$/i.test(p) ||
      /\.(?:jpg|jpeg|png|webp|gif|svg|css|js|xml|json|ico)$/i.test(p)
    );
  } catch (_) {
    return true;
  }
}

function resolveUrl(raw, base = BASE_URL) {
  if (!raw || raw.startsWith("data:") || raw.startsWith("javascript:") || raw.startsWith("#")) {
    return null;
  }
  try {
    return new URL(decodeHtml(raw).trim(), base).toString();
  } catch (_) {
    return null;
  }
}

function isBadImage(url = "") {
  return /icon|logo|favicon|sprite|avatar|emoji|placeholder|blank|loader/i.test(url);
}

function detectItemType(url = "", title = "", fallbackType = null) {
  const combined = `${url} ${title}`.toLowerCase();
  if (/\b(?:korean\s*drama|kdrama)\b/i.test(combined)) {
    return "kdrama";
  }
  if (/[?&]ep=\d+|\b(?:ep|episode|s\d{1,2}e\d{1,3})\b|\/episodes?\b/i.test(combined)) {
    return fallbackType === "series" || fallbackType === "kdrama" ? fallbackType : "episode";
  }
  if (
    /\b(?:series|tv\s*show|drama|season\s*\d+|\d+\s*eps?)\b|\/(?:series|tvshows|tv-series|seasons)\b/i.test(
      combined
    )
  ) {
    return fallbackType === "kdrama" ? "kdrama" : "series";
  }
  if (/\bmovie\b|\/movies?\b/i.test(combined)) {
    return "movie";
  }
  return fallbackType || "cartoon";
}

function detectQuality(text = "") {
  if (/\b1080p\b|\bfhd\b|\bfull\s*hd\b/i.test(text)) return "1080p";
  if (/\b720p\b|\bhd\b/i.test(text)) return "720p";
  if (/\b480p\b|\bsd\b|\b420p\b/i.test(text)) return "480p";
  return null;
}

function detectSize(text = "") {
  const m = String(text).match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  if (!m) return { size: null, bytes: 0 };
  const val = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const bytes = unit === "GB" ? Math.round(val * 1024 * 1024 * 1024) : Math.round(val * 1024 * 1024);
  const size = unit === "GB" ? `${val.toFixed(2)} GB` : `${val.toFixed(1)} MB`;
  return { size, bytes };
}

function extractEpsCount(text = "") {
  const m = String(text).match(/\b(\d+)\s*EPS?\b/i);
  return m ? parseInt(m[1], 10) : null;
}

async function fetchHtml(targetUrl, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(targetUrl, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseCardsOrLinks(html, baseUrl, forcedType = null) {
  const items = [];
  const seen = new Set();

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = resolveUrl(m[1], baseUrl);
    if (!url || !isAllowedTarget(url) || isNavOrCategoryPath(url) || seen.has(url)) continue;

    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length === 0 || segments.length > 3) continue;

    const idx = typeof m.index === "number" ? m.index : 0;
    const aroundHtml = html.slice(Math.max(0, idx - 300), Math.min(html.length, idx + m[0].length + 300));
    const aroundText = stripTags(aroundHtml);
    const label = stripTags(m[2]);

    if (isCommentOrJunkLink(url, label) || hasTelegramSignature(url) || hasTelegramSignature(label)) {
      continue;
    }

    if (/^(?:cartoons?|korean\s*dramas?|movies?|tv\s*series|home|search)$/i.test(label)) {
      continue;
    }

    const titleAttr = m[0].match(/title=["']([^"']+)["']/i);
    const slugTitle = segments[segments.length - 1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const title =
      (label && !/^(?:watch|download|more info|play)\b/i.test(label) ? label : "") ||
      (titleAttr ? decodeHtml(titleAttr[1]).trim() : "") ||
      slugTitle;

    if (!title || title.length < 2) continue;

    const imgM = (m[2] + aroundHtml).match(/<img\b[^>]*(?:data-src|data-lazy-src|src)=["']([^"']+)["'][^>]*>/i);
    const imgUrl = imgM ? resolveUrl(imgM[1], url) : null;

    const epsCount = extractEpsCount(`${label} ${aroundText}`);
    const badgeQuality = detectQuality(`${label} ${aroundText}`);

    seen.add(url);
    items.push({
      title,
      type: detectItemType(url, title, forcedType),
      episodesCount: epsCount,
      quality: badgeQuality,
      url,
      image: imgUrl && !isBadImage(imgUrl) ? imgUrl : null
    });
  }

  return items;
}

function extractSeasonsAndEpisodes(html, pageUrl, mainTitle = "") {
  const seasons = [];
  const episodes = [];
  const seenSeasons = new Set();
  const seenEpisodes = new Set();
  const baseObj = new URL(pageUrl);

  const showWords = mainTitle
    .toLowerCase()
    .replace(/\b(?:season\s*\d+|sinhala\s*dubbed|cartoon|series|tv\s*show|korean\s*drama|free\s*download|cartoons\.lk|\|.*$)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const resolved = resolveUrl(m[1], pageUrl);
    if (!resolved || !isAllowedTarget(resolved) || isNavOrCategoryPath(resolved)) continue;

    const label = stripTags(m[2]);
    if (
      isCommentOrJunkLink(resolved, label) ||
      hasTelegramSignature(resolved) ||
      hasTelegramSignature(label)
    ) {
      continue;
    }

    const u = new URL(resolved);
    u.hash = "";
    const cleanUrl = u.toString();

    const epParam = u.searchParams.get("ep") || u.searchParams.get("episode");
    const epTextMatch =
      label.match(/^(?:ep(?:isode)?)\s*0*(\d{1,3})$/i) ||
      label.match(/\b(?:ep(?:isode)?)\s*0*(\d{1,3})\b/i) ||
      cleanUrl.match(/[?&]ep=0*(\d{1,3})\b/i);

    const epNum = epParam
      ? parseInt(epParam, 10)
      : epTextMatch
      ? parseInt(epTextMatch[1], 10)
      : null;

    if (epNum && epNum > 0 && !seenEpisodes.has(epNum)) {
      seenEpisodes.add(epNum);
      episodes.push({
        episode: epNum,
        title: `Episode ${epNum}`,
        type: "episode",
        url: cleanUrl
      });
      continue;
    }

    if (u.pathname !== baseObj.pathname && /season[-\s]?\d+/i.test(`${cleanUrl} ${label}`)) {
      const targetLower = `${cleanUrl} ${label}`.toLowerCase();
      const matchesShow =
        showWords.length === 0 || showWords.slice(0, 2).every((w) => targetLower.includes(w));

      if (matchesShow && !seenSeasons.has(cleanUrl)) {
        seenSeasons.add(cleanUrl);
        const sMatch = `${cleanUrl} ${label}`.match(/season[-\s]?(\d+)/i);
        seasons.push({
          season: sMatch ? parseInt(sMatch[1], 10) : null,
          title: sMatch ? `Season ${sMatch[1]}` : label,
          type: "series",
          url: cleanUrl
        });
      }
    }
  }

  // Page එකේ "22 EPS" වගේ count එකක් තියෙනවා නම් සහ links ටිකක් හෝ තියෙනවා නම්, links නැති වුණත් ep list එකක් fallback විදියට හදන්න පුළුවන්
  if (episodes.length === 0) {
    const epsCount = extractEpsCount(`${mainTitle} ${stripTags(html).slice(0, 2000)}`);
    if (epsCount && epsCount > 0 && epsCount <= 100) {
      for (let i = 1; i <= epsCount; i++) {
        const epUrlObj = new URL(pageUrl);
        epUrlObj.searchParams.set("ep", String(i));
        episodes.push({
          episode: i,
          title: `Episode ${i}`,
          type: "episode",
          url: epUrlObj.toString()
        });
      }
    }
  }

  episodes.sort((a, b) => a.episode - b.episode);
  seasons.sort((a, b) => (a.season || 99) - (b.season || 99));

  return {
    seasons: seasons.slice(0, 15),
    episodes: episodes.slice(0, 100)
  };
}

function extractQualities(html, pageUrl, fallbackUrl) {
  const candidates = [];
  const seen = new Set();

  for (const m of html.matchAll(
    /<(?:a|iframe|source)\b[^>]*\b(?:href|src)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|<(?:iframe|source)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  )) {
    const rawHref = m[1] || m[3];
    const href = resolveUrl(rawHref, pageUrl);
    if (!href || seen.has(href)) continue;

    const idx = typeof m.index === "number" ? m.index : 0;
    const aroundHtml = html.slice(Math.max(0, idx - 400), Math.min(html.length, idx + m[0].length + 400));
    const aroundText = stripTags(aroundHtml);
    const label = stripTags(m[2] || "") || "Stream / Download";

    if (
      isCommentOrJunkLink(href, label) ||
      hasTelegramSignature(href) ||
      hasTelegramSignature(label) ||
      hasTelegramSignature(aroundText)
    ) {
      continue;
    }

    try {
      const u = new URL(href);
      if (isAllowedTarget(href) && isNavOrCategoryPath(href)) continue;
      if (isAllowedTarget(href) && u.pathname === new URL(pageUrl).pathname && !u.searchParams.get("ep")) {
        continue;
      }

      const quality = detectQuality(`${label} ${aroundText} ${href}`);
      const sizeInfo = detectSize(`${label} ${aroundText}`);
      const isFileHost =
        /(?:pixeldrain|mediafire|mega\.nz|mega\.io|drive\.google\.com|terabox|1024terabox|gofile|1fichier|buzzheavier|vikingfile|akirabox|workupload|send\.cm|streamtape|dood|voe|mixdrop)/i.test(
          u.hostname
        );
      const isDirectFileOrDl =
        /\.(?:mp4|mkv|avi|webm|m3u8)(?:\?|$)|\/(?:download|dl|stream|embed|player|get_file|direct)\b|[?&](?:download|dl|file|link)=/i.test(
          href
        );

      if (!quality && !sizeInfo.size && !isFileHost && !isDirectFileOrDl) continue;

      seen.add(href);
      candidates.push({
        label,
        url: href,
        quality: quality || "720p",
        size: sizeInfo.size || "MB / GB",
        bytes: sizeInfo.bytes || 0
      });
    } catch (_) {}
  }

  const targetQualities = ["480p", "720p", "1080p"];
  const picked = [];
  const used = new Set();

  for (const q of targetQualities) {
    const found = candidates.find((c) => c.quality === q && !used.has(c.url));
    if (found) {
      used.add(found.url);
      picked.push({ ...found, quality: q });
    }
  }

  for (const q of targetQualities) {
    if (picked.some((p) => p.quality === q)) continue;
    const extra = candidates.find((c) => !used.has(c.url));
    if (extra) {
      used.add(extra.url);
      picked.push({ ...extra, quality: q });
    }
  }

  if (picked.length === 0) {
    return targetQualities.map((q) => ({
      quality: q,
      label: `Watch / Download ${q}`,
      size: "MB / GB",
      bytes: 0,
      url: fallbackUrl || pageUrl
    }));
  }

  return picked;
}

async function parseInfo(html, pageUrl) {
  const titleMatch =
    html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  const descMatch =
    html.match(/<meta\b[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

  let image = null;
  for (const imgM of html.matchAll(
    /<(?:meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']|img\b[^>]*(?:data-src|data-lazy-src|src)=["']([^"']+)["'])[^>]*>/gi
  )) {
    const resolved = resolveUrl(imgM[1] || imgM[2], pageUrl);
    if (resolved && !isBadImage(resolved)) {
      image = resolved;
      break;
    }
  }

  const title = titleMatch ? stripTags(titleMatch[1]) : null;
  const { seasons, episodes } = extractSeasonsAndEpisodes(html, pageUrl, title || "");
  const primaryStreamTarget = episodes[0]?.url || pageUrl;
  const qualities = extractQualities(html, pageUrl, primaryStreamTarget);

  return {
    title,
    type: detectItemType(pageUrl, title || ""),
    image,
    description: descMatch ? stripTags(descMatch[1]).slice(0, 600) : null,
    qualities,
    seasons,
    episodes
  };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return jsonResponse({}, 200);
    if (request.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

    const urlObj = new URL(request.url);
    const path = urlObj.pathname;

    if (path === "/health") {
      return jsonResponse({
        ok: true,
        source: BASE_URL,
        categories: ["tv-series", "cartoons", "movies", "korean-dramas"],
        endpoints: ["/category?type=series|cartoons|movies|kdrama", "/search?q=...", "/info?url=...", "/dl?url=..."]
      });
    }

    if (path === "/category") {
      const rawType = (urlObj.searchParams.get("type") || "").trim().toLowerCase();
      const targetUrl = CATEGORY_MAP[rawType];
      if (!targetUrl) {
        return jsonResponse(
          { ok: false, error: "Pass ?type=series, ?type=cartoons, ?type=movies, or ?type=kdrama" },
          400
        );
      }

      try {
        const html = await fetchHtml(targetUrl);
        const normalizedType =
          rawType.startsWith("kdrama") || rawType.includes("korean")
            ? "kdrama"
            : rawType.startsWith("series") || rawType.includes("tv")
            ? "series"
            : rawType.startsWith("movie")
            ? "movie"
            : "cartoon";
        const items = parseCardsOrLinks(html, targetUrl, normalizedType);
        return jsonResponse({
          ok: true,
          category: normalizedType,
          url: targetUrl,
          total: items.length,
          items
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message || "Category fetch failed" }, 500);
      }
    }

    if (path === "/search") {
      const q = (urlObj.searchParams.get("q") || "").trim();
      if (!q) return jsonResponse({ ok: false, error: "Missing ?q=keyword" }, 400);

      try {
        const searchUrl = `${BASE_URL}?s=${encodeURIComponent(q)}`;
        const html = await fetchHtml(searchUrl);
        let items = parseCardsOrLinks(html, searchUrl, null);

        const typeFilter = (urlObj.searchParams.get("type") || "").trim().toLowerCase();
        if (typeFilter) {
          items = items.filter((it) => it.type === typeFilter);
        }

        return jsonResponse({ ok: true, query: q, total: items.length, items });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message || "Search failed" }, 500);
      }
    }

    if (path === "/info" || path === "/dl") {
      const rawTarget = (urlObj.searchParams.get("url") || "").trim();
      const epParam = (urlObj.searchParams.get("ep") || "").trim();
      let target = rawTarget;

      if (target && epParam) {
        try {
          const u = new URL(target);
          if (!u.searchParams.get("ep")) u.searchParams.set("ep", epParam);
          target = u.toString();
        } catch (_) {}
      }

      if (!target || !isAllowedTarget(target)) {
        return jsonResponse({ ok: false, error: "Pass valid ?url=https://cartoons.lk/..." }, 400);
      }

      try {
        const html = await fetchHtml(target);
        const info = await parseInfo(html, target);
        return jsonResponse({ ok: true, url: target, ...info });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message || "Info failed" }, 500);
      }
    }

    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }
};
