import os
import streamlit as st
from crewai import Crew, Task
from agents import legal_auditor, market_analyst, chief_risk_officer

st.title("Sublease Sleuth: AI Defense Against Housing Scams")

zip_code = st.text_input("Enter Target Zip Code")
asking_rent = st.number_input("Enter Asking Rent ($)", min_value=0)
listing_text = st.text_area("Paste Listing Description or Chat History")

if st.button("Audit Listing"):
    if not zip_code or not listing_text:
        st.error("Please provide zip code and listing text.")
        st.stop()

    # Require keys to actually call the LLM + market data APIs
    gemini_key = os.getenv("GEMINI_API_KEY")
    rentcast_key = os.getenv("RENTCAST_API_KEY")
    if not gemini_key or "your_" in gemini_key.lower():
        st.warning("Missing or placeholder GEMINI_API_KEY. Set a real key in .env to run the audit.")
        st.stop()
    if not rentcast_key or "your_" in rentcast_key.lower():
        st.warning("Missing or placeholder RENTCAST_API_KEY. Set a real key in .env to fetch market rents.")
        st.stop()

    # Task 1: Legal Auditor
    task1 = Task(
        description=f"Analyze this listing text for scam phrases: {listing_text}",
        agent=legal_auditor,
        expected_output="List of red flags from UMich guidelines."
    )
        
        # Task 2: Market Analyst
        task2 = Task(
            description=f"Check if asking rent ${asking_rent} in zip {zip_code} is realistic.",
            agent=market_analyst,
            expected_output="Market comparison and price analysis."
        )
        
        # Task 3: Chief Risk Officer
        task3 = Task(
            description="Synthesize findings from legal and market analysis into a Scam Risk Score (1-100) and defense plan.",
            agent=chief_risk_officer,
            context=[task1, task2],
            expected_output="Final report with score and recommendations."
        )
        
        # Create and run the crew
        crew = Crew(
            agents=[legal_auditor, market_analyst, chief_risk_officer],
            tasks=[task1, task2, task3]
        )
        
        with st.spinner("Running audit... this may take a moment"):
            try:
                result = crew.kickoff()
            except Exception as e:
                st.error("Audit failed")
                st.exception(e)
            else:
                st.subheader("Audit Results")
                st.write(result)
