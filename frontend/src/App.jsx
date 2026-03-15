import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "http://localhost:8000"

// text color constants - UMich Branding
const T = { bright: "#ffffff", mid: "#e0e0e0", dim: "#a0a0a0", accent: "#1679B7", danger: "#B91C1C", warning: "#D97706", safe: "#55A05E", maize: "#FFCB05", blue: "#00274C" }
const F = { display: "'Syne', sans-serif", body: "'DM Sans', sans-serif", mono: "'DM Mono', monospace" }

const scoreColor = (s) => {
  if (s == null) return "#a0a0a0"
  if (s >= 70) return "#55A05E"  // Growth Green
  if (s >= 40) return "#D97706"  // Warning
  return "#B91C1C"  // Danger Red
}

const verdictConfig = (v) => ({
  "Likely Scam":         { label: "🚨 LIKELY SCAM",         bg: "#B91C1C20", border: "#B91C1C60", color: "#B91C1C" },
  "Investigate Further": { label: "⚠️ INVESTIGATE FURTHER",  bg: "#D9770620", border: "#D9770660", color: "#D97706" },
  "Appears Legitimate":  { label: "✅ APPEARS LEGITIMATE",   bg: "#55A05E20", border: "#55A05E60", color: "#55A05E" },
}[v] || { label: "⏳ PENDING", bg: "#ffffff10", border: "#ffffff20", color: "#a0a0a0" })

function ScoreRing({ score, verdict }) {
  const [display, setDisplay] = useState(0)
  const circumference = 339.3
  const offset = score != null ? circumference - (score / 100) * circumference : circumference
  const color = scoreColor(score)
  const vc = verdictConfig(verdict)

  useEffect(() => {
    if (score == null) return
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / 2000, 1)
      setDisplay(Math.round((1 - Math.pow(1 - t, 4)) * score))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [score])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
      <div style={{ position: "relative", width: "220px", height: "220px" }}>
        {/* Outer glow ring */}
        <div style={{ position: "absolute", inset: "-10px", borderRadius: "50%", background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`, filter: "blur(8px)" }} />
        
        {/* Main ring background */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(from 0deg, ${color}30 0deg, ${color}10 180deg, transparent 360deg)`, opacity: 0.3 }} />
        
        {/* Inner background */}
        <div style={{ position: "absolute", inset: "15px", borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "2px solid #2a2a4e" }} />
        
        <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#2a2a4e" strokeWidth="8" />
          {score != null && (
            <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circumference}
              style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 12px ${color}60)` }} />
          )}
        </svg>
        
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          {score != null ? (
            <>
              <span style={{ fontFamily: F.display, fontWeight: 900, fontSize: "56px", lineHeight: 1, color, textShadow: `0 0 30px ${color}80, 0 0 60px ${color}40` }}>{display}</span>
              <span style={{ fontFamily: F.mono, fontSize: "12px", color: T.dim, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500 }}>Trust Score</span>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #2a2a4e", borderTopColor: T.accent, animation: "spin 1s linear infinite" }} />
              <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase" }}>Analyzing</span>
            </div>
          )}
        </div>
      </div>
      
      {verdict && (
        <div style={{ 
          padding: "10px 24px", 
          borderRadius: "25px", 
          border: `2px solid ${vc.border}`, 
          background: `linear-gradient(135deg, ${vc.bg} 0%, ${vc.bg}80 100%)`, 
          color: vc.color, 
          fontFamily: F.display, 
          fontWeight: 800, 
          fontSize: "14px", 
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `0 4px 20px ${vc.color}20`,
          backdropFilter: "blur(10px)"
        }}>
          {vc.label}
        </div>
      )}
    </div>
  )
}

// ── Agent Card ─────────────────────────────────────────────────────────────────

function AgentCard({ icon, title, score, summary, findings, delay = 0 }) {
  const color = scoreColor(score)
  return (
    <div style={{ 
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", 
      border: "1px solid #2a2a4e", 
      borderRadius: "16px", 
      padding: "18px", 
      display: "flex", 
      flexDirection: "column", 
      gap: "12px", 
      animation: `fadeUp 0.6s ease-out ${delay}s forwards`, 
      opacity: 0,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      backdropFilter: "blur(10px)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      cursor: "pointer"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)"
      e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)"
      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ 
            width: "36px", 
            height: "36px", 
            borderRadius: "10px", 
            background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`, 
            border: `1px solid ${color}30`, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "16px",
            boxShadow: `0 0 20px ${color}20`
          }}>
            {icon}
          </div>
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: "14px", color: T.bright }}>{title}</span>
        </div>
        {score != null
          ? <span style={{ fontFamily: F.mono, fontSize: "16px", fontWeight: 600, color, textShadow: `0 0 10px ${color}50` }}>{score}</span>
          : <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.dim, background: "#0f0f23", padding: "3px 10px", borderRadius: "6px", border: "1px solid #2a2a4e" }}>SKIPPED</span>
        }
      </div>
      
      {score != null && (
        <div style={{ height: "4px", background: "#0f0f23", borderRadius: "100px", overflow: "hidden", border: "1px solid #2a2a4e" }}>
          <div style={{ 
            height: "100%", 
            width: `${score}%`, 
            background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`, 
            borderRadius: "100px", 
            boxShadow: `0 0 10px ${color}60`, 
            transition: "width 1.2s ease-out 0.3s",
            position: "relative"
          }}>
            <div style={{ 
              position: "absolute", 
              inset: 0, 
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`, 
              animation: "shimmer 2s infinite" 
            }} />
          </div>
        </div>
      )}
      
      {summary && <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, lineHeight: "1.6", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{summary}</p>}
      
      {findings?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "10px", borderTop: "1px solid #2a2a4e" }}>
          {findings.slice(0, 2).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "8px" }}>
              <span style={{ color: T.danger, fontSize: "12px", marginTop: "1px", flexShrink: 0 }}>▸</span>
              <span style={{ fontFamily: F.body, fontSize: "12px", color: T.mid, lineHeight: "1.5", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{f}</span>
            </div>
          ))}
          {findings.length > 2 && <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.dim, fontStyle: "italic" }}>+{findings.length - 2} more findings</span>}
        </div>
      )}
    </div>
  )
}

// ── Loading Screen ─────────────────────────────────────────────────────────────

function LoadingScreen({ photoCount }) {
  const steps = [
    { label: "Parsing listing text", icon: "📝" },
    { label: "Analyzing lease contract", icon: "📄" },
    { label: "Checking market pricing", icon: "📊" },
    { label: "Comparing Street View", icon: "🏠" },
    { label: `Reverse searching ${photoCount} photo${photoCount !== 1 ? "s" : ""}`, icon: "🔎" },
    { label: "Synthesizing trust score", icon: "⚡" },
  ]
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1600)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: "32px" }}>
      <div style={{ position: "relative", width: "68px", height: "68px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #1c1c2e" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: T.accent, borderRightColor: T.accent + "80", animation: "spin 1s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🔍</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "280px" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", opacity: i <= step ? 1 : 0.2, transition: "opacity 0.4s" }}>
            <div style={{
              width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px",
              background: i < step ? `${T.safe}20` : i === step ? `${T.accent}20` : "#1a1a2e",
              border: `1px solid ${i < step ? T.safe + "40" : i === step ? T.accent + "40" : "#2a2a4e"}`,
              color: i < step ? T.safe : i === step ? T.accent : T.dim,
              boxShadow: i < step ? `0 0 15px ${T.safe}30` : i === step ? `0 0 15px ${T.accent}30` : "none"
            }}>
              {i < step ? "✓" : s.icon}
            </div>
            <span style={{ fontFamily: F.mono, fontSize: "12px", color: i === step ? T.accent : i < step ? T.safe : T.dim }}>
              {s.label}{i === step ? "..." : ""}
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.dim, letterSpacing: "0.12em" }}>4 AGENTS RUNNING IN PARALLEL</span>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState() {
  const agents = [
    { icon: "📄", label: "Contract Analysis", desc: "Illegal clauses & scam patterns" },
    { icon: "📊", label: "Market Pricing", desc: "Bait pricing detection" },
    { icon: "🏠", label: "Street View Match", desc: "Photo vs reality check" },
    { icon: "🔎", label: "Image Forensics", desc: "Stolen photo detection" },
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "32px", textAlign: "center" }} className="fade-up">
      <div>
        <div style={{ 
          width: "64px", 
          height: "64px", 
          borderRadius: "20px", 
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", 
          border: "1px solid #2a2a4e", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          fontSize: "28px", 
          margin: "0 auto 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          backdropFilter: "blur(10px)"
        }}>
          🏠
        </div>
        <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: "22px", color: T.bright, margin: "0 0 10px" }}>Ready to Investigate</h2>
        <p style={{ fontFamily: F.body, fontSize: "15px", color: T.mid, lineHeight: "1.7", maxWidth: "360px", margin: "0 auto" }}>
          Paste any rental listing and our AI agents will verify it across 4 dimensions simultaneously in under 30 seconds.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", maxWidth: "420px" }}>
        {agents.map((a, i) => (
          <div key={i} style={{ 
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", 
            border: "1px solid #2a2a4e", 
            borderRadius: "16px", 
            padding: "16px", 
            textAlign: "left", 
            animation: `fadeUp 0.5s ease-out ${0.1 + i * 0.1}s forwards`, 
            opacity: 0,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            backdropFilter: "blur(10px)",
            transition: "transform 0.2s ease",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{a.icon}</div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: "14px", color: T.bright, marginBottom: "4px" }}>{a.label}</div>
            <div style={{ fontFamily: F.mono, fontSize: "12px", color: T.mid, lineHeight: "1.5" }}>{a.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "24px", fontFamily: F.mono, fontSize: "12px", color: T.dim }}>
        <span>🔒 No data stored</span><span>⚡ ~30s analysis</span><span>🤖 4 AI agents</span>
      </div>
    </div>
  )
}

// ── Analysis Dashboard ──────────────────────────────────────────────────────────

function AnalysisDashboard({ result, imageUrls }) {
  const { trust_score, verdict, red_flags, audit_log, evidence_summary, agent_scores, action_kit, parsed_listing, listing_flags } = result
  const [copySuccess, setCopySuccess] = useState(false)
  const [agentLogs, setAgentLogs] = useState({
    contract: ["Analyzing lease contract..."],
    property: ["Fetching market data..."],
    street_view: ["Comparing with Street View..."],
    reverse_image: ["Scanning for stolen photos..."]
  })

  const label = (text) => (
    <p style={{ fontFamily: F.mono, fontSize: "12px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px", marginTop: 0 }}>{text}</p>
  )

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const downloadReport = () => {
    // Simple PDF generation - in a real app, you'd use a proper PDF library
    const reportContent = `
SUBLETSHIELD INVESTIGATION REPORT
================================

TRUST SCORE: ${trust_score}/100
VERDICT: ${verdict}

LISTING DETAILS:
- Address: ${parsed_listing?.full_address || 'N/A'}
- Rent: $${parsed_listing?.asking_rent || 'N/A'}
- Landlord: ${parsed_listing?.landlord_name || 'N/A'}

RED FLAGS FOUND:
${red_flags?.map(flag => `- ${flag}`).join('\n') || 'None'}

AGENT ANALYSIS:
Contract: ${agent_scores?.contract}/100
Market: ${agent_scores?.property}/100
Street View: ${agent_scores?.street_view}/100
Reverse Image: ${agent_scores?.reverse_image}/100

ACTION KIT:
${action_kit?.steps?.map((step, i) => `${i+1}. ${step}`).join('\n') || ''}

COPY-PASTE REPLY:
"${action_kit?.copy_paste_reply || ''}"

Generated by SubletShield - AI Fraud Detection for Student Rentals
    `
    
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subletshield-report.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

      {/* Left Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Interactive Spatial Context - Split Screen */}
        {imageUrls?.length > 0 && (
          <div style={{
            background: "rgba(10, 10, 20, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(42, 42, 78, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
          }}>
            {label("Spatial Analysis - Street View Comparison")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: "11px", color: T.accent, marginBottom: "8px" }}>UPLOADED PHOTO</div>
                <img src={imageUrls[0]} alt="Uploaded" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "8px", border: "2px solid rgba(22, 121, 183, 0.3)" }} />
              </div>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: "11px", color: T.safe, marginBottom: "8px" }}>STREET VIEW</div>
                <div style={{
                  width: "100%",
                  height: "120px",
                  background: "linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  borderRadius: "8px",
                  border: "2px solid rgba(85, 160, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.safe,
                  fontSize: "12px",
                  fontFamily: F.mono
                }}>
                  Street View Data
                </div>
              </div>
            </div>
            <div style={{
              marginTop: "12px",
              padding: "8px 12px",
              background: audit_log?.visual_verification?.street_view_match ? "rgba(85, 160, 94, 0.1)" : "rgba(185, 28, 28, 0.1)",
              border: `1px solid ${audit_log?.visual_verification?.street_view_match ? "rgba(85, 160, 94, 0.3)" : "rgba(185, 28, 28, 0.3)"}`,
              borderRadius: "6px",
              fontSize: "12px",
              color: T.mid
            }}>
              {audit_log?.visual_verification?.street_view_match ? "✓ Visual features match Street View" : "✗ Visual features don't match Street View"}
            </div>
          </div>
        )}

        {/* Linguistic Heat Map */}
        {parsed_listing?.full_text && (
          <div style={{
            background: "rgba(10, 10, 20, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(42, 42, 78, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
          }}>
            {label("Contract Analysis - Linguistic Heat Map")}
            <div style={{
              maxHeight: "200px",
              overflowY: "auto",
              fontFamily: F.body,
              fontSize: "13px",
              lineHeight: "1.6",
              color: T.mid,
              background: "rgba(15, 15, 25, 0.5)",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(42, 42, 78, 0.2)"
            }}>
              {parsed_listing.full_text.split(' ').map((word, i) => {
                const isIllegal = audit_log?.contract_compliance?.illegal_clauses?.some(clause => 
                  clause.toLowerCase().includes(word.toLowerCase())
                )
                const isRedFlag = listing_flags?.some(flag => 
                  flag.toLowerCase().includes(word.toLowerCase())
                )
                
                return (
                  <span key={i} style={{
                    backgroundColor: isIllegal ? 'rgba(185, 28, 28, 0.3)' : isRedFlag ? 'rgba(217, 119, 6, 0.3)' : 'transparent',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    margin: '0 1px'
                  }}>
                    {word}{' '}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Agent Thought Logs */}
        <div style={{
          background: "rgba(10, 10, 20, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(42, 42, 78, 0.3)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
        }}>
          {label("Agent Activity Logs")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {Object.entries(agentLogs).map(([agent, logs]) => (
              <div key={agent} style={{
                background: "rgba(15, 15, 25, 0.5)",
                border: "1px solid rgba(42, 42, 78, 0.2)",
                borderRadius: "8px",
                padding: "12px"
              }}>
                <div style={{ fontFamily: F.mono, fontSize: "10px", color: T.accent, marginBottom: "8px", textTransform: "uppercase" }}>
                  {agent.replace('_', ' ')} agent
                </div>
                <div style={{ fontFamily: F.mono, fontSize: "11px", color: T.mid, lineHeight: "1.4" }}>
                  {logs[logs.length - 1]}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Market Pressure Gauge */}
        {audit_log?.property_analysis && (
          <div style={{
            background: "rgba(10, 10, 20, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(42, 42, 78, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
          }}>
            {label("Market Pressure Analysis")}
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: T.bright, marginBottom: "4px" }}>
                ${audit_log.property_analysis.asking_rent}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: "12px", color: T.mid }}>Asking Rent</div>
            </div>
            
            {/* Simple histogram visualization */}
            <div style={{ display: "flex", alignItems: "end", justifyContent: "center", gap: "4px", height: "80px", marginBottom: "12px" }}>
              {[0.3, 0.5, 0.8, 0.6, 0.4, 0.2, 0.1].map((height, i) => (
                <div key={i} style={{
                  width: "20px",
                  height: `${height * 100}%`,
                  background: i === 3 ? scoreColor(agent_scores?.property) : "rgba(42, 42, 78, 0.5)",
                  borderRadius: "2px 2px 0 0",
                  position: "relative"
                }}>
                  {i === 3 && (
                    <div style={{
                      position: "absolute",
                      top: "-20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "10px",
                      color: T.accent,
                      fontFamily: F.mono
                    }}>
                      YOUR LISTING
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: F.mono, fontSize: "12px", color: T.mid, marginBottom: "4px" }}>
                Market Average: ${audit_log.property_analysis.market_average}
              </div>
              <div style={{
                fontFamily: F.mono,
                fontSize: "11px",
                color: agent_scores?.property < 50 ? T.danger : T.safe
              }}>
                {agent_scores?.property < 50 ? "⚠️ Above market rate" : "✅ Fair market value"}
              </div>
            </div>
          </div>
        )}

        {/* Action Kit */}
        {action_kit && (
          <div style={{
            background: "rgba(10, 10, 20, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(42, 42, 78, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
          }}>
            {label("Defense Action Plan")}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {action_kit.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: "12px" }}>
                  <span style={{
                    fontFamily: F.mono,
                    fontSize: "12px",
                    color: T.danger,
                    background: "rgba(185, 28, 28, 0.2)",
                    border: "1px solid rgba(185, 28, 28, 0.3)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    flexShrink: 0
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: F.body, fontSize: "13px", color: T.bright, lineHeight: "1.5" }}>{s}</span>
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: "16px",
              padding: "12px",
              background: "rgba(15, 15, 25, 0.5)",
              border: "1px solid rgba(42, 42, 78, 0.2)",
              borderRadius: "8px"
            }}>
              <div style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, marginBottom: "8px", letterSpacing: "0.1em" }}>
                COPY-PASTE REPLY TO LANDLORD
              </div>
              <div style={{ fontFamily: F.body, fontSize: "12px", color: T.mid, lineHeight: "1.6", fontStyle: "italic", marginBottom: "8px" }}>
                "{action_kit.copy_paste_reply}"
              </div>
              <button onClick={() => handleCopy(action_kit.copy_paste_reply)}
                style={{
                  fontFamily: F.mono,
                  fontSize: "11px",
                  color: copySuccess ? T.safe : T.accent,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.2s"
                }}>
                {copySuccess ? "✓ Copied!" : "📋 Copy to clipboard"}
              </button>
            </div>
            
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={downloadReport} style={{
                flex: 1,
                padding: "10px",
                background: "linear-gradient(135deg, #1679B7 0%, #0F4C75 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontFamily: F.display,
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                📄 Download Report
              </button>
              
              {Object.entries(action_kit.reporting_links).map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: "rgba(185, 28, 28, 0.2)",
                    border: "1px solid rgba(185, 28, 28, 0.3)",
                    color: T.danger,
                    fontFamily: F.display,
                    fontWeight: 700,
                    fontSize: "11px",
                    padding: "10px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(185, 28, 28, 0.3)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(185, 28, 28, 0.2)"}>
                  {label} →
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {red_flags?.length > 0 && (
          <div style={{
            background: "rgba(10, 10, 20, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(185, 28, 28, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 32px rgba(185, 28, 28, 0.2)"
          }}>
            {label(`Critical Red Flags (${red_flags.length})`)}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {red_flags.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: "10px" }}>
                  <span style={{ color: T.danger, fontSize: "14px", marginTop: "1px", flexShrink: 0 }}>🚨</span>
                  <span style={{ fontFamily: F.body, fontSize: "13px", color: T.bright, lineHeight: "1.5" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Input Panel ────────────────────────────────────────────────────────────────

function InputPanel({ onResult, onLoading, loading }) {
  const [listingText, setListingText] = useState("")
  const [officeAddress, setOfficeAddress] = useState("")
  const [leasePdf, setLeasePdf] = useState(null)
  const [listingImages, setListingImages] = useState([])  // multiple images
  const [parsedPreview, setParsedPreview] = useState(null)
  const parseRef = useRef(null)

  useEffect(() => {
    if (listingText.length < 60) { setParsedPreview(null); return }
    clearTimeout(parseRef.current)
    parseRef.current = setTimeout(async () => {
      try {
        const form = new FormData()
        form.append("listing_text", listingText)
        const res = await axios.post(`${API}/parse-listing`, form)
        setParsedPreview(res.data)
      } catch {}
    }, 900)
    return () => clearTimeout(parseRef.current)
  }, [listingText])

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files)
    setListingImages(prev => [...prev, ...files].slice(0, 6)) // cap at 6
  }

  const removeImage = (idx) => setListingImages(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!listingText || !officeAddress || loading) return
    onLoading(true)
    try {
      const form = new FormData()
      form.append("listing_text", listingText)
      form.append("office_address", officeAddress)
      if (leasePdf) form.append("lease_pdf", leasePdf)
      listingImages.forEach(img => form.append("listing_images", img))
      const res = await axios.post(`${API}/investigate`, form)
      const imageUrls = listingImages.map(img => URL.createObjectURL(img))
      onResult(res.data, imageUrls)
    } catch (err) {
      console.error(err)
    } finally {
      onLoading(false)
    }
  }

  const inputStyle = {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", 
    border: "1px solid #2a2a4e", 
    borderRadius: "12px",
    padding: "14px 16px", 
    fontSize: "14px", 
    color: T.bright,
    fontFamily: F.body, 
    width: "100%", 
    outline: "none", 
    transition: "all 0.3s ease",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    backdropFilter: "blur(10px)"
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* Logo */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `linear-gradient(135deg, ${T.accent}20 0%, ${T.accent}10 100%)`, border: `1px solid ${T.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: `0 0 20px ${T.accent}20` }}>🔍</div>
          <h1 style={{ fontFamily: F.display, fontWeight: 800, fontSize: "21px", color: T.bright, margin: 0 }}>SubletShield</h1>
        </div>
        <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, margin: 0, lineHeight: "1.6" }}>AI fraud detection for student rentals. Paste any listing to investigate.</p>
      </div>

      <div style={{ height: "1px", background: "#1c1c2e" }} />

      {/* Listing textarea */}
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        <label style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase" }}>Paste Listing Text</label>
        <textarea value={listingText} onChange={e => setListingText(e.target.value)}
          placeholder={"URGENT!! Rent: $900/month\n2 Beds, 1 Bath — 123 Main St\n\nPaste the full listing here..."}
          rows={6} style={{ ...inputStyle, resize: "none", lineHeight: "1.6" }}
          onFocus={e => {
            e.target.style.borderColor = "#00d4ff50"
            e.target.style.boxShadow = "0 0 20px rgba(0,212,255,0.2), 0 2px 10px rgba(0,0,0,0.2)"
          }}
          onBlur={e => {
            e.target.style.borderColor = "#2a2a4e"
            e.target.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)"
          }} />
      </div>

      {/* Parse preview */}
      {parsedPreview?.status === "ok" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.accent }} className="pulse-glow" />
            <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.accent }}>Listing parsed</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {parsedPreview.full_address && <span style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #2a2a4e", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: T.mid, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>📍 {parsedPreview.full_address}</span>}
            {parsedPreview.asking_rent && <span style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #2a2a4e", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: T.mid, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>💰 ${parsedPreview.asking_rent}/mo</span>}
            {parsedPreview.landlord_name && <span style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #2a2a4e", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: T.mid, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>👤 {parsedPreview.landlord_name}</span>}
            {parsedPreview.listing_flags?.map((f, i) => (
              <span key={i} style={{ background: `linear-gradient(135deg, ${T.warning}15 0%, ${T.warning}08 100%)`, border: `1px solid ${T.warning}30`, borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: T.warning, boxShadow: `0 2px 8px ${T.warning}15` }}>⚠ {f}</span>
            ))}
          </div>
          {parsedPreview.missing_fields?.length > 0 && (
            <p style={{ fontFamily: F.mono, fontSize: "11px", color: T.warning, margin: 0 }}>Missing: {parsedPreview.missing_fields.join(", ")}</p>
          )}
        </div>
      )}

      {/* Office address */}
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        <label style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase" }}>Your Campus / Office Address</label>
        <input value={officeAddress} onChange={e => setOfficeAddress(e.target.value)}
          placeholder="500 S State St, Ann Arbor, MI 48109" style={inputStyle}
          onFocus={e => {
            e.target.style.borderColor = "#00d4ff50"
            e.target.style.boxShadow = "0 0 20px rgba(0,212,255,0.2), 0 2px 10px rgba(0,0,0,0.2)"
          }}
          onBlur={e => {
            e.target.style.borderColor = "#2a2a4e"
            e.target.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)"
          }} />
      </div>

      {/* Multi-image upload */}
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Listing Photos {listingImages.length > 0 && <span style={{ color: T.accent }}>({listingImages.length})</span>}
          </label>
          {listingImages.length > 0 && (
            <span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim }}>First used for Street View</span>
          )}
        </div>

        {/* Image thumbnails */}
        {listingImages.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {listingImages.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={URL.createObjectURL(img)} alt="" style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: `1px solid ${i === 0 ? "#e8ff4740" : "#1c1c2e"}` }} />
                {i === 0 && <span style={{ position: "absolute", top: "2px", left: "2px", background: "#000000cc", fontFamily: F.mono, fontSize: "8px", color: T.accent, padding: "1px 4px", borderRadius: "3px" }}>1st</span>}
                <button onClick={() => removeImage(i)} style={{ position: "absolute", top: "2px", right: "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#ff475790", border: "none", color: "white", fontSize: "9px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
              </div>
            ))}
            {listingImages.length < 6 && (
              <label style={{ width: "64px", height: "64px", borderRadius: "8px", border: "1px dashed #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "18px", color: T.dim }}>
                +<input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImagesChange} />
              </label>
            )}
          </div>
        )}

        {listingImages.length === 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: "10px", background: "#0e0e1a", border: "1px dashed #1c1c2e", borderRadius: "10px", padding: "12px 14px", cursor: "pointer", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#e8ff4740"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1c1c2e"}>
            <span style={{ fontSize: "20px" }}>📸</span>
            <div>
              <div style={{ fontFamily: F.body, fontSize: "13px", color: T.mid }}>Upload listing photos</div>
              <div style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim }}>Up to 6 · All searched for stolen images</div>
            </div>
            <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImagesChange} />
          </label>
        )}
      </div>

      {/* PDF upload */}
      <label style={{ display: "flex", alignItems: "center", gap: "10px", background: "#0e0e1a", border: `1px dashed ${leasePdf ? "#00e67640" : "#1c1c2e"}`, borderRadius: "10px", padding: "12px 14px", cursor: "pointer", transition: "border-color 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = leasePdf ? "#00e67640" : "#e8ff4740"}
        onMouseLeave={e => e.currentTarget.style.borderColor = leasePdf ? "#00e67640" : "#1c1c2e"}>
        <span style={{ fontSize: "20px" }}>{leasePdf ? "✅" : "📄"}</span>
        <div>
          <div style={{ fontFamily: F.body, fontSize: "13px", color: leasePdf ? T.safe : T.mid }}>{leasePdf ? leasePdf.name : "Upload Lease PDF"}</div>
          <div style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim }}>Optional · Enables contract analysis</div>
        </div>
        <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setLeasePdf(e.target.files[0])} />
      </label>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading || !listingText || !officeAddress}
        style={{
          width: "100%", padding: "16px", borderRadius: "12px", border: "none",
          cursor: loading || !listingText || !officeAddress ? "not-allowed" : "pointer",
          background: loading || !listingText || !officeAddress 
            ? "linear-gradient(135deg, #2a2a4e 0%, #1a1a2e 100%)" 
            : "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
          color: loading || !listingText || !officeAddress ? T.dim : "#ffffff",
          fontFamily: F.display, fontWeight: 900, fontSize: "14px", letterSpacing: "0.08em", textTransform: "uppercase",
          transition: "all 0.3s ease", 
          boxShadow: loading || !listingText || !officeAddress 
            ? "0 2px 10px rgba(0,0,0,0.2)" 
            : "0 8px 30px rgba(0,212,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transform: loading || !listingText || !officeAddress ? "none" : "translateY(0px)"
        }}
        onMouseEnter={(e) => {
          if (!(loading || !listingText || !officeAddress)) {
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,212,255,0.6), inset 0 1px 0 rgba(255,255,255,0.3)"
          }
        }}
        onMouseLeave={(e) => {
          if (!(loading || !listingText || !officeAddress)) {
            e.currentTarget.style.transform = "translateY(0px)"
            e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,212,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
          }
        }}>
        {loading
          ? <><span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#ffffff", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} />Analyzing...</>
          : `🚀 Investigate${listingImages.length > 0 ? ` · ${listingImages.length} Photo${listingImages.length > 1 ? "s" : ""}` : ""}`
        }
      </button>

      <p style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, textAlign: "center", margin: 0 }}>
        All photos searched for stolen images · First photo used for Street View
      </p>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [imageUrls, setImageUrls] = useState([])
  const [photoCount, setPhotoCount] = useState(0)
  const resultsRef = useRef(null)

  const handleResult = (data, urls) => {
    setResult(data)
    setImageUrls(urls)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const handleLoading = (state, count = 0) => {
    setLoading(state)
    if (state) setPhotoCount(count)
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a14 0%, #0f0f1a 50%, #0a0a14 100%)" }}>
      {/* Animated background elements */}
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.1, pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "-10%", left: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(22, 121, 183, 0.08) 0%, transparent 70%)", pointerEvents: "none", animation: "float 20s ease-in-out infinite" }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-20%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(85, 160, 94, 0.06) 0%, transparent 70%)", pointerEvents: "none", animation: "float 25s ease-in-out infinite reverse" }} />
      <div style={{ position: "fixed", top: "50%", left: "70%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255, 203, 5, 0.05) 0%, transparent 70%)", pointerEvents: "none", animation: "float 15s ease-in-out infinite" }} />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex" }}>
        {/* Left Sidebar - Evidence Locker */}
        <div style={{
          width: "380px",
          background: "rgba(10, 10, 20, 0.95)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(42, 42, 78, 0.3)",
          padding: "32px 24px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
          boxShadow: "4px 0 32px rgba(0,0,0,0.3)"
        }}>
          <InputPanel onResult={handleResult} onLoading={setLoading} loading={loading} />
        </div>

        {/* Central Dashboard */}
        <div style={{ marginLeft: "380px", flex: 1, padding: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Trust Score Header */}
          {result && (
            <div style={{
              background: "rgba(10, 10, 20, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(42, 42, 78, 0.3)",
              borderRadius: "24px",
              padding: "24px 48px",
              marginBottom: "32px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
              textAlign: "center"
            }}>
              <div style={{ fontFamily: F.mono, fontSize: "14px", color: T.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
                Overall Scam Risk Assessment
              </div>
              <div style={{ fontSize: "72px", fontWeight: "900", color: scoreColor(result.trust_score), fontFamily: F.display, marginBottom: "8px" }}>
                {result.trust_score ?? "--"}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: "16px", color: T.mid, letterSpacing: "0.05em" }}>
                {result.verdict ? verdictConfig(result.verdict).label : "Analysis Pending"}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div ref={resultsRef} style={{ width: "100%", maxWidth: "1200px" }}>
            {loading ? (
              <div style={{
                background: "rgba(10, 10, 20, 0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(42, 42, 78, 0.3)",
                borderRadius: "24px",
                padding: "48px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                textAlign: "center"
              }}>
                <LoadingScreen photoCount={photoCount} />
              </div>
            ) : result ? (
              <AnalysisDashboard result={result} imageUrls={imageUrls} />
            ) : (
              <div style={{
                background: "rgba(10, 10, 20, 0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(42, 42, 78, 0.3)",
                borderRadius: "24px",
                padding: "48px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                textAlign: "center"
              }}>
                <EmptyState />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}