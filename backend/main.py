from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

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


# ── Individual agent routes (for testing) ─────────────────────────────────────

@app.post("/check-contract")
async def contract_route(file: UploadFile = File(...)):
    content = await file.read()
    return await check_contract(content)


@app.post("/check-property")
async def property_route(
    zip_code: str = Form(...),
    asking_rent: str = Form(...),
    listing_address: str = Form(...),
    office_address: str = Form(...)
):
    return await check_property_data(zip_code, asking_rent, listing_address, office_address)


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


# ── Listing parser route ───────────────────────────────────────────────────────

@app.post("/parse-listing")
async def parse_listing_route(listing_text: str = Form(...)):
    """
    Parses raw listing text from Facebook Marketplace / Craigslist into
    structured fields. Call this first to pre-fill the investigation.

    Form fields:
        listing_text - Raw text copied from the listing post
    """
    return await parse_listing(listing_text)


# ── Main orchestrator route ────────────────────────────────────────────────────

@app.post("/investigate")
async def investigate(
    # Raw listing text — parsed server-side to extract address, rent, landlord
    listing_text: str = Form(...),
    # Only field the student provides manually
    office_address: str = Form(...),
    # Optional file uploads
    lease_pdf: Optional[UploadFile] = File(None),
    listing_image: Optional[UploadFile] = File(None),
):
    """
    Main endpoint — parses the listing text, then runs all agents in parallel
    and returns a unified trust score, verdict, audit log, and action kit.

    Form fields:
        listing_text    - Raw text copied from Facebook Marketplace / Craigslist
        office_address  - Student's office or campus address for commute calc

    Optional:
        lease_pdf       - Lease document PDF (enables contract analysis)
        listing_image   - Exterior photo from listing (enables street view + reverse image)
    """

    # Step 1: Parse the listing text into structured fields
    parsed = await parse_listing(listing_text)

    # Step 2: Read uploaded files
    contract_bytes = await lease_pdf.read() if lease_pdf else None
    image_bytes = await listing_image.read() if listing_image else None

    # Step 3: Run all agents via orchestrator
    result = await orchestrator.run(
        contract_bytes=contract_bytes,
        zip_code=parsed.get("zip_code") or "00000",
        asking_rent=parsed.get("asking_rent") or "0",
        listing_address=parsed.get("full_address") or "Unknown Address",
        office_address=office_address,
        listing_image_bytes=image_bytes,
        claimed_landlord=parsed.get("landlord_name") or "Unknown",
        claimed_price=f"${parsed.get('asking_rent')}/mo" if parsed.get("asking_rent") else "Unknown",
    )

    # Step 4: Attach parsed listing data and early flags to the result
    result["parsed_listing"] = parsed
    result["listing_flags"] = parsed.get("listing_flags", [])
    result["missing_fields"] = parsed.get("missing_fields", [])

    # Merge listing-level flags into red flags
    if parsed.get("listing_flags"):
        result["red_flags"] = list(set(
            result.get("red_flags", []) + parsed["listing_flags"]
        ))

    return result