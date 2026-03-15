import os
import json
import requests
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are a real estate market analyst. 
I will provide you with the user's target sublease details and the ACTUAL live market data.

Your job is to compare the asking rent to the actual market rent to detect "Bait Pricing" 
(where scammers list luxury apartments for impossibly low prices).

Return ONLY valid JSON in exactly this format:
{
  "risk_level": "LOW | MEDIUM | HIGH",
  "price_discrepancy_flag": true/false,
  "market_average": "Extracted from the tool data as a number e.g. 1400",
  "findings": ["List of red flags regarding price or location"],
  "summary": "Short explanation of whether this price makes sense for this market."
}
"""


def get_market_rent(zip_code: str) -> str:
    api_key = os.getenv("RENTCAST_API_KEY")
    url = f"https://api.rentcast.io/v1/markets?zipCode={zip_code}"
    headers = {"accept": "application/json", "X-Api-Key": api_key}

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return f"Market data for {zip_code}: {str(response.json())}"
        else:
            print(f"⚠️ RentCast API returned {response.status_code}. Using fallback data.")
            mock_rent = 1400 if zip_code == "48104" else 2100
            return f"Market data for {zip_code}: {{'averageRent': {mock_rent}, 'status': 'mocked_fallback'}}"
    except Exception as e:
        return f"API connection failed: {str(e)}. Fallback average rent is $2100."


def parse_rent_value(rent_str: str) -> float | None:
    try:
        cleaned = rent_str.replace("$", "").replace(",", "").replace("/mo", "").strip()
        return float(cleaned)
    except Exception:
        return None


async def check_property_data(
    zip_code: str,
    asking_rent: str,
    listing_address: str
) -> dict:
    try:
        market_data = get_market_rent(zip_code)

        user_prompt = f"""
        User Input:
        - Zip Code: {zip_code}
        - Asking Rent: ${asking_rent}
        - Listing Address: {listing_address}

        Live API Data:
        - Market Rent Tool Output: {market_data}
        """

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1
        )

        parsed = json.loads(response.choices[0].message.content)
        risk = parsed.get("risk_level", "LOW").upper()
        score = {"LOW": 80, "MEDIUM": 45, "HIGH": 15}.get(risk, 50)

        asking = parse_rent_value(str(asking_rent))
        market = parse_rent_value(str(parsed.get("market_average", "")))
        rent_deviation_pct = None
        if asking is not None and market is not None and market > 0:
            rent_deviation_pct = round(((market - asking) / market) * 100, 1)

        return {
            "agent": "property",
            "score": score,
            "risk_level": risk,
            "price_discrepancy_flag": parsed.get("price_discrepancy_flag", False),
            "market_average": parsed.get("market_average", "N/A"),
            "asking_rent": asking_rent,
            "rent_deviation_pct": rent_deviation_pct,
            "findings": parsed.get("findings", []),
            "summary": parsed.get("summary", "")
        }

    except Exception as e:
        return {
            "agent": "property",
            "score": 50,
            "risk_level": "UNKNOWN",
            "price_discrepancy_flag": False,
            "market_average": "N/A",
            "asking_rent": asking_rent,
            "rent_deviation_pct": None,
            "findings": [f"Market analysis failed: {str(e)}"],
            "summary": "Could not process property data."
        }