# SubletShield

**Paste a listing. 30 seconds. Know if it's real.**

SubletShield is an AI-powered multi-agent system that investigates rental listings for fraud. Built for university students searching for sublets remotely, it catches stolen photos, fake addresses, bait pricing, and suspicious lease clauses — before a student sends a single dollar.

---

## The Problem

Rental scams explicitly target college students relocating for internships. Students browse listings remotely, under time pressure, with no way to verify what they're looking at. Scammers steal photos from Zillow and Realtor.com, post fake listings at 50–60% below market rate, and pressure victims into sending deposits via Zelle before they can verify anything. The FBI tracked $173.5 million in direct rental fraud losses in 2024. Ages 18–29 are 42% more likely to be victimized than any other group.

---

## How It Works

A student pastes raw listing text, uploads a photo, and optionally attaches a lease PDF. Four agents run in parallel and return a **Trust Score (0–100)**, a verdict, and an **Action Kit**.

### The 4 Agents

| Agent | What it does |
|---|---|
| **Contract Agent** | Scans lease PDFs for illegal clauses, Zelle payment demands, missing signatures, and Ann Arbor-specific compliance issues |
| **Market Data Agent** | Calls the Rentcast API to compare asking rent against the live market average for the zip code |
| **Street View Agent** | Fetches Google Street View of the claimed address and uses GPT-4o vision to detect building mismatches |
| **Reverse Image Agent** | Compresses the listing photo, uploads it to imgbb, and runs a Google reverse image search via SerpAPI to find if the photo appears at a different address |

### The Orchestrator

Runs all 4 agents in parallel, applies weighted scoring, detects cross-agent fraud correlations (e.g. Street View mismatch + stolen photo = Photo Fraud alert), generates a plain-English investigation summary, and produces an Action Kit with specific steps, a copy-paste landlord reply, and FTC/IC3 reporting links.

### Scoring Weights

| Agent | Weight |
|---|---|
| Contract | 40% |
| Street View | 25% |
| Market Data | 20% |
| Reverse Image | 15% |

### Verdicts

| Trust Score | Verdict |
|---|---|
| 0–39 | Likely Scam |
| 40–69 | Investigate Further |
| 70–100 | Appears Legitimate |

---

## Demo

**Listing:** 616 Pauline Blvd, Ann Arbor — $1,200/mo, 2BR/1BA

**Result:** Trust Score **14 / 100** — Likely Scam

| Agent | Score | Finding |
|---|---|---|
| Contract | 15 | Wire transfer payment clause detected |
| Market Data | 15 | $1,200 vs $2,800 market average — 57.1% below market |
| Street View | 10 | Building mismatch — different roofline, exterior material, structure type |
| Reverse Image | 15 | Photo found on Zillow and Realtor.com at a different address |

---

## Tech Stack

- **Backend:** Python, FastAPI
- **Frontend:** React, Vite
- **AI Models:** OpenAI GPT-4o (vision), OpenAI GPT-4o-mini (text extraction, summaries)
- **APIs:** Rentcast, Google Street View Static API, Google Maps API, SerpAPI, imgbb

---

## Project Structure
```
subletshield/
├── main.py                    # FastAPI app, all routes
├── orchestrator.py            # Parallel agent execution, scoring, synthesis
├── listing_parser.py          # GPT-4o-mini listing text parser
├── agents/
│   ├── contract_agent.py      # Lease PDF analysis
│   ├── property_agent.py      # Market data + bait pricing detection
│   ├── street_view_agent.py   # Google Street View + GPT-4o vision comparison
│   └── reverse_image_agent.py # Photo reverse search via SerpAPI
└── frontend/                  # React + Vite frontend
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Installation
```bash
# Clone the repo
git clone https://github.com/yourusername/subletshield.git
cd subletshield

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
```

### Environment Variables

Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key
RENTCAST_API_KEY=your_rentcast_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SERPAPI_API_KEY=your_serpapi_api_key
IMGBB_API_KEY=your_imgbb_api_key
```

### Running the App
```bash
# Start the backend
uvicorn main:app --reload

# Start the frontend (in a separate terminal)
cd frontend
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/investigate` | Main endpoint — full multi-agent investigation |
| POST | `/parse-listing` | Parse raw listing text into structured fields |
| POST | `/check-contract` | Run contract agent only |
| POST | `/check-property` | Run market data agent only |
| POST | `/check-street-view` | Run street view agent only |
| POST | `/check-reverse-image` | Run reverse image agent only |
