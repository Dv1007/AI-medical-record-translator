import { useRef, useState } from 'react';

function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function upload(selected) {
    if (!selected) return;
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a PDF file to continue.');
      return;
    }
    setFile(selected);
    setResult(null);
    setError('');
    setLoading(true);
    const body = new FormData();
    body.append('file', selected);
    try {
      const response = await fetch('/api/extract', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'The report could not be processed.');
      setResult(data);
    } catch (cause) {
      setError(cause.message || 'Could not connect to the API. Start the backend and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Clarity Health home">
          <span className="brand-mark">✳</span><span>clarity<span className="brand-light">health</span></span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <a className="nav-item active" href="#reports"><span>▤</span> My reports</a>
        <a className="nav-item" href="#questions"><span>◌</span> Appointment prep</a>
        <div className="sidebar-bottom"><div className="privacy-icon">⌑</div><strong>Your health, kept private</strong><p>Reports stay in your workspace. You’re always in control of your information.</p><a href="#privacy">Privacy details <span>↗</span></a></div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> My reports</div><div className="profile"><span className="avatar">J</span><span>Personal workspace</span><span className="chevron">⌄</span></div></header>
        <section className="page-heading" id="reports"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR HEALTH, MADE CLEAR</div><h1>Understand your<br/><em>lab results.</em></h1><p className="lede">A calmer way to make sense of your health reports. Start by adding a lab report below.</p></div><div className="heading-art" aria-hidden="true"><div className="art-circle"><span className="art-plus">+</span><span className="art-spark">✳</span><div className="art-leaf"/></div></div></section>

        <section className="upload-card" aria-labelledby="upload-title">
          <div className="card-topline"><div><h2 id="upload-title">Add a lab report</h2><p>We’ll prepare your report so it’s easier to review.</p></div><span className="step-pill"><span>01</span> UPLOAD</span></div>
          <button className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload(event.dataTransfer.files[0]); }}>
            <span className="upload-icon">↑</span><span className="drop-title">{file ? file.name : 'Drop your PDF report here'}</span><span className="drop-subtitle">or <span className="browse-link">browse files</span> on your device</span><span className="file-chip">PDF <i>·</i> UP TO 20 MB</span>
          </button>
          <input ref={inputRef} className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => upload(event.target.files[0])}/>
          {loading && <p className="status-message">Reading your PDF…</p>}
          {error && <p className="error-message" role="alert">{error}</p>}
          {result && <div className="result-panel"><div className="result-heading"><span className="success-icon">✓</span><div><strong>Text extracted</strong><span>{result.page_count} page{result.page_count === 1 ? '' : 's'} · {result.filename}</span></div></div><pre>{result.text}</pre><p className="disclaimer">{result.disclaimer}</p></div>}
          <div className="security-note"><span>◈</span> Your report is processed for text extraction only.</div>
        </section>

        <section className="next-card" id="questions"><div className="next-icon">✳</div><div><div className="next-kicker">COMING NEXT</div><h3>Your results, explained in plain language.</h3><p>Once your report is ready, we’ll help you understand the numbers and prepare questions for your care team.</p></div><span className="next-arrow">↗</span></section>
        <footer><span>Clarity Health <i>·</i> A little more clarity, a little less worry.</span><span>For education only <i>·</i> Always talk with your healthcare professional.</span></footer>
      </main>
    </div>
  );
}

export default App;
