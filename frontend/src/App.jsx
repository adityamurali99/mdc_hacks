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
  "Likely Scam":         { label: "⚠ LIKELY SCAM",         bg: "#ff475715", border: "#ff475750", color: "#ff4757" },
  "Investigate Further": { label: "⚡ INVESTIGATE FURTHER",  bg: "#ffaa0015", border: "#ffaa0050", color: "#ffaa00" },
  "Appears Legitimate":  { label: "✓ APPEARS LEGITIMATE",   bg: "#00e67615", border: "#00e67650", color: "#00e676" },
}[v] || { label: "— PENDING", bg: "#ffffff10", border: "#ffffff20", color: "#9999bb" })

// text color constants
const T = { bright: "#eeeef5", mid: "#bbbbdd", dim: "#9999bb", accent: "#e8ff47", danger: "#ff4757", warning: "#ffaa00", safe: "#00e676" }
const F = { display: "'Syne', sans-serif", body: "'DM Sans', sans-serif", mono: "'DM Mono', monospace" }

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
    const tick = (now) => {
      const t = Math.min((now - start) / 2000, 1)
      setDisplay(Math.round((1 - Math.pow(1 - t, 4)) * score))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [score])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div style={{ position: "relative", width: "200px", height: "200px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${color}18 0%, transparent 70%)` }} />
        <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1c1c2e" strokeWidth="6" />
          {score != null && (
            <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circumference}
              style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 8px ${color})` }} />
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
          {score != null ? (
            <>
              <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: "52px", lineHeight: 1, color, textShadow: `0 0 24px ${color}70` }}>{display}</span>
              <span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, letterSpacing: "0.2em" }}>TRUST SCORE</span>
            </>
          ) : (
            <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.dim, letterSpacing: "0.15em" }}>AWAITING</span>
          )}
        </div>
      </div>
      {verdict && (
        <div style={{ padding: "8px 20px", borderRadius: "100px", border: `1px solid ${vc.border}`, background: vc.bg, color: vc.color, fontFamily: F.display, fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em" }}>
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
    <div style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", animation: `fadeUp 0.5s ease-out ${delay}s forwards`, opacity: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#12121e", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>{icon}</div>
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: "13px", color: T.bright }}>{title}</span>
        </div>
        {score != null
          ? <span style={{ fontFamily: F.mono, fontSize: "14px", fontWeight: 500, color }}>{score}</span>
          : <span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, background: "#12121e", padding: "2px 8px", borderRadius: "5px" }}>SKIPPED</span>
        }
      </div>
      {score != null && (
        <div style={{ height: "3px", background: "#1c1c2e", borderRadius: "100px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "100px", boxShadow: `0 0 6px ${color}80`, transition: "width 1s ease-out 0.3s" }} />
        </div>
      )}
      {summary && <p style={{ fontFamily: F.body, fontSize: "12px", color: T.mid, lineHeight: "1.6", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{summary}</p>}
      {findings?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", paddingTop: "8px", borderTop: "1px solid #1c1c2e" }}>
          {findings.slice(0, 2).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "6px" }}>
              <span style={{ color: T.danger, fontSize: "10px", marginTop: "2px", flexShrink: 0 }}>▸</span>
              <span style={{ fontFamily: F.body, fontSize: "11px", color: T.mid, lineHeight: "1.5", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{f}</span>
            </div>
          ))}
          {findings.length > 2 && <span style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim }}>+{findings.length - 2} more</span>}
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
              background: i < step ? "#00e67615" : i === step ? "#e8ff4715" : "#12121e",
              border: `1px solid ${i < step ? "#00e67640" : i === step ? "#e8ff4740" : "#1c1c2e"}`,
              color: i < step ? T.safe : i === step ? T.accent : T.dim,
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "28px", textAlign: "center" }} className="fade-up">
      <div>
        <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#0e0e1a", border: "1px solid #1c1c2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", margin: "0 auto 14px" }}>🏠</div>
        <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: "20px", color: T.bright, margin: "0 0 8px" }}>Ready to Investigate</h2>
        <p style={{ fontFamily: F.body, fontSize: "14px", color: T.mid, lineHeight: "1.7", maxWidth: "340px", margin: "0 auto" }}>
          Paste any rental listing and our AI agents will verify it across 4 dimensions simultaneously in under 30 seconds.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", maxWidth: "400px" }}>
        {agents.map((a, i) => (
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

// ── Results Dashboard ──────────────────────────────────────────────────────────

function ResultsDashboard({ result, imageUrls }) {
  const { trust_score, verdict, red_flags, audit_log, evidence_summary, agent_scores, action_kit, parsed_listing, listing_flags } = result
  const label = (text) => (
    <p style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px", marginTop: 0 }}>{text}</p>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Score */}
      <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", position: "relative", overflow: "hidden" }} className="fade-up">
        <div className="bg-grid" style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>
          <ScoreRing score={trust_score} verdict={verdict} />
          {parsed_listing?.full_address && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "100px", padding: "5px 14px" }}>
              <span style={{ fontSize: "11px" }}>📍</span>
              <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.mid }}>{parsed_listing.full_address}</span>
            </div>
          )}
          {agent_scores && (
            <div style={{ display: "flex", gap: "3px", height: "4px", borderRadius: "100px", overflow: "hidden", width: "100%", maxWidth: "260px" }}>
              {Object.entries(agent_scores).map(([k, v]) => (
                <div key={k} style={{ flex: 1, background: scoreColor(v), borderRadius: "100px" }} title={`${k}: ${v}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent cards */}
      <div>
        {label("Agent Analysis")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <AgentCard icon="📄" title="Contract" score={agent_scores?.contract} findings={audit_log?.contract_compliance?.illegal_clauses} summary={evidence_summary?.[0]} delay={0.1} />
          <AgentCard icon="📊" title="Market Data" score={agent_scores?.property}
            findings={audit_log?.property_analysis?.price_discrepancy_flag ? [`Asking $${audit_log.property_analysis.asking_rent} vs avg $${audit_log.property_analysis.market_average}`] : []}
            summary={evidence_summary?.[1]} delay={0.2} />
          <AgentCard icon="🏠" title="Street View" score={agent_scores?.street_view} findings={audit_log?.visual_verification?.mismatching_features || []} summary={evidence_summary?.[2]} delay={0.3} />
          <AgentCard icon="🔎" title="Reverse Image" score={agent_scores?.reverse_image}
            findings={audit_log?.visual_verification?.reverse_image_mismatches || []}
            summary={audit_log?.visual_verification?.photos_checked > 0
              ? `${audit_log.visual_verification.stolen_count}/${audit_log.visual_verification.photos_checked} photos flagged`
              : evidence_summary?.[3]}
            delay={0.4} />
        </div>
      </div>

      {/* Photo strip + street view comparison */}
      {imageUrls?.length > 0 && (
        <div className="fade-up-4">
          {label("Visual Verification")}
          <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "16px", overflow: "hidden" }}>
            {/* Photo strip */}
            <div style={{ display: "flex", gap: "6px", padding: "12px", overflowX: "auto" }}>
              {imageUrls.map((url, i) => (
                <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                  <img src={url} alt={`Photo ${i + 1}`} style={{ height: "90px", width: "120px", objectFit: "cover", borderRadius: "8px", border: "1px solid #1c1c2e" }} />
                  {i === 0 && (
                    <span style={{ position: "absolute", bottom: "4px", left: "4px", background: "#000000aa", fontFamily: F.mono, fontSize: "9px", color: T.accent, padding: "2px 5px", borderRadius: "4px" }}>
                      STREET VIEW ↑
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Street view result */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid #1c1c2e", background: audit_log?.visual_verification?.street_view_match ? "#00e67608" : "#ff475708", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: audit_log?.visual_verification?.street_view_match ? T.safe : T.danger, fontSize: "14px" }}>
                {audit_log?.visual_verification?.street_view_match ? "✓" : "✗"}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.mid, flex: 1 }}>
                {audit_log?.visual_verification?.street_view_match ? "First photo matches Street View" : "First photo doesn't match Street View"}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: "12px", color: scoreColor(audit_log?.visual_verification?.street_view_score) }}>
                {audit_log?.visual_verification?.street_view_score ?? "—"}/100
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Listing language flags */}
      {listing_flags?.length > 0 && (
        <div className="fade-up-3">
          {label("Suspicious Listing Language")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {listing_flags.map((f, i) => (
              <span key={i} style={{ background: "#ffaa0012", border: "1px solid #ffaa0040", color: T.warning, fontFamily: F.mono, fontSize: "11px", padding: "5px 11px", borderRadius: "100px" }}>⚠ {f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Red flags */}
      {red_flags?.length > 0 && (
        <div className="fade-up-4">
          {label(`Red Flags (${red_flags.length})`)}
          <div style={{ background: "#12121e", border: "1px solid #ff475725", borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "9px" }}>
            {red_flags.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: T.danger, fontSize: "11px", marginTop: "2px", flexShrink: 0 }}>⚠</span>
                <span style={{ fontFamily: F.body, fontSize: "13px", color: T.bright, lineHeight: "1.5" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action kit */}
      {action_kit && (
        <div className="fade-up-5">
          {label("Action Kit")}
          <div style={{ background: "#ff475708", border: "1px solid #ff475730", borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {action_kit.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: "10px" }}>
                  <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.danger, background: "#ff475715", border: "1px solid #ff475730", borderRadius: "5px", padding: "2px 6px", flexShrink: 0 }}>0{i + 1}</span>
                  <span style={{ fontFamily: F.body, fontSize: "13px", color: T.bright, lineHeight: "1.5" }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "10px", padding: "12px" }}>
              <p style={{ fontFamily: F.mono, fontSize: "10px", color: T.dim, marginBottom: "7px", letterSpacing: "0.1em" }}>COPY-PASTE REPLY TO LANDLORD</p>
              <p style={{ fontFamily: F.body, fontSize: "12px", color: T.mid, lineHeight: "1.6", fontStyle: "italic", margin: "0 0 8px" }}>"{action_kit.copy_paste_reply}"</p>
              <button onClick={() => navigator.clipboard.writeText(action_kit.copy_paste_reply)}
                style={{ fontFamily: F.mono, fontSize: "11px", color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Copy to clipboard →
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Object.keys(action_kit.reporting_links).length}, 1fr)`, gap: "7px" }}>
              {Object.entries(action_kit.reporting_links).map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ textAlign: "center", background: "#ff475712", border: "1px solid #ff475730", color: T.danger, fontFamily: F.display, fontWeight: 700, fontSize: "11px", padding: "9px", borderRadius: "9px", textDecoration: "none" }}>
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
    background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "10px",
    padding: "11px 14px", fontSize: "14px", color: T.bright,
    fontFamily: F.body, width: "100%", outline: "none", transition: "border-color 0.2s",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* Logo */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#e8ff4715", border: "1px solid #e8ff4730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>🔍</div>
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
          onFocus={e => e.target.style.borderColor = "#e8ff4750"}
          onBlur={e => e.target.style.borderColor = "#1c1c2e"} />
      </div>

      {/* Parse preview */}
      {parsedPreview?.status === "ok" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.accent }} className="pulse-glow" />
            <span style={{ fontFamily: F.mono, fontSize: "11px", color: T.accent }}>Listing parsed</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {parsedPreview.full_address && <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "7px", padding: "3px 9px", fontSize: "11px", color: T.mid }}>📍 {parsedPreview.full_address}</span>}
            {parsedPreview.asking_rent && <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "7px", padding: "3px 9px", fontSize: "11px", color: T.mid }}>💰 ${parsedPreview.asking_rent}/mo</span>}
            {parsedPreview.landlord_name && <span style={{ background: "#0e0e1a", border: "1px solid #1c1c2e", borderRadius: "7px", padding: "3px 9px", fontSize: "11px", color: T.mid }}>👤 {parsedPreview.landlord_name}</span>}
            {parsedPreview.listing_flags?.map((f, i) => (
              <span key={i} style={{ background: "#ffaa0012", border: "1px solid #ffaa0030", borderRadius: "7px", padding: "3px 9px", fontSize: "11px", color: T.warning }}>⚠ {f}</span>
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
          onFocus={e => e.target.style.borderColor = "#e8ff4750"}
          onBlur={e => e.target.style.borderColor = "#1c1c2e"} />
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
          width: "100%", padding: "13px", borderRadius: "10px", border: "none",
          cursor: loading || !listingText || !officeAddress ? "not-allowed" : "pointer",
          background: loading || !listingText || !officeAddress ? "#1c1c2e" : "#e8ff47",
          color: loading || !listingText || !officeAddress ? T.dim : "#07070f",
          fontFamily: F.display, fontWeight: 800, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase",
          transition: "all 0.2s", boxShadow: loading || !listingText || !officeAddress ? "none" : "0 4px 20px rgba(232,255,71,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "7px"
        }}>
        {loading
          ? <><span style={{ width: "13px", height: "13px", border: "2px solid #07070f30", borderTopColor: "#07070f", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} />Investigating...</>
          : `🔍 Investigate${listingImages.length > 0 ? ` · ${listingImages.length} Photo${listingImages.length > 1 ? "s" : ""}` : ""}`
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
    <div style={{ minHeight: "100vh", background: "#07070f" }}>
      <div className="bg-grid" style={{ position: "fixed", inset: 0, opacity: 0.15, pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: 0, left: "30%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,255,71,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,71,87,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "18px", alignItems: "start" }}>

          <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "18px", padding: "22px", position: "sticky", top: "28px", boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}>
            <InputPanel onResult={handleResult} onLoading={setLoading} loading={loading} />
          </div>

          <div ref={resultsRef}>
            {loading ? (
              <div style={{ background: "#12121e", border: "1px solid #1c1c2e", borderRadius: "18px", padding: "24px" }}>
                <LoadingScreen photoCount={photoCount} />
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