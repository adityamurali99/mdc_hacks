import asyncio
from typing import Optional
from agents.contract_agent import check_contract
from agents.property_agent import check_property_data
from agents.street_view_agent import check_street_view_reality
from agents.reverse_image_agent import check_reverse_image


class Orchestrator:

    async def run(
        self,
        contract_bytes: Optional[bytes],
        zip_code: str,
        asking_rent: str,
        listing_address: str,
        office_address: str,
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
        tasks.append(check_property_data(zip_code, asking_rent, listing_address, office_address))

        # Street View — uses first image only
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

        return self.synthesize(results)

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

    def synthesize(self, results: dict) -> dict:
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
                "commute": results["property"].get("commute")
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

        action_kit = None
        if verdict == "Likely Scam":
            action_kit = {
                "steps": [
                    "Stop all communication with this landlord immediately.",
                    "Do not send any money, deposits, or personal documents.",
                    "Save this report as a PDF for campus housing or local police.",
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

        return {
            "trust_score": round(weighted_score, 1),
            "verdict": verdict,
            "red_flags": list(set(all_red_flags)),
            "audit_log": audit_log,
            "evidence_summary": [
                str(results[k].get("summary", ""))
                for k in ["contract", "property", "street_view", "reverse_image"]
                if results[k].get("summary")
            ],
            "agent_scores": {k: results[k].get("score", 50) for k in weights},
            "action_kit": action_kit
        }


orchestrator = Orchestrator()