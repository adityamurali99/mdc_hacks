from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List

from agents.contract_agent import check_contract
from agents.property_agent import check_property_data
from agents.street_view_agent import check_street_view_reality
from agents.reverse_image_agent import check_reverse_image
from orchestrator import orchestrator
from listing_parser import parse_listing

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


@app.post("/check-property")
async def property_route(
    zip_code: str = Form(...),
    asking_rent: str = Form(...),
    listing_address: str = Form(...)
):
    return await check_property_data(zip_code, asking_rent, listing_address)


@app.post("/check-street-view")
async def street_view_route(
    address: str = Form(...),
    listing_image: UploadFile = File(...)
):
    image_bytes = await listing_image.read()
    return await check_street_view_reality(
        address=address,
        listing_image_bytes=image_bytes,
        listing_image_media_type=listing_image.content_type or "image/jpeg"
    )


@app.post("/check-reverse-image")
async def reverse_image_route(
    claimed_address: str = Form(...),
    claimed_price: str = Form(...),
    claimed_landlord: str = Form(...),
    listing_image: UploadFile = File(...)
):
    image_bytes = await listing_image.read()
    return await check_reverse_image(
        image_bytes=image_bytes,
        claimed_address=claimed_address,
        claimed_price=claimed_price,
        claimed_landlord=claimed_landlord
    )


@app.post("/parse-listing")
async def parse_listing_route(listing_text: str = Form(...)):
    return await parse_listing(listing_text)


@app.post("/investigate")
async def investigate(
    listing_text: str = Form(...),
    lease_pdf: Optional[UploadFile] = File(None),
    listing_images: Optional[List[UploadFile]] = File(None),
):
    """
    Main endpoint. Accepts multiple listing images.
    - Street View comparison uses the first image
    - Reverse image search runs on all images
    """
    parsed = await parse_listing(listing_text)
    contract_bytes = await lease_pdf.read() if lease_pdf else None

    # Read all uploaded images — handle None, single file, and list
    images_bytes = []
    if listing_images:
        # FastAPI may return a single UploadFile or a list depending on how form is sent
        if not isinstance(listing_images, list):
            listing_images = [listing_images]
        for img in listing_images:
            if img and img.filename:  # Skip empty file slots
                data = await img.read()
                if data:  # Skip empty reads
                    images_bytes.append(data)
    print(f"[investigate] received {len(images_bytes)} image(s)")

    result = await orchestrator.run(
        contract_bytes=contract_bytes,
        zip_code=parsed.get("zip_code") or "00000",
        asking_rent=parsed.get("asking_rent") or "0",
        listing_address=parsed.get("full_address") or "Unknown Address",

        listing_images=images_bytes,
        claimed_landlord=parsed.get("landlord_name") or "Unknown",
        claimed_price=f"${parsed.get('asking_rent')}/mo" if parsed.get("asking_rent") else "Unknown",
    )

    result["parsed_listing"] = parsed
    result["listing_flags"] = parsed.get("listing_flags", [])
    result["missing_fields"] = parsed.get("missing_fields", [])
    result["photos_submitted"] = len(images_bytes)

    if parsed.get("listing_flags"):
        result["red_flags"] = list(set(result.get("red_flags", []) + parsed["listing_flags"]))

    return result