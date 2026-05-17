"""Conservative-by-default service (CR-5 / P0.3.7).

Per IA_SPEC §Universal Cockpit Rules CR-5 + the conservative-settle
doctrine: when the data feeding a calculation is degraded (missing,
disputed, delayed, or already flagged conservative upstream), the
response is computed with conservative assumptions AND the response
header `X-Emappa-Conservative: true` is set. The cockpit UI primitive
`<ConservativeBanner>` reads that header to render the banner +
disable mutation CTAs.

This module owns:

1. A taxonomy of "degraded" data-quality states. Mirrors
   `DataQualityStatus` from packages/shared/src/types.ts. Two of the
   six members (`verified`, `estimated`) are not degraded; the rest
   are (`missing`, `delayed`, `disputed`, `conservative`).

2. `is_conservative(flags)` — pure predicate. Used by the projector,
   settlement service, etc.

3. `ConservativeContext` — request-scoped bag attached to
   `request.state.conservative`. Endpoints push their own reasons
   onto it (e.g. "energy_reading_gap_2026-05-15") and the response
   middleware aggregates them when emitting the header.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Literal

DataQualityStatus = Literal[
    "verified", "estimated", "missing", "delayed", "disputed", "conservative"
]

# The four flags that force conservative mode.
_DEGRADED: frozenset[str] = frozenset({"missing", "delayed", "disputed", "conservative"})


def is_degraded(flag: str | None) -> bool:
    """Returns True if a single flag falls into the degraded bucket."""
    return flag is not None and flag in _DEGRADED


def is_conservative(flags: Iterable[str | None]) -> bool:
    """Aggregate predicate — True if any flag in the iterable is degraded.

    Empty iterable returns False (no data → no reason to flag).
    """
    return any(is_degraded(f) for f in flags)


def reasons_for(flags: Iterable[str | None]) -> list[str]:
    """Returns the de-duplicated degraded flags as plain strings, for
    audit + banner rendering."""
    seen: list[str] = []
    for flag in flags:
        if is_degraded(flag) and flag not in seen:
            assert flag is not None  # narrow for type-checker
            seen.append(flag)
    return seen


@dataclass
class ConservativeContext:
    """Mutable bag carried on `request.state.conservative`.

    Endpoints (or downstream services) push reasons as they discover
    degraded inputs:

        request.state.conservative.flag('energy_reading_gap')

    The middleware reads `active` after call_next and stamps the
    response header.
    """

    reasons: list[str] = field(default_factory=list)

    @property
    def active(self) -> bool:
        return len(self.reasons) > 0

    def flag(self, reason: str) -> None:
        if reason and reason not in self.reasons:
            self.reasons.append(reason)

    def flag_quality(self, flag: str | None) -> None:
        """Convenience: forward a DataQualityStatus into the bag iff degraded."""
        if is_degraded(flag):
            assert flag is not None
            self.flag(f"data_quality:{flag}")

    def flag_qualities(self, flags: Iterable[str | None]) -> None:
        for f in flags:
            self.flag_quality(f)
