import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_rentcast():
    api_key = os.getenv("RENTCAST_API_KEY")
    if not api_key or api_key == "your_rentcast_key_here":
        print("❌ RentCast API Key missing from .env")
        return

    print("Testing RentCast API...")
    # Testing an Atlanta zip code (30309)
    url = "https://api.rentcast.io/v1/avm/rent?zipCode=30309&propertyType=Apartment"
    headers = {
        "accept": "application/json",
        "X-Api-Key": api_key
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! RentCast data fetched: Median Rent for 30309 is roughly ${data.get('rentEstimate')}")
    else:
        print(f"❌ Failed to fetch RentCast data. Status: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_rentcast()
    print("Gemini Key Loaded:", "✅" if os.getenv("GEMINI_API_KEY") != "your_gemini_key_here" else "❌")

    