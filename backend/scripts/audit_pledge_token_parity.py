"""scripts/audit_pledge_token_parity.py — ADR 0002 PR 1 observation script.

Run daily during the PR 1 → PR 2 transition. Asserts that for every user,
the sum across the legacy `prepaid_commitments` table equals the sum across
the two new tables (`pledge` + `token_purchase`). Any drift means the
dual-write classifier has a bug — halt PR 2 until fixed.

Usage:
    python -m scripts.audit_pledge_token_parity
    python -m scripts.audit_pledge_token_parity --json
    python -m scripts.audit_pledge_token_parity --user-id <uuid>

Exit codes:
    0  parity holds for every user inspected
    1  drift detected (printed to stderr in either format)
    2  database error / invalid args
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import uuid
from dataclasses import dataclass, asdict
from decimal import Decimal

from sqlalchemy import text

from app.db.session import engine


_QUERY_LEGACY = """
SELECT
    user_id,
    COALESCE(SUM(amount_kes), 0) AS legacy_total
FROM prepaid_commitments
WHERE status = 'confirmed'
GROUP BY user_id;
"""

_QUERY_NEW = """
SELECT
    COALESCE(p.user_id, t.user_id) AS user_id,
    COALESCE(p.pledge_total, 0)    AS pledge_total,
    COALESCE(t.token_total, 0)     AS token_total
FROM (
    SELECT user_id, SUM(amount_kes) AS pledge_total
    FROM pledge
    WHERE status = 'active' AND amount_kes IS NOT NULL
    GROUP BY user_id
) p
FULL OUTER JOIN (
    SELECT user_id, SUM(amount_kes) AS token_total
    FROM token_purchase
    GROUP BY user_id
) t ON p.user_id = t.user_id;
"""


@dataclass
class ParityRow:
    user_id: str
    legacy_total: float
    pledge_total: float
    token_total: float

    @property
    def delta(self) -> float:
        return float(
            Decimal(str(self.legacy_total))
            - Decimal(str(self.pledge_total))
            - Decimal(str(self.token_total))
        )

    @property
    def in_parity(self) -> bool:
        # 1-cent tolerance for decimal display rounding.
        return abs(self.delta) <= 0.01


async def _collect_rows(user_id: uuid.UUID | None) -> list[ParityRow]:
    async with engine.begin() as conn:
        legacy_rows = (await conn.execute(text(_QUERY_LEGACY))).all()
        new_rows = (await conn.execute(text(_QUERY_NEW))).all()

    legacy_by_user: dict[str, Decimal] = {
        str(r.user_id): Decimal(str(r.legacy_total)) for r in legacy_rows
    }
    new_by_user: dict[str, tuple[Decimal, Decimal]] = {
        str(r.user_id): (
            Decimal(str(r.pledge_total)),
            Decimal(str(r.token_total)),
        )
        for r in new_rows
    }
    every_user = set(legacy_by_user) | set(new_by_user)
    if user_id is not None:
        every_user &= {str(user_id)}

    rows: list[ParityRow] = []
    for uid in sorted(every_user):
        pledge_t, token_t = new_by_user.get(uid, (Decimal(0), Decimal(0)))
        rows.append(
            ParityRow(
                user_id=uid,
                legacy_total=float(legacy_by_user.get(uid, Decimal(0))),
                pledge_total=float(pledge_t),
                token_total=float(token_t),
            )
        )
    return rows


def _print_human(rows: list[ParityRow]) -> bool:
    drift = [r for r in rows if not r.in_parity]
    print("ADR 0002 pledge/token parity audit")
    print(f"  users inspected: {len(rows)}")
    print(f"  in parity:       {len(rows) - len(drift)}")
    print(f"  drift:           {len(drift)}")
    if not drift:
        print("\n✓ parity holds for every user")
        return True
    print("\n✗ DRIFT — DO NOT PROMOTE ADR 0002 TO PR 2")
    print(f"\n{'user_id':<40} {'legacy':>12} {'pledge':>12} {'token':>12} {'Δ':>10}")
    for r in drift:
        print(
            f"{r.user_id:<40} {r.legacy_total:>12.2f} {r.pledge_total:>12.2f} "
            f"{r.token_total:>12.2f} {r.delta:>10.2f}"
        )
    return False


def _print_json(rows: list[ParityRow]) -> bool:
    in_parity = all(r.in_parity for r in rows)
    out = {
        "in_parity_overall": in_parity,
        "users_inspected": len(rows),
        "drift_count": sum(1 for r in rows if not r.in_parity),
        "rows": [
            {**asdict(r), "delta": r.delta, "in_parity": r.in_parity}
            for r in rows
        ],
    }
    print(json.dumps(out, indent=2))
    return in_parity


async def _run(user_id: uuid.UUID | None, as_json: bool) -> int:
    try:
        rows = await _collect_rows(user_id)
    except Exception as exc:
        print(f"FATAL: database error — {exc}", file=sys.stderr)
        return 2

    if as_json:
        ok = _print_json(rows)
    else:
        ok = _print_human(rows)
    return 0 if ok else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="audit_pledge_token_parity")
    parser.add_argument(
        "--json", action="store_true", help="emit JSON instead of human text"
    )
    parser.add_argument(
        "--user-id",
        help="restrict the audit to a single user UUID (default: all users)",
    )
    args = parser.parse_args(argv)
    user_uuid: uuid.UUID | None = None
    if args.user_id:
        try:
            user_uuid = uuid.UUID(args.user_id)
        except ValueError:
            print(f"FATAL: invalid --user-id {args.user_id!r}", file=sys.stderr)
            return 2
    return asyncio.run(_run(user_uuid, args.json))


if __name__ == "__main__":
    sys.exit(main())
