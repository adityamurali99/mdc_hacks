import os
import requests
import googlemaps
from langchain.tools import tool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@tool("Get Market Rent Tool")
def get_market_rent(zip_code: str) -> str:
    """
    Useful to fetch the average market rent for a specific zip code. 
    Input should be a 5-digit US zip code as a string.
    """
    api_key = os.getenv("RENTCAST_API_KEY")
    url = f"https://api.rentcast.io/v1/avm/rent?zipCode={zip_code}&propertyType=Apartment"
    headers = {
        "accept": "application/json",
        "X-Api-Key": api_key
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            rent = data.get('rentEstimate')
            if rent:
                return f"The median market rent for an apartment in {zip_code} is ${rent} per month."
            else:
                return f"RentCast could not find data for {zip_code}."
        else:
            return f"Error fetching rent data: {response.status_code}"
    except Exception as e:
        return f"API connection failed: {str(e)}"

@tool("Calculate Commute Time Tool")
def get_commute_time(origin: str, destination: str) -> str:
    """
    Useful to calculate the real transit time between a listing address and an office address.
    Input should be two string addresses (origin, destination).
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return "Google Maps API key missing."
        
    try:
        gmaps = googlemaps.Client(key=api_key)
        # Request transit directions
        directions_result = gmaps.directions(origin, destination, mode="transit")
        
        if directions_result:
            duration = directions_result[0]['legs'][0]['duration']['text']
            return f"The actual public transit commute time from {origin} to {destination} is {duration}."
        else:
            return f"Could not calculate transit time between those addresses."
    except Exception as e:
         return f"Google Maps API failed: {str(e)}"