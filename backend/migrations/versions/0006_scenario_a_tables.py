"""apartment_ats_state + capacity_queue + load_profile (Scenario A backbone)

P0.3.10 — apartment_ats_state: 8-state per-apartment ATS machine
  (Scenario A §2.1). No per-apartment table exists yet, so we key by
  (building_id, apartment_label) — apartment_label matches the free-form
  string residents enter at onboarding step 5. A future migration will
  introduce `apartments` and add the FK.

P0.3.11 — capacity_queue: 7-state queue (Scenario A §6.2). The status
  enum mirrors CapacityQueueStatus in packages/shared/src/types.ts.
  priority_factors is a TEXT[] so the spec's 4 factors (pledge_amount,
  load_profile_fit, early_signup, geographic_cluster) can be enumerated
  per row without a sidecar table.

P0.3.12 — load_profile: L1/L2/L3 capture (Scenario A §7). appliances
  stored as JSONB so the spec's mixed structure ({name, watts, hours})
  rides one column.

Reversibility: downgrade drops the 3 tables in reverse FK order. No
existing tables FK into these.

Revision ID: 0006_scenario_a_tables
Revises: 0005_alert_incident_tables
Create Date: 2026-05-17
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0006_scenario_a_tables"
down_revision: str | Sequence[str] | None = "0005_alert_incident_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_ATS_STATES = (
    "pre_install",
    "installed_not_activated",
    "active_solar",
    "active_kplc",
    "throttled",
    "isolated",
    "fault",
    "suspended",
)

_QUEUE_STATES = (
    "interested",
    "pledged",
    "capacity_review",
    "capacity_cleared",
    "queued",
    "waitlisted",
    "activated",
)


def upgrade() -> None:
    # ---- apartment_ats_state -------------------------------------------------
    op.create_table(
        "apartment_ats_state",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("apartment_label", sa.Text(), nullable=False),
        sa.Column(
            "state",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'pre_install'"),
        ),
        sa.Column("last_transition_reason", sa.Text(), nullable=True),
        sa.Column(
            "last_transition_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "building_id", "apartment_label", name="uq_ats_building_apartment"
        ),
        sa.CheckConstraint(
            "state IN (" + ",".join(f"'{s}'" for s in _ATS_STATES) + ")",
            name="apartment_ats_state_check",
        ),
    )
    op.create_index(
        "idx_ats_building_state",
        "apartment_ats_state",
        ["building_id", "state"],
    )

    # ---- capacity_queue -----------------------------------------------------
    op.create_table(
        "capacity_queue",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'interested'"),
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "priority_factors",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("ARRAY[]::text[]"),
        ),
        sa.Column(
            "joined_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("cleared_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("activated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "building_id", "user_id", name="uq_capacity_queue_building_user"
        ),
        sa.CheckConstraint(
            "status IN (" + ",".join(f"'{s}'" for s in _QUEUE_STATES) + ")",
            name="capacity_queue_status_check",
        ),
        sa.CheckConstraint("position > 0", name="capacity_queue_position_positive"),
    )
    op.create_index(
        "idx_capacity_queue_building_pos",
        "capacity_queue",
        ["building_id", "position"],
    )

    # ---- load_profile -------------------------------------------------------
    op.create_table(
        "load_profile",
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
        sa.Column("level", sa.Text(), nullable=False),
        sa.Column(
            "appliances",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("daytime_kwh", sa.Numeric(10, 3), nullable=False),
        sa.Column("evening_kwh", sa.Numeric(10, 3), nullable=False),
        sa.Column("receipt_url", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=False),
        sa.Column(
            "captured_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "level IN ('L1','L2','L3')", name="load_profile_level_check"
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="load_profile_confidence_range",
        ),
        sa.CheckConstraint(
            "daytime_kwh >= 0 AND evening_kwh >= 0",
            name="load_profile_kwh_non_negative",
        ),
    )
    op.create_index("idx_load_profile_user", "load_profile", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_load_profile_user", table_name="load_profile")
    op.drop_table("load_profile")
    op.drop_index("idx_capacity_queue_building_pos", table_name="capacity_queue")
    op.drop_table("capacity_queue")
    op.drop_index("idx_ats_building_state", table_name="apartment_ats_state")
    op.drop_table("apartment_ats_state")
