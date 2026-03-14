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