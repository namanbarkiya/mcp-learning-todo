from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.services.csv_service import CSVService
from app.core.security import verify_password, get_password_hash, create_access_token, verify_token
from datetime import timedelta
from app.core.config import settings

router = APIRouter()
security = HTTPBearer()
csv_service = CSVService()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get the current authenticated user."""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = csv_service.get_user_by_username(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    try:
        # Hash the password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user data
        user_dict = {
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": hashed_password
        }
        
        # Create user in CSV
        created_user = csv_service.create_user(user_dict)
        
        # Return user without password hash
        return UserResponse(
            id=created_user["id"],
            username=created_user["username"],
            email=created_user["email"],
            created_at=created_user["created_at"],
            last_login=created_user["last_login"],
            preferences=eval(created_user["preferences"]) if isinstance(created_user["preferences"], str) else created_user["preferences"]
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """Login user and return access token."""
    # Get user from CSV
    user = csv_service.get_user_by_username(user_credentials.username)
    
    if not user or not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    # Update last login
    csv_service.update_user(user["id"], {"last_login": "2024-01-01T00:00:00Z"})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        created_at=current_user["created_at"],
        last_login=current_user["last_login"],
        preferences=eval(current_user["preferences"]) if isinstance(current_user["preferences"], str) else current_user["preferences"]
    )
