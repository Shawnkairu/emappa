"""P2.6.6 — homeowner_authority table + repo + CHECK invariants.

The endpoint half (P2.6.1) ships next; this PR is storage-only. Tests
cover:
- submit: append-only, requires at least one ownership-proof URL (app
  layer + DB CHECK)
- status CHECK rejects bogus values
- atomicity CHECKs: pending ↔ no reviewer / no reviewed_at; terminal ↔
  reviewer + reviewed_at both set
- latest_for_user reads most-recent submission (resubmission semantics)
- has_verified is the A.7-case-1 doctrine gate for P2.6.4
- review() transitions pending → terminal, refuses non-pending and
  non-terminal targets
- pending_review_queue is FIFO
"""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.session import SessionLocal, engine
from app.models.homeowner_authority import HomeownerAuthority
from app.repos import homeowner_authority as ha_repo


async def _insert_user(role: str = "homeowner") -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, :role, true)"
            ),
            {"id": new_id, "email": f"ha-{new_id}@emappa.test", "role": role},
        )
    return new_id


# ---- submit -----------------------------------------------------------------


async def test_submit_with_title_only_succeeds():
    user = await _insert_user()
    async with SessionLocal() as session:
        row = await ha_repo.submit(
            session, user_id=user, title_url="s3://docs/title.pdf"
        )
        await session.commit()
    assert row.status == "pending"
    assert row.title_url == "s3://docs/title.pdf"
    assert row.reviewed_at is None
    assert row.reviewed_by_user_id is None


async def test_submit_with_lease_only_succeeds():
    user = await _insert_user()
    async with SessionLocal() as session:
        row = await ha_repo.submit(
            session, user_id=user, lease_url="s3://docs/lease.pdf"
        )
        await session.commit()
    assert row.lease_url == "s3://docs/lease.pdf"


async def test_submit_with_owner_authorization_only_succeeds():
    user = await _insert_user()
    async with SessionLocal() as session:
        row = await ha_repo.submit(
            session, user_id=user, owner_authorization_url="s3://docs/auth.pdf"
        )
        await session.commit()
    assert row.owner_authorization_url == "s3://docs/auth.pdf"


async def test_submit_without_any_ownership_proof_rejected_in_app():
    """Fail-fast at the repo so callers don't burn a DB round-trip."""
    user = await _insert_user()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="ownership-proof|at least one"):
            await ha_repo.submit(
                session,
                user_id=user,
                utility_account_evidence_url="s3://docs/bill.pdf",
                national_id_url="s3://docs/id.pdf",
            )


async def test_submit_without_any_ownership_proof_rejected_by_db_check():
    """Belt + suspenders: even if app layer is bypassed, the DB CHECK fires."""
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            HomeownerAuthority(
                user_id=user,
                utility_account_evidence_url="s3://docs/bill.pdf",
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_submit_with_all_fields_succeeds():
    user = await _insert_user()
    async with SessionLocal() as session:
        row = await ha_repo.submit(
            session,
            user_id=user,
            title_url="s3://t.pdf",
            lease_url="s3://l.pdf",
            owner_authorization_url="s3://a.pdf",
            utility_account_evidence_url="s3://u.pdf",
            national_id_url="s3://n.pdf",
            site_inspection_consent_url="s3://c.pdf",
        )
        await session.commit()
    assert row.title_url
    assert row.site_inspection_consent_url


# ---- CHECK invariants -------------------------------------------------------


async def test_invalid_status_rejected_by_db():
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            HomeownerAuthority(
                user_id=user, title_url="s3://t.pdf", status="bogus"
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_pending_with_reviewer_set_violates_atomicity():
    """status='pending' but reviewer fields populated → DB rejects."""
    user = await _insert_user()
    reviewer = await _insert_user(role="admin")
    async with SessionLocal() as session:
        session.add(
            HomeownerAuthority(
                user_id=user,
                title_url="s3://t.pdf",
                status="pending",
                reviewed_at=__import__("datetime").datetime.now(
                    __import__("datetime").timezone.utc
                ),
                reviewed_by_user_id=reviewer,
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_terminal_without_reviewer_violates_atomicity():
    """status='verified' but reviewer fields NULL → DB rejects."""
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            HomeownerAuthority(
                user_id=user, title_url="s3://t.pdf", status="verified"
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


# ---- latest_for_user + has_verified ----------------------------------------


async def test_latest_for_user_returns_most_recent():
    user = await _insert_user()
    async with SessionLocal() as session:
        first = await ha_repo.submit(
            session, user_id=user, title_url="s3://first.pdf"
        )
        await session.commit()
        first_id = first.id

    # Newer submission strictly after — sleep to avoid clock-tie under
    # rapid test execution.
    import asyncio

    await asyncio.sleep(0.01)
    async with SessionLocal() as session:
        second = await ha_repo.submit(
            session, user_id=user, lease_url="s3://second.pdf"
        )
        await session.commit()
        second_id = second.id

    async with SessionLocal() as session:
        latest = await ha_repo.latest_for_user(session, user_id=user)
    assert latest is not None
    assert latest.id == second_id
    assert latest.id != first_id


async def test_latest_for_user_none_when_no_submissions():
    user = await _insert_user()
    async with SessionLocal() as session:
        assert await ha_repo.latest_for_user(session, user_id=user) is None


async def test_has_verified_false_when_pending():
    user = await _insert_user()
    async with SessionLocal() as session:
        await ha_repo.submit(session, user_id=user, title_url="s3://t.pdf")
        await session.commit()
    async with SessionLocal() as session:
        assert await ha_repo.has_verified(session, user_id=user) is False


async def test_has_verified_true_after_review_verified():
    user = await _insert_user()
    reviewer = await _insert_user(role="admin")
    async with SessionLocal() as session:
        row = await ha_repo.submit(session, user_id=user, title_url="s3://t.pdf")
        await session.commit()
        row_id = row.id

    async with SessionLocal() as session:
        await ha_repo.review(
            session,
            authority_id=row_id,
            reviewer_user_id=reviewer,
            new_status="verified",
            review_notes="docs check out",
        )
        await session.commit()

    async with SessionLocal() as session:
        assert await ha_repo.has_verified(session, user_id=user) is True


async def test_has_verified_false_when_latest_is_rejected():
    """A.7 case 1 doctrine gate: rejection blocks deployment even if an
    earlier row was verified."""
    user = await _insert_user()
    reviewer = await _insert_user(role="admin")

    # Resubmission scenario: first row gets verified, but a later
    # submission gets rejected. has_verified must follow the latest.
    async with SessionLocal() as session:
        first = await ha_repo.submit(session, user_id=user, title_url="s3://1.pdf")
        await session.commit()
        first_id = first.id

    async with SessionLocal() as session:
        await ha_repo.review(
            session,
            authority_id=first_id,
            reviewer_user_id=reviewer,
            new_status="verified",
        )
        await session.commit()

    import asyncio

    await asyncio.sleep(0.01)
    async with SessionLocal() as session:
        second = await ha_repo.submit(session, user_id=user, lease_url="s3://2.pdf")
        await session.commit()
        second_id = second.id

    async with SessionLocal() as session:
        await ha_repo.review(
            session,
            authority_id=second_id,
            reviewer_user_id=reviewer,
            new_status="rejected",
            review_notes="lease expired",
        )
        await session.commit()

    async with SessionLocal() as session:
        assert await ha_repo.has_verified(session, user_id=user) is False


# ---- review ----------------------------------------------------------------


async def test_review_pending_to_verified_stamps_reviewer():
    user = await _insert_user()
    reviewer = await _insert_user(role="admin")
    async with SessionLocal() as session:
        row = await ha_repo.submit(session, user_id=user, title_url="s3://t.pdf")
        await session.commit()
        row_id = row.id

    async with SessionLocal() as session:
        reviewed = await ha_repo.review(
            session,
            authority_id=row_id,
            reviewer_user_id=reviewer,
            new_status="verified",
            review_notes="ok",
        )
        await session.commit()
    assert reviewed.status == "verified"
    assert reviewed.reviewed_by_user_id == reviewer
    assert reviewed.reviewed_at is not None
    assert reviewed.review_notes == "ok"


async def test_review_already_terminal_raises():
    user = await _insert_user()
    reviewer = await _insert_user(role="admin")
    async with SessionLocal() as session:
        row = await ha_repo.submit(session, user_id=user, title_url="s3://t.pdf")
        await session.commit()
        row_id = row.id

    async with SessionLocal() as session:
        await ha_repo.review(
            session,
            authority_id=row_id,
            reviewer_user_id=reviewer,
            new_status="verified",
        )
        await session.commit()

    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="already"):
            await ha_repo.review(
                session,
                authority_id=row_id,
                reviewer_user_id=reviewer,
                new_status="rejected",
            )


async def test_review_rejects_non_terminal_target_status():
    user = await _insert_user()
    reviewer = await _insert_user(role="admin")
    async with SessionLocal() as session:
        row = await ha_repo.submit(session, user_id=user, title_url="s3://t.pdf")
        await session.commit()
        row_id = row.id

    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="terminal"):
            await ha_repo.review(
                session,
                authority_id=row_id,
                reviewer_user_id=reviewer,
                new_status="pending",  # type: ignore[arg-type]
            )


async def test_review_missing_row_raises():
    reviewer = await _insert_user(role="admin")
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="not found"):
            await ha_repo.review(
                session,
                authority_id=uuid.uuid4(),
                reviewer_user_id=reviewer,
                new_status="verified",
            )


# ---- review queue ----------------------------------------------------------


async def test_pending_review_queue_is_fifo():
    a = await _insert_user()
    b = await _insert_user()
    c = await _insert_user()
    async with SessionLocal() as session:
        await ha_repo.submit(session, user_id=a, title_url="s3://a.pdf")
        await session.commit()
    import asyncio

    await asyncio.sleep(0.01)
    async with SessionLocal() as session:
        await ha_repo.submit(session, user_id=b, title_url="s3://b.pdf")
        await session.commit()
    await asyncio.sleep(0.01)
    async with SessionLocal() as session:
        await ha_repo.submit(session, user_id=c, title_url="s3://c.pdf")
        await session.commit()

    async with SessionLocal() as session:
        queue = await ha_repo.pending_review_queue(session, limit=50)
    user_ids = [r.user_id for r in queue]
    # The three new users should appear in submission order (a before b
    # before c), filtered to just those we inserted.
    ordered_subset = [u for u in user_ids if u in (a, b, c)]
    assert ordered_subset == [a, b, c]


async def test_pending_review_queue_excludes_terminal():
    user = await _insert_user()
    reviewer = await _insert_user(role="admin")
    async with SessionLocal() as session:
        row = await ha_repo.submit(session, user_id=user, title_url="s3://t.pdf")
        await session.commit()
        row_id = row.id

    async with SessionLocal() as session:
        await ha_repo.review(
            session,
            authority_id=row_id,
            reviewer_user_id=reviewer,
            new_status="verified",
        )
        await session.commit()

    async with SessionLocal() as session:
        queue = await ha_repo.pending_review_queue(session)
    assert all(r.user_id != user for r in queue)
