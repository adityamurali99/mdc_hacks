import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "http://localhost:8000"

const scoreColor = (s) => {
  if (s == null) return "#3a3a5c"
  if (s >= 70) return "#00e676"
  if (s >= 40) return "#ffaa00"
  return "#ff4757"
}

const verdictConfig = (v) => ({
  "Likely Scam":         { label: "⚠ LIKELY SCAM",         bg: "#ff475712", border: "#ff475740", color: "#ff4757" },
  "Investigate Further": { label: "⚡ INVESTIGATE FURTHER",  bg: "#ffaa0012", border: "#ffaa0040", color: "#ffaa00" },
  "Appears Legitimate":  { label: "✓ APPEARS LEGITIMATE",   bg: "#00e67612", border: "#00e67640", color: "#00e676" },
}[v] || { label: "— PENDING", bg: "#3a3a5c20", border: "#3a3a5c40", color: "#7878a0" })

// ── Score Ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, verdict }) {
  const [display, setDisplay] = useState(0)
  const circumference = 339.3
  const offset = score != null ? circumference - (score / 100) * circumference : circumference
  const color = scoreColor(score)
  const vc = verdictConfig(verdict)

  useEffect(() => {
    if (score == null) return
    const start = performance.now()
    const duration = 2000
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      setDisplay(Math.round(ease * score))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [score])

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-52 h-52">
        <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1c1c2e" strokeWidth="6" />
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * 360 - 90
            const rad = (angle * Math.PI) / 180
            return <line key={i}
              x1={60 + 50 * Math.cos(rad)} y1={60 + 50 * Math.sin(rad)}
              x2={60 + 54 * Math.cos(rad)} y2={60 + 54 * Math.sin(rad)}
              stroke="#1c1c2e" strokeWidth="1.5" />
          })}
          {score != null && (
            <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circumference}
              style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 8px ${color})` }} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {score != null ? (
            <>
              <span className="font-display font-800 text-5xl leading-none" style={{ color, textShadow: `0 0 24px ${color}80` }}>{display}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#7878a0", letterSpacing: "0.2em" }}>TRUST SCORE</span>
            </>
          ) : (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em" }}>AWAITING</span>
          )}
        </div>
      </div>
      {verdict && (
        <div style={{ padding: "8px 20px", borderRadius: "100px", border: `1px solid ${vc.border}`, background: vc.bg, color: vc.color, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.1em" }}>
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
    <div style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px", animation: `fadeUp 0.5s ease-out ${delay}s forwards`, opacity: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#12121e", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>{icon}</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: "#eeeef5" }}>{title}</span>
        </div>
        {score != null
          ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "14px", fontWeight: 500, color }}>{score}</span>
          : <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#3a3a5c", background: "#12121e", padding: "2px 8px", borderRadius: "6px" }}>SKIPPED</span>
        }
      </div>
      {score != null && (
        <div style={{ height: "3px", background: "#1c1c2e", borderRadius: "100px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "100px", boxShadow: `0 0 8px ${color}80`, transition: "width 1s ease-out 0.3s" }} />
        </div>
      )}
      {summary && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#7878a0", lineHeight: "1.6", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{summary}</p>}
      {findings?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "8px", borderTop: "1px solid #1c1c2e" }}>
          {findings.slice(0, 2).map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ color: "#ff4757", fontSize: "10px", marginTop: "2px", flexShrink: 0 }}>▸</span>
              <span style={{ fontSize: "11px", color: "#7878a0", lineHeight: "1.5", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{f}</span>
            </div>
          ))}
          {findings.length > 2 && <span style={{ fontSize: "11px", color: "#3a3a5c", fontFamily: "'DM Mono', monospace" }}>+{findings.length - 2} more</span>}
        </div>
      )}
    </div>
  )
}

// ── Loading Screen ─────────────────────────────────────────────────────────────

function LoadingScreen() {
  const steps = [
    { label: "Parsing listing text", icon: "📝" },
    { label: "Analyzing lease contract", icon: "📄" },
    { label: "Checking market pricing", icon: "📊" },
    { label: "Comparing Street View", icon: "🏠" },
    { label: "Running reverse image search", icon: "🔎" },
    { label: "Synthesizing trust score", icon: "⚡" },
  ]
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1600)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: "36px" }}>
      <div style={{ position: "relative", width: "72px", height: "72px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #1c1c2e" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#e8ff47", borderRightColor: "#e8ff4780", animation: "spin 1s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>🔍</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "280px" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", opacity: i <= step ? 1 : 0.2, transition: "opacity 0.4s" }}>
            <div style={{
              width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px",
              background: i < step ? "#00e67615" : i === step ? "#e8ff4715" : "#12121e",
              border: `1px solid ${i < step ? "#00e67640" : i === step ? "#e8ff4740" : "#1c1c2e"}`,
              color: i < step ? "#00e676" : i === step ? "#e8ff47" : "#3a3a5c",
            }}>
              {i < step ? "✓" : s.icon}
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: i === step ? "#e8ff47" : i < step ? "#00e676" : "#3a3a5c" }}>
              {s.label}{i === step ? "..." : ""}
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#3a3a5c", letterSpacing: "0.15em" }}>4 AGENTS RUNNING IN PARALLEL</span>
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "28px", textAlign: "center" }} className="fade-up">
      <div>
        <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "#0e0e1a", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto 16px" }}>🏠</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "22px", color: "#eeeef5", margin: "0 0 8px" }}>Ready to Investigate</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#7878a0", lineHeight: "1.7", maxWidth: "360px", margin: "0 auto" }}>
          Paste any rental listing and our AI agents will verify it across 4 dimensions simultaneously in under 30 seconds.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", maxWidth: "420px" }}>
        {agents.map((a, i) => (
          <div key={i} style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "16px", padding: "16px", textAlign: "left", animation: `fadeUp 0.4s ease-out ${0.1 + i * 0.1}s forwards`, opacity: 0 }}>
            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{a.icon}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: "#eeeef5", marginBottom: "4px" }}>{a.label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#3a3a5c", lineHeight: "1.5" }}>{a.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "24px", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#3a3a5c" }}>
        <span>🔒 No data stored</span>
        <span>⚡ ~30s analysis</span>
        <span>🤖 4 AI agents</span>
      </div>
    </div>
  )
}

// ── Results Dashboard ──────────────────────────────────────────────────────────

function ResultsDashboard({ result, listingImageUrl }) {
  const { trust_score, verdict, red_flags, audit_log, evidence_summary, agent_scores, action_kit, parsed_listing, listing_flags } = result

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Score */}
      <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", position: "relative", overflow: "hidden" }} className="fade-up">
        <div className="bg-grid" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>
          <ScoreRing score={trust_score} verdict={verdict} />
          {parsed_listing?.full_address && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "100px", padding: "6px 16px" }}>
              <span style={{ fontSize: "12px" }}>📍</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#7878a0" }}>{parsed_listing.full_address}</span>
            </div>
          )}
          {agent_scores && (
            <div style={{ display: "flex", gap: "4px", height: "4px", borderRadius: "100px", overflow: "hidden", width: "100%", maxWidth: "280px", marginTop: "4px" }}>
              {Object.entries(agent_scores).map(([k, v]) => (
                <div key={k} style={{ flex: 1, background: scoreColor(v), borderRadius: "100px" }} title={`${k}: ${v}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent cards */}
      <div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>Agent Analysis</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <AgentCard icon="📄" title="Contract" score={agent_scores?.contract} findings={audit_log?.contract_compliance?.illegal_clauses} summary={evidence_summary?.[0]} delay={0.1} />
          <AgentCard icon="📊" title="Market Data" score={agent_scores?.property}
            findings={audit_log?.property_analysis?.price_discrepancy_flag ? [`Asking $${audit_log.property_analysis.asking_rent} vs avg $${audit_log.property_analysis.market_average}`] : []}
            summary={evidence_summary?.[1]} delay={0.2} />
          <AgentCard icon="🏠" title="Street View" score={agent_scores?.street_view} findings={audit_log?.visual_verification?.mismatching_features || []} summary={evidence_summary?.[2]} delay={0.3} />
          <AgentCard icon="🔎" title="Reverse Image" score={agent_scores?.reverse_image} findings={audit_log?.visual_verification?.reverse_image_mismatches || []} summary={evidence_summary?.[3]} delay={0.4} />
        </div>
      </div>

      {/* Visual comparison */}
      {listingImageUrl && (
        <div className="fade-up-4">
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>Visual Verification</p>
          <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ padding: "14px", borderRight: "1px solid #1c1c2e" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", margin: "0 0 8px" }}>STREET VIEW (AUTO-FETCHED)</p>
                <div style={{ background: "#0e0e1a", borderRadius: "10px", height: "130px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #1c1c2e" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#3a3a5c" }}>Fetched via Google Maps API</span>
                </div>
              </div>
              <div style={{ padding: "14px" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", margin: "0 0 8px" }}>LISTING PHOTO</p>
                <img src={listingImageUrl} alt="Listing" style={{ borderRadius: "10px", height: "130px", width: "100%", objectFit: "cover" }} />
              </div>
            </div>
            <div style={{ padding: "10px 16px", borderTop: "1px solid #1c1c2e", background: audit_log?.visual_verification?.street_view_match ? "#00e67608" : "#ff475708", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: audit_log?.visual_verification?.street_view_match ? "#00e676" : "#ff4757", fontSize: "13px" }}>
                {audit_log?.visual_verification?.street_view_match ? "✓" : "✗"}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#7878a0", flex: 1 }}>
                {audit_log?.visual_verification?.street_view_match ? "Building exterior appears consistent with Street View" : "Building exterior mismatch detected"}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 500, color: scoreColor(audit_log?.visual_verification?.street_view_score) }}>
                {audit_log?.visual_verification?.street_view_score ?? "—"}/100
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Listing language flags */}
      {listing_flags?.length > 0 && (
        <div className="fade-up-3">
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>Suspicious Listing Language</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {listing_flags.map((f, i) => (
              <span key={i} style={{ background: "#ffaa0012", border: "1px solid #ffaa0040", color: "#ffaa00", fontFamily: "'DM Mono', monospace", fontSize: "11px", padding: "5px 12px", borderRadius: "100px" }}>⚠ {f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Red flags */}
      {red_flags?.length > 0 && (
        <div className="fade-up-4">
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>
            Red Flags <span style={{ color: "#ff4757" }}>({red_flags.length})</span>
          </p>
          <div style={{ background: "#12121e", border: "1px solid #ff475720", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {red_flags.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ color: "#ff4757", fontSize: "11px", marginTop: "2px", flexShrink: 0 }}>⚠</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#eeeef5", lineHeight: "1.5" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action kit */}
      {action_kit && (
        <div className="fade-up-5">
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>Action Kit</p>
          <div style={{ background: "#ff475708", border: "1px solid #ff475730", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {action_kit.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#ff4757", background: "#ff475715", border: "1px solid #ff475730", borderRadius: "6px", padding: "2px 7px", flexShrink: 0 }}>0{i + 1}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#eeeef5", lineHeight: "1.5" }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "12px", padding: "14px" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", marginBottom: "8px", letterSpacing: "0.1em" }}>COPY-PASTE REPLY TO LANDLORD</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#7878a0", lineHeight: "1.6", fontStyle: "italic", margin: "0 0 10px" }}>"{action_kit.copy_paste_reply}"</p>
              <button onClick={() => navigator.clipboard.writeText(action_kit.copy_paste_reply)}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#e8ff47", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Copy to clipboard →
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Object.keys(action_kit.reporting_links).length}, 1fr)`, gap: "8px" }}>
              {Object.entries(action_kit.reporting_links).map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ textAlign: "center", background: "#ff475712", border: "1px solid #ff475730", color: "#ff4757", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "12px", padding: "10px", borderRadius: "10px", textDecoration: "none", transition: "background 0.2s" }}>
                  {label} →
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Input Panel ────────────────────────────────────────────────────────────────

function InputPanel({ onResult, onLoading, loading }) {
  const [listingText, setListingText] = useState("")
  const [officeAddress, setOfficeAddress] = useState("")
  const [leasePdf, setLeasePdf] = useState(null)
  const [listingImage, setListingImage] = useState(null)
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

  const handleSubmit = async () => {
    if (!listingText || !officeAddress || loading) return
    onLoading(true)
    try {
      const form = new FormData()
      form.append("listing_text", listingText)
      form.append("office_address", officeAddress)
      if (leasePdf) form.append("lease_pdf", leasePdf)
      if (listingImage) form.append("listing_image", listingImage)
      const res = await axios.post(`${API}/investigate`, form)
      onResult(res.data, listingImage ? URL.createObjectURL(listingImage) : null)
    } catch (err) {
      console.error(err)
    } finally {
      onLoading(false)
    }
  }

  const inputStyle = {
    background: "#0e0e1a",
    border: "1px solid #1c1c2e",
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#eeeef5",
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Logo */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#e8ff4715", border: "1px solid #e8ff4730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🔍</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "22px", color: "#eeeef5", margin: 0 }}>SubletShield</h1>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#7878a0", margin: 0, lineHeight: "1.6" }}>
          AI fraud detection for student rentals. Paste any listing to investigate.
        </p>
      </div>

      <div style={{ height: "1px", background: "#1c1c2e" }} />

      {/* Listing textarea */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em", textTransform: "uppercase" }}>Paste Listing Text</label>
        <textarea
          value={listingText}
          onChange={e => setListingText(e.target.value)}
          placeholder={"URGENT!! Rent: $900/month\n2 Beds, 1 Bath — 123 Main St\n\nPaste the full Facebook Marketplace\nor Craigslist listing here..."}
          rows={7}
          style={{ ...inputStyle, resize: "none", lineHeight: "1.6" }}
          onFocus={e => e.target.style.borderColor = "#e8ff4740"}
          onBlur={e => e.target.style.borderColor = "#1c1c2e"}
        />
      </div>

      {/* Live parse preview */}
      {parsedPreview?.status === "ok" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e8ff47" }} className="pulse-glow" />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#e8ff47" }}>Listing parsed</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {parsedPreview.full_address && (
              <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: "#7878a0", display: "flex", alignItems: "center", gap: "6px" }}>
                📍 {parsedPreview.full_address}
              </span>
            )}
            {parsedPreview.asking_rent && (
              <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: "#7878a0", display: "flex", alignItems: "center", gap: "6px" }}>
                💰 ${parsedPreview.asking_rent}/mo
              </span>
            )}
            {parsedPreview.landlord_name && (
              <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: "#7878a0", display: "flex", alignItems: "center", gap: "6px" }}>
                👤 {parsedPreview.landlord_name}
              </span>
            )}
            {parsedPreview.listing_flags?.map((f, i) => (
              <span key={i} style={{ background: "#ffaa0012", border: "1px solid #ffaa0030", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: "#ffaa00" }}>
                ⚠ {f}
              </span>
            ))}
          </div>
          {parsedPreview.missing_fields?.length > 0 && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#ffaa00", margin: 0 }}>
              Missing: {parsedPreview.missing_fields.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Office address */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", letterSpacing: "0.15em", textTransform: "uppercase" }}>Your Campus / Office Address</label>
        <input
          value={officeAddress}
          onChange={e => setOfficeAddress(e.target.value)}
          placeholder="500 S State St, Ann Arbor, MI 48109"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#e8ff4740"}
          onBlur={e => e.target.style.borderColor = "#1c1c2e"}
        />
      </div>

      {/* File uploads */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {[
          { label: "Listing Photo", icon: "📸", accept: "image/*", state: listingImage, setter: setListingImage },
          { label: "Lease PDF", icon: "📄", accept: ".pdf", state: leasePdf, setter: setLeasePdf },
        ].map(({ label, icon, accept, state, setter }) => (
          <label key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", background: "#0e0e1a", border: "1px dashed #1c1c2e", borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#e8ff4740"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1c1c2e"}>
            <span style={{ fontSize: "22px" }}>{state ? "✅" : icon}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: state ? "#00e676" : "#3a3a5c", textAlign: "center", lineHeight: "1.4" }}>
              {state ? state.name.slice(0, 18) + (state.name.length > 18 ? "…" : "") : label}
            </span>
            <input type="file" accept={accept} style={{ display: "none" }} onChange={e => setter(e.target.files[0])} />
          </label>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !listingText || !officeAddress}
        style={{
          width: "100%", padding: "14px", borderRadius: "12px", border: "none", cursor: loading || !listingText || !officeAddress ? "not-allowed" : "pointer",
          background: loading || !listingText || !officeAddress ? "#1c1c2e" : "#e8ff47",
          color: loading || !listingText || !officeAddress ? "#3a3a5c" : "#07070f",
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase",
          transition: "all 0.2s", boxShadow: loading || !listingText || !officeAddress ? "none" : "0 4px 20px rgba(232,255,71,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
        }}>
        {loading ? (
          <>
            <span style={{ width: "14px", height: "14px", border: "2px solid #3a3a5c30", borderTopColor: "#3a3a5c", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} />
            Investigating...
          </>
        ) : "🔍 Investigate Listing"}
      </button>

      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3a5c", textAlign: "center", margin: 0 }}>
        Photo enables Street View + image analysis · PDF enables contract review
      </p>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const resultsRef = useRef(null)

  const handleResult = (data, imgUrl) => {
    setResult(data)
    setImageUrl(imgUrl)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070f", position: "relative" }}>
      {/* Background grid */}
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.15, pointerEvents: "none" }} />

      {/* Ambient glows */}
      <div style={{ position: "fixed", top: 0, left: "30%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,255,71,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,71,87,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", alignItems: "start" }}>

          {/* Input — sticky */}
          <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "20px", padding: "24px", position: "sticky", top: "32px", boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}>
            <InputPanel onResult={handleResult} onLoading={setLoading} loading={loading} />
          </div>

          {/* Results */}
          <div ref={resultsRef}>
            {loading ? (
              <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}>
                <LoadingScreen />
              </div>
            ) : result ? (
              <ResultsDashboard result={result} listingImageUrl={imageUrl} />
            ) : (
              <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}>
                <EmptyState />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}