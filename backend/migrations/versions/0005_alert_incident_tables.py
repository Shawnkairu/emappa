"""alert + incident tables

P0.3.8 — alert: per-event row from the AI-native anomaly + alert
agents, ops health checks, settlement runner, etc. Severity drives
on-call escalation (AI-native §6).

P0.3.9 — incident: 1+ correlated alerts grouped under an investigation;
holds root cause + postmortem reference for the AI-native governance
loop's "evaluate" phase.

Both shapes mirror AlertRecord / IncidentRecord in
packages/shared/src/types.ts. The `incident_id` FK on alert is added
later (it's a back-reference; first the incident exists, then alerts
get linked). Stored as Text for now to keep the migration self-contained;
P0.3.13's agent_action FK will model the same pattern.

Reversibility: downgrade drops both tables. No other table FKs into
them at this revision.

Revision ID: 0005_alert_incident_tables
Revises: 0004_rbac_tables
Create Date: 2026-05-17
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_alert_incident_tables"
down_revision: str | Sequence[str] | None = "0004_rbac_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alert",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'open'")),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("owner_role", sa.Text(), nullable=False),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id"),
            nullable=True,
        ),
        sa.Column(
            "incident_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("remediation_status", sa.Text(), nullable=True),
        sa.Column(
            "ts",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "severity IN ('info','warning','critical','page')",
            name="alert_severity_check",
        ),
        sa.CheckConstraint(
            "status IN ('open','acknowledged','remediating','resolved')",
            name="alert_status_check",
        ),
        sa.CheckConstraint(
            "owner_role IN ('resident','homeowner','building_owner','provider',"
            "'financier','electrician','admin')",
            name="alert_owner_role_check",
        ),
    )
    op.create_index("idx_alert_status_severity", "alert", ["status", "severity"])
    op.create_index("idx_alert_building", "alert", ["building_id"])
    op.create_index("idx_alert_incident", "alert", ["incident_id"])
    op.create_index(
        "idx_alert_open_ts_desc",
        "alert",
        ["ts"],
        postgresql_where=sa.text("status = 'open'"),
    )

    op.create_table(
        "incident",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'open'")),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("postmortem_uri", sa.Text(), nullable=True),
        sa.Column(
            "opened_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("closed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint(
            "severity IN ('info','warning','critical','page')",
            name="incident_severity_check",
        ),
        sa.CheckConstraint(
            "status IN ('open','investigating','remediating','resolved','postmortem')",
            name="incident_status_check",
        ),
        sa.CheckConstraint(
            "(status = 'resolved' OR status = 'postmortem') = (closed_at IS NOT NULL)",
            name="incident_closed_at_atomic_check",
        ),
    )
    op.create_index("idx_incident_status_severity", "incident", ["status", "severity"])

    # Now backfill the alert.incident_id FK pointing at incident.id.
    op.create_foreign_key(
        "alert_incident_id_fkey",
        "alert",
        "incident",
        ["incident_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("alert_incident_id_fkey", "alert", type_="foreignkey")
    op.drop_index("idx_incident_status_severity", table_name="incident")
    op.drop_table("incident")
    op.drop_index("idx_alert_open_ts_desc", table_name="alert")
    op.drop_index("idx_alert_incident", table_name="alert")
    op.drop_index("idx_alert_building", table_name="alert")
    op.drop_index("idx_alert_status_severity", table_name="alert")
    op.drop_table("alert")
