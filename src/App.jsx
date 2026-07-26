import { useState } from "react";

const NOTION_DATA_SOURCE_ID = "29cf68e1-7216-4e7e-ba37-ea5819e4dc84";

const DEFAULT_VIDEOS = [
  {
    title: "I Wasn't Allowed Off This Train Until I Made $5,000",
    description: "Sol boards a train with no money and cannot get off until he hits the number. Real stakes, real hustle, filmed live."
  },
  {
    title: "I Refused to Turn the Lights On Until I Made $5,000",
    description: "Sol works in complete darkness. Every $1,000 made earns him the right to turn one light on. Cinematic and intense."
  },
  {
    title: "Asking Strangers Their Salary In London (Nobody Wants To Answer)",
    description: "Sol asks 100 people on the street what they earn. Tapping into the UK taboo around money."
  },
  {
    title: "How UK Supermarkets Manipulate Every Decision You Make",
    description: "Breaking down the psychology behind every supermarket trick — and what your business can steal from it."
  },
  {
    title: "I Interviewed Myself 1 Year Apart",
    description: "A high-end interview with Sol now vs Sol exactly one year ago. The difference in thinking is the content."
  }
];

function StarRating({ value, onChange, label, sublabel }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: "#111", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>{sublabel}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 8,
              border: value === n ? "2px solid #111" : "1.5px solid #e5e7eb",
              background: value === n ? "#111" : "white",
              color: value === n ? "white" : "#6b7280",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.1s"
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>Not likely</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>Definitely</span>
      </div>
    </div>
  );
}

function ChoiceButtons({ value, onChange, options, label }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: "#111", marginBottom: 8, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 8,
              border: value === opt ? "2px solid #111" : "1.5px solid #e5e7eb",
              background: value === opt ? "#111" : "white",
              color: value === opt ? "white" : "#374151",
              fontWeight: value === opt ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.1s",
              textAlign: "left"
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0); // 0 = welcome, 1-5 = videos, 6 = final questions, 7 = done
  const [name, setName] = useState("");
  const [memorableContent, setMemorableContent] = useState("");
  const [responses, setResponses] = useState(
    DEFAULT_VIDEOS.map(() => ({ likelihood: 0, watchReason: "", wouldShare: "", trustFeel: "", wantMore: "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentVideo = DEFAULT_VIDEOS[step - 1];
  const currentResponse = responses[step - 1];

  function updateResponse(field, value) {
    setResponses(prev => prev.map((r, i) => i === step - 1 ? { ...r, [field]: value } : r));
  }

  function canProceed() {
    if (step === 0) return true;
    if (step >= 1 && step <= 5) {
      const r = responses[step - 1];
      return r.likelihood > 0 && r.watchReason && r.wouldShare && r.trustFeel && r.wantMore;
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const weekLabel = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    const properties = {
      "Name": `Response — ${weekLabel}${name ? ` — ${name}` : ""}`,
      "Respondent Name": name || "Anonymous",
      "Week": weekLabel,
      "Memorable Content": memorableContent,
    };

    DEFAULT_VIDEOS.forEach((video, i) => {
      const n = i + 1;
      const r = responses[i];
      properties[`Video ${n} Title`] = video.title;
      properties[`Video ${n} Watch`] = String(r.likelihood);
      properties[`Video ${n} Follow Sol`] = r.wantMore;
      properties[`Video ${n} Relevance`] = r.likelihood;
      properties[`Video ${n} Entertainment`] = r.watchReason + " | Share: " + r.wouldShare + " | Trust: " + r.trustFeel;
    });

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: "You are a Notion API assistant. When asked to save data, use the Notion MCP tool to create a page in the specified database. Return only 'SUCCESS' if it worked, or 'ERROR: [reason]' if it failed.",
          messages: [{
            role: "user",
            content: `Save this response to Notion database with data_source_id: ${NOTION_DATA_SOURCE_ID}. 
            
Properties to save: ${JSON.stringify(properties, null, 2)}

Use the notion-create-pages tool to save this. The parent should be data_source_id: ${NOTION_DATA_SOURCE_ID}`
          }],
          mcp_servers: [{
            type: "url",
            url: "https://mcp.notion.com/mcp",
            name: "notion-mcp"
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "";

      if (text.includes("SUCCESS") || text.includes("created") || text.includes("page")) {
        setStep(7);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    }
    setSubmitting(false);
  }

  // Welcome screen
  if (step === 0) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, border: "1.5px solid #e5e7eb", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>Sol Hyde — Content Pulse</h1>
            <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Takes 2 minutes. You'll see 5 video ideas and rate each one. Your answers help us make better videos for people like you.
            </p>
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16, marginBottom: 24, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>What you'll rate</div>
              {["Would you watch it?", "Would it make you want to follow Sol?", "How relevant is it to you? (1-5)", "How entertaining does it look? (1-5)"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#111", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              style={{ width: "100%", padding: 14, background: "#111", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              Let's go →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done screen
  if (step === 7) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, border: "1.5px solid #e5e7eb" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>Thank you{name ? `, ${name}` : ""}!</h2>
            <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Your feedback has been saved. We read every response and it directly shapes what we make next.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Final questions screen
  if (step === 6) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f9fafb", padding: "24px 16px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Final step</span>
              <span style={{ fontSize: 12, color: "#374151", fontWeight: 700 }}>6 / 6</span>
            </div>
            <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4 }}>
              <div style={{ height: 4, background: "#111", borderRadius: 4, width: "100%" }} />
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "0 0 20px" }}>One last thing</h2>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                What's a piece of content you've watched recently that you still remember — and why?
              </label>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 8px", fontStyle: "italic" }}>
                Most content gets forgotten instantly. If you remembered it, it did something right.
              </p>
              <textarea
                value={memorableContent}
                onChange={e => setMemorableContent(e.target.value)}
                placeholder="e.g. Gary V's garage sale video — it showed entrepreneurship in a way that felt real and accessible..."
                rows={4}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", color: "#111", lineHeight: 1.5 }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                Your name (optional)
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="First name is fine"
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#111" }}
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: "100%", padding: 14, background: submitting ? "#9ca3af" : "#111", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? "Saving..." : "Submit feedback ✓"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Video rating screens (steps 1-5)
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f9fafb", padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Video {step} of 5</span>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 700 }}>{step} / 6</span>
          </div>
          <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4 }}>
            <div style={{ height: 4, background: "#111", borderRadius: 4, width: `${(step / 6) * 100}%`, transition: "width 0.3s" }} />
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #e5e7eb", padding: 24 }}>
          {/* Video card */}
          <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16, marginBottom: 24, border: "1.5px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Video Idea {step}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111", margin: "0 0 8px", lineHeight: 1.4 }}>
              {currentVideo.title}
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
              {currentVideo.description}
            </p>
          </div>

          {/* Questions */}
          <StarRating
            label="How likely are you to watch this?"
            sublabel="1 = would never watch · 5 = watching immediately"
            value={currentResponse.likelihood}
            onChange={val => updateResponse("likelihood", val)}
          />

          <ChoiceButtons
            label="Would you watch this to be entertained or to learn something?"
            value={currentResponse.watchReason}
            onChange={val => updateResponse("watchReason", val)}
            options={[
              "Purely to be entertained",
              "Purely to learn something",
              "Both equally",
              "Neither"
            ]}
          />

          <ChoiceButtons
            label="Would you send this to someone you know?"
            value={currentResponse.wouldShare}
            onChange={val => updateResponse("wouldShare", val)}
            options={[
              "Yes — I know exactly who I'd send it to",
              "Maybe — depends how good it was",
              "No — I'd keep it to myself"
            ]}
          />

          <ChoiceButtons
            label="Does this feel like content from someone you trust and respect?"
            value={currentResponse.trustFeel}
            onChange={val => updateResponse("trustFeel", val)}
            options={[
              "Yes — completely",
              "Not sure",
              "No — doesn't feel right"
            ]}
          />

          <ChoiceButtons
            label="After watching this would you want to know more about who made it?"
            value={currentResponse.wantMore}
            onChange={val => updateResponse("wantMore", val)}
            options={[
              "Yes — I'd go straight to their channel",
              "Maybe — depends how good it was",
              "No — I'd just move on"
            ]}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{ flex: 1, padding: 13, background: "white", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              style={{ flex: 2, padding: 13, background: canProceed() ? "#111" : "#e5e7eb", color: canProceed() ? "white" : "#9ca3af", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: canProceed() ? "pointer" : "not-allowed" }}
            >
              {step === 5 ? "Last question →" : "Next video →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
