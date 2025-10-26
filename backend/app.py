# backend/app.py
"""
Argus-Core Production Backend
---------------------------------------
A robust FastAPI backend to store incidents and evidence clips, now with
user authentication and JWT support.
"""

import os
import shutil
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
import sys
import cv2
import numpy as np
import os.path as osp
import random
import traceback

# -----------------------------
# Config & DB
# -----------------------------
load_dotenv()  # Load environment variables from the .env file

API_KEY = os.getenv("ARGUS_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
STORAGE_DIR = os.getenv("STORAGE_DIR", "./storage")

if not API_KEY:
    raise RuntimeError("ARGUS_API_KEY not found in environment variables.")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in environment variables.")

os.makedirs(STORAGE_DIR, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# -----------------------------
# NEW: Security & Auth Config
# -----------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_in_your_env_file")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token expires in 24 hours

# Use a password hashing scheme that doesn't require native backends on Windows.
# pbkdf2_sha256 is pure Python and production-safe.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

if SECRET_KEY == "a_very_secret_key_that_should_be_in_your_env_file":
    print("WARNING: Using default SECRET_KEY. Please set a strong, random key in your .env file for production.")


# -----------------------------
# Models
# -----------------------------

# NEW: User Model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Integer, default=1)

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    rtsp_url = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    is_active = Column(Integer, default=1)
    incidents = relationship("Incident", back_populates="camera")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    score = Column(Float, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="detected")
    note = Column(Text, nullable=True)

    camera = relationship("Camera", back_populates="incidents")
    clips = relationship("Clip", back_populates="incident", cascade="all, delete-orphan")

class Clip(Base):
    __tablename__ = "clips"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    duration_seconds = Column(Float, nullable=True)

    incident = relationship("Incident", back_populates="clips")

# -----------------------------
# Schemas (for request/response validation)
# -----------------------------

# NEW: User and Token Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Existing Schemas
class ClipOut(BaseModel):
    id: int
    incident_id: int
    file_path: str
    uploaded_at: datetime
    duration_seconds: Optional[float]
    class Config:
        from_attributes = True
        
class IncidentOut(BaseModel):
    id: int
    camera_id: int
    event_type: str
    score: Optional[float]
    started_at: datetime
    ended_at: Optional[datetime]
    status: str
    note: Optional[str]
    clips: List[ClipOut] = []
    class Config:
        from_attributes = True
        
class IncidentCreate(BaseModel):
    camera_id: int
    event_type: str = Field(..., examples=["fight"])
    score: Optional[float] = Field(None, ge=0.0, le=1.0)
    started_at: datetime
    ended_at: Optional[datetime] = None

class CameraCreate(BaseModel):
    name: str
    rtsp_url: Optional[str] = None
    location: Optional[str] = None

class CameraOut(BaseModel):
    id: int
    name: str
    rtsp_url: Optional[str]
    location: Optional[str]
    is_active: int
    class Config:
        from_attributes = True

# -----------------------------
# Security Helpers & Dependencies
# -----------------------------
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
def get_user(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

# Dependency for API key auth (for edge client)
def require_api_key(x_api_key: Optional[str] = Header(None)):
    if API_KEY and x_api_key == API_KEY:
        return True
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key for edge client")

# Dependency for JWT auth (for web users)
async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# -----------------------------
# App & middleware
# -----------------------------
app = FastAPI(title="Argus-Core Backend", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# This needs to run to create the tables in the database
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Mount the datasets directory to serve videos
    datasets_dir = osp.abspath(osp.join(osp.dirname(__file__), '..', 'datasets'))
    app.mount("/datasets", StaticFiles(directory=datasets_dir), name="datasets")
    # Ensure we can import from src/ for simulation utilities
    project_root = osp.abspath(osp.join(osp.dirname(__file__), '..'))
    src_dir = osp.join(project_root, 'src')
    if src_dir not in sys.path:
        sys.path.append(src_dir)
    
# -----------------------------
# Routes
# -----------------------------

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

# --- NEW Authentication Routes ---
@app.post("/users/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token)
async def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user(db, email=form_data.username) # form_data.username is the email
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Edge Client Routes (Protected by API Key) ---

@app.post("/events", response_model=IncidentOut, status_code=201, dependencies=[Depends(require_api_key)])
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == payload.camera_id).first()
    if not cam:
        raise HTTPException(404, detail="camera not found")
    inc = Incident(**payload.dict())
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc

@app.post("/clips/upload", dependencies=[Depends(require_api_key)])
def upload_clip(incident_id: int = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    inc = db.query(Incident).get(incident_id)
    if not inc:
        raise HTTPException(404, detail="incident not found")
    incident_dir = os.path.join(STORAGE_DIR, f"incident_{incident_id}")
    os.makedirs(incident_dir, exist_ok=True)
    dest_path = os.path.join(incident_dir, file.filename)
    with open(dest_path, "wb") as out:
        shutil.copyfileobj(file.file, out)
    clip = Clip(incident_id=incident_id, file_path=dest_path)
    db.add(clip)
    db.commit()
    db.refresh(clip)
    return {"status": "success", "clip_id": clip.id}
    
# --- Web App Routes (Protected by User Login) ---

@app.get("/incidents", response_model=List[IncidentOut])
def list_incidents(db: Session = Depends(get_db), limit: int = 100, user: User = Depends(get_current_user)):
    from sqlalchemy.orm import joinedload
    incidents = db.query(Incident).options(joinedload(Incident.clips)).order_by(Incident.id.desc()).limit(limit).all()
    return incidents

@app.get("/incidents/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy.orm import joinedload
    inc = db.query(Incident).options(joinedload(Incident.clips)).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, detail="incident not found")
    return inc

@app.get("/cameras", response_model=List[CameraOut])
def list_cameras(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Camera).all()
    
@app.get("/clips/{clip_id}")
def download_clip(clip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    clip = db.query(Clip).get(clip_id)
    if not clip:
        raise HTTPException(404, detail="clip not found")
    if not os.path.exists(clip.file_path):
        raise HTTPException(410, detail="clip file missing")
    return FileResponse(path=clip.file_path, filename=os.path.basename(clip.file_path))

def _pick_random_video(base_dir: str = "datasets/ucf_crime") -> str:
    base_abs = osp.abspath(osp.join(osp.dirname(__file__), '..', base_dir))
    if not osp.exists(base_abs):
        return ""
    candidates = []
    for type_dir in os.listdir(base_abs): # This will be 'test' or 'train'
        type_dir_abs = osp.join(base_abs, type_dir)
        if not osp.isdir(type_dir_abs):
            continue
        for cls in os.listdir(type_dir_abs): # This will be 'Abuse', 'Arrest', etc.
            cls_dir = osp.join(type_dir_abs, cls)
            if not osp.isdir(cls_dir):
                continue
            for f in os.listdir(cls_dir):
                if f.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
                    candidates.append(osp.join(cls_dir, f))
    return random.choice(candidates) if candidates else ""

@app.get("/api/videos/random")
def get_random_video():
    video_path = _pick_random_video()
    if not video_path:
        raise HTTPException(404, detail="No test videos found under datasets/ucf_crime")
    
    # Convert the absolute path to a relative path that the frontend can use
    base_dir = osp.abspath(osp.join(osp.dirname(__file__), '..', 'datasets'))
    relative_path = osp.relpath(video_path, base_dir)
    
    # Replace backslashes with forward slashes for URL compatibility
    video_url = f"/datasets/{relative_path.replace('\\', '/')}"
    
    return {"video_url": video_url}

# --- Simulation Route: Analyze random dataset video for a camera ---


@app.post("/simulate/cameras/{camera_id}")
def simulate_camera_run(camera_id: int, send_email: bool = True, db: Session = Depends(get_db)):
    # Import ML bits lazily to avoid reload/import issues
    try:
        from src.anomaly_detection import predict_anomaly  # type: ignore
        from src.anomaly_config import ALERT_ANOMALY_CLASSES  # type: ignore
        from backend.video_storage import save_clip as save_clip_file  # type: ignore
        from backend.alert_service import send_alert as send_email_alert  # type: ignore
    except Exception as e:
        detail = f"Simulation not available: {e}. Ensure models/anomaly_classifier.pth exists and src imports work."
        print("[SIMULATE IMPORT ERROR]", detail)
        print(traceback.format_exc())
        raise HTTPException(500, detail=detail)

    # Ensure camera exists; create a demo one if missing
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        cam = Camera(id=camera_id, name=f"Demo Camera {camera_id}", location="Demo", is_active=1)
        db.add(cam)
        try:
            db.commit()
        except Exception:
            db.rollback()
            cam = db.query(Camera).filter(Camera.id == camera_id).first()

    video_path = _pick_random_video()
    if not video_path:
        raise HTTPException(404, detail="No test videos found under datasets/ucf_crime")

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video {video_path}")
    except Exception as e:
        print("[SIMULATE VIDEO ERROR]", e)
        print(traceback.format_exc())
        raise HTTPException(500, detail=str(e))

    frames_per_clip = 16
    frames_buffer = []
    alert_types = set()
    prob_seen = 0.0
    first_pred = None

    full_frames = []
    fps = cap.get(cv2.CAP_PROP_FPS) or 25

    # Process up to first 10 seconds to keep this endpoint responsive
    max_frames = int(fps * 10)
    processed = 0
    try:
        while processed < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            processed += 1
            full_frames.append(frame.copy())
            resized = cv2.resize(frame, (224, 224))
            frames_buffer.append(resized)
            if len(frames_buffer) == frames_per_clip:
                pred_cls, prob = predict_anomaly(frames_buffer)
                if first_pred is None:
                    first_pred = pred_cls
                    prob_seen = float(prob or 0.0)
                if pred_cls and pred_cls in ALERT_ANOMALY_CLASSES and (prob or 0.0) >= 0.5:
                    alert_types.add(pred_cls)
                frames_buffer.clear()
    except Exception as e:
        print("[SIMULATE INFER ERROR]", e)
        print(traceback.format_exc())
        raise HTTPException(500, detail=f"Inference failed: {e}")

    cap.release()

    incident_id = None
    clip_id = None
    saved_path = None

    if alert_types:
        # Create incident
        inc = Incident(
            camera_id=camera_id,
            event_type=", ".join(sorted(alert_types)),
            score=prob_seen,
            started_at=datetime.now(timezone.utc),
            status="detected",
        )
        db.add(inc)
        db.commit()
        db.refresh(inc)
        incident_id = inc.id

        # Save clip
        saved_path = save_clip_file(full_frames, base_filename=f"consolidated_evidence_{camera_id}_{incident_id}", fps=fps, location=f"Camera {camera_id}", confidence=prob_seen, event_type=inc.event_type)
        if saved_path:
            clip = Clip(incident_id=incident_id, file_path=saved_path)
            db.add(clip)
            db.commit()
            db.refresh(clip)
            clip_id = clip.id

        if send_email and saved_path:
            try:
                send_email_alert(saved_path, location=f"Camera {camera_id}", anomaly_type=inc.event_type)
            except Exception:
                pass

    return {
        "video": video_path,
        "first_prediction": first_pred,
        "probability": prob_seen,
        "alert_types": sorted(list(alert_types)),
        "incident_id": incident_id,
        "clip_id": clip_id,
        "saved_clip_path": saved_path,
    }