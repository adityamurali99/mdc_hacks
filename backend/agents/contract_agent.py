import anthropic
import os
from pypdf import PdfReader
import io

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """
You are a lease fraud detection agent specializing in off-campus housing 
scams targeting University of Michigan students in Ann Arbor, MI.

Analyze the provided lease document and extract the following:

1. PAYMENT RED FLAGS
   - Requests for Zelle, Venmo, Cash App, wire transfer, or cash only
   - Non-refundable security deposit under all circumstances
   - Security deposit exceeding 1.5x monthly rent (excessive by Michigan standards)
   - Any mention of sending money before signing or before viewing the property

2. SIGNATORY ISSUES
   - Extract the landlord/lessor name exactly as written
   - Flag if no landlord signature line exists
   - Flag if signatory is unverifiable (no company name, no address, no phone)

3. ILLEGAL CLAUSES UNDER MICHIGAN LAW
   - Waiving tenant's right to habitable premises
   - Landlord entering without 24-hour notice
   - Waiving right to security deposit return within 30 days
   - Holding tenant liable for normal wear and tear
   - Any clause waiving tenant's right to legal action

4. DATE AND TERM ISSUES
   - Lease start date before document signing date
   - Missing lease end date
   - Lease term inconsistencies (e.g. dates don't match stated duration)

5. ANN ARBOR SPECIFIC FLAGS
   - No mention of Ann Arbor city ordinance compliance
   - Missing Certificate of Compliance (required for Ann Arbor rentals)
   - No mention of landlord registration (required by Ann Arbor city code)

Return ONLY valid JSON in exactly this format, no preamble, no explanation:
{
  "signatory_name": "",
  "monthly_rent": "",
  "lease_term": "",
  "security_deposit": "",
  "payment_red_flags": [],
  "illegal_clauses": [],
  "date_issues": [],
  "ann_arbor_flags": [],
  "risk_level": "LOW | MEDIUM | HIGH",
  "summary": ""
}
"""

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()

async def check_contract(pdf_bytes: bytes) -> dict:
    try:
        lease_text = extract_text_from_pdf(pdf_bytes)

        if not lease_text or len(lease_text) < 100:
            return {
                "agent": "contract",
                "status": "UNKNOWN",
                "findings": ["Could not extract text from PDF. File may be scanned or corrupted."],
                "summary": "Upload a text-based PDF for analysis."
            }

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze this lease agreement:\n\n{lease_text[:8000]}"
                }
            ]
        )

        raw = message.content[0].text.strip()

        import json
        parsed = json.loads(raw)

        all_flags = (
            parsed.get("payment_red_flags", []) +
            parsed.get("illegal_clauses", []) +
            parsed.get("date_issues", []) +
            parsed.get("ann_arbor_flags", [])
        )

        risk = parsed.get("risk_level", "LOW").upper()
        if risk == "HIGH":
            status = "DANGER"
        elif risk == "MEDIUM":
            status = "WARNING"
        else:
            status = "SAFE"

        return {
            "agent": "contract",
            "status": status,
            "signatory_name": parsed.get("signatory_name", "Not found"),
            "monthly_rent": parsed.get("monthly_rent", "Not found"),
            "lease_term": parsed.get("lease_term", "Not found"),
            "security_deposit": parsed.get("security_deposit", "Not found"),
            "findings": all_flags,
            "summary": parsed.get("summary", ""),
            "risk_level": risk
        }

    except json.JSONDecodeError:
        return {
            "agent": "contract",
            "status": "UNKNOWN",
            "findings": ["Failed to parse Claude response as JSON."],
            "summary": "Internal parsing error. Try again."
        }

    except Exception as e:
        return {
            "agent": "contract",
            "status": "UNKNOWN",
            "findings": [f"Unexpected error: {str(e)}"],
            "summary": "Something went wrong during contract analysis."
        }