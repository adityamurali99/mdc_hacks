import os
import httpx
import base64
import json
from openai import AsyncOpenAI
from serpapi import GoogleSearch

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

REAL_ESTATE_DOMAINS = [
    "zillow.com", "apartments.com", "realtor.com",
    "redfin.com", "trulia.com", "craigslist.org",
    "hotpads.com", "rent.com", "zumper.com",
    "apartmentlist.com", "rentals.com"
]


def encode_image_to_base64(image_bytes: bytes) -> str:
    return base64.standard_b64encode(image_bytes).decode("utf-8")


def reverse_image_search(image_bytes: bytes) -> list[str]:
    """Layer 1: Reverse image search via SerpAPI."""
    image_b64 = encode_image_to_base64(image_bytes)
    image_data_url = f"data:image/jpeg;base64,{image_b64}"

    search = GoogleSearch({
        "engine": "google_reverse_image",
        "image_url": image_data_url,
        "api_key": SERPAPI_API_KEY,
    })

    data = search.get_dict()
    urls = []

    for result in data.get("image_results", []):
        if "link" in result:
            urls.append(result["link"])

    for result in data.get("inline_images", []):
        if "link" in result:
            urls.append(result["link"])

    kg = data.get("knowledge_graph", {})
    if "url" in kg:
        urls.append(kg["url"])

    return list(set(urls))


def filter_real_estate_urls(urls: list[str]) -> list[str]:
    return [
        url for url in urls
        if any(domain in url for domain in REAL_ESTATE_DOMAINS)
    ]


async def extract_listing_details_with_gpt4o(
    url: str,
    claimed_address: str,
    claimed_price: str,
    claimed_landlord: str
) -> dict:
    """Layer 2: Fetch page and use GPT-4o to extract and compare listing details."""
    try:
        page_response = httpx.get(
            url,
            timeout=15,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        page_text = page_response.text[:8000]
    except Exception as e:
        return {
            "url": url,
            "error": f"Could not fetch page: {str(e)}",
            "mismatches": [],
            "fraud_signals": []
        }

    system_prompt = """You are a forensic real estate analyst helping detect rental fraud.
You will be given the HTML/text content of a real estate listing page and details that a suspected scammer claimed.
Extract the listing details from the page and compare them against the claimed details.

Respond ONLY with a valid JSON object — no markdown, no code fences, no extra text:

{
  "found_address": "address found on the page or null",
  "found_price": "price found on the page or null",
  "found_landlord": "landlord or property management company found on the page or null",
  "found_platform": "name of the real estate platform (e.g. Zillow, Apartments.com)",
  "mismatches": ["list of specific mismatches between claimed and found details"],
  "fraud_signals": ["list of specific fraud signals detected"],
  "summary": "one sentence summary of findings"
}"""

    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        max_tokens=800,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"""Real estate page content from {url}:

{page_text}

---
What the suspected scammer claimed:
- Address: {claimed_address}
- Monthly rent: {claimed_price}
- Landlord/Contact: {claimed_landlord}

Extract the listing details from the page and identify any mismatches."""
            }
        ]
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    result = json.loads(raw.strip())
    result["url"] = url
    return result


async def check_reverse_image(
    image_bytes: bytes,
    claimed_address: str,
    claimed_price: str,
    claimed_landlord: str
) -> dict:
    """Main entry point for the Reverse Image Agent."""

    all_urls = reverse_image_search(image_bytes)

    if not all_urls:
        return {
            "agent": "reverse_image",
            "status": "no_results",
            "score": 50,
            "verdict": "No matching images found online. Photo may be original or not indexed.",
            "real_estate_matches": [],
            "mismatches": [],
            "fraud_signals": [],
            "red_flags": [],
            "summary": "No reverse image matches found — cannot confirm or deny stolen photo."
        }

    real_estate_urls = filter_real_estate_urls(all_urls)

    if not real_estate_urls:
        return {
            "agent": "reverse_image",
            "status": "no_real_estate_match",
            "score": 60,
            "verdict": "Photo found online but not on any real estate platform.",
            "all_urls_found": all_urls[:5],
            "real_estate_matches": [],
            "mismatches": [],
            "fraud_signals": [],
            "red_flags": [],
            "summary": "Photo exists online but was not found on known real estate platforms."
        }

    # Run all Layer 2 fetches concurrently
    import asyncio
    tasks = [
        extract_listing_details_with_gpt4o(
            url=url,
            claimed_address=claimed_address,
            claimed_price=claimed_price,
            claimed_landlord=claimed_landlord
        )
        for url in real_estate_urls[:3]
    ]
    real_estate_matches = await asyncio.gather(*tasks)

    all_mismatches = []
    all_fraud_signals = []
    for match in real_estate_matches:
        all_mismatches.extend(match.get("mismatches", []))
        all_fraud_signals.extend(match.get("fraud_signals", []))

    is_stolen = len(all_mismatches) > 0
    score = max(0, 20 - (len(all_mismatches) * 10)) if is_stolen else 40

    verdict = (
        f"Photo found on {len(real_estate_matches)} real estate platform(s) with mismatches — strong hijacked listing signal."
        if is_stolen else
        f"Photo found on {len(real_estate_matches)} real estate platform(s) but details appear consistent."
    )

    summaries = [m.get("summary", "") for m in real_estate_matches if m.get("summary")]

    return {
        "agent": "reverse_image",
        "status": "analyzed",
        "score": score,
        "is_stolen": is_stolen,
        "verdict": verdict,
        "real_estate_matches": list(real_estate_matches),
        "mismatches": all_mismatches,
        "fraud_signals": all_fraud_signals,
        "red_flags": all_mismatches + all_fraud_signals,
        "total_urls_found": len(all_urls),
        "real_estate_urls_found": len(real_estate_urls),
        "summary": summaries[0] if summaries else verdict
    }