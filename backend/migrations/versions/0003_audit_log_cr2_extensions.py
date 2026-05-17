"""audit_log CR-2 extensions + append-only triggers

Per BUILD_PLAN P0.3.1 and DONE_DEFINITION CR-2:
- adds columns actor_kind, before, after, reason, agent_attribution, surface
- keeps legacy columns (action, target_type, target_id, payload, at,
  actor_user_id) for back-compat with existing callers
- enforces append-only invariant via BEFORE UPDATE / BEFORE DELETE
  triggers that raise (the test_audit_immutability.py gate)

Reversibility: downgrade restores schema; data in new columns is
dropped (acceptable per DONE_DEFINITION D6 because these columns are
nullable and unused by anything outside this migration).

Revision ID: 0003_audit_log_cr2_extensions
Revises: 0002_onboarding_extensions
Create Date: 2026-05-17
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0003_audit_log_cr2_extensions"
down_revision: str | Sequence[str] | None = "0002_onboarding_extensions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


IMMUTABILITY_FN = """
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only (CR-2 / ADR 0001 / P9.1.20)';
END;
$$ LANGUAGE plpgsql;
"""

IMMUTABILITY_TRIGGER_UPDATE = """
CREATE TRIGGER audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
"""

IMMUTABILITY_TRIGGER_DELETE = """
CREATE TRIGGER audit_log_no_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
"""


def upgrade() -> None:
    op.add_column(
        "audit_log",
        sa.Column("actor_kind", sa.Text(), nullable=True),
    )
    op.add_column(
        "audit_log",
        sa.Column("before", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "audit_log",
        sa.Column("after", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "audit_log",
        sa.Column("reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "audit_log",
        sa.Column("agent_attribution", sa.Text(), nullable=True),
    )
    op.add_column(
        "audit_log",
        sa.Column("surface", sa.Text(), nullable=True),
    )
    op.create_check_constraint(
        "audit_log_actor_kind_check",
        "audit_log",
        "actor_kind IS NULL OR actor_kind IN ('user','agent','system')",
    )
    op.create_check_constraint(
        "audit_log_agent_attribution_when_agent",
        "audit_log",
        "actor_kind <> 'agent' OR agent_attribution IS NOT NULL",
    )
    op.create_index(
        "idx_audit_actor_at",
        "audit_log",
        ["actor_user_id", sa.text("at DESC")],
    )

    op.execute(IMMUTABILITY_FN)
    op.execute(IMMUTABILITY_TRIGGER_UPDATE)
    op.execute(IMMUTABILITY_TRIGGER_DELETE)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;")
    op.execute("DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;")
    op.execute("DROP FUNCTION IF EXISTS audit_log_immutable();")
    op.drop_index("idx_audit_actor_at", table_name="audit_log")
    op.drop_constraint("audit_log_agent_attribution_when_agent", "audit_log", type_="check")
    op.drop_constraint("audit_log_actor_kind_check", "audit_log", type_="check")
    op.drop_column("audit_log", "surface")
    op.drop_column("audit_log", "agent_attribution")
    op.drop_column("audit_log", "reason")
    op.drop_column("audit_log", "after")
    op.drop_column("audit_log", "before")
    op.drop_column("audit_log", "actor_kind")
