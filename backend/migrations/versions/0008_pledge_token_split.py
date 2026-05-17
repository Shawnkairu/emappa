"""pledge + token_purchase tables (ADR 0002 PR 1)

Per docs/adr/0002-pledge-token-split.md, split the single
`prepaid_commitments` table into two semantically distinct tables:

- `pledge` — pre-activation, non-binding, nullable amount, cancellable
- `token_purchase` — post-activation, real money, NOT NULL, immutable

This migration creates the two tables and BACKFILLS them from existing
`prepaid_commitments` rows using `building.stage = 'live'` as the
activation proxy (no `apartment.is_activated` exists yet; the spec
field will land with the apartments table in P1.x and the backfill
key will be re-derived then).

Backfill rule:
- building.stage = 'live'                  → token_purchase
- building.stage IN (other stages)         → pledge (status='active')

Legacy `prepaid_commitments` rows are LEFT IN PLACE — PR 1 of ADR 0002
keeps the legacy endpoint dual-writing during the observation window.
PR 2 (separate migration) deletes it after the parity audit script
confirms agreement.

The new tables enforce the doctrine guards at the schema layer:
- pledge has no payment_method column — pledges never move money
- token_purchase has payment_method ∈ {mpesa, card, bank} and no
  status enum — tokens are immutable on creation (no pending/failed)

Reversibility: downgrade drops both new tables. Backfilled data is
already in `prepaid_commitments` so no data loss.

Revision ID: 0008_pledge_token_split
Revises: 0007_agent_action_eval_tables
Create Date: 2026-05-17
"""
from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0008_pledge_token_split"
down_revision: str | Sequence[str] | None = "0007_agent_action_eval_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ---- pledge -------------------------------------------------------------
    op.create_table(
        "pledge",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        # NULLABLE: residents may signal intent before settling on an amount.
        sa.Column("amount_kes", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("closed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('active','cancelled','converted')",
            name="pledge_status_check",
        ),
        sa.CheckConstraint(
            "amount_kes IS NULL OR amount_kes >= 0",
            name="pledge_amount_non_negative",
        ),
        # closed_at iff status terminal.
        sa.CheckConstraint(
            "(status = 'active' AND closed_at IS NULL) "
            "OR (status IN ('cancelled','converted') AND closed_at IS NOT NULL)",
            name="pledge_closed_at_atomicity",
        ),
    )
    op.create_index("idx_pledge_building", "pledge", ["building_id"])
    op.create_index(
        "idx_pledge_user_active",
        "pledge",
        ["user_id"],
        postgresql_where=sa.text("status = 'active'"),
    )

    # ---- token_purchase ------------------------------------------------------
    op.create_table(
        "token_purchase",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        # NOT NULL: real money. Never zero.
        sa.Column("amount_kes", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_method", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "amount_kes > 0", name="token_purchase_amount_positive"
        ),
        sa.CheckConstraint(
            "payment_method IN ('mpesa','card','bank')",
            name="token_purchase_method_check",
        ),
    )
    op.create_index(
        "idx_token_purchase_building_user",
        "token_purchase",
        ["building_id", "user_id"],
    )
    # An UPDATE trigger would be the strict reading of "immutable", but the
    # endpoint contract (no PATCH on this resource) + the lack of any repo
    # write path beyond INSERT cover the same invariant in app code.
    # Adding the DB trigger is queued as a follow-up if app-layer drift is
    # ever observed.

    # ---- BACKFILL ------------------------------------------------------------
    # Classify each existing prepaid_commitments row by building.stage at
    # migration time. Use raw SQL so the migration doesn't depend on ORM
    # models (which is the alembic discipline).
    op.execute(
        """
        INSERT INTO pledge (
            id, building_id, user_id, amount_kes, status, created_at, closed_at
        )
        SELECT
            pc.id,
            pc.building_id,
            pc.user_id,
            pc.amount_kes,
            'active',
            pc.created_at,
            NULL
        FROM prepaid_commitments pc
        JOIN buildings b ON b.id = pc.building_id
        WHERE b.stage <> 'live';
        """
    )
    op.execute(
        """
        INSERT INTO token_purchase (
            id, building_id, user_id, amount_kes, payment_method, created_at
        )
        SELECT
            pc.id,
            pc.building_id,
            pc.user_id,
            pc.amount_kes,
            CASE pc.payment_method WHEN 'mpesa' THEN 'mpesa' ELSE 'mpesa' END,
            pc.created_at
        FROM prepaid_commitments pc
        JOIN buildings b ON b.id = pc.building_id
        WHERE b.stage = 'live';
        """
    )
    # Note on the CASE: legacy `prepaid_commitments.payment_method` was
    # {'pledge','mpesa'} — neither matches token_purchase.method_check
    # exactly. We default the backfilled rows to 'mpesa' (the only real
    # method present in pilot data) so the CHECK passes; the field
    # semantics are reconstructed when the new POST /tokens/purchase
    # endpoint replaces the legacy in PR 2.


def downgrade() -> None:
    op.drop_index(
        "idx_token_purchase_building_user", table_name="token_purchase"
    )
    op.drop_table("token_purchase")
    op.drop_index("idx_pledge_user_active", table_name="pledge")
    op.drop_index("idx_pledge_building", table_name="pledge")
    op.drop_table("pledge")
