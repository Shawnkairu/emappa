"""rbac_claim + admin_allowlist tables

P0.3.3 — rbac_claim: time-bounded JWT scope grants (CR-7, ADR 0001 §4).
P0.3.4 — admin_allowlist: DB-side replacement for the env-var-only seed
list, so grants/revokes are audit-tracked and survive across deploys.

Schema notes:
- rbac_claim.subject_id is nullable to support agent / system subjects
  whose identity is a string (e.g. agent_id 'drs'); subject_kind
  disambiguates.
- rbac_claim.expires_at is NOT NULL — claims must have a TTL per ADR
  0001 §4. The TTL ceilings per class are enforced in app code, not
  the DB.
- admin_allowlist.granted_by FK is nullable for bootstrap rows seeded
  from EMAPPA_ADMIN_EMAILS at first deploy; later grants require an
  actor.

Reversibility: downgrade drops both tables; no other table FKs into
them yet so there are no cascade concerns at this revision.

Revision ID: 0004_rbac_tables
Revises: 0003_audit_log_cr2_extensions
Create Date: 2026-05-17
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0004_rbac_tables"
down_revision: str | Sequence[str] | None = "0003_audit_log_cr2_extensions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rbac_claim",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("subject_kind", sa.Text(), nullable=False),
        sa.Column("subject_id", sa.Text(), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("resource_kind", sa.Text(), nullable=True),
        sa.Column("resource_id", sa.Text(), nullable=True),
        sa.Column(
            "granted_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "granted_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("incident_id", sa.Text(), nullable=True),
        sa.Column("revoked_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "revoked_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("revoked_reason", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "subject_kind IN ('user','agent','system')",
            name="rbac_claim_subject_kind_check",
        ),
        sa.CheckConstraint(
            "expires_at > granted_at",
            name="rbac_claim_ttl_positive_check",
        ),
        # When revoked_at is set, revoked_by + revoked_reason must also be set.
        sa.CheckConstraint(
            "(revoked_at IS NULL AND revoked_by IS NULL AND revoked_reason IS NULL) "
            "OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL "
            "AND revoked_reason IS NOT NULL)",
            name="rbac_claim_revoke_atomicity_check",
        ),
    )
    op.create_index(
        "idx_rbac_claim_subject_active",
        "rbac_claim",
        ["subject_kind", "subject_id", "scope", "expires_at"],
    )
    op.create_index(
        "idx_rbac_claim_expiry",
        "rbac_claim",
        ["expires_at"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )

    op.create_table(
        "admin_allowlist",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column(
            "granted_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "granted_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("revoked_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "revoked_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("revoked_reason", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "(revoked_at IS NULL AND revoked_by IS NULL AND revoked_reason IS NULL) "
            "OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL "
            "AND revoked_reason IS NOT NULL)",
            name="admin_allowlist_revoke_atomicity_check",
        ),
    )
    # Lowercase email lookup index.
    op.execute(
        "CREATE UNIQUE INDEX idx_admin_allowlist_email_lower "
        "ON admin_allowlist (lower(email)) WHERE revoked_at IS NULL;"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_admin_allowlist_email_lower;")
    op.drop_table("admin_allowlist")
    op.drop_index("idx_rbac_claim_expiry", table_name="rbac_claim")
    op.drop_index("idx_rbac_claim_subject_active", table_name="rbac_claim")
    op.drop_table("rbac_claim")
