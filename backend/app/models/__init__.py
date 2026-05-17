"""SQLAlchemy ORM models. Schema mirrors migrations/versions/0001_pilot_baseline.py.

Single Base lives in app.db.session. All models inherit from it. Importing this
module ensures every model is registered with the metadata.
"""
from ..db.session import Base
from .admin import AdminAllowlist
from .agent_action import AgentAction
from .agent_eval import AgentEvalRun
from .alert import Alert
from .ats import ApartmentAtsState
from .audit import AuditLog
from .building import Building
from .capacity_queue import CapacityQueue
from .incident import Incident
from .load_profile import LoadProfile
from .rbac import RbacClaim
from .certification import Certification
from .energy import EnergyReading
from .financier import FinancierPosition
from .inventory import InventoryItem
from .job import Job
from .prepaid import PrepaidCommitment
from .settlement import SettlementPeriod
from .user import OtpCode, User
from .wallet import WalletTransaction
from .waitlist import WaitlistLead

__all__ = [
    "Base",
    "AdminAllowlist",
    "AgentAction",
    "AgentEvalRun",
    "Alert",
    "ApartmentAtsState",
    "AuditLog",
    "Building",
    "CapacityQueue",
    "Certification",
    "EnergyReading",
    "FinancierPosition",
    "Incident",
    "InventoryItem",
    "Job",
    "LoadProfile",
    "OtpCode",
    "PrepaidCommitment",
    "RbacClaim",
    "SettlementPeriod",
    "User",
    "WaitlistLead",
    "WalletTransaction",
]
