"""
Lightweight FastAPI server that exposes only the development frame upload
endpoint used for debugging client uploads.

Run with (after activating your venv):

    uvicorn frames_dev_server:app --host 0.0.0.0 --port 8000 --reload

This file intentionally avoids importing the rest of the application's
heavy dependencies (database, ML, etc.) so it starts reliably for local
debugging.
"""
import uvicorn
from datetime import datetime, timezone
from typing import Optional
import os
import os.path as osp
import traceback

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Minimal configuration
STORAGE_DIR = os.getenv("STORAGE_DIR", "./storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI(title="Argus-Core Frames Dev Server")

# Enable CORS for development. Allow all origins so browsers on localhost can POST frames.
# In production, restrict origins to trusted hosts.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/frames/upload-dev")
async def upload_frame_dev(camera_id: int = Form(...), timestamp: Optional[str] = Form(None), file: UploadFile = File(...)):
    """
    Development-only endpoint: receives a single image/frame without requiring an API key.
    Saves the uploaded file under STORAGE_DIR/camera_{camera_id}/ and logs the reception time.
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

        return JSONResponse({"status": "received", "path": dest_path, "received_at": now_iso})
    except Exception as e:
        print("Error receiving dev frame:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Allows running `python frames_dev_server.py` directly for quick debugging
    uvicorn.run("frames_dev_server:app", host="0.0.0.0", port=8000, reload=True)
