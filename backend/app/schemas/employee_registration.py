from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

SUPPORTED_ROLES = {"employee", "it_support_team", "asset_manager", "admin"}

class AdminEmployeeRegistration(BaseModel):
    FirstName: str
    LastName: str
    Email: EmailStr
    Role: str
    Department: Optional[str] = None
    Location: Optional[str] = None
    Designation: Optional[str] = None
    Phone: Optional[str] = None
    Manager: Optional[str] = None
    JoinDate: Optional[str] = None
    AllocationDate: Optional[str] = None
    AllocationTime: Optional[str] = None
    RequiredHardwareCategory: Optional[str] = None
    Status: str = "Active"

    @field_validator("Role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        role_lower = v.lower().replace(" ", "_")
        if role_lower not in SUPPORTED_ROLES:
            raise ValueError(
                f"Role '{v}' is not supported. Must be one of: {', '.join(sorted(SUPPORTED_ROLES))}"
            )
        return role_lower


class RegistrationResponse(BaseModel):
    EmployeeId: str
    TemporaryPassword: str
    Note: Optional[str] = None
