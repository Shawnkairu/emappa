"""grant_admin — operator-run CLI to grant a user the admin role.

Per docs/IA_SPEC.md §8.5, admin is never publicly assignable. This script and
seed.py are the only paths that create admin users.

Allowlist source-of-truth (P0.3.4): the `admin_allowlist` DB table. On every
invocation, entries from EMAPPA_ADMIN_EMAILS are upserted into the table
(bootstrap rows, granted_by=NULL), then the target email is checked against
the active (non-revoked) rows in the DB. Refuses targets not allowlisted,
and refuses to overwrite existing non-admin users without --force.

Usage:
    python -m scripts.grant_admin <email>
    python -m scripts.grant_admin <email> --force
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from typing import Iterable

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User
from app.repos import admin_allowlist as admin_repo
from app.repos import users as users_repo


def _parse_env_emails(raw: str) -> set[str]:
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


async def _bootstrap_allowlist_from_env(session: AsyncSession) -> None:
    """Upsert EMAPPA_ADMIN_EMAILS rows so the DB allowlist is the source of truth."""
    for env_email in _parse_env_emails(get_settings().admin_emails):
        await admin_repo.upsert(
            session,
            email=env_email,
            granted_by=None,
            reason="bootstrap from EMAPPA_ADMIN_EMAILS",
        )


async def _grant(email: str, *, force: bool) -> int:
    email = email.lower().strip()

    async with SessionLocal() as session:
        await _bootstrap_allowlist_from_env(session)
        if not await admin_repo.is_allowlisted(session, email):
            active = await admin_repo.list_active_emails(session)
            print(
                f"refused: {email} not in EMAPPA_ADMIN_EMAILS allowlist {sorted(active)}",
                file=sys.stderr,
            )
            await session.commit()
            return 2

        existing = await users_repo.get_by_email(session, email)
        if existing is None:
            user = await users_repo.create(
                session,
                email=email,
                role="admin",
                onboarding_complete=True,
            )
            await session.commit()
            print(f"granted: created admin user {user.id} for {email}")
            return 0

        if existing.role == "admin":
            await session.commit()
            print(f"noop: {email} is already admin (id={existing.id})")
            return 0

        if not force:
            await session.commit()
            print(
                f"refused: {email} already exists as role={existing.role!r}; pass --force to overwrite",
                file=sys.stderr,
            )
            return 3

        await session.execute(
            update(User)
            .where(User.id == existing.id)
            .values(role="admin", onboarding_complete=True)
        )
        await session.commit()
        print(f"granted: promoted {email} (id={existing.id}) from {existing.role!r} to 'admin'")
        return 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="grant_admin")
    parser.add_argument("email", help="email of user to grant admin role")
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite existing non-admin user (refuse otherwise)",
    )
    args = parser.parse_args(argv)
    return asyncio.run(_grant(args.email, force=args.force))


if __name__ == "__main__":
    sys.exit(main())
