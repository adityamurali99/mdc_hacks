import asyncio
from typing import Optional
from openai import AsyncOpenAI
from agents.contract_agent import check_contract
from agents.property_agent import check_property_data
from agents.street_view_agent import check_street_view_reality
from agents.reverse_image_agent import check_reverse_image
import os

_openai = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))


class Orchestrator:

    async def run(
        self,
        contract_bytes: Optional[bytes],
        zip_code: str,
        asking_rent: str,
        listing_address: str,
        listing_images: list[bytes],   # Now a list — supports multiple photos
        claimed_landlord: str,
        claimed_price: str,
    ) -> dict:
        """
        Runs all 4 agents in parallel and synthesizes results.
        - Street View uses the first image (exterior comparison)
        - Reverse image search runs on ALL images (catches partial photo theft)
        """

        tasks = []

        # Contract agent
        if contract_bytes:
            tasks.append(check_contract(contract_bytes))
        else:
            tasks.append(self._skip("contract", "No lease document provided."))

        # Property agent
        tasks.append(check_property_data(zip_code, asking_rent, listing_address))

        # Normalize — filter out any empty entries
        listing_images = [img for img in listing_images if img]
        first_image = listing_images[0] if listing_images else None
        if first_image:
            tasks.append(check_street_view_reality(listing_address, first_image))
        else:
            tasks.append(self._skip("street_view", "No listing image provided."))

        # Reverse image — runs on ALL images, merges results
        if listing_images:
            tasks.append(self._run_reverse_image_all(
                images=listing_images,
                claimed_address=listing_address,
                claimed_price=claimed_price,
                claimed_landlord=claimed_landlord
            ))
        else:
            tasks.append(self._skip("reverse_image", "No listing image provided."))

        contract_result, property_result, street_view_result, reverse_image_result = \
            await asyncio.gather(*tasks, return_exceptions=True)

        results = {
            "contract":      self._safe(contract_result,      "contract"),
            "property":      self._safe(property_result,      "property"),
            "street_view":   self._safe(street_view_result,   "street_view"),
            "reverse_image": self._safe(reverse_image_result, "reverse_image"),
        }

        # street_view agent returns "verdict" — alias to "summary" for consistency
        if "summary" not in results["street_view"] and "verdict" in results["street_view"]:
            results["street_view"]["summary"] = results["street_view"]["verdict"]
        # reverse_image agent returns "verdict" too
        if "summary" not in results["reverse_image"] and "verdict" in results["reverse_image"]:
            results["reverse_image"]["summary"] = results["reverse_image"]["verdict"]

        return await self.synthesize(results)

    async def _run_reverse_image_all(
        self,
        images: list[bytes],
        claimed_address: str,
        claimed_price: str,
        claimed_landlord: str
    ) -> dict:
        """
        Runs reverse image search on each photo concurrently,
        then merges all findings into a single result.
        """
        tasks = [
            check_reverse_image(
                image_bytes=img,
                claimed_address=claimed_address,
                claimed_price=claimed_price,
                claimed_landlord=claimed_landlord
            )
            for img in images
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Merge all results — collect all mismatches, fraud signals, matches
        all_mismatches = []
        all_fraud_signals = []
        all_red_flags = []
        all_real_estate_matches = []
        any_stolen = False
        min_score = 100
        summaries = []

        for i, r in enumerate(results):
            if isinstance(r, Exception):
                continue
            all_mismatches.extend(r.get("mismatches", []))
            all_fraud_signals.extend(r.get("fraud_signals", []))
            all_red_flags.extend(r.get("red_flags", []))
            all_real_estate_matches.extend(r.get("real_estate_matches", []))
            if r.get("is_stolen"):
                any_stolen = True
            if r.get("score") is not None:
                min_score = min(min_score, r["score"])
            if r.get("summary"):
                summaries.append(f"Photo {i+1}: {r['summary']}")

        photos_checked = len([r for r in results if not isinstance(r, Exception)])
        stolen_count = sum(1 for r in results if not isinstance(r, Exception) and r.get("is_stolen"))

        if any_stolen:
            verdict = f"{stolen_count}/{photos_checked} photos found on real estate platforms with mismatches — hijacked listing signal."
        else:
            verdict = f"{photos_checked} photos checked — no stolen photo evidence detected."

        return {
            "agent": "reverse_image",
            "status": "analyzed",
            "score": min_score if min_score < 100 else 60,
            "is_stolen": any_stolen,
            "photos_checked": photos_checked,
            "stolen_count": stolen_count,
            "verdict": verdict,
            "real_estate_matches": all_real_estate_matches,
            "mismatches": list(set(all_mismatches)),
            "fraud_signals": list(set(all_fraud_signals)),
            "red_flags": list(set(all_red_flags)),
            "summary": summaries[0] if summaries else verdict
        }

    async def _skip(self, agent: str, reason: str) -> dict:
        return {
            "agent": agent,
            "score": 50,
            "status": "SKIPPED",
            "findings": [],
            "summary": reason
        }

    def _safe(self, result, agent: str) -> dict:
        if isinstance(result, Exception):
            return {
                "agent": agent,
                "score": 50,
                "status": "ERROR",
                "findings": [f"Agent failed: {str(result)}"],
                "summary": f"{agent} agent encountered an error."
            }
        return result

    async def synthesize(self, results: dict) -> dict:
        weights = {"contract": 0.40, "street_view": 0.25, "property": 0.20, "reverse_image": 0.15}
        weighted_score = sum(results[k].get("score", 50) * weights[k] for k in weights)

        signatory_name = results["contract"].get("signatory_name")
        name_mismatch_flag = False
        if signatory_name and signatory_name.lower() not in ["not found", "none", ""]:
            property_summary = results["property"].get("summary", "").lower()
            if signatory_name.lower() not in property_summary:
                name_mismatch_flag = True

        audit_log = {
            "property_analysis": {
                "asking_rent": results["property"].get("asking_rent"),
                "market_average": results["property"].get("market_average"),
                "deviation_pct": results["property"].get("rent_deviation_pct"),
                "price_discrepancy_flag": results["property"].get("price_discrepancy_flag"),

            },
            "contract_compliance": {
                "signatory_name": signatory_name,
                "monthly_rent": results["contract"].get("monthly_rent"),
                "lease_term": results["contract"].get("lease_term"),
                "security_deposit": results["contract"].get("security_deposit"),
                "illegal_clauses": results["contract"].get("findings", []),
                "risk_level": results["contract"].get("risk_level"),
                "name_mismatch_flag": name_mismatch_flag
            },
            "visual_verification": {
                "street_view_match": results["street_view"].get("consistent"),
                "street_view_score": results["street_view"].get("score"),
                "street_view_confidence": results["street_view"].get("confidence"),
                "street_view_image": results["street_view"].get("street_view_image"),
                "street_view_description": results["street_view"].get("street_view_description"),
                "listing_description": results["street_view"].get("listing_description"),
                "matching_features": results["street_view"].get("matching_features", []),
                "mismatching_features": results["street_view"].get("mismatching_features", []),
                "reverse_image_stolen": results["reverse_image"].get("is_stolen", False),
                "photos_checked": results["reverse_image"].get("photos_checked", 0),
                "stolen_count": results["reverse_image"].get("stolen_count", 0),
                "reverse_image_mismatches": results["reverse_image"].get("mismatches", []),
                "real_estate_matches": results["reverse_image"].get("real_estate_matches", [])
            }
        }

        all_red_flags = []
        for k in ["contract", "property", "street_view", "reverse_image"]:
            r = results[k]
            all_red_flags.extend(r.get("findings", []))
            all_red_flags.extend(r.get("red_flags", []))
        if name_mismatch_flag and signatory_name:
            all_red_flags.append(f"Lease signatory '{signatory_name}' could not be verified against property records.")

        any_danger = any(r.get("status") == "DANGER" for r in results.values())
        if weighted_score < 40 or any_danger:
            verdict = "Likely Scam"
        elif weighted_score < 70:
            verdict = "Investigate Further"
        else:
            verdict = "Appears Legitimate"

        if verdict == "Likely Scam":
            action_kit = {
                "tone": "danger",
                "headline": "Do not proceed with this listing.",
                "steps": [
                    "Stop all communication with this landlord immediately.",
                    "Do not send any money, deposits, or personal documents.",
                    "Screenshot this report and share it with your campus housing office if needed.",
                    "Submit a formal report to the FTC and IC3."
                ],
                "copy_paste_reply": (
                    "Hello, my rental verification tool flagged this listing for "
                    "inconsistencies. Please provide official proof of ownership "
                    "(e.g., tax statement or utility bill) to continue. Otherwise, "
                    "I will be reporting this listing to the appropriate authorities."
                ),
                "reporting_links": {
                    "FTC": "https://reportfraud.ftc.gov/",
                    "IC3": "https://www.ic3.gov/",
                    "UMich Housing": "https://housing.umich.edu/off-campus-housing/"
                }
            }
        elif verdict == "Investigate Further":
            action_kit = {
                "tone": "warning",
                "headline": "Proceed with caution — verify before paying anything.",
                "steps": [
                    "Do not send any deposit until you verify ownership independently.",
                    "Request a video call walkthrough of the property with the landlord.",
                    "Ask for a copy of the property tax record or utility bill showing their name.",
                    "Search the address on your county assessor website to confirm the owner.",
                    "Never pay via Zelle, Venmo, wire transfer, or crypto — use check or escrow only."
                ],
                "copy_paste_reply": (
                    "Hi, I am interested in the listing but would like to verify a few things "
                    "before proceeding. Could you provide proof of ownership such as a property "
                    "tax statement or utility bill and do a live video walkthrough of the unit? "
                    "I would also prefer to pay the deposit by check rather than digital transfer."
                ),
                "reporting_links": {
                    "FTC": "https://reportfraud.ftc.gov/",
                    "UMich Housing": "https://housing.umich.edu/off-campus-housing/"
                }
            }
        else:
            action_kit = {
                "tone": "safe",
                "headline": "Listing appears legitimate — a few final checks before you sign.",
                "steps": [
                    "Request a signed copy of the lease before sending any payment.",
                    "Verify the landlord identity with a government-issued ID.",
                    "Confirm the lease start date and terms match what was advertised.",
                    "Document the property condition with photos on move-in day."
                ],
                "copy_paste_reply": (
                    "Hi, everything looks good on my end. Before I send the deposit, "
                    "could you send over the signed lease agreement and confirm payment "
                    "instructions? I would like to pay by check if possible."
                ),
                "reporting_links": {
                    "UMich Housing": "https://housing.umich.edu/off-campus-housing/"
                }
            }

        # ── Cross-agent correlation ──────────────────────────────────────────
        correlations = []

        price_flagged = results["property"].get("price_discrepancy_flag", False)
        language_flagged = any(
            kw in f.lower()
            for f in all_red_flags
            for kw in ["zelle", "wire", "urgent", "asap", "sight unseen", "out of the country", "send deposit"]
        )
        sv_mismatch = results["street_view"].get("consistent") == False
        img_stolen = results["reverse_image"].get("is_stolen", False)
        contract_risky = results["contract"].get("risk_level") in ["HIGH", "MEDIUM"]

        if price_flagged and language_flagged:
            correlations.append({
                "agents": ["Market Data", "Listing Language"],
                "pattern": "bait_pricing",
                "message": f"Price is {audit_log['property_analysis'].get('deviation_pct', '?')}% below market AND listing uses high-pressure language — classic bait-and-switch pattern.",
                "severity": "high"
            })

        if sv_mismatch and img_stolen:
            correlations.append({
                "agents": ["Street View", "Reverse Image"],
                "pattern": "photo_fraud",
                "message": "Building exterior does not match Street View AND photos were found on another listing — photos are stolen from a different property.",
                "severity": "high"
            })

        if contract_risky and price_flagged:
            correlations.append({
                "agents": ["Contract", "Market Data"],
                "pattern": "document_fraud",
                "message": "Lease contains suspicious clauses AND asking price is unrealistically low — both documents and pricing suggest coordinated fraud.",
                "severity": "high"
            })

        agent_labels = {"contract": "Contract", "property": "Market Data", "street_view": "Street View", "reverse_image": "Reverse Image"}
        flagged_agents = [k for k in weights if results[k].get("score", 50) < 50 and results[k].get("status") not in ["SKIPPED", "ERROR"]]
        if len(flagged_agents) >= 3:
            names = [agent_labels[a] for a in flagged_agents]
            correlations.append({
                "agents": names,
                "pattern": "multi_agent_consensus",
                "message": f"{', '.join(names)} all independently flagged this listing — multiple unrelated signals converging on the same conclusion significantly increases fraud likelihood.",
                "severity": "high"
            })

        # ─────────────────────────────────────────────────────────────────────

        # ── Generate plain-English investigation summary ─────────────────────
        investigation_summary = await self._generate_summary(
            verdict=verdict,
            trust_score=round(weighted_score, 1),
            agent_summaries={k: results[k].get("summary", "") for k in weights},
            red_flags=all_red_flags,
            correlations=correlations,
            audit_log=audit_log
        )

        return {
            "trust_score": round(weighted_score, 1),
            "verdict": verdict,
            "investigation_summary": investigation_summary,
            "red_flags": list(set(all_red_flags)),
            "audit_log": audit_log,
            "evidence_summary": {
                k: str(results[k].get("summary", ""))
                for k in ["contract", "property", "street_view", "reverse_image"]
                if results[k].get("summary")
            },
            "agent_scores": {k: results[k].get("score", 50) for k in weights},
            "action_kit": action_kit,
            "correlations": correlations
        }

    async def _generate_summary(
        self,
        verdict: str,
        trust_score: float,
        agent_summaries: dict,
        red_flags: list,
        correlations: list,
        audit_log: dict
    ) -> str:
        """
        Generates a 2-3 sentence plain-English summary of all agent findings.
        Written for a student who needs to understand the risk immediately.
        """
        try:
            # Build context from agent findings
            price_info = ""
            if audit_log.get("property_analysis", {}).get("deviation_pct"):
                pct = audit_log["property_analysis"]["deviation_pct"]
                asking = audit_log["property_analysis"].get("asking_rent", "?")
                avg = audit_log["property_analysis"].get("market_average", "?")
                price_info = f"Asking rent ${asking}/mo is {pct}% below market average of ${avg}/mo."

            sv_match = audit_log.get("visual_verification", {}).get("street_view_match")
            sv_info = ""
            if sv_match is False:
                sv_info = "The listing photo does not match the building at the claimed address on Google Street View."
            elif sv_match is True:
                sv_info = "The listing photo is consistent with the property on Google Street View."

            ri_platforms = audit_log.get("visual_verification", {}).get("real_estate_matches", [])
            ri_info = ""
            if ri_platforms:
                names = list(set(m.get("platform", "") for m in ri_platforms if m.get("platform")))
                ri_info = f"The listing photo was found on {', '.join(names)}."

            contract_flags = audit_log.get("contract_compliance", {}).get("illegal_clauses", [])
            contract_info = f"{len(contract_flags)} suspicious lease clause(s) detected." if contract_flags else ""

            context = "\n".join(filter(None, [price_info, sv_info, ri_info, contract_info]))
            top_flags = red_flags[:5] if red_flags else []

            prompt = f"""Summarize this rental fraud investigation in exactly 2 short sentences for a university student.

Key findings: {context}

Rules:
- Sentence 1: State the single most damning finding with specific numbers (e.g. "$1200 is 57% below the $2800 market average", "photo found on Zillow at a different address"). NEVER mention trust score numbers or verdict labels like "Likely Scam".
- Sentence 2: One clear action — "Do not send money." or "Verify ownership before paying." or "Confirm details before signing."
- Max 35 words total. Start directly with the finding. No filler."""

            response = await _openai.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=100,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"[orchestrator] Summary generation failed: {e}")
            # Fallback to a basic summary
            if verdict == "Likely Scam":
                return f"This listing scored {trust_score}/100 and shows multiple fraud signals. Do not send any money or personal information to this landlord."
            elif verdict == "Investigate Further":
                return f"This listing scored {trust_score}/100 and has suspicious signals worth investigating before proceeding. Verify the landlord's identity and property ownership before paying anything."
            else:
                return f"This listing scored {trust_score}/100 and appears relatively legitimate. Perform standard due diligence before signing."


orchestrator = Orchestrator()