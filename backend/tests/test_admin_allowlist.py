"""P0.3.4 — admin_allowlist repo + grant_admin DB allowlist path."""
from __future__ import annotations

import asyncio
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.db.session import SessionLocal, engine
from app.repos import admin_allowlist as admin_repo
from scripts import grant_admin as grant_admin_script


def _purge_test_rows_sync() -> None:
    """Mirror of conftest.pytest_configure — dedicated short-lived engine
    so the cleanup never crosses the test-loop boundary."""

    async def _run() -> None:
        cleanup_engine = create_async_engine(get_settings().database_url)
        try:
            async with cleanup_engine.begin() as conn:
                await conn.execute(
                    text(
                        "DELETE FROM admin_allowlist WHERE email LIKE 'al-test-%@emappa.test'"
                    )
                )
                await conn.execute(
                    text(
                        "DELETE FROM users WHERE email LIKE 'al-test-%@emappa.test'"
                    )
                )
        finally:
            await cleanup_engine.dispose()

    asyncio.run(_run())


@pytest.fixture(autouse=True)
def cleanup():
    _purge_test_rows_sync()
    yield
    _purge_test_rows_sync()


async def test_upsert_inserts_new_email():
    async with SessionLocal() as session:
        row = await admin_repo.upsert(
            session,
            email="al-test-alice@emappa.test",
            granted_by=None,
            reason="bootstrap",
        )
        await session.commit()
    assert row.email == "al-test-alice@emappa.test"
    assert row.granted_by is None
    assert row.revoked_at is None


async def test_upsert_is_idempotent():
    async with SessionLocal() as session:
        first = await admin_repo.upsert(
            session,
            email="al-test-bob@emappa.test",
            granted_by=None,
            reason="bootstrap",
        )
        await session.commit()
        first_id = first.id

    async with SessionLocal() as session:
        again = await admin_repo.upsert(
            session,
            email="al-test-bob@emappa.test",
            granted_by=None,
            reason="bootstrap again",
        )
        await session.commit()
    assert again.id == first_id  # same active row returned, no duplicate


async def test_is_allowlisted_case_insensitive():
    async with SessionLocal() as session:
        await admin_repo.upsert(
            session,
            email="al-test-carol@emappa.test",
            granted_by=None,
            reason="bootstrap",
        )
        await session.commit()

    async with SessionLocal() as session:
        assert await admin_repo.is_allowlisted(
            session, "AL-TEST-CAROL@EMAPPA.TEST"
        )
        assert not await admin_repo.is_allowlisted(session, "al-test-nope@emappa.test")


async def test_revoke_drops_from_active_list():
    async with SessionLocal() as session:
        await admin_repo.upsert(
            session,
            email="al-test-dave@emappa.test",
            granted_by=None,
            reason="bootstrap",
        )
        await session.commit()

    # Insert a separate admin actor to satisfy revoked_by FK.
    actor_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, 'admin', true)"
            ),
            {"id": actor_id, "email": f"al-test-actor-{actor_id}@emappa.test"},
        )

    async with SessionLocal() as session:
        result = await admin_repo.revoke(
            session,
            email="al-test-dave@emappa.test",
            revoked_by=actor_id,
            reason="left team",
        )
        await session.commit()
    assert result is not None
    assert result.revoked_at is not None

    async with SessionLocal() as session:
        assert not await admin_repo.is_allowlisted(session, "al-test-dave@emappa.test")


async def test_revoke_returns_none_when_email_unknown():
    actor_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, 'admin', true)"
            ),
            {"id": actor_id, "email": f"al-test-actor2-{actor_id}@emappa.test"},
        )
    async with SessionLocal() as session:
        result = await admin_repo.revoke(
            session,
            email="al-test-ghost@emappa.test",
            revoked_by=actor_id,
            reason="cleanup",
        )
        await session.commit()
    assert result is None


def test_grant_admin_cli_refuses_email_not_in_allowlist(monkeypatch, capsys):
    # Override the env var so this test email is definitively NOT allowlisted.
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("EMAPPA_ADMIN_EMAILS", "al-test-allowed@emappa.test")

    rc = grant_admin_script.main(["al-test-blocked@emappa.test"])
    assert rc == 2
    err = capsys.readouterr().err
    assert "not in EMAPPA_ADMIN_EMAILS allowlist" in err

    get_settings.cache_clear()


def test_grant_admin_cli_succeeds_for_allowlisted_email(monkeypatch, capsys):
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("EMAPPA_ADMIN_EMAILS", "al-test-allowed@emappa.test")

    rc = grant_admin_script.main(["al-test-allowed@emappa.test"])
    assert rc == 0
    out = capsys.readouterr().out
    assert "granted" in out or "noop" in out

    # Cleanup happens via the autouse fixture's teardown.
    get_settings.cache_clear()
