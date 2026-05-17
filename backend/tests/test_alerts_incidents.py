"""P0.3.8 + P0.3.9 — alert + incident repo + CHECK constraint coverage."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.session import SessionLocal, engine
from app.models.alert import Alert
from app.models.incident import Incident
from app.repos import alerts as alerts_repo
from app.repos import incidents as incidents_repo


async def _insert_building() -> uuid.UUID:
    """Create a minimal building row so alert.building_id FK is satisfiable."""
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO buildings (id, name, address, lat, lon, unit_count, "
                "kind, stage, data_source) "
                "VALUES (:id, :name, :addr, 0.0, 0.0, 1, 'apartment', 'listed', "
                "'synthetic')"
            ),
            {
                "id": new_id,
                "name": f"al-test-{new_id}",
                "addr": "test",
            },
        )
    return new_id


async def test_create_alert_minimal_fields():
    async with SessionLocal() as session:
        alert = await alerts_repo.create(
            session,
            severity="warning",
            source="settlement_runner",
            owner_role="admin",
        )
        await session.commit()
    assert isinstance(alert.id, uuid.UUID)
    assert alert.severity == "warning"
    assert alert.status == "open"
    assert alert.ts is not None


async def test_create_alert_rejects_blank_source():
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="alert source"):
            await alerts_repo.create(
                session, severity="info", source="   ", owner_role="admin"
            )


async def test_create_alert_invalid_severity_rejected_by_db():
    async with SessionLocal() as session:
        session.add(
            Alert(severity="bogus", source="x", owner_role="admin")
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_list_open_filters_by_building_and_severity():
    building_id = await _insert_building()
    async with SessionLocal() as session:
        await alerts_repo.create(
            session,
            severity="critical",
            source="t1",
            owner_role="admin",
            building_id=building_id,
        )
        await alerts_repo.create(
            session,
            severity="info",
            source="t2",
            owner_role="admin",
            building_id=building_id,
        )
        await alerts_repo.create(
            session, severity="page", source="t3", owner_role="admin"
        )
        await session.commit()

    async with SessionLocal() as session:
        critical_for_bldg = await alerts_repo.list_open(
            session, building_id=building_id, severity="critical"
        )
    assert len(critical_for_bldg) == 1
    assert critical_for_bldg[0].source == "t1"


async def test_mark_status_transitions_alert():
    async with SessionLocal() as session:
        alert = await alerts_repo.create(
            session, severity="info", source="t", owner_role="admin"
        )
        await session.commit()
        alert_id = alert.id

    async with SessionLocal() as session:
        updated = await alerts_repo.mark_status(
            session, alert_id=alert_id, status="resolved"
        )
        await session.commit()
    assert updated is not None
    assert updated.status == "resolved"


async def test_open_incident_and_link_alerts():
    async with SessionLocal() as session:
        a1 = await alerts_repo.create(
            session, severity="critical", source="x1", owner_role="admin"
        )
        a2 = await alerts_repo.create(
            session, severity="warning", source="x2", owner_role="admin"
        )
        incident = await incidents_repo.open_incident(session, severity="critical")
        linked = await incidents_repo.link_alerts(
            session, incident_id=incident.id, alert_ids=[a1.id, a2.id]
        )
        await session.commit()
    assert linked == 2

    async with SessionLocal() as session:
        fresh_a1 = await session.get(Alert, a1.id)
        fresh_a2 = await session.get(Alert, a2.id)
        assert fresh_a1.incident_id == incident.id
        assert fresh_a2.incident_id == incident.id


async def test_advance_to_resolved_sets_closed_at():
    async with SessionLocal() as session:
        incident = await incidents_repo.open_incident(session, severity="critical")
        await session.commit()
        incident_id = incident.id

    async with SessionLocal() as session:
        resolved = await incidents_repo.advance_status(
            session,
            incident_id=incident_id,
            status="resolved",
            root_cause="downstream API throttled",
        )
        await session.commit()
    assert resolved is not None
    assert resolved.closed_at is not None
    assert resolved.root_cause == "downstream API throttled"


async def test_advance_to_open_clears_closed_at():
    async with SessionLocal() as session:
        incident = await incidents_repo.open_incident(session, severity="info")
        await session.commit()
        incident_id = incident.id

    async with SessionLocal() as session:
        await incidents_repo.advance_status(
            session, incident_id=incident_id, status="resolved"
        )
        await session.commit()

    async with SessionLocal() as session:
        reopened = await incidents_repo.advance_status(
            session, incident_id=incident_id, status="investigating"
        )
        await session.commit()
    assert reopened is not None
    assert reopened.closed_at is None


async def test_closed_at_atomicity_constraint_blocks_inconsistent_state():
    """status='open' with closed_at NOT NULL violates the CHECK."""
    async with SessionLocal() as session:
        session.add(
            Incident(
                severity="info",
                status="open",
                closed_at=__import__("datetime").datetime.now(
                    __import__("datetime").timezone.utc
                ),
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_list_open_incidents_excludes_resolved():
    async with SessionLocal() as session:
        active = await incidents_repo.open_incident(session, severity="warning")
        resolved = await incidents_repo.open_incident(session, severity="info")
        await session.commit()
        resolved_id = resolved.id

    async with SessionLocal() as session:
        await incidents_repo.advance_status(
            session, incident_id=resolved_id, status="resolved"
        )
        await session.commit()

    async with SessionLocal() as session:
        open_incidents = await incidents_repo.list_open(session)
    ids = {i.id for i in open_incidents}
    assert active.id in ids
    assert resolved_id not in ids
