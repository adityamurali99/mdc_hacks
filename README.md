# RentGuard: Automated Forensic Rental Investigation Pipeline

RentGuard is an intelligent, agent-based forensic platform built to protect Ann Arbor students from the rising tide of rental scams. Instead of relying on a single AI chatbot, RentGuard employs a **4-Layer Verification Pipeline** that cross-references the legal, physical, economic, and visual realities of every listing to deliver a high-confidence fraud verdict.



---

## 🛡️ The 4-Layer Verification Pipeline

RentGuard runs four specialized AI agents in parallel to ensure a comprehensive investigation:

1. **Legal Reality (Contract Agent):** Scrutinizes lease agreements for illegal clauses, signatory irregularities, and Michigan-specific housing ordinance violations.
2. **Economic Reality (Property Agent):** Cross-references live market data via **RentCast** and transit times via **Google Maps** to detect "Bait Pricing."
3. **Visual Reality (Reverse Image Agent):** Performs global reverse image searches across major real estate platforms, using **GPT-4o Vision** to detect hijacked photos or mismatched listing details.
4. **Physical Reality (Street View Agent):** Fetches official imagery from **Google Street View** and uses forensic visual comparison to verify if the listing photos match the actual property architecture.

---

## 🚀 Key Features

* **Asynchronous Orchestration:** Built with `asyncio`, our engine fires all four agents concurrently, reducing analysis time from minutes to seconds.
* **The "Verdict" Engine:** Our `Orchestrator` uses weighted risk modeling to synthesize conflicting reports from different agents into a single, reliable **Trust Score**.
* **Automated Action Kit:** If a listing is flagged as a scam, RentGuard automatically generates a tailored response for the landlord and provides direct links to the **FTC, IC3, and UMich Housing authorities**.
* **Forensic Reporting:** Generates a clean, actionable summary report that students can present to local authorities as physical evidence.

---

## 🛠️ Technical Stack

* **Intelligence:** GPT-4o & GPT-4o-mini (Orchestration & Forensic Analysis).
* **Backend:** FastAPI (Asynchronous REST API).
* **Data Sources:** RentCast API, Google Maps API, SerpAPI (Reverse Image).
* **Infrastructure:** Multi-agent design pattern with parallel `asyncio` task execution.



---

## 📊 How it Works

1. **Ingestion:** User uploads raw listing text and optional lease PDF via the `/investigate` endpoint.
2. **Parallel Investigation:** The `Orchestrator` triggers all four agents simultaneously.
3. **Synthesis:** Findings are normalized into a structured `Audit Log`.
4. **Verdict:** System outputs a `Likely Scam / Investigate / Legitimate` verdict with an integrated `Action Kit`.

## 📝 Getting Started

1. **Clone the repository.**
2. **Set environment variables** in a `.env` file:
   ```env
   OPENAI_API_KEY=your_key
   RENTCAST_API_KEY=your_key
   GOOGLE_MAPS_API_KEY=your_key
   SERPAPI_API_KEY=your_key