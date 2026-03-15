import asyncio
from typing import Optional
from agents.contract_agent import check_contract
from agents.property_agent import check_property_data
from agents.street_view_agent import check_street_view_reality
from agents.reverse_image_agent import check_reverse_image


class Orchestrator:

    async def run(
        self,
        # Contract inputs
        contract_bytes: Optional[bytes],
        # Property inputs
        zip_code: str,
        asking_rent: str,
        listing_address: str,
        office_address: str,
        # Street view inputs
        listing_image_bytes: Optional[bytes],
        # Reverse image inputs
        claimed_landlord: str,
        claimed_price: str,
    ) -> dict:
        """
        Runs all 4 agents in parallel and synthesizes results into a
        single trust score, verdict, and action kit.
        """

        # Build tasks — handle optional inputs gracefully
        tasks = []

        # Contract agent (optional — lease PDF may not be provided)
        if contract_bytes:
            tasks.append(check_contract(contract_bytes))
        else:
            tasks.append(self._skip("contract", "No lease document provided."))

        # Property agent (always runs)
        tasks.append(check_property_data(zip_code, asking_rent, listing_address, office_address))

        # Street view agent (optional — listing image may not be provided)
        if listing_image_bytes:
            tasks.append(check_street_view_reality(listing_address, listing_image_bytes))
        else:
            tasks.append(self._skip("street_view", "No listing image provided."))

        # Reverse image agent (optional — listing image may not be provided)
        if listing_image_bytes:
            tasks.append(check_reverse_image(
                image_bytes=listing_image_bytes,
                claimed_address=listing_address,
                claimed_price=claimed_price,
                claimed_landlord=claimed_landlord
            ))
        else:
            tasks.append(self._skip("reverse_image", "No listing image provided."))

        # Run all agents in parallel
        contract_result, property_result, street_view_result, reverse_image_result = \
            await asyncio.gather(*tasks, return_exceptions=True)

        # Replace any exceptions with safe fallback dicts
        results = {
            "contract": self._safe(contract_result, "contract"),
            "property": self._safe(property_result, "property"),
            "street_view": self._safe(street_view_result, "street_view"),
            "reverse_image": self._safe(reverse_image_result, "reverse_image"),
        }

        return self.synthesize(results)

    async def _skip(self, agent: str, reason: str) -> dict:
        """Returns a neutral result for agents that were skipped due to missing input."""
        return {
            "agent": agent,
            "score": 50,
            "status": "SKIPPED",
            "findings": [],
            "summary": reason
        }

    def _safe(self, result, agent: str) -> dict:
        """Ensures agent result is a dict even if it threw an exception."""
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
        """
        Synthesizes agent data into a verdict, action kit, and a
        transparent audit log for data analysis scoring.
        """

        # 1. Weighted scoring — contract is heaviest (most reliable signal)
        weights = {
            "contract": 0.40,
            "street_view": 0.25,
            "property": 0.20,
            "reverse_image": 0.15
        }
        weighted_score = sum(
            results[k].get("score", 50) * weights[k] for k in weights
        )

        # 2. Cross-reference: signatory name vs property agent landlord
        signatory_name = results["contract"].get("signatory_name")
        name_mismatch_flag = False
        if signatory_name and signatory_name.lower() not in ["not found", "none", ""]:
            # Flag if contract signatory doesn't appear in property findings
            property_summary = results["property"].get("summary", "").lower()
            if signatory_name.lower() not in property_summary:
                name_mismatch_flag = True

        # 3. Build audit log (the "evidence box" for judges)
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
                "reverse_image_mismatches": results["reverse_image"].get("mismatches", []),
                "real_estate_matches": results["reverse_image"].get("real_estate_matches", [])
            }
        }

        # 4. Collect all red flags across agents
        all_red_flags = []
        for agent_key in ["contract", "property", "street_view", "reverse_image"]:
            r = results[agent_key]
            all_red_flags.extend(r.get("findings", []))
            all_red_flags.extend(r.get("red_flags", []))
        if name_mismatch_flag and signatory_name:
            all_red_flags.append(f"Lease signatory '{signatory_name}' could not be verified against property records.")

        # 5. Verdict logic — any DANGER agent overrides the score
        any_danger = any(r.get("status") == "DANGER" for r in results.values())
        if weighted_score < 40 or any_danger:
            verdict = "Likely Scam"
        elif weighted_score < 70:
            verdict = "Investigate Further"
        else:
            verdict = "Appears Legitimate"

        # 6. Action kit for likely scams
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
            "red_flags": list(set(all_red_flags)),  # Deduplicate
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