import html
import re
from typing import Any
from urllib.parse import urljoin, urlparse


EMPTY_VALUES = (None, "", [], {})


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    try:
        if hasattr(value, "clean"):
            value = value.clean()
    except Exception:
        pass
    text = html.unescape(str(value)).replace("\xa0", " ")
    if "<" in text and ">" in text:
        text = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", text, flags=re.I)
        text = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def compact(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned = {key: compact(val) for key, val in value.items()}
        return {key: val for key, val in cleaned.items() if val not in EMPTY_VALUES}
    if isinstance(value, list):
        cleaned = [compact(item) for item in value]
        return [item for item in cleaned if item not in EMPTY_VALUES]
    return value


def unique(values: list[Any]) -> list[Any]:
    seen: set[str] = set()
    result: list[Any] = []
    for value in values:
        marker = repr(value)
        if marker in seen:
            continue
        seen.add(marker)
        result.append(value)
    return result


def raw_css_values(page: Any, selector: str, limit: int = 50) -> list[str]:
    try:
        values = page.css(selector).getall()
    except Exception:
        return []
    return [str(value).strip() for value in values[:limit] if str(value).strip()]


def first_css(page: Any, selectors: list[str]) -> str | None:
    for selector in selectors:
        try:
            value = page.css(selector).get()
            value = clean_text(value)
            if value:
                return value
        except Exception:
            continue
    return None


def all_css(page: Any, selector: str, limit: int = 100) -> list[str]:
    try:
        values = page.css(selector).getall()
    except Exception:
        return []

    cleaned: list[str] = []
    for value in values[:limit]:
        text = clean_text(value)
        if text:
            cleaned.append(text)
    return unique(cleaned)


def has_css(page: Any, selectors: list[str]) -> bool:
    for selector in selectors:
        try:
            if page.css(selector).get() is not None:
                return True
        except Exception:
            continue
    return False


def clean_price(price_str: Any) -> float | None:
    if price_str is None:
        return None

    raw = html.unescape(str(price_str)).replace("\xa0", " ")
    match = re.search(r"-?\d[\d\s.,]*", raw)
    if not match:
        return None

    clean = re.sub(r"\s+", "", match.group(0))
    clean = re.sub(r"[^0-9,.-]", "", clean)
    if not re.search(r"\d", clean):
        return None

    if "," in clean and "." in clean:
        if clean.rfind(",") > clean.rfind("."):
            clean = clean.replace(".", "").replace(",", ".")
        else:
            clean = clean.replace(",", "")
    elif "," in clean:
        parts = clean.split(",")
        if len(parts[-1]) in (1, 2):
            clean = "".join(parts[:-1]) + "." + parts[-1]
        else:
            clean = clean.replace(",", "")
    elif clean.count(".") > 1:
        parts = clean.split(".")
        if len(parts[-1]) in (1, 2):
            clean = "".join(parts[:-1]) + "." + parts[-1]
        else:
            clean = "".join(parts)

    try:
        price = float(clean)
    except ValueError:
        return None

    if price < 0:
        return None
    return round(price, 2)


def to_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(str(value).replace(",", "."))
        return number if number == number else None
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int | None:
    if value is None:
        return None
    match = re.search(r"\d[\d\s,.]*", str(value))
    if not match:
        return None
    try:
        return int(re.sub(r"[^0-9]", "", match.group(0)))
    except ValueError:
        return None


def parse_rating(value: Any) -> float | None:
    if value is None:
        return None
    match = re.search(r"\d+(?:[\.,]\d+)?", str(value))
    if not match:
        return None
    try:
        rating = float(match.group(0).replace(",", "."))
    except ValueError:
        return None
    if 0 <= rating <= 5:
        return round(rating, 2)
    if 5 < rating <= 100 and "%" in str(value):
        return round(rating / 20, 2)
    return None


def stock_status(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).lower()
    if any(token in text for token in ["outofstock", "out of stock", "soldout", "sold out", "rupture", "épuisé", "indisponible", "unavailable", "discontinued", "currently unavailable"]):
        return "Out of Stock"
    if any(token in text for token in ["instock", "in stock", "available", "disponible", "en stock", "add to cart", "add to basket", "ajouter au panier", "limitedavailability", "preorder", "backorder", "buy now"]):
        return "In Stock"
    return None


def normalize_currency(value: Any, fallback_text: str = "") -> str | None:
    if value:
        text = clean_text(value)
        if text:
            text = text.upper()
            symbols = {"€": "EUR", "$": "USD", "£": "GBP", "¥": "JPY", "₹": "INR", "₩": "KRW", "R$": "BRL", "MX$": "MXN", "C$": "CAD", "A$": "AUD"}
            return symbols.get(text, text[:3] if len(text) > 3 else text)
    if "€" in fallback_text:
        return "EUR"
    if "£" in fallback_text:
        return "GBP"
    if "R$" in fallback_text:
        return "BRL"
    if "MX$" in fallback_text:
        return "MXN"
    if "$" in fallback_text:
        return "USD"
    if "¥" in fallback_text:
        return "JPY"
    if "₹" in fallback_text:
        return "INR"
    if "₩" in fallback_text:
        return "KRW"
    return None


def absolutize_url(value: str, base_url: str) -> str:
    value = html.unescape(str(value).strip())
    if not value or value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
        return value
    if value.startswith("//"):
        parsed = urlparse(base_url)
        return f"{parsed.scheme}:{value}"
    return urljoin(base_url, value)


def host_for_url(url: str) -> str:
    return (urlparse(url).hostname or "").lower().replace("www.", "")


def domain_matches(host: str, domain: str) -> bool:
    domain = domain.lower().strip()
    if not domain:
        return False
    if domain.startswith("."):
        return host.endswith(domain) or host == domain[1:]
    if domain.endswith("."):
        return domain in host
    return host == domain or host.endswith(f".{domain}") or domain in host


class BaseAdapter:
    """Small domain/platform adapter inspired by Crinibus' per-site handler routing."""

    name = "Generic"
    platform = "Generic"
    domains: list[str] = []
    raw_signals: list[str] = []
    page_signals: list[str] = []
    selectors: dict[str, list[str]] = {}
    priority = 0
    always_match = False

    def matches(self, url: str, raw: str = "", page: Any | None = None) -> bool:
        if self.always_match:
            return True
        host = host_for_url(url)
        if any(domain_matches(host, domain) for domain in self.domains):
            return True
        lowered = raw.lower()
        if any(signal.lower() in lowered for signal in self.raw_signals):
            return True
        if page is not None and self.page_signals and has_css(page, self.page_signals):
            return True
        return False

    def extract(self, page: Any, url: str, raw: str = "") -> dict[str, Any]:
        data = self.extract_selectors(page, url, raw)
        extra = self.extract_extra(page, url, raw)
        return compact(merge_missing(data, extra))

    def extract_selectors(self, page: Any, url: str, raw: str = "") -> dict[str, Any]:
        price_text = first_css(page, self.selectors.get("price", []))
        image = first_css(page, self.selectors.get("image", []))
        if image:
            image = absolutize_url(image, url)

        data = {
            "title": first_css(page, self.selectors.get("title", [])),
            "price": clean_price(price_text),
            "description": first_css(page, self.selectors.get("description", [])),
            "image": image,
            "brand": first_css(page, self.selectors.get("brand", [])),
            "sku": first_css(page, self.selectors.get("sku", [])),
            "currency": normalize_currency(first_css(page, self.selectors.get("currency", []) + ['meta[property="product:price:currency"]::attr(content)', 'meta[itemprop="priceCurrency"]::attr(content)', 'meta[property="og:price:currency"]::attr(content)']), price_text or raw[:5000]),
            "rating": parse_rating(first_css(page, self.selectors.get("rating", []))),
            "reviewsCount": to_int(first_css(page, self.selectors.get("reviews", []))),
            "stockStatus": stock_status(first_css(page, self.selectors.get("stock", [])) or raw[:100_000]),
        }
        return compact(data)

    def extract_extra(self, page: Any, url: str, raw: str = "") -> dict[str, Any]:
        return {}


def merge_missing(base: dict[str, Any], *sources: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for source in sources:
        for key, value in source.items():
            if value in EMPTY_VALUES:
                continue
            if merged.get(key) in EMPTY_VALUES:
                merged[key] = value
    return merged
