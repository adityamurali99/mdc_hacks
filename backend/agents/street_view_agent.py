import os
import httpx
import base64
import json
from openai import AsyncOpenAI

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def fetch_street_view_image(address: str, size: str = "640x480") -> bytes | None:
    """
    Fetches a Street View image for a given address using the Google Street View Static API.
    Returns raw image bytes or None if no imagery exists.
    """
    url = "https://maps.googleapis.com/maps/api/streetview"
    params = {
        "size": size,
        "location": address,
        "key": GOOGLE_MAPS_API_KEY,
        "return_error_code": "true",
        "source": "outdoor",
        "fov": 90,
        "pitch": 5,
    }

    response = httpx.get(url, params=params)

    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise Exception(f"Street View API error: {response.status_code} — {response.text}")

    return response.content


def encode_image_to_base64(image_bytes: bytes) -> str:
    return base64.standard_b64encode(image_bytes).decode("utf-8")


async def compare_images_with_gpt4o(
    street_view_b64: str,
    listing_image_b64: str,
    address: str
) -> dict:
    """
    Sends both images to GPT-4o for architectural comparison.
    Returns structured analysis with consistency verdict and red flags.
    """

    system_prompt = """You are a forensic real estate analyst specializing in rental fraud detection.
Your job is to compare a Google Street View image of a property address against a listing photo
provided by a potential landlord, and determine whether they plausibly show the same building.

You must respond ONLY with a valid JSON object — no markdown, no code fences, no extra text.

{
  "consistent": true or false,
  "confidence": "high" | "medium" | "low",
  "score": 0-100,
  "matching_features": ["list of architectural features that match"],
  "mismatching_features": ["list of architectural features that conflict"],
  "street_view_description": "brief description of what Street View shows",
  "listing_description": "brief description of what the listing photo shows",
  "verdict": "one sentence plain-English conclusion",
  "red_flags": ["list of specific fraud signals, empty array if none"]
}

Scoring guide:
- 80-100: Strong match, same building very likely
- 60-79: Probable match with minor differences (lighting, season, angle)
- 40-59: Uncertain, notable differences worth flagging
- 0-39: Likely mismatch, strong fraud indicator

Focus on architectural features that are hard to fake:
- Roofline shape and pitch
- Number, size, and placement of windows
- Exterior material (brick, siding, stucco, wood)
- Building height and structure type
- Garage or driveway presence
- Distinctive architectural details

Do NOT penalize for: seasonal differences, parked cars, lighting, camera angle,
landscaping changes, or minor renovations. These are normal over time."""

    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        max_tokens=1000,
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Property address under investigation: {address}\n\nImage 1 is the Google Street View of this address. Image 2 is the exterior photo from the rental listing. Compare them carefully and return only JSON."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{street_view_b64}",
                            "detail": "high"
                        }
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{listing_image_b64}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ]
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw.strip())


async def check_street_view_reality(
    address: str,
    listing_image_bytes: bytes,
    listing_image_media_type: str = "image/jpeg"
) -> dict:
    """
    Main entry point for the Street View Reality Agent.
    """
    street_view_bytes = fetch_street_view_image(address)

    if street_view_bytes is None:
        return {
            "agent": "street_view",
            "status": "no_street_view",
            "score": 40,  # Mild red flag
            "consistent": None,
            "verdict": "Google Street View has no imagery for this address. This could indicate a very new building, a rural address, or a fake/nonexistent address — treat as a mild red flag.",
            "red_flags": ["No Street View imagery available for this address"],
            "matching_features": [],
            "mismatching_features": [],
            "confidence": "low",
            "address": address
        }

    street_view_b64 = encode_image_to_base64(street_view_bytes)
    listing_b64 = encode_image_to_base64(listing_image_bytes)

    analysis = await compare_images_with_gpt4o(
        street_view_b64=street_view_b64,
        listing_image_b64=listing_b64,
        address=address
    )

    analysis["agent"] = "street_view"
    analysis["status"] = "analyzed"
    analysis["address"] = address
    analysis["street_view_image"] = f"data:image/jpeg;base64,{street_view_b64}"

    return analysis