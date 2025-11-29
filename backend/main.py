from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.parent / "dataset"

class DatasetFile(BaseModel):
    path: str
    name: str
    type: str

class DatasetContent(BaseModel):
    content: List[Dict[str, Any]]

@app.get("/datasets")
async def list_datasets():
    datasets = []
    if not BASE_DIR.exists():
        return {"datasets": []}

    for turn_type in ['multi-turn', 'single-turn']:
        turn_dir = BASE_DIR / turn_type
        if turn_dir.exists():
            for file_path in turn_dir.glob('*.json'):
                datasets.append({
                    "path": f"{turn_type}/{file_path.name}",
                    "name": file_path.stem.replace('_', ' ').title(),
                    "type": turn_type
                })
    return {"datasets": datasets}

@app.get("/datasets/{turn_type}/{filename}")
async def get_dataset(turn_type: str, filename: str):
    file_path = BASE_DIR / turn_type / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/datasets/{turn_type}/{filename}")
async def save_dataset(turn_type: str, filename: str, data: DatasetContent):
    file_path = BASE_DIR / turn_type / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        # Verify it's valid JSON structure (list of dicts)
        content = data.content
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
            
        return {"status": "success", "message": "File saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
