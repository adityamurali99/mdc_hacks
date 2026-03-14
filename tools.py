import requests
import os
from crewai.tools import tool
from dotenv import load_dotenv

load_dotenv()

@tool
def get_market_rent(zip_code: str) -> str:
    """
    Fetches the average market rent for a given US zip code using RentCast API.
    Returns the rentEstimate as an integer.
    """
    api_key = os.getenv("RENTCAST_API_KEY")
    url = f"https://api.rentcast.io/v1/avm/rent?zipCode={zip_code}&propertyType=Apartment"
    headers = {"X-Api-Key": api_key}
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            rent_estimate = data.get('rentEstimate', 'N/A')
            return str(rent_estimate)
        else:
            # Fallback for demo
            print(f"⚠️ RentCast API returned {response.status_code}. Using fallback data.")
            mock_rent = 2100 if zip_code != "48104" else 1400  # Ann Arbor vs Other
            return str(mock_rent)
            
    except Exception as e:
        # Fallback
        print(f"API connection failed: {str(e)}. Using fallback.")
        mock_rent = 2100 if zip_code != "48104" else 1400
        return str(mock_rent)