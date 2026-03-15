import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "http://localhost:8000"

const scoreColor = (s) => {
  if (s == null) return "#9999bb"
  if (s >= 70) return "#00e676"
  if (s >= 40) return "#ffaa00"
  return "#ff4757"
}

const verdictConfig = (v) => ({
  "Likely Scam":         { label: "⚠ LIKELY SCAM",         bg: "#ff475715", border: "#ff475750", color: "#ff4757", glow: "rgba(255,71,87,0.15)" },
  "Investigate Further": { label: "⚡ INVESTIGATE FURTHER",  bg: "#ffaa0015", border: "#ffaa0050", color: "#ffaa00", glow: "rgba(255,170,0,0.1)" },
  "Appears Legitimate":  { label: "✓ APPEARS LEGITIMATE",   bg: "#00e67615", border: "#00e67650", color: "#00e676", glow: "rgba(0,230,118,0.1)" },
}[v] || { label: "— PENDING", bg: "#ffffff10", border: "#ffffff20", color: "#9999bb", glow: "transparent" })

const T = { bright: "#eeeef5", mid: "#bbbbdd", dim: "#9999bb", accent: "#e8ff47", danger: "#ff4757", warning: "#ffaa00", safe: "#00e676" }
const F = { display: "'Syne', sans-serif", body: "'DM Sans', sans-serif", mono: "'DM Mono', monospace" }

// ── Animated Score Ring ───────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const [display, setDisplay] = useState(0)
  const circumference = 339.3
  const offset = score != null ? circumference - (score / 100) * circumference : circumference
  const color = scoreColor(score)

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
    <div style={{ position: "relative", width: "130px", height: "130px", flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }} />
      <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#1c1c2e" strokeWidth="7" />
        {score != null && (
          <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 10px ${color})` }} />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: "38px", lineHeight: 1, color, textShadow: `0 0 20px ${color}80` }}>{display}</span>
        <span style={{ fontFamily: F.mono, fontSize: "8px", color: T.dim, letterSpacing: "0.2em", marginTop: "2px" }}>/ 100</span>
      </div>
    </div>
  )
}

// ── Agent Row ─────────────────────────────────────────────────────────────────
function AgentRow({ icon, title, score, signal, delay }) {
  const color = scoreColor(score)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", animation: `fadeUp 0.4s ease-out ${delay}s forwards`, opacity: 0 }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#0e0e1a", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 }}>{icon}</div>
      <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: "12px", color: T.mid, width: "90px", flexShrink: 0 }}>{title}</span>
      <div style={{ flex: 1, height: "4px", background: "#1c1c2e", borderRadius: "100px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score ?? 0}%`, background: color, borderRadius: "100px", boxShadow: `0 0 6px ${color}80`, transition: "width 1.2s ease-out 0.4s" }} />
      </div>
      <span style={{ fontFamily: F.mono, fontSize: "13px", fontWeight: 600, color, width: "28px", textAlign: "right", flexShrink: 0 }}>{score ?? "—"}</span>
      {signal && <span style={{ fontFamily: F.body, fontSize: "11px", color: T.dim, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{signal}</span>}
    </div>
  )
}

// ── Evidence Panel ────────────────────────────────────────────────────────────
function EvidencePanel({ result, imageUrls }) {
  const { audit_log, evidence_summary, agent_scores } = result
  const [openSection, setOpenSection] = useState(null)

  const Section = ({ id, icon, title, score, children }) => {
    const isOpen = openSection === id
    const color = scoreColor(score)
    return (
      <div style={{ border: "1px solid #1c1c2e", borderRadius: "12px", overflow: "hidden" }}>
        <button onClick={() => setOpenSection(isOpen ? null : id)}
          style={{ width: "100%", padding: "12px 14px", background: isOpen ? "#12121e" : "#0e0e1a", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px" }}>{icon}</span>
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: "13px", color: T.bright, flex: 1, textAlign: "left" }}>{title}</span>
          <span style={{ fontFamily: F.mono, fontSize: "13px", color, fontWeight: 600 }}>{score ?? "—"}</span>
          <span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, marginLeft: "4px" }}>{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && (
          <div style={{ padding: "14px", borderTop: "1px solid #1c1c2e", background: "#080810" }}>
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.dim, letterSpacing: "0.15em", margin: "0 0 4px" }}>AGENT EVIDENCE — CLICK TO EXPAND</p>

      {/* Contract */}
      <Section id="contract" icon="📄" title="Contract Analysis" score={agent_scores?.contract}>
        <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, margin: "0 0 10px", lineHeight: "1.6" }}>{evidence_summary?.contract || "No lease document provided."}</p>
        {audit_log?.contract_compliance?.illegal_clauses?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {audit_log.contract_compliance.illegal_clauses.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: "6px" }}>
                <span style={{ color: T.danger, fontSize: "10px", flexShrink: 0, marginTop: "2px" }}>▸</span>
                <span style={{ fontFamily: F.body, fontSize: "12px", color: T.mid }}>{f}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Market */}
      <Section id="market" icon="📊" title="Market Pricing" score={agent_scores?.property}>
        <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, margin: "0 0 10px", lineHeight: "1.6" }}>{evidence_summary?.property}</p>
        {audit_log?.property_analysis?.asking_rent && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            <div style={{ background: "#12121e", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
              <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.dim, margin: "0 0 4px" }}>ASKING RENT</p>
              <p style={{ fontFamily: F.display, fontWeight: 700, fontSize: "20px", color: T.danger, margin: 0 }}>${audit_log.property_analysis.asking_rent}/mo</p>
            </div>
            <div style={{ background: "#12121e", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
              <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.dim, margin: "0 0 4px" }}>MARKET AVG</p>
              <p style={{ fontFamily: F.display, fontWeight: 700, fontSize: "20px", color: T.safe, margin: 0 }}>${audit_log.property_analysis.market_average}/mo</p>
            </div>
          </div>
        )}
        {audit_log?.property_analysis?.deviation_pct && (
          <div style={{ background: "#ff475710", border: "1px solid #ff475730", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: "13px", color: T.danger }}>
              {audit_log.property_analysis.deviation_pct}% below market — bait pricing signal
            </span>
          </div>
        )}
      </Section>

      {/* Street View */}
      <Section id="streetview" icon="🏠" title="Street View Match" score={agent_scores?.street_view}>
        <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, margin: "0 0 10px", lineHeight: "1.6" }}>{evidence_summary?.street_view}</p>
        {(audit_log?.visual_verification?.street_view_image || imageUrls?.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.dim, margin: "0 0 5px" }}>GOOGLE STREET VIEW</p>
                {audit_log?.visual_verification?.street_view_image
                  ? <img src={audit_log.visual_verification.street_view_image} alt="Street View" style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "8px", border: "1px solid #1c1c2e" }} />
                  : <div style={{ width: "100%", height: "110px", background: "#12121e", borderRadius: "8px", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim }}>No imagery</span></div>
                }
                {audit_log?.visual_verification?.street_view_description && (
                  <p style={{ fontFamily: F.body, fontSize: "10px", color: T.dim, fontStyle: "italic", margin: "4px 0 0" }}>"{audit_log.visual_verification.street_view_description}"</p>
                )}
              </div>
              <div>
                <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.dim, margin: "0 0 5px" }}>LISTING PHOTO</p>
                {imageUrls?.[0]
                  ? <img src={imageUrls[0]} alt="Listing" style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "8px", border: "1px solid #1c1c2e" }} />
                  : <div style={{ width: "100%", height: "110px", background: "#12121e", borderRadius: "8px", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim }}>No photo</span></div>
                }
                {audit_log?.visual_verification?.listing_description && (
                  <p style={{ fontFamily: F.body, fontSize: "10px", color: T.dim, fontStyle: "italic", margin: "4px 0 0" }}>"{audit_log.visual_verification.listing_description}"</p>
                )}
              </div>
            </div>
            <div style={{ background: audit_log?.visual_verification?.street_view_match ? "#00e67608" : "#ff475708", border: `1px solid ${audit_log?.visual_verification?.street_view_match ? "#00e67630" : "#ff475730"}`, borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{audit_log?.visual_verification?.street_view_match ? "✅" : "❌"}</span>
              <span style={{ fontFamily: F.body, fontSize: "12px", color: T.bright, flex: 1 }}>
                {audit_log?.visual_verification?.street_view_match ? "Buildings appear consistent" : "Building mismatch detected"}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: "12px", fontWeight: 600, color: scoreColor(audit_log?.visual_verification?.street_view_score) }}>
                {audit_log?.visual_verification?.street_view_score ?? "—"}/100
              </span>
            </div>
            {(audit_log?.visual_verification?.mismatching_features?.length > 0) && (
              <div>
                <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.danger, letterSpacing: "0.1em", margin: "0 0 5px" }}>MISMATCHING FEATURES</p>
                {audit_log.visual_verification.mismatching_features.map((f, i) => (
                  <p key={i} style={{ fontFamily: F.body, fontSize: "12px", color: T.mid, margin: "0 0 3px" }}>▸ {f}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Reverse Image */}
      <Section id="reverseimage" icon="🔎" title="Reverse Image Search" score={agent_scores?.reverse_image}>
        <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, margin: "0 0 10px", lineHeight: "1.6" }}>{evidence_summary?.reverse_image}</p>
        {audit_log?.visual_verification?.real_estate_matches?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.danger, letterSpacing: "0.1em", margin: "0 0 4px" }}>PHOTO FOUND ON THESE PLATFORMS</p>
            {audit_log.visual_verification.real_estate_matches.map((match, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "8px", padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: F.mono, fontSize: "10px", color: T.accent, background: "#e8ff4710", border: "1px solid #e8ff4730", borderRadius: "4px", padding: "1px 7px" }}>{match.platform}</span>
                  <span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {match.url?.replace(/https?:\/\//, "").slice(0, 35)}…
                  </span>
                </div>
                <a href={match.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: F.mono, fontSize: "10px", color: T.accent, textDecoration: "none" }}>View →</a>
              </div>
            ))}
            {audit_log.visual_verification.reverse_image_mismatches?.length > 0 && (
              <div style={{ borderTop: "1px solid #ff475720", paddingTop: "8px", marginTop: "4px" }}>
                <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.danger, letterSpacing: "0.1em", margin: "0 0 5px" }}>ADDRESS MISMATCH</p>
                {audit_log.visual_verification.reverse_image_mismatches.map((m, i) => (
                  <p key={i} style={{ fontFamily: F.body, fontSize: "12px", color: T.bright, margin: "0 0 3px" }}>▸ {m}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Action Panel ──────────────────────────────────────────────────────────────
function ActionPanel({ action_kit, verdict }) {
  if (!action_kit) return null
  const vc = verdictConfig(verdict)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px", background: vc.bg, border: `1px solid ${vc.border}`, borderRadius: "12px" }}>
        <span style={{ fontSize: "20px" }}>{verdict === "Likely Scam" ? "🚨" : verdict === "Investigate Further" ? "⚡" : "✅"}</span>
        <p style={{ fontFamily: F.display, fontWeight: 700, fontSize: "15px", color: vc.color, margin: 0 }}>{action_kit.headline}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {action_kit.steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ fontFamily: F.mono, fontSize: "11px", color: vc.color, background: `${vc.border}40`, border: `1px solid ${vc.border}`, borderRadius: "5px", padding: "2px 7px", flexShrink: 0, minWidth: "28px", textAlign: "center" }}>0{i + 1}</span>
            <span style={{ fontFamily: F.body, fontSize: "13px", color: T.bright, lineHeight: "1.5" }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "10px", padding: "14px" }}>
        <p style={{ fontFamily: F.mono, fontSize: "9px", color: T.dim, marginBottom: "8px", letterSpacing: "0.1em" }}>COPY-PASTE REPLY TO LANDLORD</p>
        <p style={{ fontFamily: F.body, fontSize: "12px", color: T.mid, lineHeight: "1.6", fontStyle: "italic", margin: "0 0 10px" }}>"{action_kit.copy_paste_reply}"</p>
        <button onClick={() => navigator.clipboard.writeText(action_kit.copy_paste_reply)}
          style={{ fontFamily: F.mono, fontSize: "11px", color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Copy to clipboard →
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Object.keys(action_kit.reporting_links).length}, 1fr)`, gap: "8px" }}>
        {Object.entries(action_kit.reporting_links).map(([lbl, url]) => (
          <a key={lbl} href={url} target="_blank" rel="noopener noreferrer"
            style={{ textAlign: "center", background: `${vc.border}25`, border: `1px solid ${vc.border}`, color: vc.color, fontFamily: F.display, fontWeight: 700, fontSize: "12px", padding: "10px", borderRadius: "9px", textDecoration: "none" }}>
            {lbl} →
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Results Dashboard ──────────────────────────────────────────────────────────
function ResultsDashboard({ result, imageUrls }) {
  const { trust_score, verdict, audit_log, agent_scores, action_kit, parsed_listing, listing_flags, correlations, investigation_summary, evidence_summary } = result
  const vc = verdictConfig(verdict)
  const [activePanel, setActivePanel] = useState(null)

  const agentSignals = {
    contract: audit_log?.contract_compliance?.illegal_clauses?.[0] || (agent_scores?.contract === 50 ? "No lease uploaded" : evidence_summary?.contract),
    property: audit_log?.property_analysis?.price_discrepancy_flag
      ? `$${audit_log.property_analysis.asking_rent} vs avg $${audit_log.property_analysis.market_average}`
      : null,
    street_view: agent_scores?.street_view === 50 ? "No photo uploaded" :
                 audit_log?.visual_verification?.street_view_match === false ? "Building mismatch" :
                 audit_log?.visual_verification?.street_view_match === true ? "Match confirmed" : null,
    reverse_image: agent_scores?.reverse_image === 50 ? "No photo uploaded" :
                   audit_log?.visual_verification?.real_estate_matches?.length > 0
                     ? `Found on ${audit_log.visual_verification.real_estate_matches.map(m => m.platform).join(", ")}`
                     : "No matches found"
  }

  

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* ── VERDICT CARD ── */}
      <div style={{ background: "#12121e", border: `1px solid ${vc.border}`, borderRadius: "20px", overflow: "hidden", boxShadow: `0 0 40px ${vc.glow}` }} className="fade-up">

        {/* Score + verdict + address */}
        <div style={{ padding: "20px 24px", display: "flex", gap: "20px", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div className="bg-grid" style={{ position: "absolute", inset: 0, opacity: 0.2 }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "20px", alignItems: "center", width: "100%", flexWrap: "wrap" }}>
            <ScoreRing score={trust_score} />
            <div style={{ flex: 1, minWidth: "180px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Verdict badge only */}
              <div style={{ padding: "8px 18px", borderRadius: "100px", border: `1px solid ${vc.border}`, background: vc.bg, color: vc.color, fontFamily: F.display, fontWeight: 800, fontSize: "15px", letterSpacing: "0.08em", alignSelf: "flex-start", boxShadow: `0 0 20px ${vc.glow}` }}>
                {vc.label}
              </div>
              {/* Correlated agents + explanation */}
              {correlations?.length > 0 && (() => {
                const agentIcons = { "Contract": "📄", "Market Data": "📊", "Street View": "🏠", "Reverse Image": "🔎" }
                const topCorr = correlations[0]
                const agentsInvolved = [...new Set(correlations.flatMap(c => c.agents))]
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                      {agentsInvolved.map((a, i) => (
                        <span key={i} style={{ fontFamily: F.mono, fontSize: "10px", color: T.warning, background: "#ffaa0012", border: "1px solid #ffaa0030", borderRadius: "6px", padding: "2px 8px" }}>
                          {agentIcons[a] || "⚠"} {a}
                        </span>
                      ))}
                      <span style={{ fontFamily: F.body, fontSize: "11px", color: T.dim }}>flagged this listing</span>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: "12px", color: T.dim, margin: 0, lineHeight: "1.5", borderLeft: `2px solid ${vc.border}`, paddingLeft: "10px" }}>
                      {topCorr.message}
                    </p>
                  </div>
                )
              })()}
              {investigation_summary && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontFamily: F.mono, fontSize: "9px", color: T.dim, letterSpacing: "0.2em" }}>INVESTIGATION SUMMARY</span>
                  <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, margin: 0, lineHeight: "1.6" }}>
                    {investigation_summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent score rows */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #1c1c2e", background: "#0e0e1a", display: "flex", flexDirection: "column", gap: "10px" }}>
          <AgentRow icon="📄" title="Contract" score={agent_scores?.contract} signal={agentSignals.contract} delay={0.05} />
          <AgentRow icon="📊" title="Market Data" score={agent_scores?.property} signal={agentSignals.property} delay={0.1} />
          <AgentRow icon="🏠" title="Street View" score={agent_scores?.street_view} signal={agentSignals.street_view} delay={0.15} />
          <AgentRow icon="🔎" title="Reverse Image" score={agent_scores?.reverse_image} signal={agentSignals.reverse_image} delay={0.2} />
        </div>

        {/* Listing flags — compact */}
        {listing_flags?.length > 0 && (
          <div style={{ padding: "8px 24px", borderTop: "1px solid #1c1c2e", display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {listing_flags.map((f, i) => (
              <span key={i} style={{ background: "#ffaa0010", border: "1px solid #ffaa0030", color: T.warning, fontFamily: F.mono, fontSize: "9px", padding: "2px 8px", borderRadius: "100px" }}>⚠ {f}</span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #1c1c2e", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button onClick={() => setActivePanel(activePanel === "evidence" ? null : "evidence")}
            style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${activePanel === "evidence" ? "#e8ff4750" : "#1c1c2e"}`, background: activePanel === "evidence" ? "#e8ff4710" : "#0e0e1a", color: activePanel === "evidence" ? T.accent : T.mid, fontFamily: F.display, fontWeight: 700, fontSize: "12px", cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.05em" }}>
            📋 {activePanel === "evidence" ? "Hide Evidence" : "View Evidence"}
          </button>
          <button onClick={() => setActivePanel(activePanel === "action" ? null : "action")}
            style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${activePanel === "action" ? `${vc.border}` : "#1c1c2e"}`, background: activePanel === "action" ? vc.bg : "#0e0e1a", color: activePanel === "action" ? vc.color : T.mid, fontFamily: F.display, fontWeight: 700, fontSize: "12px", cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.05em" }}>
            {verdict === "Likely Scam" ? "🚨" : "⚡"} {activePanel === "action" ? "Hide Steps" : "What To Do Next"}
          </button>
        </div>
      </div>

      {/* ── PANEL: Evidence ── */}
      {activePanel === "evidence" && (
        <div style={{ animation: "fadeUp 0.3s ease-out forwards" }}>
          <EvidencePanel result={result} imageUrls={imageUrls} />
        </div>
      )}

      {/* ── PANEL: Action ── */}
      {activePanel === "action" && (
        <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "16px", padding: "20px", animation: "fadeUp 0.3s ease-out forwards" }}>
          <ActionPanel action_kit={action_kit} verdict={verdict} />
        </div>
      )}

    </div>
  )
}

// ── Loading Screen ─────────────────────────────────────────────────────────────
function LoadingScreen({ photoCount }) {
  const steps = [
    { label: "Parsing listing text", icon: "📝" },
    { label: "Checking market pricing", icon: "📊" },
    { label: "Comparing Street View", icon: "🏠" },
    { label: `Reverse searching ${photoCount || 0} photo${photoCount !== 1 ? "s" : ""}`, icon: "🔎" },
    { label: "Synthesizing investigation", icon: "⚡" },
  ]
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1800)
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
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", background: i < step ? "#00e67615" : i === step ? "#e8ff4715" : "#12121e", border: `1px solid ${i < step ? "#00e67640" : i === step ? "#e8ff4740" : "#1c1c2e"}`, color: i < step ? T.safe : i === step ? T.accent : T.dim }}>
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
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "24px", textAlign: "center" }} className="fade-up">
      <div>
        <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#0e0e1a", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", margin: "0 auto 14px" }}>🏠</div>
        <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: "20px", color: T.bright, margin: "0 0 8px" }}>Ready to Investigate</h2>
        <p style={{ fontFamily: F.body, fontSize: "14px", color: T.mid, lineHeight: "1.7", maxWidth: "340px", margin: "0 auto" }}>
          Paste any rental listing and our AI agents will verify it across 4 dimensions in under 30 seconds.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", maxWidth: "400px" }}>
        {[
          { icon: "📄", label: "Contract Analysis", desc: "Illegal clauses & scam patterns" },
          { icon: "📊", label: "Market Pricing", desc: "Bait pricing detection" },
          { icon: "🏠", label: "Street View Match", desc: "Photo vs reality check" },
          { icon: "🔎", label: "Image Forensics", desc: "Stolen photo detection" },
        ].map((a, i) => (
          <div key={i} style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "14px", padding: "14px", textAlign: "left", animation: `fadeUp 0.4s ease-out ${0.1 + i * 0.1}s forwards`, opacity: 0 }}>
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>{a.icon}</div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: "13px", color: T.bright, marginBottom: "3px" }}>{a.label}</div>
            <div style={{ fontFamily: F.mono, fontSize: "11px", color: T.mid, lineHeight: "1.5" }}>{a.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "20px", fontFamily: F.mono, fontSize: "11px", color: T.dim }}>
        <span>🔒 No data stored</span><span>⚡ ~30s analysis</span><span>🤖 4 AI agents</span>
      </div>
    </div>
  )
}

// ── Input Panel ────────────────────────────────────────────────────────────────
function InputPanel({ onResult, onLoading, loading }) {
  const [listingText, setListingText] = useState("")
  const [leasePdf, setLeasePdf] = useState(null)
  const [listingImages, setListingImages] = useState([])
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
    setListingImages(prev => [...prev, ...files].slice(0, 6))
  }

  const removeImage = (idx) => setListingImages(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!listingText || loading) return
    onLoading(true, listingImages.length)
    try {
      const form = new FormData()
      form.append("listing_text", listingText)
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

  const inputStyle = { background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: T.bright, fontFamily: F.body, width: "100%", outline: "none", transition: "border-color 0.2s" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#e8ff4715", border: "1px solid #e8ff4730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>🔍</div>
          <h1 style={{ fontFamily: F.display, fontWeight: 800, fontSize: "21px", color: T.bright, margin: 0 }}>SubletShield</h1>
        </div>
        <p style={{ fontFamily: F.body, fontSize: "13px", color: T.mid, margin: 0, lineHeight: "1.6" }}>Paste a listing. 30 seconds. Know if it's real.</p>
      </div>

      <div style={{ height: "1px", background: "#1c1c2e" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        <label style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase" }}>Paste Listing Text</label>
        <textarea value={listingText} onChange={e => setListingText(e.target.value)}
          placeholder={"URGENT!! Rent: $900/month\n2 Beds, 1 Bath — 123 Main St\n\nPaste the full listing here..."}
          rows={6} style={{ ...inputStyle, resize: "none", lineHeight: "1.6" }}
          onFocus={e => e.target.style.borderColor = "#e8ff4750"}
          onBlur={e => e.target.style.borderColor = "#1c1c2e"} />
      </div>

      {parsedPreview?.status === "ok" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.accent }} className="pulse-glow" />
            <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.accent }}>Listing parsed</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {parsedPreview.full_address && <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "7px", padding: "3px 9px", fontSize: "11px", color: T.mid }}>📍 {parsedPreview.full_address}</span>}
            {parsedPreview.asking_rent && <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "7px", padding: "3px 9px", fontSize: "11px", color: T.mid }}>💰 ${parsedPreview.asking_rent}/mo</span>}
            {parsedPreview.listing_flags?.map((f, i) => (
              <span key={i} style={{ background: "#ffaa0012", border: "1px solid #ffaa0030", borderRadius: "7px", padding: "3px 9px", fontSize: "11px", color: T.warning }}>⚠ {f}</span>
            ))}
          </div>
        
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Listing Photos {listingImages.length > 0 && <span style={{ color: T.accent }}>({listingImages.length})</span>}
          </label>
        </div>
        {listingImages.length > 0 ? (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {listingImages.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={URL.createObjectURL(img)} alt="" style={{ width: "58px", height: "58px", objectFit: "cover", borderRadius: "8px", border: `1px solid ${i === 0 ? "#e8ff4740" : "#1c1c2e"}` }} />
                {i === 0 && <span style={{ position: "absolute", top: "2px", left: "2px", background: "#000000cc", fontFamily: F.mono, fontSize: "8px", color: T.accent, padding: "1px 4px", borderRadius: "3px" }}>1st</span>}
                <button onClick={() => removeImage(i)} style={{ position: "absolute", top: "2px", right: "2px", width: "15px", height: "15px", borderRadius: "50%", background: "#ff475790", border: "none", color: "white", fontSize: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
              </div>
            ))}
            {listingImages.length < 6 && (
              <label style={{ width: "58px", height: "58px", borderRadius: "8px", border: "1px dashed #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "18px", color: T.dim }}>
                +<input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImagesChange} />
              </label>
            )}
          </div>
        ) : (
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

      <button onClick={handleSubmit} disabled={loading || !listingText}
        style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", cursor: loading || !listingText ? "not-allowed" : "pointer", background: loading || !listingText ? "#1c1c2e" : "#e8ff47", color: loading || !listingText ? T.dim : "#07070f", fontFamily: F.display, fontWeight: 800, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.2s", boxShadow: loading || !listingText ? "none" : "0 4px 20px rgba(232,255,71,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", whiteSpace: "nowrap" }}>
        {loading
          ? <><span style={{ width: "13px", height: "13px", border: "2px solid #07070f30", borderTopColor: "#07070f", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} />Investigating...</>
          : `🔍 Investigate${listingImages.length > 0 ? ` · ${listingImages.length} Photo${listingImages.length > 1 ? "s" : ""}` : ""}`
        }
      </button>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [imageUrls, setImageUrls] = useState([])
  const resultsRef = useRef(null)

  const [photoCount, setPhotoCount] = useState(0)
  const photoCountRef = useRef(0)

  const handleResult = (data, urls) => {
    setResult(data)
    setImageUrls(urls)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070f" }}>
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.15, pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: 0, left: "30%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,255,71,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,71,87,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "18px", alignItems: "start" }}>
          <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "18px", padding: "22px", position: "sticky", top: "28px", boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}>
            <InputPanel onResult={handleResult} onLoading={(state, count) => { if (count !== undefined) { photoCountRef.current = count; setPhotoCount(count); } setLoading(state); }} loading={loading} />
          </div>
          <div ref={resultsRef}>
            {loading ? (
              <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "18px", padding: "24px" }}>
                <LoadingScreen photoCount={photoCountRef.current} />
              </div>
            ) : result ? (
              <ResultsDashboard result={result} imageUrls={imageUrls} />
            ) : (
              <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "18px", padding: "24px" }}>
                <EmptyState />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}