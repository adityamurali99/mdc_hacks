import os
import io
import httpx
import base64
from PIL import Image
from serpapi import GoogleSearch

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")

REAL_ESTATE_DOMAINS = {
    "zillow.com": "Zillow",
    "apartments.com": "Apartments.com",
    "realtor.com": "Realtor.com",
    "redfin.com": "Redfin",
    "trulia.com": "Trulia",
    "craigslist.org": "Craigslist",
    "hotpads.com": "HotPads",
    "rent.com": "Rent.com",
    "zumper.com": "Zumper",
    "apartmentlist.com": "ApartmentList",
    "rentals.com": "Rentals.com"
}


def compress_and_encode(image_bytes: bytes) -> str:
    """Compress image to under 400KB and return base64."""
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    if max(img.size) > 1024:
        img.thumbnail((1024, 1024), Image.LANCZOS)
    for quality in [85, 70, 55]:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        data = buf.getvalue()
        if len(data) <= 400 * 1024:
            print(f"[reverse_image] Compressed to {len(data)//1024}KB")
            return base64.standard_b64encode(data).decode("utf-8")
    return base64.standard_b64encode(data).decode("utf-8")


def upload_to_imgbb(image_b64: str) -> str | None:
    """Upload to imgbb to get a public URL for SerpAPI."""
    if not IMGBB_API_KEY:
        print("[reverse_image] ERROR: IMGBB_API_KEY not set")
        return None
    try:
        resp = httpx.post(
            "https://api.imgbb.com/1/upload",
            params={"key": IMGBB_API_KEY},
            data={"image": image_b64},
            timeout=20
        )
        if resp.status_code == 200:
            url = resp.json()["data"]["url"]
            print(f"[reverse_image] imgbb URL: {url}")
            return url
        print(f"[reverse_image] imgbb error {resp.status_code}")
        return None
    except Exception as e:
        print(f"[reverse_image] imgbb failed: {e}")
        return None


def get_platform(url: str) -> str | None:
    """Return the platform name if URL is from a known real estate domain."""
    for domain, name in REAL_ESTATE_DOMAINS.items():
        if domain in url:
            return name
    return None


def reverse_image_search(image_bytes: bytes) -> list[dict]:
    """
    Compress image, upload to imgbb, reverse search via SerpAPI.
    Returns list of {platform, url} for all real estate matches found.
    """
    image_b64 = compress_and_encode(image_bytes)
    public_url = upload_to_imgbb(image_b64)

    if not public_url:
        return []

    try:
        search = GoogleSearch({
            "engine": "google_reverse_image",
            "image_url": public_url,
            "api_key": SERPAPI_API_KEY,
        })
        data = search.get_dict()

        all_urls = []
        for r in data.get("image_results", []):
            if "link" in r:
                all_urls.append(r["link"])
        for r in data.get("inline_images", []):
            if "link" in r:
                all_urls.append(r["link"])

        print(f"[reverse_image] SerpAPI found {len(all_urls)} total URLs")

        # Filter to real estate platforms only
        matches = []
        seen_platforms = set()
        for url in all_urls:
            platform = get_platform(url)
            if platform and platform not in seen_platforms:
                matches.append({"platform": platform, "url": url})
                seen_platforms.add(platform)
                print(f"[reverse_image] RE match: {platform} — {url}")

        return matches

    except Exception as e:
        print(f"[reverse_image] SerpAPI failed: {e}")
        return []


async def check_reverse_image(
    image_bytes: bytes,
    claimed_address: str,
    claimed_price: str,
    claimed_landlord: str
) -> dict:
    """
    Main entry point for the Reverse Image Agent.
    Checks if listing photos appear on real estate platforms.
    Does NOT scrape pages — just confirms presence on platforms.
    The signal: same photo on Zillow/Trulia at a different address = stolen listing.
    """
    print(f"[reverse_image] Image size: {len(image_bytes)//1024}KB")

    try:
        matches = reverse_image_search(image_bytes)
    except Exception as e:
        print(f"[reverse_image] Failed: {e}")
        return {
            "agent": "reverse_image", "status": "error", "score": 50,
            "verdict": f"Reverse image search failed: {e}",
            "platforms_found": [], "real_estate_matches": [],
            "mismatches": [], "fraud_signals": [], "red_flags": [],
            "summary": f"Search error: {e}"
        }

    if not matches:
        print("[reverse_image] No real estate platform matches found")
        return {
            "agent": "reverse_image", "status": "no_results", "score": 60,
            "verdict": "Photo not found on any known real estate platform.",
            "platforms_found": [], "real_estate_matches": [],
            "mismatches": [], "fraud_signals": [], "red_flags": [],
            "summary": "No reverse image matches on real estate platforms — photo may be original."
        }

    # Photo found on real estate platforms — this is the signal
    platform_names = [m["platform"] for m in matches]
    platforms_str = ", ".join(platform_names)

    # Check if any URL contains a different address than what was claimed
    address_keywords = claimed_address.lower().replace(",", "").split()
    url_mismatches = []
    for m in matches:
        url_lower = m["url"].lower()
        # If none of the address keywords appear in the URL, it's a different property
        if not any(kw in url_lower for kw in address_keywords if len(kw) > 3):
            url_mismatches.append(f"Photo found on {m['platform']} at a different address: {m['url']}")

    is_suspicious = len(url_mismatches) > 0
    score = 15 if is_suspicious else 45

    if is_suspicious:
        verdict = f"Photo found on {platforms_str} — URLs suggest a different property than claimed."
        red_flags = url_mismatches + [f"Listing photo appears on {platforms_str}"]
    else:
        verdict = f"Photo found on {platforms_str} — may be legitimate cross-posting or stolen."
        red_flags = [f"Listing photo appears on {platforms_str} — verify manually"]

    print(f"[reverse_image] Done — platforms={platform_names}, suspicious={is_suspicious}, score={score}")

    return {
        "agent": "reverse_image",
        "status": "analyzed",
        "score": score,
        "is_stolen": is_suspicious,
        "verdict": verdict,
        "platforms_found": platform_names,
        "real_estate_matches": matches,
        "mismatches": url_mismatches,
        "fraud_signals": red_flags,
        "red_flags": red_flags,
        "total_urls_found": len(matches),
        "real_estate_urls_found": len(matches),
        "summary": verdict
    }