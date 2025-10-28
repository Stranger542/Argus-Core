# backend/app.py
"""
Argus-Core Production Backend
---------------------------------------
A robust FastAPI backend to store incidents and evidence clips, now with
user authentication and JWT support. Includes a dedicated detection endpoint.
Version: 0.2.3 (Corrected Syntax)
"""

import os
import shutil
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import sys
import cv2
import numpy as np
import os.path as osp # <-- CORRECT Import alias
import random
import traceback
import json

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
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import joinedload # <-- Moved import to top
from src.utils import AnomalyConfidenceQueue # Import the queue utility

# -----------------------------
# Config & DB
# -----------------------------
load_dotenv()
API_KEY = os.getenv("ARGUS_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
STORAGE_DIR = os.getenv("STORAGE_DIR", "./storage")

if not API_KEY:
    raise RuntimeError("ARGUS_API_KEY not found in environment variables.")

# If DATABASE_URL isn't set or points to a PostgreSQL instance that may be
# unavailable during local development, fall back to a local sqlite DB so
# the app can start. This is a temporary convenience for developers; restore
# the original DATABASE_URL to re-enable Postgres.
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set. Falling back to local sqlite for development.")
    DATABASE_URL = "sqlite:///./argus_core_dev.db"
else:
    # If DATABASE_URL looks like Postgres, temporarily switch to sqlite to avoid
    # connection failures while developing locally. This keeps the rest of the
    # code unchanged and can be reverted by setting DATABASE_URL in your env.
    lower = DATABASE_URL.lower()
    if lower.startswith("postgres://") or lower.startswith("postgresql://") or "postgres" in lower:
        print("WARNING: DATABASE_URL appears to be PostgreSQL. Temporarily switching to local sqlite for development to avoid connection issues.")
        DATABASE_URL = "sqlite:///./argus_core_dev.db"

os.makedirs(STORAGE_DIR, exist_ok=True)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# -----------------------------
# Security & Auth Config
# -----------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_in_your_env_file")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
if SECRET_KEY == "a_very_secret_key_that_should_be_in_your_env_file":
    print("WARNING: Using default SECRET_KEY.")

# -----------------------------
# Models (User, Camera, Incident, Clip)
# -----------------------------
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
    event_type = Column(String(255), nullable=False) # Increased length
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
# Schemas
# -----------------------------
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: int
    class Config:
        from_attributes = True # <-- FIX: Correct syntax for Pydantic v2

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ClipOut(BaseModel):
    id: int
    incident_id: int
    file_path: str
    uploaded_at: datetime
    duration_seconds: Optional[float]
    class Config:
        from_attributes = True # <-- FIX: Correct syntax

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
        from_attributes = True # <-- FIX: Correct syntax

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
        from_attributes = True # <-- FIX: Correct syntax

class DetectRequest(BaseModel):
    video_url: str

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
        # Default expiration from config
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key for edge client"
    )

# Dependency for JWT auth (for web users)
async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try: # <-- FIX: Correct indentation and added except block
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError: # <-- FIX: Added except block
        raise credentials_exception

    user = get_user(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# -----------------------------
# App & middleware
# -----------------------------
app = FastAPI(title="Argus-Core Backend", version="0.2.3") # Version bump
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine) # Ensure tables exist
    datasets_dir = osp.abspath(osp.join(osp.dirname(__file__), '..', 'datasets'))
    if not osp.isdir(datasets_dir):
        print(f"WARNING: Datasets directory not found at {datasets_dir}. Video serving/detection might fail.")
    else:
        # Mount datasets dir to serve videos
        app.mount("/datasets", StaticFiles(directory=datasets_dir), name="datasets")
    # Add src directory to path for imports within endpoints
    project_root = osp.abspath(osp.join(osp.dirname(__file__), '..'))
    src_dir = osp.join(project_root, 'src')
    if src_dir not in sys.path:
        sys.path.append(src_dir)
    print("Startup complete. Static files mounted if datasets dir exists.")

# -----------------------------
# Routes
# -----------------------------

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

# --- Authentication Routes ---
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
    # Keep authentication active
    return current_user

# --- Edge Client Routes (API Key) ---
@app.post("/events", response_model=IncidentOut, status_code=201, dependencies=[Depends(require_api_key)])
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == payload.camera_id).first()
    if not cam:
        raise HTTPException(404, detail="camera not found")
    # Explicitly map fields to avoid issues if schemas diverge
    inc = Incident(
        camera_id=payload.camera_id,
        event_type=payload.event_type,
        score=payload.score,
        started_at=payload.started_at,
        ended_at=payload.ended_at
        # status and note have defaults or are nullable
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    # Reload with clips relationship for response model
    db.refresh(inc, attribute_names=['clips'])
    return inc

@app.post("/clips/upload", dependencies=[Depends(require_api_key)])
def upload_clip(incident_id: int = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    inc = db.query(Incident).get(incident_id)
    if not inc:
        raise HTTPException(404, detail="incident not found")
    incident_dir = osp.join(STORAGE_DIR, f"incident_{incident_id}")
    os.makedirs(incident_dir, exist_ok=True)
    # Sanitize filename (optional but recommended)
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in ('-', '_', '.'))
    dest_path = osp.join(incident_dir, safe_filename)
    try:
        with open(dest_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    clip = Clip(incident_id=incident_id, file_path=dest_path)
    db.add(clip)
    db.commit()
    db.refresh(clip)
    return {"status": "success", "clip_id": clip.id}


# Endpoint to receive single image/frame blobs from edge clients
@app.post("/frames/upload", dependencies=[Depends(require_api_key)])
async def upload_frame(camera_id: int = Form(...), timestamp: Optional[str] = Form(None), file: UploadFile = File(...)):
    """
    Receive a single image/frame as an UploadFile. Protected by API key dependency for edge clients.
    Logs reception time and saves the frame under STORAGE_DIR/camera_{camera_id}/
    """
    try:
        contents = await file.read()
        # log reception
        now_iso = datetime.now(timezone.utc).isoformat()
        print(f"Got a frame at {now_iso}")

        # ensure camera directory exists
        cam_dir = osp.join(STORAGE_DIR, f"camera_{camera_id}")
        os.makedirs(cam_dir, exist_ok=True)
        filename = f"frame_{int(datetime.now(timezone.utc).timestamp())}_{file.filename}"
        dest_path = osp.join(cam_dir, filename)
        with open(dest_path, "wb") as out:
            out.write(contents)

        # Optionally attempt to decode for sanity using OpenCV
        decoded = False
        try:
            arr = np.frombuffer(contents, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                decoded = True
        except Exception:
            decoded = False

        return {"status": "received", "path": dest_path, "decoded": decoded, "received_at": now_iso}
    except Exception as e:
        print("Error receiving frame:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Development helper: same as /frames/upload but without API key requirement
@app.post("/frames/upload-dev")
async def upload_frame_dev(camera_id: int = Form(...), timestamp: Optional[str] = Form(None), file: UploadFile = File(...)):
    """
    Development-only endpoint: receives a single image/frame without requiring an API key.
    Useful for debugging client-side uploads during local development.
    """
    try:
        contents = await file.read()
        now_iso = datetime.now(timezone.utc).isoformat()
        print(f"[DEV] Got a frame at {now_iso}")

        cam_dir = osp.join(STORAGE_DIR, f"camera_{camera_id}")
        os.makedirs(cam_dir, exist_ok=True)
        filename = f"dev_frame_{int(datetime.now(timezone.utc).timestamp())}_{file.filename}"
        dest_path = osp.join(cam_dir, filename)
        with open(dest_path, "wb") as out:
            out.write(contents)

        decoded = False
        try:
            arr = np.frombuffer(contents, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                decoded = True
        except Exception:
            decoded = False
            print("Failed to decode dev frame for sanity check.")

        return {"status": "received", "path": dest_path, "decoded": decoded, "received_at": now_iso}
    except Exception as e:
        print("Error receiving dev frame:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# --- Web App Routes (Protected by User Login) ---

# --- Web App Data Routes (User Login) ---
@app.get("/incidents", response_model=List[IncidentOut])
def list_incidents(db: Session = Depends(get_db), limit: int = 100, user: User = Depends(get_current_user)): # Keep auth
    incidents = db.query(Incident).options(joinedload(Incident.clips)).order_by(Incident.id.desc()).limit(limit).all()
    return incidents

@app.get("/incidents/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)): # Keep auth
    inc = db.query(Incident).options(joinedload(Incident.clips)).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, detail="incident not found")
    return inc

@app.get("/cameras", response_model=List[CameraOut])
def list_cameras(db: Session = Depends(get_db), user: User = Depends(get_current_user)): # Keep auth
    return db.query(Camera).all()

@app.get("/clips/{clip_id}")
def download_clip(clip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)): # Keep auth
    clip = db.query(Clip).get(clip_id)
    if not clip:
        raise HTTPException(404, detail="clip not found")
    if not osp.exists(clip.file_path):
        raise HTTPException(410, detail="clip file missing")
    return FileResponse(path=clip.file_path, filename=osp.basename(clip.file_path))

# --- Video Serving Route ---
def _pick_random_video(base_dir: str = "datasets/ucf_crime") -> str:
    # Safely finds a random video file within the specified base directory
    base_abs = osp.abspath(osp.join(osp.dirname(__file__), '..', base_dir))
    if not osp.exists(base_abs): return ""
    candidates = []
    for root, _, files in os.walk(base_abs): # Walk through all subdirectories
        for f in files:
            if f.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
                candidates.append(osp.join(root, f))
    return random.choice(candidates) if candidates else ""

@app.get("/api/videos/random") # Publicly accessible for now
def get_random_video():
    video_path = _pick_random_video()
    if not video_path:
        raise HTTPException(404, detail="No videos found under datasets/ucf_crime")

    # Correctly create relative URL for frontend
    base_dir = osp.abspath(osp.join(osp.dirname(__file__), '..', 'datasets'))
    relative_path = osp.relpath(video_path, base_dir)
    video_url = f"/datasets/{relative_path.replace(os.sep, '/')}"
    return {"video_url": video_url}

# --- IMPROVED Endpoint for Detection (User Login Required) ---
@app.post("/api/detect", dependencies=[Depends(get_current_user)]) # Keep auth
def run_detection_on_video(
    request: DetectRequest,
    db: Session = Depends(get_db) # Keep db
):
    try:
        # Lazy imports for ML components
        from src.anomaly_detection import predict_anomaly
        from src.anomaly_config import ALERT_ANOMALY_CLASSES
    except ImportError as e: raise HTTPException(500, detail=f"Detection components missing: {e}")
    except Exception as e: raise HTTPException(500, detail=f"Import error: {e}")

    # --- Configuration similar to main.py ---
    ALERT_CONFIDENCE_THRESHOLD = 0.5 # Minimum probability threshold
    MIN_HITS_FOR_ALERT = 3         # Minimum consecutive high-confidence clips
    FRAMES_PER_CLIP = 16           # Frames per ML prediction

    # Validate and construct absolute path
    # ... (path construction logic remains the same) ...
    if not request.video_url.startswith("/datasets/"): raise HTTPException(400, detail="Invalid video URL.")
    base_datasets_dir = osp.abspath(osp.join(osp.dirname(__file__), '..', 'datasets'))
    relative_path = request.video_url.partition('/datasets/')[-1]
    if not relative_path: raise HTTPException(400, detail="Invalid video URL path.")
    absolute_video_path = osp.normpath(osp.join(base_datasets_dir, relative_path.replace('/', os.sep)))
    if not absolute_video_path.startswith(base_datasets_dir): raise HTTPException(400, detail="Invalid video path.")
    if not osp.exists(absolute_video_path): raise HTTPException(404, detail=f"Video file not found: {absolute_video_path}")

    # --- Video Processing Logic ---
    try: cap = cv2.VideoCapture(absolute_video_path); assert cap.isOpened()
    except Exception as e: raise HTTPException(500, detail=f"Error opening video: {e}")

    frames_buffer = []
    anomaly_events = [] # List to store TRIGGERED events
    processed_clips = 0
    processed_frames_total = 0

    # Initialize confidence queues and trigger status (like in main.py)
    anomaly_conf_queues = {
        atype: AnomalyConfidenceQueue(max_len=FRAMES_PER_CLIP) # Use FRAMES_PER_CLIP as window size
        for atype in ALERT_ANOMALY_CLASSES
    }
    alert_triggered_status = {atype: False for atype in ALERT_ANOMALY_CLASSES}

    print(f"\n--- Starting SUSTAINED detection for: {osp.basename(absolute_video_path)} ---")

    try:
        while True:
            ret, frame = cap.read()
            if not ret: break
            processed_frames_total += 1
            resized = cv2.resize(frame, (224, 224))
            frames_buffer.append(resized)

            if len(frames_buffer) == FRAMES_PER_CLIP:
                processed_clips += 1
                pred_cls, prob = predict_anomaly(frames_buffer)
                prob_float = float(prob or 0.0) # Ensure it's a float

                print(f"  Clip {processed_clips}: Predicted='{pred_cls}', Prob={prob_float:.4f}", end="") # Keep basic log

                # Update relevant confidence queue
                if pred_cls in anomaly_conf_queues:
                    anomaly_conf_queues[pred_cls].update(prob_float)
                # Clear queues for non-alert classes to reset confidence
                elif pred_cls == "Normal_Videos": # Check specifically for Normal
                     for q in anomaly_conf_queues.values(): q.clear()

                # Check all alertable types for sustained detection
                for anomaly_type in ALERT_ANOMALY_CLASSES:
                    current_queue = anomaly_conf_queues[anomaly_type]

                    # Check if it SHOULD trigger based on sustained confidence
                    should_trigger = current_queue.should_alert(
                        threshold=ALERT_CONFIDENCE_THRESHOLD,
                        min_hits=MIN_HITS_FOR_ALERT
                    )

                    if should_trigger:
                        # Only add event if it wasn't already triggered
                        if not alert_triggered_status[anomaly_type]:
                            print(f" -> SUSTAINED DETECTED: {anomaly_type}!") # Log trigger
                            anomaly_events.append({
                                "event": anomaly_type,
                                # Report the probability that caused the trigger
                                "confidence": prob_float if pred_cls == anomaly_type else current_queue.average(),
                                "time": datetime.now(timezone.utc).isoformat()
                            })
                            alert_triggered_status[anomaly_type] = True # Mark as triggered
                    else:
                        # If confidence dropped, reset the trigger status
                        if alert_triggered_status[anomaly_type]:
                            print(f" -> CLEARED: {anomaly_type}") # Log clear
                            alert_triggered_status[anomaly_type] = False
                            # Optionally clear the queue to require a fresh N hits
                            # current_queue.clear()

                # Always print newline after processing checks
                print("")

                frames_buffer.clear()

    except Exception as e:
        print(f"\n[DETECT ERROR] Inference failed after {processed_clips} clips: {e}")
        traceback.print_exc()
    finally:
        cap.release()

    if not processed_frames_total:
        print(f"--- ERROR: Could not read any frames from {osp.basename(absolute_video_path)} ---")
        raise HTTPException(500, detail="Could not read frames.")

    print(f"--- Detection complete for {osp.basename(absolute_video_path)}. Processed {processed_clips} clips. Found {len(anomaly_events)} SUSTAINED anomaly events. ---")
    return anomaly_events # Return list of triggered events

# --- OLD Simulation Route (Keep Auth Required) ---
@app.post("/api/simulate/cameras/{camera_id}", dependencies=[Depends(get_current_user)]) # Keep auth active
def simulate_camera_run(
    camera_id: int,
    send_email: bool = True,
    db: Session = Depends(get_db)
):
    # This function remains logically the same as before, handling
    # detection, incident creation, clip saving, and email sending.
    # It just won't be called by the current frontend flow.
    try:
        from src.anomaly_detection import predict_anomaly
        from src.anomaly_config import ALERT_ANOMALY_CLASSES
        from backend.alert_service import send_alert as send_email_alert
    except ImportError as e: raise HTTPException(500, detail=f"Sim components missing: {e}")
    except Exception as e: raise HTTPException(500, detail=f"Sim import error: {e}")

    cam = db.query(Camera).filter(Camera.id == camera_id).first();
    if not cam: raise HTTPException(404, detail=f"Camera {camera_id} not found.")
    video_path = _pick_random_video();
    if not video_path: raise HTTPException(404, detail="No test videos found.")
    try: cap = cv2.VideoCapture(video_path); assert cap.isOpened()
    except Exception as e: raise HTTPException(500, detail=f"Error opening video: {e}")

    frames_per_clip = 16; frames_buffer = []; alert_types = set(); prob_seen = 0.0; first_pred = None; anomaly_events = []; full_frames = []; fps = cap.get(cv2.CAP_PROP_FPS) or 25; processed = 0
    try:
        while True:
            ret, frame = cap.read();
            if not ret: break; processed += 1; full_frames.append(frame.copy()); resized = cv2.resize(frame, (224, 224)); frames_buffer.append(resized)
            if len(frames_buffer) == frames_per_clip:
                pred_cls, prob = predict_anomaly(frames_buffer);
                if first_pred is None: first_pred = pred_cls; prob_seen = float(prob or 0.0)
                if pred_cls and pred_cls in ALERT_ANOMALY_CLASSES and (prob or 0.0) >= 0.5:
                    alert_types.add(pred_cls); anomaly_events.append({"event": pred_cls, "confidence": float(prob or 0.0), "time": datetime.now(timezone.utc).isoformat()})
                frames_buffer.clear()
    except Exception as e: print(f"[SIMULATE INFER ERROR] {e}"); traceback.print_exc()
    finally: cap.release()
    if not processed: raise HTTPException(500, detail="Could not read frames.")

    incident_id = None; clip_id = None; saved_path = None
    if alert_types:
        try:
            inc = Incident(camera_id=camera_id, event_type=", ".join(sorted(alert_types)), score=prob_seen, started_at=datetime.now(timezone.utc), status="detected", note=json.dumps(anomaly_events))
            db.add(inc); db.commit(); db.refresh(inc); incident_id = inc.id
        except Exception as e: db.rollback(); print(f"[ERROR] DB error creating incident: {e}"); traceback.print_exc(); raise HTTPException(500, detail=f"DB error: {e}")

        try:
            incident_dir = osp.join(STORAGE_DIR, f"incident_{incident_id}"); os.makedirs(incident_dir, exist_ok=True); timestamp = datetime.now().strftime("%Y%m%d_%H%M%S"); filename = f"sim_clip_{incident_id}_{timestamp}.mp4"; saved_path = osp.join(incident_dir, filename)
            if not full_frames: raise ValueError("No frames captured to save.")
            h, w, _ = full_frames[0].shape; out = cv2.VideoWriter(saved_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h));
            for f in full_frames: out.write(f); out.release()
        except Exception as e: print(f"[ERROR] Failed save sim clip: {e}"); traceback.print_exc(); saved_path = None

        if saved_path:
            clip = Clip(incident_id=incident_id, file_path=saved_path); db.add(clip); db.commit(); db.refresh(clip); clip_id = clip.id
            if send_email:
                try: send_email_alert(saved_path, location=cam.location or f"Camera {camera_id}", anomaly_type=inc.event_type)
                except Exception as e: print(f"[ERROR] Failed send email: {e}")
                
    return {"video": video_path, "first_prediction": first_pred, "probability": prob_seen, "alert_types": sorted(list(alert_types)), "incident_id": incident_id, "clip_id": clip_id, "saved_clip_path": saved_path, "anomaly_events_log": anomaly_events }