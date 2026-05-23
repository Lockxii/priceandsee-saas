from .base import BaseAdapter
from .registry import ADAPTERS, adapter_summary, detect_adapter_platform, extract_with_adapters, matching_adapters

__all__ = [
    "ADAPTERS",
    "BaseAdapter",
    "adapter_summary",
    "detect_adapter_platform",
    "extract_with_adapters",
    "matching_adapters",
]
