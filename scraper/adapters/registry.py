from __future__ import annotations

from typing import Any

from .base import BaseAdapter, compact, host_for_url, merge_missing
from .generic import GenericAdapter
from .marketplaces import ALL_MARKETPLACE_ADAPTERS
from .shop_platforms import ALL_SHOP_PLATFORM_ADAPTERS


ADAPTERS: list[BaseAdapter] = [
    *(adapter_cls() for adapter_cls in ALL_MARKETPLACE_ADAPTERS),
    *(adapter_cls() for adapter_cls in ALL_SHOP_PLATFORM_ADAPTERS),
    GenericAdapter(),
]
ADAPTERS.sort(key=lambda adapter: adapter.priority, reverse=True)


def matching_adapters(url: str, raw: str = "", page: Any | None = None, include_generic: bool = True) -> list[BaseAdapter]:
    matches = [adapter for adapter in ADAPTERS if adapter.matches(url, raw, page)]
    if not include_generic:
        matches = [adapter for adapter in matches if not isinstance(adapter, GenericAdapter)]
    return matches


def extract_with_adapters(page: Any, url: str, raw: str = "", include_generic: bool = True) -> tuple[dict[str, Any], list[str]]:
    data: dict[str, Any] = {}
    used: list[str] = []
    for adapter in matching_adapters(url, raw, page, include_generic=include_generic):
        try:
            extracted = adapter.extract(page, url, raw)
        except Exception as exc:
            used.append(f"{adapter.name}:error:{type(exc).__name__}")
            continue
        if extracted:
            data = merge_missing(data, extracted)
            used.append(adapter.name)
    return compact(data), used


def detect_adapter_platform(url: str, raw: str = "", page: Any | None = None) -> str | None:
    for adapter in matching_adapters(url, raw, page, include_generic=False):
        return adapter.platform
    return None


def adapter_summary(url: str, raw: str = "", page: Any | None = None) -> dict[str, Any]:
    matches = matching_adapters(url, raw, page, include_generic=False)
    return compact({
        "host": host_for_url(url),
        "matchedAdapters": [adapter.name for adapter in matches],
        "platform": matches[0].platform if matches else None,
    })
