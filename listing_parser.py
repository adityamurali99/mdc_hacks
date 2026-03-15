import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are a real estate listing parser. Your job is to extract structured data 
from raw rental listing text copied from platforms like Facebook Marketplace, 
Craigslist, or similar sites.

Extract the following fields as accurately as possible from the listing text.
If a field cannot be determined, return null for that field.

Return ONLY valid JSON in exactly this format, no preamble, no explanation:
{
  "address": "full street address if mentioned, or null",
  "zip_code": "5-digit zip code if determinable, or null",
  "city": "city name if mentioned, or null",
  "state": "2-letter state code if determinable, or null",
  "asking_rent": "monthly rent as a plain number e.g. 1100, or null",
  "landlord_name": "landlord or contact name if mentioned, or null",
  "bedrooms": "number of bedrooms as integer, or null",
  "bathrooms": "number of bathrooms as integer, or null",
  "move_in_date": "move in date if mentioned, or null",
  "listing_flags": ["list of suspicious phrases detected e.g. URGENT, wire transfer, Zelle, sight-unseen, out of country, DM only, no lease, etc."],
  "missing_fields": ["list of important fields that are absent e.g. full address, landlord name, contact phone"]
}

Flag these phrases as suspicious if found in the text:
- URGENT, ASAP, limited time
- Wire transfer, Zelle, Venmo, Cash App, Western Union
- Out of the country, overseas, abroad
- Sight unseen, can't show in person
- DM only, no phone number
- No lease, month to month only
- Send deposit to hold
- Too good to be true pricing signals
"""


async def parse_listing(listing_text: str) -> dict:
    """
    Parses raw listing text into structured fields for the agents.

    Args:
        listing_text: Raw text copied from Facebook Marketplace, Craigslist, etc.

    Returns:
        Structured dict with address, rent, landlord name, and suspicious flags.
    """
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Parse this rental listing:\n\n{listing_text}"}
            ],
            temperature=0.1
        )

        parsed = json.loads(response.choices[0].message.content)

        # Build a clean full address string for agents that need it
        address_parts = [
            parsed.get("address"),
            parsed.get("city"),
            parsed.get("state"),
            parsed.get("zip_code")
        ]
        full_address = ", ".join(p for p in address_parts if p) or None

        return {
            "status": "ok",
            "full_address": full_address,
            "address": parsed.get("address"),
            "zip_code": parsed.get("zip_code"),
            "city": parsed.get("city"),
            "state": parsed.get("state"),
            "asking_rent": str(parsed.get("asking_rent")) if parsed.get("asking_rent") else None,
            "landlord_name": parsed.get("landlord_name"),
            "bedrooms": parsed.get("bedrooms"),
            "bathrooms": parsed.get("bathrooms"),
            "move_in_date": parsed.get("move_in_date"),
            "listing_flags": parsed.get("listing_flags", []),
            "missing_fields": parsed.get("missing_fields", []),
            "needs_clarification": len(parsed.get("missing_fields", [])) > 0
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to parse listing: {str(e)}",
            "full_address": None,
            "zip_code": None,
            "asking_rent": None,
            "landlord_name": None,
            "listing_flags": [],
            "missing_fields": [],
            "needs_clarification": True
        }