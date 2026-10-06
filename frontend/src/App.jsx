import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";

/**
 * AI Resume Analyzer — frontend
 * --------------------------------------------------------------
 * Design concept: the app is treated like a document under review —
 * an editor's markup of a resume. Paper-toned surface, ink-navy type,
 * a single "stamp" amber for the headline score, teal for matches,
 * clay-red for gaps. Serif for headings (the document voice), a plain
 * sans for interface chrome and data (the reviewer's voice).
 *
 * Everything — components, styles, API calls — lives in this one file
 * on purpose, per the project's current constraints.
 * --------------------------------------------------------------
 */

const API_BASE = "https://ai-resume-analyzer-1-1yt7.onrender.com";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE_MB = 10;

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function formatDate(value) {
  if (!value) return "—";

  let dateValue = value;

  // Backend stores created_at as UTC without timezone information.
  // Tell JavaScript that the timestamp is UTC before converting
  // it to the user's local timezone.
  if (
    typeof dateValue === "string" &&
    !dateValue.endsWith("Z") &&
    !/[+-]\d{2}:\d{2}$/.test(dateValue)
  ) {
    dateValue = `${dateValue}Z`;
  }

  const d = new Date(dateValue);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExtension(filename = "") {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

function clampScore(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/* ----------------------------- Icons ----------------------------- */
/* Small inline SVGs, no external icon library. */

const IconMark = (props) => (
  <svg viewBox="0 0 32 32" width="22" height="22" fill="none" {...props}>
    <path
      d="M8 4h12l6 6v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M19 4v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M11 17h9M11 21h9M11 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconUpload = (props) => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
    <path d="M12 15V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7.5 8.5 12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconFile = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" {...props}>
    <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const IconX = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" {...props}>
    <path d="m5 12 5 5 9-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconAlert = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" {...props}>
    <path d="M12 4 2 20h20L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconClock = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconRefresh = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
    <path
      d="M20 11A8 8 0 1 0 18.5 16"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path d="M20 5v6h-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* --------------------------- Small pieces --------------------------- */

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className="section-description">{description}</p> : null}
    </div>
  );
}

function ScoreGauge({ value, label }) {
  const pct = clampScore(value);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const tone = pct >= 80 ? "good" : pct >= 55 ? "mid" : "low";

  return (
    <div className="gauge">
      <svg viewBox="0 0 150 150" width="176" height="176">
        <circle cx="75" cy="75" r={radius} className="gauge-track" strokeWidth="10" fill="none" />
        <circle
          cx="75"
          cy="75"
          r={radius}
          className={`gauge-fill gauge-fill--${tone}`}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 75 75)"
        />
        <text x="75" y="72" textAnchor="middle" className="gauge-number">
          {pct.toFixed(1)}
        </text>
        <text x="75" y="92" textAnchor="middle" className="gauge-percent">
          out of 100
        </text>
      </svg>
      <p className="gauge-label">{label}</p>
    </div>
  );
}

function MetricBar({ label, value }) {
  const pct = clampScore(value);
  const tone = pct >= 80 ? "good" : pct >= 55 ? "mid" : "low";
  return (
    <div className="metric">
      <div className="metric-row">
        <span className="metric-label">{label}</span>
        <span className="metric-value">
          {typeof value === "number" ? value.toFixed(2) : "—"}
        </span>
      </div>
      <div className="metric-track">
        <div className={`metric-fill metric-fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

function ListCard({ title, items, emptyText }) {
  const hasItems = Array.isArray(items) && items.length > 0;
  return (
    <div className="list-card">
      <h3>{title}</h3>
      {hasItems ? (
        <ul>
          {items.map((item, i) => (
            <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="list-card-empty">{emptyText}</p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- */

export default function App() {
  const [page, setPage] = useState("analyze"); // 'analyze' | 'history'

  /* ---- upload / analyze state ---- */
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const inFlightRef = useRef(false);

  /* ---- history state ---- */
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
const [historyDetailError, setHistoryDetailError] = useState("");

  const validateAndSetFile = useCallback((candidate) => {
    if (!candidate) return;
    const ext = getExtension(candidate.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError("Only .pdf and .docx resumes are supported.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File is larger than ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setFileError("");
    setFile(candidate);
  }, []);

  const handleInputChange = (e) => {
    const candidate = e.target.files?.[0];
    validateAndSetFile(candidate);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const candidate = e.dataTransfer.files?.[0];
      validateAndSetFile(candidate);
    },
    [validateAndSetFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = () => {
    setFile(null);
    setFileError("");
  };

  const resetForm = () => {
    setFile(null);
    setFileError("");
    setJobDescription("");
    setResult(null);
    setAnalyzeError("");
  };
  const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message || "Logout failed.");
  }
};

  const canAnalyze = Boolean(file) && jobDescription.trim().length > 0 && !loading;

  const handleAnalyze = async () => {
    if (!file || !jobDescription.trim() || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setAnalyzeError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("job_description", jobDescription);

      const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  throw new Error("Please login before analyzing your resume.");
}

const response = await fetch(`${API_BASE}/resume/analyze`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
  body: formData,
});

      if (!response.ok) {
        let message = `Analysis failed (status ${response.status}).`;
        try {
          const errBody = await response.json();
          if (errBody?.detail) message = errBody.detail;
          else if (errBody?.message) message = errBody.message;
        } catch {
          /* response wasn't JSON — keep default message */
        }
        throw new Error(message);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      if (err instanceof TypeError) {
        setAnalyzeError(
          "Couldn't reach the analysis server. Confirm the backend is running at " + API_BASE + "."
        );
      } else {
        setAnalyzeError(err.message || "Something went wrong while analyzing your resume.");
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  throw new Error("Please login before viewing history.");
}

const response = await fetch(`${API_BASE}/resume/history`, {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
      if (!response.ok) {
        throw new Error(`Couldn't load history (status ${response.status}).`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.history || data?.items || [];
      setHistory(list);
      setHistoryLoaded(true);
    } catch (err) {
      if (err instanceof TypeError) {
        setHistoryError("Couldn't reach the analysis server. Confirm the backend is running.");
      } else {
        setHistoryError(err.message || "Something went wrong while loading history.");
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);
  const fetchHistoryDetails = async (analysisId) => {
  setHistoryDetailLoading(true);

  try {
    const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  throw new Error("Please login before viewing analysis details.");
}

const response = await fetch(
  `${API_BASE}/resume/history/${analysisId}`,
  {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  }
);

    if (!response.ok) {
      throw new Error(
        `Couldn't load analysis details (status ${response.status}).`
      );
    }

    const data = await response.json();

    setResult(data);
    setPage("analyze");
  } catch (err) {
    alert(
      err.message || "Something went wrong while loading the analysis."
    );
  } finally {
    setHistoryDetailLoading(false);
  }
};

  useEffect(() => {
    if (page === "history" && !historyLoaded) {
      fetchHistory();
    }
  }, [page, historyLoaded, fetchHistory]);

  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.created_at || a.date || a.analyzed_at || 0).getTime();
    const dateB = new Date(b.created_at || b.date || b.analyzed_at || 0).getTime();
    if (dateB !== dateA) return dateB - dateA;
    const idA = a.analysis_id ?? a.id ?? 0;
    const idB = b.analysis_id ?? b.id ?? 0;
    return idB - idA;
  });

  const score = result?.score || {};
  const analysis = result?.analysis || {};

  return (
    <div className="app-shell">
      <GlobalStyles />

      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className="rail">
        <div className="rail-brand">
          <span className="rail-mark">
            <IconMark />
          </span>
          <div>
            <p className="rail-title">AI Resume Analyzer</p>
            <p className="rail-subtitle">AI-powered resume analysis and ATS optimization</p>
          </div>
        </div>

        <nav className="rail-nav" aria-label="Primary">
          <button
            type="button"
            className={`rail-nav-item ${page === "analyze" ? "is-active" : ""}`}
            onClick={() => setPage("analyze")}
          >
            Analyze Resume
          </button>
          <button
            type="button"
            className={`rail-nav-item ${page === "history" ? "is-active" : ""}`}
            onClick={() => setPage("history")}
          >
            History
          </button>
        </nav>

        <div className="rail-footer">
  <button
    type="button"
    className="logout-btn"
    onClick={handleLogout}
  >
    Logout
  </button>

  <p>Connected to</p>
  <code>{API_BASE}</code>
</div>
      </aside>

      <main id="main-content" className="main">
        {page === "analyze" ? (
          <AnalyzePage
            file={file}
            fileError={fileError}
            isDragging={isDragging}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            loading={loading}
            analyzeError={analyzeError}
            result={result}
            canAnalyze={canAnalyze}
            inputRef={inputRef}
            onInputChange={handleInputChange}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onRemoveFile={removeFile}
            onAnalyze={handleAnalyze}
            onReset={resetForm}
            score={score}
            analysis={analysis}
            suggestions={result?.suggestions || []}
            filename={result?.filename}
          />
        ) : (
          <HistoryPage
  items={sortedHistory}
  loading={historyLoading}
  error={historyError}
  onRefresh={fetchHistory}
  onOpenAnalysis={fetchHistoryDetails}
/>
        )}
      </main>
    </div>
  );
}

/* ----------------------------- Analyze page ----------------------------- */

function AnalyzePage(props) {
  const {
    file,
    fileError,
    isDragging,
    jobDescription,
    setJobDescription,
    loading,
    analyzeError,
    result,
    canAnalyze,
    inputRef,
    onInputChange,
    onDrop,
    onDragOver,
    onDragLeave,
    onRemoveFile,
    onAnalyze,
    onReset,
    score,
    analysis,
    suggestions,
    filename,
  } = props;

  if (result) {
    return (
      <ResultsView
  score={score}
  analysis={analysis}
  suggestions={suggestions}
  filename={filename}
  genaiFeedback={result?.genai_feedback}
  onReset={onReset}
/>
    );
  }

  return (
    <div className="page">
      <SectionHeading
        eyebrow="Step 1 of 1"
        title="Analyze a resume"
        description="Upload a resume and paste the job description you're targeting. The report checks ATS readability, keyword match, and section coverage against it."
      />

      <div className="upload-grid">
        <div
          className={`dropzone ${isDragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          {!file ? (
            <>
              <div className="dropzone-icon">
                <IconUpload />
              </div>
              <p className="dropzone-title">Drag &amp; drop your resume here</p>
              <p className="dropzone-subtitle">PDF or DOCX, up to {MAX_FILE_SIZE_MB}MB</p>
              <button type="button" className="btn btn--secondary" onClick={() => inputRef.current?.click()}>
                Browse files
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="visually-hidden"
                onChange={onInputChange}
              />
            </>
          ) : (
            <div className="file-chip">
              <span className="file-chip-icon">
                <IconFile />
              </span>
              <div className="file-chip-meta">
                <p className="file-chip-name">{file.name}</p>
                <p className="file-chip-size">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                className="file-chip-remove"
                onClick={onRemoveFile}
                aria-label="Remove selected file"
              >
                <IconX />
              </button>
            </div>
          )}
          {fileError ? (
            <p className="field-error">
              <IconAlert /> {fileError}
            </p>
          ) : null}
        </div>

        <div className="jd-panel">
          <label htmlFor="job-description">Job description</label>
          <textarea
            id="job-description"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
          />
          <p className="jd-count">{jobDescription.trim().length.toLocaleString()} characters</p>
        </div>
      </div>

      {analyzeError ? (
        <div className="alert alert--error">
          <IconAlert />
          <div>
            <p className="alert-title">Analysis failed</p>
            <p>{analyzeError}</p>
          </div>
        </div>
      ) : null}

      <div className="analyze-actions">
        <button type="button" className="btn btn--primary btn--large" disabled={!canAnalyze} onClick={onAnalyze}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Analyzing resume…
            </>
          ) : (
            "Analyze Resume"
          )}
        </button>
        {!file || !jobDescription.trim() ? (
          <p className="analyze-hint">Add a resume and job description to continue.</p>
        ) : null}
      </div>

      {loading ? <AnalyzeSkeleton /> : null}
    </div>
  );
}

function AnalyzeSkeleton() {
  return (
    <div className="skeleton-block" aria-hidden="true">
      <div className="skeleton-row skeleton-row--wide" />
      <div className="skeleton-row" />
      <div className="skeleton-row skeleton-row--short" />
    </div>
  );
}

/* ----------------------------- Results view ----------------------------- */

function ResultsView({
  score,
  analysis,
  suggestions,
  filename,
  genaiFeedback,
  onReset,
}) {
  const matching = Array.isArray(score.matching_skills) ? score.matching_skills : [];
  const missing = Array.isArray(score.missing_skills) ? score.missing_skills : [];
  const feedback = genaiFeedback && !genaiFeedback.error
  ? genaiFeedback
  : null;

const renderFeedbackItems = (items) => {
  if (Array.isArray(items)) {
    return (
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {typeof item === "string" ? item : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof items === "string" && items.trim()) {
    return <p>{items}</p>;
  }

  return <p className="list-card-empty">No feedback available.</p>;
};
  return (
    <div className="page">
      <div className="results-header">
        <div>
          <p className="section-eyebrow">Report ready</p>
          <h2>Results{filename ? ` for ${filename}` : ""}</h2>
        </div>
        <button type="button" className="btn btn--secondary" onClick={onReset}>
          Analyze another resume
        </button>
      </div>

      <section className="score-panel">
        <ScoreGauge value={score.ats_score} label="ATS Score" />
        <div className="metric-grid">
          <MetricBar label="Keyword score" value={score.keyword_score} />
          <MetricBar label="Semantic similarity" value={score.semantic_similarity_score} />
          <MetricBar label="TF-IDF similarity" value={score.similarity_score} />
          <MetricBar label="Combined similarity" value={score.combined_similarity_score} />
          <MetricBar label="Parseability" value={score.parseability_score} />
          <MetricBar label="Section score" value={score.section_score} />
          <MetricBar label="Experience / impact" value={score.experience_impact_score} />
        </div>
      </section>

      <section className="skills-panel">
        <div className="skills-column">
          <h3>Matching skills</h3>
          <p className="skills-note">Skills in your resume that line up with the job description.</p>
          <div className="badge-row">
            {matching.length ? (
              matching.map((skill, i) => (
                <Badge key={i} tone="good">
                  <IconCheck /> {skill}
                </Badge>
              ))
            ) : (
              <p className="skills-empty">No overlapping skills were detected.</p>
            )}
          </div>
        </div>
        <div className="skills-column">
          <h3>Missing skills</h3>
          <p className="skills-note">
            Consider adding these if you have genuine experience with them.
          </p>
          <div className="badge-row">
            {missing.length ? (
              missing.map((skill, i) => (
                <Badge key={i} tone="warn">
                  <IconAlert /> {skill}
                </Badge>
              ))
            ) : (
              <p className="skills-empty">No missing skills were flagged.</p>
            )}
          </div>
        </div>
      </section>

      

      
     {/* Gemini AI Resume Feedback */}
<section className="gemini-feedback-section" aria-labelledby="gemini-heading">
  <div className="gemini-section-header">
    <div className="gemini-heading-content">
      <h2 id="gemini-heading">Resume review</h2>
      <p>
        Personalized suggestions to strengthen your resume and match it
        more closely to your target role.
      </p>
    </div>

    <div className="gemini-status">
      <span className="gemini-status-dot" />
      Powered by Gemini
    </div>
  </div>

  {!genaiFeedback ? (
    <div className="gemini-empty-state" role="status">
      <h3>No AI feedback yet</h3>
      <p>Analyze your resume again to generate personalized feedback.</p>
    </div>
  ) : genaiFeedback.error ? (
    <div className="gemini-error-state" role="alert">
      <h3>We couldn't generate feedback</h3>
      <p>{genaiFeedback.error}</p>
    </div>
  ) : (
    <>
      {genaiFeedback.overall_feedback && (
        <div className="gemini-overview-card">
          <h3>Overall assessment</h3>
          <p>{genaiFeedback.overall_feedback}</p>
        </div>
      )}

      <div className="gemini-feedback-grid">
        <div className="gemini-feedback-card gemini-card--green">
          <div className="gemini-card-heading">
            <span className="gemini-icon" aria-hidden="true">✓</span>
            <div>
              <h3>Key strengths</h3>
              <p>What already works in your resume</p>
            </div>
          </div>
          {renderFeedbackItems(genaiFeedback.strengths)}
        </div>

        <div className="gemini-feedback-card gemini-card--amber">
          <div className="gemini-card-heading">
            <span className="gemini-icon" aria-hidden="true">↗</span>
            <div>
              <h3>Areas to improve</h3>
              <p>Where a few changes will help most</p>
            </div>
          </div>
          {renderFeedbackItems(genaiFeedback.improvements)}
        </div>

        <div className="gemini-feedback-card gemini-card--blue">
          <div className="gemini-card-heading">
            <span className="gemini-icon" aria-hidden="true">⌕</span>
            <div>
              <h3>Skill gap analysis</h3>
              <p>Skills the role asks for that are missing</p>
            </div>
          </div>
          {renderFeedbackItems(genaiFeedback.missing_skills_explanation)}
        </div>

        <div className="gemini-feedback-card gemini-card--purple">
          <div className="gemini-card-heading">
            <span className="gemini-icon" aria-hidden="true">✎</span>
            <div>
              <h3>Suggested bullet points</h3>
              <p>Stronger ways to describe your experience</p>
            </div>
          </div>
          {renderFeedbackItems(genaiFeedback.rewritten_bullets)}
        </div>

        <div className="gemini-feedback-card gemini-action-card gemini-card--blue">
          <div className="gemini-card-heading">
            <span className="gemini-icon" aria-hidden="true">→</span>
            <div>
              <h3>Action plan</h3>
              <p>Next steps, in order</p>
            </div>
          </div>
          {renderFeedbackItems(genaiFeedback.action_plan)}
        </div>
      </div>

      <p className="gemini-disclaimer">
        These are AI-generated suggestions. Check them for accuracy and only
        add skills and experience you actually have.
      </p>
    </>
  )}
</section>

      <div className="analyze-actions">
        <button type="button" className="btn btn--primary btn--large" onClick={onReset}>
          Analyze another resume
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- History page ----------------------------- */

function HistoryPage({
  items,
  loading,
  error,
  onRefresh,
  onOpenAnalysis
}) {
  return (
    <div className="page">
      <div className="results-header">
        <SectionHeading
          eyebrow="Past reports"
          title="Analysis history"
          description="Every resume you've analyzed, newest first."
        />
        <button type="button" className="btn btn--secondary" onClick={onRefresh} disabled={loading}>
          <IconRefresh /> Refresh
        </button>
      </div>

      {error ? (
        <div className="alert alert--error">
          <IconAlert />
          <div>
            <p className="alert-title">Couldn't load history</p>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="skeleton-block" aria-hidden="true">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row skeleton-row--short" />
        </div>
      ) : !error && items.length === 0 ? (
        <div className="empty-state">
          <IconClock />
          <p className="empty-title">No analyses yet</p>
          <p>Run your first resume analysis and it will show up here.</p>
        </div>
      ) : (
        <div className="history-list">
          {items.map((item, i) => {
            const id = item.analysis_id ?? item.id ?? i;
            const name = item.filename ?? item.resume_name ?? item.file_name ?? "Untitled resume";
            const ats = item.ats_score ?? item.score?.ats_score;
            const keyword = item.keyword_score ?? item.score?.keyword_score;
            const date = item.created_at ?? item.date ?? item.analyzed_at;
            return (
              <button
  type="button"
  className="history-row"
  key={id}
  onClick={() => onOpenAnalysis(id)}
>
                <div className="history-row-main">
                  <span className="history-icon">
                    <IconFile />
                  </span>
                  <div>
                    <p className="history-name">{name}</p>
                    <p className="history-date">
                      <IconClock /> {formatDate(date)} · ID #{id}
                    </p>
                  </div>
                </div>
                <div className="history-row-scores">
                  <div className="history-score">
                    <span className="history-score-value">
                      {typeof ats === "number" ? `${ats.toFixed(1)}%` : "—"}
                    </span>
                    <span className="history-score-label">ATS score</span>
                  </div>
                  <div className="history-score">
                    <span className="history-score-value">
                      {typeof keyword === "number" ? `${keyword.toFixed(1)}%` : "—"}
                    </span>
                    <span className="history-score-label">Keyword match</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Styles ------------------------------- */

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');

      :root {
        --ink: #1C2333;
        --ink-soft: #4B5265;
        --paper: #FAFAF8;
        --paper-raised: #FFFFFF;
        --rule: #E4E0D6;
        --rule-strong: #CFC9BA;
        --amber: #C08A1E;
        --amber-soft: #F3E4C2;
        --teal: #2F6F62;
        --teal-soft: #DCEAE5;
        --clay: #AE4B36;
        --clay-soft: #F3DDD5;
        --radius-sm: 6px;
        --radius-md: 10px;
        --serif: 'Source Serif 4', Georgia, 'Iowan Old Style', ui-serif, serif;
        --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      * { box-sizing: border-box; }

      html, body, #root { height: 100%; }

      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: var(--sans);
        -webkit-font-smoothing: antialiased;
      }

      .visually-hidden {
        position: absolute;
        width: 1px; height: 1px;
        padding: 0; margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0;
      }

      .skip-link {
        position: absolute;
        left: -999px;
        top: 0;
        background: var(--ink);
        color: var(--paper);
        padding: 10px 16px;
        z-index: 100;
      }
      .skip-link:focus { left: 12px; top: 12px; border-radius: var(--radius-sm); }

      button, input, textarea { font-family: inherit; }
      button:focus-visible, input:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
        outline: 2px solid var(--amber);
        outline-offset: 2px;
      }

      .app-shell {
        display: grid;
        grid-template-columns: 260px 1fr;
        min-height: 100vh;
      }

      /* ---------- rail ---------- */
      .rail {
        border-right: 1px solid var(--rule);
        padding: 28px 22px;
        display: flex;
        flex-direction: column;
        gap: 32px;
        position: sticky;
        top: 0;
        height: 100vh;
      }

      .rail-brand { display: flex; gap: 12px; align-items: flex-start; }
      .rail-mark {
        flex-shrink: 0;
        width: 38px; height: 38px;
        border: 1.5px solid var(--ink);
        border-radius: var(--radius-sm);
        display: flex; align-items: center; justify-content: center;
        color: var(--ink);
      }
      .rail-title {
        margin: 0;
        font-family: var(--serif);
        font-weight: 600;
        font-size: 1.05rem;
        line-height: 1.25;
      }
      .rail-subtitle {
        margin: 4px 0 0;
        font-size: 0.76rem;
        color: var(--ink-soft);
        line-height: 1.4;
      }

      .rail-nav { display: flex; flex-direction: column; gap: 4px; }
      .rail-nav-item {
        text-align: left;
        background: none;
        border: none;
        border-left: 2px solid transparent;
        padding: 9px 12px;
        font-size: 0.92rem;
        color: var(--ink-soft);
        cursor: pointer;
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
      }
      .rail-nav-item:hover { color: var(--ink); background: rgba(0,0,0,0.03); }
      .rail-nav-item.is-active {
        color: var(--ink);
        border-left-color: var(--amber);
        background: var(--amber-soft);
        font-weight: 600;
      }

      .rail-footer { margin-top: auto; font-size: 0.74rem; color: var(--ink-soft); }
      .rail-footer p { margin: 0 0 4px; }
      .rail-footer code {
        display: inline-block;
        background: var(--paper-raised);
        border: 1px solid var(--rule);
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 0.72rem;
        word-break: break-all;
      }
        .logout-btn {
  width: 100%;
  margin-bottom: 16px;
  padding: 9px 12px;
  border: 1px solid var(--rule-strong);
  border-radius: var(--radius-sm);
  background: var(--paper-raised);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.logout-btn:hover {
  background: var(--clay-soft);
  border-color: var(--clay);
  color: var(--clay);
}

      /* ---------- main ---------- */
      .main { padding: 40px 48px 80px; min-width: 0; }

      .page { max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }

      .section-heading h2 {
        font-family: var(--serif);
        font-weight: 600;
        font-size: 1.7rem;
        margin: 4px 0 8px;
      }
      .section-eyebrow {
        margin: 0;
        font-size: 0.78rem;
        color: var(--amber);
        font-weight: 600;
      }
      .section-description {
        margin: 0;
        color: var(--ink-soft);
        max-width: 62ch;
        line-height: 1.55;
      }

      .results-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .results-header h2 { font-family: var(--serif); font-size: 1.6rem; margin: 4px 0 0; }

      /* ---------- upload ---------- */
      .upload-grid {
        display: grid;
        grid-template-columns: 1.1fr 1fr;
        gap: 24px;
        align-items: stretch;
      }

      .dropzone {
        border: 1.5px dashed var(--rule-strong);
        border-radius: var(--radius-md);
        background: var(--paper-raised);
        padding: 36px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 6px;
        transition: border-color 0.15s ease, background 0.15s ease;
        min-height: 280px;
      }
      .dropzone.is-dragging { border-color: var(--amber); background: var(--amber-soft); }
      .dropzone.has-file { justify-content: center; }
      .dropzone-icon { color: var(--ink-soft); margin-bottom: 6px; }
      .dropzone-title { margin: 0; font-weight: 600; font-size: 1rem; }
      .dropzone-subtitle { margin: 0 0 14px; color: var(--ink-soft); font-size: 0.86rem; }

      .file-chip {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--paper);
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        padding: 14px 16px;
      }
      .file-chip-icon { color: var(--teal); flex-shrink: 0; }
      .file-chip-meta { flex: 1; min-width: 0; text-align: left; }
      .file-chip-name {
        margin: 0;
        font-weight: 600;
        font-size: 0.92rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .file-chip-size { margin: 2px 0 0; font-size: 0.78rem; color: var(--ink-soft); }
      .file-chip-remove {
        border: none;
        background: none;
        cursor: pointer;
        color: var(--ink-soft);
        padding: 6px;
        border-radius: 50%;
        display: flex;
      }
      .file-chip-remove:hover { color: var(--clay); background: var(--clay-soft); }

      .field-error {
        margin: 12px 0 0;
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--clay);
        font-size: 0.82rem;
      }

      .jd-panel {
        border: 1px solid var(--rule);
        border-radius: var(--radius-md);
        background: var(--paper-raised);
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      .jd-panel label { font-weight: 600; font-size: 0.9rem; margin-bottom: 10px; }
      .jd-panel textarea {
        flex: 1;
        resize: vertical;
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
        font-size: 0.92rem;
        line-height: 1.5;
        color: var(--ink);
        background: var(--paper);
        min-height: 200px;
      }
      .jd-panel textarea:focus-visible { outline: 2px solid var(--amber); outline-offset: 1px; }
      .jd-count { margin: 8px 0 0; font-size: 0.76rem; color: var(--ink-soft); text-align: right; }

      /* ---------- buttons ---------- */
      .btn {
        font-family: var(--sans);
        font-weight: 600;
        font-size: 0.9rem;
        border-radius: var(--radius-sm);
        padding: 10px 18px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid transparent;
        transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease, transform 0.05s ease;
      }
      .btn:active { transform: translateY(1px); }
      .btn--primary { background: var(--ink); color: var(--paper); }
      .btn--primary:hover:not(:disabled) { background: #2A3247; }
      .btn--primary:disabled { background: var(--rule-strong); color: #8A8574; cursor: not-allowed; }
      .btn--secondary { background: var(--paper-raised); color: var(--ink); border-color: var(--rule-strong); }
      .btn--secondary:hover:not(:disabled) { border-color: var(--ink); }
      .btn--large { padding: 13px 26px; font-size: 0.95rem; }

      .analyze-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
      .analyze-hint { margin: 0; font-size: 0.8rem; color: var(--ink-soft); }

      .spinner {
        width: 14px; height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(250,250,248,0.4);
        border-top-color: var(--paper);
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ---------- alerts ---------- */
      .alert {
        display: flex;
        gap: 12px;
        padding: 14px 16px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--clay);
        background: var(--clay-soft);
        color: #7A3222;
        align-items: flex-start;
      }
      .alert--error svg { flex-shrink: 0; margin-top: 3px; }
      .alert-title { margin: 0 0 2px; font-weight: 700; }
      .alert p { margin: 0; font-size: 0.88rem; line-height: 1.5; }

      /* ---------- skeleton ---------- */
      .skeleton-block { display: flex; flex-direction: column; gap: 10px; }
      .skeleton-row {
        height: 16px;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--rule) 25%, #EFEBDF 37%, var(--rule) 63%);
        background-size: 400% 100%;
        animation: shimmer 1.4s ease infinite;
      }
      .skeleton-row--wide { width: 70%; }
      .skeleton-row--short { width: 40%; }
      @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

      /* ---------- score panel ---------- */
      .score-panel {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 36px;
        align-items: center;
        border: 1px solid var(--rule);
        border-radius: var(--radius-md);
        background: var(--paper-raised);
        padding: 28px;
      }

      .gauge { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .gauge-track { stroke: var(--rule); }
      .gauge-fill--good { stroke: var(--teal); }
      .gauge-fill--mid { stroke: var(--amber); }
      .gauge-fill--low { stroke: var(--clay); }
      .gauge-fill { transition: stroke-dashoffset 0.6s ease; }
      .gauge-number { font-family: var(--serif); font-size: 1.9rem; font-weight: 600; fill: var(--ink); }
      .gauge-percent { font-size: 0.62rem; fill: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
      .gauge-label { margin: 2px 0 0; font-weight: 600; font-size: 0.88rem; color: var(--ink-soft); }

      .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 28px; }
      .metric-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 5px; }
      .metric-label { color: var(--ink-soft); }
      .metric-value { font-weight: 600; }
      .metric-track { height: 6px; border-radius: 3px; background: var(--rule); overflow: hidden; }
      .metric-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
      .metric-fill--good { background: var(--teal); }
      .metric-fill--mid { background: var(--amber); }
      .metric-fill--low { background: var(--clay); }

      /* ---------- skills ---------- */
      .skills-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .skills-column {
        border: 1px solid var(--rule);
        border-radius: var(--radius-md);
        background: var(--paper-raised);
        padding: 20px;
      }
      .skills-column h3 { margin: 0 0 4px; font-family: var(--serif); font-size: 1.1rem; }
      .skills-note { margin: 0 0 14px; font-size: 0.82rem; color: var(--ink-soft); line-height: 1.45; }
      .skills-empty { margin: 0; font-size: 0.85rem; color: var(--ink-soft); }

      .badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid transparent;
      }
      .badge--good { background: var(--teal-soft); color: #1E4A40; border-color: #BFDAD1; }
      .badge--warn { background: var(--clay-soft); color: #7A3222; border-color: #E3BEAF; }
      .badge--neutral { background: var(--rule); color: var(--ink); }

      /* ---------- analysis grid ---------- */
      .analysis-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 18px;
      }
      .list-card {
        border: 1px solid var(--rule);
        border-radius: var(--radius-md);
        background: var(--paper-raised);
        padding: 18px;
      }
      .list-card h3 { margin: 0 0 10px; font-family: var(--serif); font-size: 1rem; }
      .list-card ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
      .list-card li { font-size: 0.86rem; line-height: 1.4; }
      .list-card-empty { margin: 0; font-size: 0.84rem; color: var(--ink-soft); }

      /* ---------- suggestions ---------- */
      .suggestions-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .suggestions-list li {
        display: flex;
        gap: 14px;
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        background: var(--paper-raised);
        padding: 14px 16px;
        font-size: 0.9rem;
        line-height: 1.5;
      }
      .suggestion-index {
        flex-shrink: 0;
        width: 24px; height: 24px;
        border-radius: 50%;
        background: var(--amber-soft);
        color: #7A5A0E;
        font-weight: 700;
        font-size: 0.78rem;
        display: flex; align-items: center; justify-content: center;
      }

      /* ---------- history ---------- */
      .history-list { display: flex; flex-direction: column; gap: 10px; }
      .history-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border: 1px solid var(--rule);
        border-radius: var(--radius-md);
        background: var(--paper-raised);
        padding: 16px 18px;
        flex-wrap: wrap;
      }
        .history-row {
  width: 100%;
  text-align: left;
  font-family: var(--sans);
  cursor: pointer;
}

.history-row:hover {
  border-color: var(--rule-strong);
  transform: translateY(-1px);
}
      .history-row-main { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .history-icon {
        flex-shrink: 0;
        width: 34px; height: 34px;
        border-radius: var(--radius-sm);
        background: var(--paper);
        border: 1px solid var(--rule);
        display: flex; align-items: center; justify-content: center;
        color: var(--ink-soft);
      }
      .history-name { margin: 0; font-weight: 600; font-size: 0.92rem; }
      .history-date {
        margin: 3px 0 0;
        font-size: 0.78rem;
        color: var(--ink-soft);
        display: flex; align-items: center; gap: 5px;
      }
      .history-row-scores { display: flex; gap: 22px; }
      .history-score { text-align: right; }
      .history-score-value { display: block; font-weight: 700; font-family: var(--serif); font-size: 1.05rem; }
      .history-score-label { display: block; font-size: 0.72rem; color: var(--ink-soft); }

      .empty-state {
        border: 1px dashed var(--rule-strong);
        border-radius: var(--radius-md);
        padding: 48px 24px;
        text-align: center;
        color: var(--ink-soft);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .empty-title { margin: 6px 0 0; font-weight: 600; color: var(--ink); }
      .empty-state p:last-child { margin: 0; font-size: 0.88rem; }

      /* ---------- responsive ---------- */
      @media (max-width: 980px) {
        .upload-grid { grid-template-columns: 1fr; }
        .skills-panel { grid-template-columns: 1fr; }
        .score-panel { grid-template-columns: 1fr; justify-items: center; text-align: center; }
        .metric-grid { grid-template-columns: 1fr; width: 100%; }
      }

      @media (max-width: 760px) {
        .app-shell { grid-template-columns: 1fr; }
        .rail {
          position: static;
          height: auto;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          gap: 16px;
        }
        .rail-subtitle { display: none; }
        .rail-nav { flex-direction: row; }
        .rail-footer { display: none; }
        .main { padding: 28px 20px 60px; }
        .history-row { flex-direction: column; align-items: flex-start; }
        .history-row-scores { width: 100%; justify-content: space-between; }
      }

      @media (prefers-reduced-motion: reduce) {
        .gauge-fill, .metric-fill, .spinner, .skeleton-row { animation: none !important; transition: none !important; }
      }
        .gemini-feedback-section {
  --gemini-bg: #f6f7fb;
  --gemini-surface: #ffffff;
  --gemini-border: #e4e7ee;
  --gemini-text: #151a2c;
  --gemini-muted: #5d6578;
  --gemini-accent: #4f46e5;

  --gemini-green: #15803d;
  --gemini-green-soft: #e7f6ec;
  --gemini-amber: #b45309;
  --gemini-amber-soft: #fdf1dc;
  --gemini-blue: #1d4ed8;
  --gemini-blue-soft: #e6eefe;
  --gemini-purple: #7e22ce;
  --gemini-purple-soft: #f3e8ff;
  --gemini-red: #b42318;
  --gemini-red-soft: #fdecea;

  --gemini-radius: 14px;
  --gemini-shadow: 0 1px 2px rgba(16, 24, 40, 0.04),
    0 4px 14px rgba(16, 24, 40, 0.04);

  box-sizing: border-box;
  width: 100%;
  margin-top: 40px;
  padding: 32px;
  background: var(--gemini-bg);
  border: 1px solid var(--gemini-border);
  border-radius: 20px;
  color: var(--gemini-text);
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
}

.gemini-feedback-section *,
.gemini-feedback-section *::before,
.gemini-feedback-section *::after {
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .gemini-feedback-section {
    --gemini-bg: #11141f;
    --gemini-surface: #181c2a;
    --gemini-border: #2a2f42;
    --gemini-text: #eef0f7;
    --gemini-muted: #a0a7bb;
    --gemini-accent: #8b87ff;

    --gemini-green: #5bd48a;
    --gemini-green-soft: #14301f;
    --gemini-amber: #f2b45a;
    --gemini-amber-soft: #38290f;
    --gemini-blue: #7aa5ff;
    --gemini-blue-soft: #16264d;
    --gemini-purple: #c79bff;
    --gemini-purple-soft: #2c1a45;
    --gemini-red: #ff8f84;
    --gemini-red-soft: #3a1815;

    --gemini-shadow: none;
  }
}

/* ---------- Header ---------- */

.gemini-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.gemini-heading-content h2 {
  margin: 0 0 6px;
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.gemini-heading-content p {
  margin: 0;
  max-width: 60ch;
  color: var(--gemini-muted);
  font-size: 0.975rem;
}

.gemini-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 7px 14px;
  background: var(--gemini-surface);
  border: 1px solid var(--gemini-border);
  border-radius: 999px;
  color: var(--gemini-muted);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.gemini-status-dot {
  width: 8px;
  height: 8px;
  background: var(--gemini-green);
  border-radius: 50%;
}

/* ---------- Overall assessment (main highlight) ---------- */

.gemini-overview-card {
  margin-bottom: 20px;
  padding: 26px 28px;
  background: var(--gemini-surface);
  border: 1px solid var(--gemini-border);
  border-left: 5px solid var(--gemini-accent);
  border-radius: var(--gemini-radius);
  box-shadow: var(--gemini-shadow);
}

.gemini-overview-card h3 {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.gemini-overview-card p {
  margin: 0;
  max-width: 75ch;
  font-size: 1.02rem;
  line-height: 1.75;
}

/* ---------- Grid + cards ---------- */

.gemini-feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}

.gemini-feedback-card {
  --tone: var(--gemini-accent);
  --tone-soft: var(--gemini-blue-soft);

  padding: 24px;
  background: var(--gemini-surface);
  border: 1px solid var(--gemini-border);
  border-radius: var(--gemini-radius);
  box-shadow: var(--gemini-shadow);
}

.gemini-card--green  { --tone: var(--gemini-green);  --tone-soft: var(--gemini-green-soft); }
.gemini-card--amber  { --tone: var(--gemini-amber);  --tone-soft: var(--gemini-amber-soft); }
.gemini-card--blue   { --tone: var(--gemini-blue);   --tone-soft: var(--gemini-blue-soft); }
.gemini-card--purple { --tone: var(--gemini-purple); --tone-soft: var(--gemini-purple-soft); }

.gemini-action-card {
  grid-column: 1 / -1;
}

.gemini-card-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--gemini-border);
}

.gemini-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  background: var(--tone-soft);
  border-radius: 10px;
  color: var(--tone);
  font-size: 1.1rem;
  font-weight: 700;
}

.gemini-card-heading h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.gemini-card-heading p {
  margin: 2px 0 0;
  color: var(--gemini-muted);
  font-size: 0.85rem;
}

/* ---------- Content rendered by renderFeedbackItems ---------- */

.gemini-feedback-card ul,
.gemini-feedback-card ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.gemini-feedback-card li {
  position: relative;
  padding-left: 22px;
  font-size: 0.94rem;
  line-height: 1.65;
}

.gemini-feedback-card li + li {
  margin-top: 12px;
}

.gemini-feedback-card li::before {
  content: "";
  position: absolute;
  top: 0.62em;
  left: 2px;
  width: 7px;
  height: 7px;
  background: var(--tone);
  border-radius: 50%;
}

/* plain <p> output (outside the heading) */
.gemini-feedback-card > p {
  margin: 0 0 12px;
  font-size: 0.94rem;
}

/* ---------- Action plan: numbered steps ---------- */

.gemini-action-card ul,
.gemini-action-card ol {
  counter-reset: gemini-step;
}

.gemini-action-card li {
  counter-increment: gemini-step;
  min-height: 30px;
  padding-left: 44px;
}

.gemini-action-card li::before {
  content: counter(gemini-step);
  top: 0;
  left: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  background: var(--tone-soft);
  border-radius: 50%;
  color: var(--tone);
  font-size: 0.8rem;
  font-weight: 700;
}

/* ---------- Empty and error states ---------- */

.gemini-empty-state,
.gemini-error-state {
  padding: 36px 24px;
  border-radius: var(--gemini-radius);
  text-align: center;
}

.gemini-empty-state {
  background: var(--gemini-surface);
  border: 1px dashed var(--gemini-border);
}

.gemini-error-state {
  background: var(--gemini-red-soft);
  border: 1px solid var(--gemini-red);
}

.gemini-empty-state h3,
.gemini-error-state h3 {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 650;
}

.gemini-error-state h3 {
  color: var(--gemini-red);
}

.gemini-empty-state p,
.gemini-error-state p {
  max-width: 50ch;
  margin: 0 auto;
  color: var(--gemini-muted);
  font-size: 0.94rem;
}

/* ---------- Disclaimer ---------- */

.gemini-disclaimer {
  margin: 24px 0 0;
  padding-top: 18px;
  border-top: 1px solid var(--gemini-border);
  color: var(--gemini-muted);
  font-size: 0.82rem;
  line-height: 1.6;
}

/* ---------- Responsive ---------- */

@media (max-width: 860px) {
  .gemini-feedback-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .gemini-feedback-section {
    margin-top: 28px;
    padding: 20px 16px;
    border-radius: 16px;
  }

  .gemini-section-header {
    flex-direction: column;
    gap: 14px;
  }

  .gemini-heading-content h2 {
    font-size: 1.4rem;
  }

  .gemini-overview-card,
  .gemini-feedback-card {
    padding: 20px 18px;
  }
}
    `}</style>
  );
}