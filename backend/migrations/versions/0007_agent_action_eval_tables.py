"""agent_action + agent_eval_run tables

P0.3.13 — agent_action: AI-native §4 governance — every agent proposal
  lands here in `pending_admin_approval` state. The cockpit Agent Panel
  (P8) lists them; admin accept/reject transitions advance the row + link
  to an audit_log entry. CR-4: "no silent auto-approval".

P0.3.14 — agent_eval_run: AI-native §9 Phase 4. Per-version scorecard
  rows for the Eval Harness UI; regression_delta is the diff vs the
  previous run for the same (agent_id, agent_version).

Both proposal + scorecard payloads ride as JSONB to match AgentProposal /
AgentEvalRunRecord shapes in packages/shared/src/types.ts.

Reversibility: downgrade drops both tables. No other table FKs into them.

Revision ID: 0007_agent_action_eval_tables
Revises: 0006_scenario_a_tables
Create Date: 2026-05-17
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0007_agent_action_eval_tables"
down_revision: str | Sequence[str] | None = "0006_scenario_a_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_AGENT_IDS = ("drs", "lbrs", "settlement", "alert_triage", "eligibility")
_STATUSES = ("pending_admin_approval", "accepted", "rejected")


def upgrade() -> None:
    op.create_table(
        "agent_action",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("agent_id", sa.Text(), nullable=False),
        sa.Column("agent_version", sa.Text(), nullable=False),
        sa.Column("proposal", postgresql.JSONB(), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'pending_admin_approval'"),
        ),
        sa.Column(
            "audit_log_id",
            sa.BigInteger(),
            sa.ForeignKey("audit_log.id"),
            nullable=True,
        ),
        sa.Column(
            "decided_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("decided_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "agent_id IN (" + ",".join(f"'{a}'" for a in _AGENT_IDS) + ")",
            name="agent_action_agent_id_check",
        ),
        sa.CheckConstraint(
            "status IN (" + ",".join(f"'{s}'" for s in _STATUSES) + ")",
            name="agent_action_status_check",
        ),
        sa.CheckConstraint(
            "(status = 'pending_admin_approval' AND decided_by IS NULL "
            "AND decided_at IS NULL AND decision_reason IS NULL) "
            "OR (status <> 'pending_admin_approval' AND decided_by IS NOT NULL "
            "AND decided_at IS NOT NULL AND decision_reason IS NOT NULL)",
            name="agent_action_decision_atomicity",
        ),
    )
    op.create_index(
        "idx_agent_action_pending",
        "agent_action",
        ["agent_id", "created_at"],
        postgresql_where=sa.text("status = 'pending_admin_approval'"),
    )
    op.create_index(
        "idx_agent_action_decided",
        "agent_action",
        ["decided_at"],
        postgresql_where=sa.text("status <> 'pending_admin_approval'"),
    )

    op.create_table(
        "agent_eval_run",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("agent_id", sa.Text(), nullable=False),
        sa.Column("agent_version", sa.Text(), nullable=False),
        sa.Column(
            "scorecard",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "regression_delta",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("pass", sa.Boolean(), nullable=False),
        sa.Column(
            "ts",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "agent_id IN (" + ",".join(f"'{a}'" for a in _AGENT_IDS) + ")",
            name="agent_eval_run_agent_id_check",
        ),
    )
    op.create_index(
        "idx_agent_eval_agent_version_ts",
        "agent_eval_run",
        ["agent_id", "agent_version", sa.text("ts DESC")],
    )


def downgrade() -> None:
    op.drop_index("idx_agent_eval_agent_version_ts", table_name="agent_eval_run")
    op.drop_table("agent_eval_run")
    op.drop_index("idx_agent_action_decided", table_name="agent_action")
    op.drop_index("idx_agent_action_pending", table_name="agent_action")
    op.drop_table("agent_action")
