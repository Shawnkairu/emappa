"""homeowner_authority — title/lease/ID + status (P2.6.6)

Per Scenario C §6 step 5 ("Authority verification — upload title/lease/owner
authorization, utility account evidence, national ID, site inspection
consent") and Reference Appendix A.7 case 1 (homeowner-does-not-control-
property must block the initiate-project gate).

Schema choices:
- Append-only: every (re-)submission is a new row keyed by user_id + ordered
  by submitted_at. Repos read the latest. Captures resubmit-after-rejection
  history without sidecar table; audit_log still attributes review actions.
- Authority proof is one of (title_url, lease_url, owner_authorization_url):
  a row that ships without ANY of these has no ownership claim and the DB
  rejects it via CHECK. The other doc fields (utility evidence, national ID,
  consent) are optional at INSERT time and can be added on resubmission.
- status ∈ {pending, verified, rejected, more_info_required}. The atomicity
  CHECKs make (status='pending' ↔ reviewed_at IS NULL ↔ reviewer NULL) and
  the converse for terminal states. Admins set status via P2.6.x endpoints
  that ship later (this PR is the storage half only).

P2.6.1 (POST /homeowner/{id}/authority-docs) ships next and writes through
this table. P2.6.4 (POST /homeowner/{id}/initiate-project) reads it to
gate DRS start: a homeowner with no verified row gets 409.

Reversibility: downgrade drops the table. No table FKs into it yet
(P2.6.4 will reference it by user_id, not by row id).

Revision ID: 0009_homeowner_authority
Revises: 0008_pledge_token_split
Create Date: 2026-05-17
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0009_homeowner_authority"
down_revision: str | Sequence[str] | None = "0008_pledge_token_split"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "homeowner_authority",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title_url", sa.Text(), nullable=True),
        sa.Column("lease_url", sa.Text(), nullable=True),
        sa.Column("owner_authorization_url", sa.Text(), nullable=True),
        sa.Column("utility_account_evidence_url", sa.Text(), nullable=True),
        sa.Column("national_id_url", sa.Text(), nullable=True),
        sa.Column("site_inspection_consent_url", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column(
            "submitted_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("reviewed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "reviewed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.CheckConstraint(
            "status IN ('pending','verified','rejected','more_info_required')",
            name="homeowner_authority_status_check",
        ),
        # At least one ownership-proof doc must be present.
        sa.CheckConstraint(
            "title_url IS NOT NULL "
            "OR lease_url IS NOT NULL "
            "OR owner_authorization_url IS NOT NULL",
            name="homeowner_authority_ownership_proof_required",
        ),
        # reviewed_at set iff status terminal.
        sa.CheckConstraint(
            "(status = 'pending' AND reviewed_at IS NULL) "
            "OR (status IN ('verified','rejected','more_info_required') "
            "    AND reviewed_at IS NOT NULL)",
            name="homeowner_authority_reviewed_at_atomicity",
        ),
        # reviewer FK set iff reviewed_at set.
        sa.CheckConstraint(
            "(reviewed_at IS NULL AND reviewed_by_user_id IS NULL) "
            "OR (reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)",
            name="homeowner_authority_reviewer_atomicity",
        ),
    )
    op.create_index(
        "idx_homeowner_authority_user_submitted",
        "homeowner_authority",
        ["user_id", sa.text("submitted_at DESC")],
    )
    # Partial index for the admin review queue (Scenario C §6 + A.7 case 1).
    op.create_index(
        "idx_homeowner_authority_pending",
        "homeowner_authority",
        ["submitted_at"],
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index(
        "idx_homeowner_authority_pending", table_name="homeowner_authority"
    )
    op.drop_index(
        "idx_homeowner_authority_user_submitted",
        table_name="homeowner_authority",
    )
    op.drop_table("homeowner_authority")
