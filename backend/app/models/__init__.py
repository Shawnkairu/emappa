"""SQLAlchemy ORM models. Schema mirrors migrations/versions/0001_pilot_baseline.py.

Single Base lives in app.db.session. All models inherit from it. Importing this
module ensures every model is registered with the metadata.
"""
from ..db.session import Base
from .admin import AdminAllowlist
from .alert import Alert
from .audit import AuditLog
from .building import Building
from .incident import Incident
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
    "Alert",
    "AuditLog",
    "Building",
    "Certification",
    "EnergyReading",
    "FinancierPosition",
    "Incident",
    "InventoryItem",
    "Job",
    "OtpCode",
    "PrepaidCommitment",
    "RbacClaim",
    "SettlementPeriod",
    "User",
    "WaitlistLead",
    "WalletTransaction",
]
