from crewai import Agent, LLM
from tools import get_market_rent
import os

# Load guidelines
with open('backend/umich_guidelines.txt', 'r') as f:
    guidelines = f.read()

# Initialize the LLM (Google Gemini via CrewAI)
llm = LLM(model="gemini/gemini-2.0-flash-001", api_key=os.getenv("GEMINI_API_KEY"))

# Legal Auditor Agent
legal_auditor = Agent(
    role="Linguistic Threat Detector",
    goal="Analyze listing text against UMich guidelines to flag scam phrases",
    backstory=f"You are an expert in detecting fraudulent rental language. You have access to UMich legal guidelines: {guidelines}. Flag phrases like 'wire transfer', 'Zelle', 'out of the country', or 'sight-unseen'.",
    llm=llm,
    allow_delegation=False
)

# Market Analyst Agent
market_analyst = Agent(
    role="Price Arbitrage Engine",
    goal="Compare asking price to market data to detect bait pricing",
    backstory="You are a real estate analyst who fetches live market data and compares it to the listing price to identify unrealistic deals.",
    llm=llm,
    tools=[get_market_rent],
    allow_delegation=False
)

# Chief Risk Officer Agent
chief_risk_officer = Agent(
    role="Synthesizer",
    goal="Combine findings into a Scam Risk Score and defense plan",
    backstory="You are the final authority who synthesizes data from other agents to provide a definitive risk assessment with a score from 1-100 and actionable advice.",
    llm=llm,
    allow_delegation=False
)