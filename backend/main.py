from fastapi import Form
from agents.image_agent import check_image
from agents.property_agent import check_property_data
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from agents.contract_agent import check_contract
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/check-contract")
async def contract_route(file: UploadFile = File(...)):
    content = await file.read()
    return await check_contract(content)

@app.post("/check-image")
async def image_route(file: UploadFile = File(...)):
    content = await file.read()
    # Pass the bytes and the mime type (e.g., image/jpeg)
    return await check_image(content, file.content_type)

@app.post("/check-property")
async def property_route(
    zip_code: str = Form(...), 
    asking_rent: str = Form(...),
    listing_address: str = Form(...),
    office_address: str = Form(...)
):
    return await check_property_data(zip_code, asking_rent, listing_address, office_address)