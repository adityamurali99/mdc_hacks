import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv
from backend.tools import get_market_rent, get_commute_time

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are a real estate market analyst. 
I will provide you with the user's target sublease details and the ACTUAL live market data.

Your job is to compare the asking rent to the actual market rent to detect "Bait Pricing" (where scammers list luxury apartments for impossibly low prices).

Return ONLY valid JSON in exactly this format:
{
  "risk_level": "LOW | MEDIUM | HIGH",
  "price_discrepancy_flag": true/false,
  "market_average": "Extracted from the tool data",
  "findings": ["List of red flags regarding price or location"],
  "summary": "Short explanation of whether this price makes sense for this market."
}
"""

async def check_property_data(zip_code: str, asking_rent: str, listing_address: str, office_address: str) -> dict:
    try:
        # 1. Run your Python tools to get the hard data
        market_data = get_market_rent(zip_code)
        commute_data = get_commute_time(listing_address, office_address)

        # 2. Package it up for OpenAI to analyze
        user_prompt = f"""
        User Input:
        - Zip Code: {zip_code}
        - Asking Rent: ${asking_rent}

        Live API Data:
        - Market Rent Tool Output: {market_data}
        - Commute Tool Output: {commute_data}
        """

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1
        )

        raw = response.choices[0].message.content
        parsed = json.loads(raw)
        parsed["agent"] = "property"
        return parsed

    except Exception as e:
        return {
            "agent": "property",
            "status": "UNKNOWN",
            "findings": [f"Market analysis failed: {str(e)}"],
            "summary": "Could not process property data."
        }