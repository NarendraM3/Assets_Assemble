from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_db, get_current_user
from app.core.security import create_access_token, decode_token
from app.models.user import User
from app.services.user import user_service, generate_temp_password, get_password_hash
from app.schemas.base import ApiResponse
from app.schemas.user import (
    UserLogin, TokenResponseData, UserResponse,
    ChangePasswordRequest, ForceChangePasswordRequest, ResetPasswordRequest
)
from app.email.email import email_service
from app.repositories.user import user_repository
from app.database import utcnow_str
from jose import JWTError
from typing import Dict, Any

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[TokenResponseData])
async def login(credentials: UserLogin, db=Depends(get_db)):
    data = await user_service.authenticate(credentials)
    return ApiResponse(
        success=True,
        message="Authentication successful",
        data=data,
    )


@router.post("/logout", response_model=ApiResponse[None])
async def logout(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        message="Sign out successful",
    )


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_me(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        message="Profile retrieved successfully",
        data=UserResponse.model_validate(current_user),
    )


@router.post("/change-password", response_model=ApiResponse[None])
async def change_password(
    request: ChangePasswordRequest,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await user_service.change_password(current_user, request.old_password, request.new_password)
    return ApiResponse(
        success=True,
        message="Password updated successfully",
    )


@router.post("/force-change-password", response_model=ApiResponse[None])
async def force_change_password(
    request: ForceChangePasswordRequest,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await user_service.force_change_password(current_user, request.new_password)
    return ApiResponse(
        success=True,
        message="Temporary password replaced successfully. Welcome aboard!",
    )


@router.post("/forgot-password", response_model=ApiResponse[None])
async def forgot_password(request: ResetPasswordRequest, db=Depends(get_db)):
    user = await user_repository.get_by_email(request.email)
    if not user:
        raise HTTPException(status_code=404, detail="Email is not registered")

    temp_pwd = generate_temp_password()
    await user_repository.update(user.id, {
        "password_hash": get_password_hash(temp_pwd),
        "must_change_password": True,
        "updated_at": utcnow_str(),
    })

    await email_service.send_temporary_password_email(
        name=user.name,
        email=user.email,
        temp_password=temp_pwd,
        role=user.role,
        login_url="http://localhost:8080/login",
    )

    return ApiResponse(
        success=True,
        message="Reset instructions and temporary password dispatched",
    )


@router.post("/refresh", response_model=ApiResponse[Dict[str, str]])
async def refresh_token(payload: Dict[str, str], db=Depends(get_db)):
    refresh = payload.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=400, detail="Refresh token required")

    claims = decode_token(refresh)
    if not claims or claims.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = claims.get("sub")
    access = create_access_token(subject=user_id)

    return ApiResponse(
        success=True,
        message="Access token refreshed",
        data={"access_token": access, "token_type": "bearer"},
    )
