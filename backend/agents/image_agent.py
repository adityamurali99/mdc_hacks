import os
import json
import base64
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are a real estate fraud detection expert. Analyze this image of a sublease/rental property.

Look for the following scam indicators:
1. Watermarks: Are there faint MLS, Zillow, or stock photo watermarks?
2. Cropping: Does the image look awkwardly cropped to hide watermarks?
3. Inconsistencies: Does it look like a 3D architectural render instead of a real photo? Are there weird AI artifacts?
4. Luxury Bait: Does this look like an ultra-luxury penthouse but is being advertised as "cheap student housing"?

Return ONLY valid JSON in exactly this format:
{
  "scam_probability": "LOW | MEDIUM | HIGH",
  "watermarks_found": true/false,
  "suspicious_elements": ["List of any weird things found"],
  "summary": "Short 2-sentence explanation of the visual analysis."
}
"""

async def check_image(image_bytes: bytes, mime_type: str) -> dict:
    try:
        # Convert the raw bytes into a base64 string for OpenAI
        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this property image for scam indicators."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.1
        )

        raw = response.choices[0].message.content
        return json.loads(raw)

    except Exception as e:
        return {
            "agent": "image",
            "status": "UNKNOWN",
            "findings": [f"Visual analysis failed: {str(e)}"],
            "summary": "Could not process image."
        }