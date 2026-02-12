from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import shutil
import uuid
import secrets

from dotenv import load_dotenv
load_dotenv()
app = FastAPI()

# Configuration
DATA_FILE = "data/properties.json"
CLIENTS_FILE = "data/clients.json"
UPLOAD_DIR = "static/uploads"
IMAGES_DIR = os.path.join(UPLOAD_DIR, "images")
VIDEOS_DIR = os.path.join(UPLOAD_DIR, "videos")

# Ensure directories exist
os.makedirs("data", exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(VIDEOS_DIR, exist_ok=True)

# Security
security = HTTPBasic()

def authenticate_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Authenticate admin using credentials from environment variables.

    This replaces hard‑coded credentials with values read from the environment,
    enhancing security by avoiding plaintext secrets in source code. It also
    logs failed attempts for audit purposes.
    """
    # Retrieve expected credentials from environment variables
    expected_user = os.getenv("ADMIN_USERNAME")
    expected_pass = os.getenv("ADMIN_PASSWORD")
    if not expected_user or not expected_pass:
        # If env vars are missing, raise a server error to avoid insecure defaults
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: admin credentials not set",
        )
    # Use constant‑time comparison to prevent timing attacks
    correct_username = secrets.compare_digest(credentials.username, expected_user)
    correct_password = secrets.compare_digest(credentials.password, expected_pass)
    if not (correct_username and correct_password):
        # Log failed authentication attempt (avoid leaking credentials)
        print(
            f"Failed admin login attempt for user '{credentials.username}' from IP placeholder"
        )
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

def load_properties():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_properties(properties):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(properties, f, indent=4, ensure_ascii=False)

def load_clients():
    if not os.path.exists(CLIENTS_FILE):
        return []
    try:
        with open(CLIENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_clients(clients):
    with open(CLIENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(clients, f, indent=4, ensure_ascii=False)

@app.get("/")
async def read_index():
    return FileResponse("index.html")

@app.get("/admin")
async def read_admin(username: str = Depends(authenticate_admin)):
    return FileResponse("admin.html")

@app.get("/clientes")
async def read_clientes(username: str = Depends(authenticate_admin)):
    return FileResponse("clientes.html")

@app.get("/propiedad/{id}")
async def read_property_detail(id: int):
    return FileResponse("property_detail.html")

@app.get("/tasaciones")
async def read_tasaciones():
    return FileResponse("tasaciones.html")

@app.get("/tasaciones.html")
async def read_tasaciones_html():
    return FileResponse("tasaciones.html")

@app.get("/contacto")
async def read_contacto():
    return FileResponse("contacto.html")

@app.get("/contactos.html")
async def read_contactos_html():
    return FileResponse("contacto.html")

@app.get("/contacto.html")
async def read_contacto_html():
    return FileResponse("contacto.html")

@app.get("/servicios.html")
async def read_servicios_html():
    return FileResponse("servicios.html")

@app.get("/propiedades.html")
async def read_propiedades_html():
    return FileResponse("propiedades.html")

@app.get("/alquiler.html")
async def read_alquiler_html():
    return FileResponse("Alquiler.html")

@app.get("/venta.html")
async def read_venta_html():
    return FileResponse("Venta.html")

@app.get("/api/properties/{id}")
async def get_property_by_id(id: int):
    properties = load_properties()
    for prop in properties:
        if prop["id"] == id:
            return prop
    raise HTTPException(status_code=404, detail="Property not found")

@app.get("/api/properties")
async def get_properties(
    operation: Optional[str] = None, 
    type: Optional[str] = None, 
    location: Optional[str] = None, 
    rooms: Optional[str] = None,
    featured: Optional[bool] = None
):
    properties = load_properties()
    filtered = properties
    
    if featured is not None:
        filtered = [p for p in filtered if p.get("featured") == featured]
    if operation:
        filtered = [p for p in filtered if p["operation"].lower() == operation.lower()]
    if type:
        filtered = [p for p in filtered if p["type"].lower() == type.lower()]
    if location:
        filtered = [p for p in filtered if location.lower() in p["location"].lower()]
    if rooms:
        try:
            rooms_int = int(rooms)
            if rooms_int >= 4:
                filtered = [p for p in filtered if p["bedrooms"] >= 4]
            else:
                filtered = [p for p in filtered if p["bedrooms"] == rooms_int]
        except ValueError:
            pass
            
    # Move featured properties to the top
    filtered.sort(key=lambda x: x.get("featured", False), reverse=True)
    
    return filtered

@app.post("/api/properties")
async def create_property(
    title: str = Form(...),
    location: str = Form(...),
    price: str = Form(...),
    type: str = Form(...),
    operation: str = Form(...),
    surface: int = Form(...),
    bedrooms: int = Form(...),
    bathrooms: int = Form(...),
    featured: bool = Form(False),
    description: Optional[str] = Form(None),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    images: List[UploadFile] = File(...),
    video_url: Optional[str] = Form(None),
    floorplan: Optional[UploadFile] = File(None),
    reserved: bool = Form(False),
    alquilado: bool = Form(False),
    vendido: bool = Form(False),
    username: str = Depends(authenticate_admin)
):
    properties = load_properties()
    
    # Generate ID
    new_id = 1
    if properties:
        new_id = max(p["id"] for p in properties) + 1
    
    # Save Images
    saved_images = []
    for image in images:
        if image.filename:
            ext = os.path.splitext(image.filename)[1]
            filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(IMAGES_DIR, filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            saved_images.append(f"/static/uploads/images/{filename}")
            
    # Save Video URL
    saved_video_url = video_url
        
    # Save Floor Plan
    saved_floorplan = None
    if floorplan and floorplan.filename:
        ext = os.path.splitext(floorplan.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(IMAGES_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(floorplan.file, buffer)
        saved_floorplan = f"/static/uploads/images/{filename}"
        
    # Parse coordinates
    lat = None
    lng = None
    if latitude and latitude.strip():
        try:
            lat = float(latitude.strip())
        except ValueError:
            pass
    if longitude and longitude.strip():
        try:
            lng = float(longitude.strip())
        except ValueError:
            pass
        
    new_property = {
        "id": new_id,
        "title": title,
        "location": location,
        "price": price,
        "type": type,
        "operation": operation,
        "surface": surface,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "featured": featured,
        "description": description or "Sin descripción disponible.",
        "images": saved_images,
        "video_url": saved_video_url,
        "floorplan": saved_floorplan,
        "reserved": reserved,
        "alquilado": alquilado,
        "vendido": vendido,
        "latitude": lat,
        "longitude": lng
    }
    
    properties.append(new_property)
    save_properties(properties)
    
    return {"message": "Property created successfully", "property": new_property}

@app.put("/api/properties/{id}")
async def update_property(
    id: int,
    title: str = Form(...),
    location: str = Form(...),
    price: str = Form(...),
    type: str = Form(...),
    operation: str = Form(...),
    surface: int = Form(...),
    bedrooms: int = Form(...),
    bathrooms: int = Form(...),
    featured: bool = Form(False),
    description: Optional[str] = Form(None),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    video_url: Optional[str] = Form(None),
    floorplan: Optional[UploadFile] = File(None),
    reserved: bool = Form(False),
    alquilado: bool = Form(False),
    vendido: bool = Form(False),
    username: str = Depends(authenticate_admin)
):
    properties = load_properties()
    
    # Find property
    prop_index = -1
    for i, p in enumerate(properties):
        if p["id"] == id:
            prop_index = i
            break
            
    if prop_index == -1:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
        
    print(f"ACTUALIZANDO PROPIEDAD ID: {id}")
    print(f"RECIBIDO: reserved={reserved}, video_url={video_url}")
    
    current_prop = properties[prop_index]
    
    # Update Images (only if new ones are uploaded)
    saved_images = current_prop.get("images", [])
    if images and any(img.filename for img in images):
        new_images = []
        for image in images:
            if image.filename:
                ext = os.path.splitext(image.filename)[1]
                filename = f"{uuid.uuid4()}{ext}"
                file_path = os.path.join(IMAGES_DIR, filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(image.file, buffer)
                new_images.append(f"/static/uploads/images/{filename}")
        if new_images:
            saved_images = new_images
            
    # Update Video URL
    saved_video_url = current_prop.get("video_url")
    if video_url is not None:
        saved_video_url = video_url
        
    # Update Floor Plan (only if new one is uploaded)
    saved_floorplan = current_prop.get("floorplan")
    if floorplan and floorplan.filename:
        ext = os.path.splitext(floorplan.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(IMAGES_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(floorplan.file, buffer)
        saved_floorplan = f"/static/uploads/images/{filename}"

    # Parse coordinates
    lat = current_prop.get("latitude")
    lng = current_prop.get("longitude")
    if latitude and latitude.strip():
        try:
            lat = float(latitude.strip())
        except ValueError:
            pass
    elif latitude == "": # Allow clearing coordinates
        lat = None

    if longitude and longitude.strip():
        try:
            lng = float(longitude.strip())
        except ValueError:
            pass
    elif longitude == "": # Allow clearing coordinates
        lng = None
        
    updated_property = {
        "id": id,
        "title": title,
        "location": location,
        "price": price,
        "type": type,
        "operation": operation,
        "surface": surface,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "featured": featured,
        "description": description or "Sin descripción disponible.",
        "images": saved_images,
        "video_url": saved_video_url,
        "floorplan": saved_floorplan,
        "reserved": reserved,
        "alquilado": alquilado,
        "vendido": vendido,
        "latitude": lat,
        "longitude": lng
    }
    
    properties[prop_index] = updated_property
    save_properties(properties)
    
    return {"message": "Property updated successfully", "property": updated_property}

@app.delete("/api/properties/{id}")
async def delete_property(id: int, username: str = Depends(authenticate_admin)):
    properties = load_properties()
    
    # Find property index
    prop_index = -1
    for i, prop in enumerate(properties):
        if prop["id"] == id:
            prop_index = i
            break
            
    if prop_index == -1:
        raise HTTPException(status_code=404, detail="Property not found")
        
    property_to_delete = properties[prop_index]
    
    # Delete images
    for image_url in property_to_delete.get("images", []):
        try:
            # Convert URL to file path
            # URL is /static/uploads/images/filename
            if image_url.startswith("/static/"):
                relative_path = image_url[1:] # remove leading slash
                file_path = os.path.join(os.getcwd(), relative_path.replace("/", os.sep))
                if os.path.exists(file_path):
                    os.remove(file_path)
        except Exception as e:
            print(f"Error deleting image {image_url}: {e}")
            
    # Video URL cleanup (nothing to delete on disk for YouTube links)
            
    # Remove from list and save
    properties.pop(prop_index)
    save_properties(properties)
    
    return {"message": "Property deleted successfully"}

class TasacionRequest(BaseModel):
    nombre: str
    apellido: str
    email: str
    telefono: Optional[str] = None
    comentario: str

class ContactRequest(BaseModel):
    nombre: str
    email: str
    telefono: Optional[str] = None
    mensaje: str

@app.post("/api/tasaciones")
async def create_tasacion(request: TasacionRequest):
    print(f"Recibida tasación: {request}")
    clients = load_clients()
    new_id = str(uuid.uuid4())[:8]
    from datetime import datetime
    
    new_client = {
        "id": new_id,
        "type": "Tasación",
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data": request.dict()
    }
    clients.append(new_client)
    save_clients(clients)
    return {"message": "Solicitud recibida correctamente"}

@app.post("/api/contacto")
async def create_contacto(request: ContactRequest):
    print(f"Recibido contacto: {request}")
    clients = load_clients()
    new_id = str(uuid.uuid4())[:8]
    from datetime import datetime
    
    new_client = {
        "id": new_id,
        "type": "Contacto",
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data": request.dict()
    }
    clients.append(new_client)
    save_clients(clients)
    return {"message": "Mensaje enviado con éxito"}

@app.get("/api/clients")
async def get_clients(username: str = Depends(authenticate_admin)):
    return load_clients()

@app.delete("/api/clients/{id}")
async def delete_client(id: str, username: str = Depends(authenticate_admin)):
    clients = load_clients()
    clients = [c for c in clients if c["id"] != id]
    save_clients(clients)
    return {"message": "Cliente eliminado"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
