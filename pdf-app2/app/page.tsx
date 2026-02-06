"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../components/layout";
import PDFComponent from "../components/pdf";
import styles from "../styles/page.module.css";

type PDF = {
  id: number;
  name: string;
  selected: boolean;
  file: string;
};

function debounceFn<F extends (...args: any[]) => void>(fn: F, delay: number) {
  let timeout: number | undefined;
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), delay);
  };
}

// Backend base URL. In Vercel set NEXT_PUBLIC_API_URL to your Render URL.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://backend-csqu.onrender.com";

export default function Page() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<boolean | undefined>();
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const didFetch = useRef(false);

  // PDF Q&A (RAG)
  const [qaPdfId, setQaPdfId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<{ page?: number; snippet: string }[]>(
    []
  );
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      fetchPdfs();
    }
  }, []);

  async function fetchPdfs(selected?: boolean) {
    let path = "/pdfs";
    if (selected !== undefined) path += `?selected=${selected}`;

    setLoading(true);
    setListError(null);

    try {
      const res = await fetch(`${API_URL}${path}`);
      if (!res.ok) {
        const maybeJson = await res
          .json()
          .catch(() => ({ error: "Error fetching PDFs" }));
        throw new Error(maybeJson?.error || "Error fetching PDFs");
      }

      const data: PDF[] = await res.json();
      setPdfs(data);
      setQaPdfId((prev) => prev ?? (data.length ? data[0].id : null));
    } catch (err: any) {
      setListError(err?.message || "Could not load PDFs");
    } finally {
      setLoading(false);
    }
  }

  const debouncedUpdate = useCallback(
    debounceFn(async (pdf: PDF, field: keyof PDF) => {
      await fetch(`${API_URL}/pdfs/${pdf.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: pdf[field] }),
      });
    }, 400),
    []
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, id: number) {
    const { name, type, checked, value } = e.target;

    setPdfs((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, [name]: type === "checkbox" ? checked : value }
          : p
      )
    );

    const pdf = pdfs.find((p) => p.id === id);
    if (pdf) {
      debouncedUpdate(
        { ...pdf, [name]: type === "checkbox" ? checked : value },
        name as keyof PDF
      );
    }
  }

  async function handleDelete(id: number) {
    await fetch(`${API_URL}/pdfs/${id}`, { method: "DELETE" });
    setPdfs((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setListError(null);

    const form = new FormData();
    form.append("file", selectedFile);

    const res = await fetch(`${API_URL}/pdfs/upload`, {
      method: "POST",
      body: form,
    });

    const newPdf = await res
      .json()
      .catch(() => ({ error: "Upload failed" }));

    if (!res.ok) {
      setListError(newPdf?.detail || newPdf?.error || "Upload failed");
      return;
    }

    setPdfs((prev) => [...prev, newPdf]);
    setQaPdfId((prev) => prev ?? newPdf?.id ?? null);
    setSelectedFile(null);
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!qaPdfId || !question.trim()) return;

    setQaLoading(true);
    setQaError(null);

    try {
      const res = await fetch(`${API_URL}/pdfs/${qaPdfId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQaError(data?.detail || data?.error || "Error asking PDF");
        setAnswer(null);
        setSources([]);
      } else {
        setAnswer(data.answer);
        setSources(data.sources || []);
      }
    } catch (err: any) {
      setQaError(err?.message || "Network error");
      setAnswer(null);
      setSources([]);
    } finally {
      setQaLoading(false);
    }
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.grid}>
          {/* Upload */}
          <section className={`${styles.card} ${styles.uploadCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Upload PDF</h2>
              <p className={styles.cardHint}>PDF only</p>
            </div>

            <form onSubmit={handleUpload} className={styles.row}>
              <input
                className={`${styles.input} ${styles.file}`}
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
                Upload
              </button>
            </form>

            {listError ? <p className={styles.qaError}>{listError}</p> : null}
          </section>

          {/* Filters */}
          <section className={`${styles.card} ${styles.filtersCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Filters</h2>
              <p className={styles.cardHint}>Quick views</p>
            </div>

            <div className={styles.filters}>
              <button
                className={`${styles.btn} ${filter === undefined ? styles.filterActive : ""}`}
                onClick={() => {
                  setFilter(undefined);
                  fetchPdfs();
                }}
                type="button"
              >
                All
              </button>
              <button
                className={`${styles.btn} ${filter === true ? styles.filterActive : ""}`}
                onClick={() => {
                  setFilter(true);
                  fetchPdfs(true);
                }}
                type="button"
              >
                Selected
              </button>
              <button
                className={`${styles.btn} ${filter === false ? styles.filterActive : ""}`}
                onClick={() => {
                  setFilter(false);
                  fetchPdfs(false);
                }}
                type="button"
              >
                Not selected
              </button>
            </div>

            <p className={styles.note}>
              {loading ? "Loading PDFs..." : `${pdfs.length} PDF(s)`}
            </p>
          </section>

          {/* List */}
          <section className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>PDF Library</h2>
              <p className={styles.cardHint}>Open, rename, select, delete</p>
            </div>

            {!pdfs.length ? (
              <p className={styles.status}>
                {loading ? "Fetching PDFs..." : "No PDFs yet. Upload one to get started."}
              </p>
            ) : (
              <div className={styles.list}>
                {pdfs.map((pdf) => (
                  <PDFComponent
                    key={pdf.id}
                    pdf={pdf}
                    onChange={handleChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Q&A */}
          <section className={`${styles.card} ${styles.qaCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Ask Your PDF (RAG)</h2>
              <p className={styles.cardHint}>Semantic search + LLM answer</p>
            </div>

            {!pdfs.length ? (
              <p className={styles.status}>Upload a PDF first.</p>
            ) : (
              <form onSubmit={handleAsk} className={styles.qaForm}>
                <select
                  className={`${styles.select} ${styles.input}`}
                  value={qaPdfId ?? undefined}
                  onChange={(e) => setQaPdfId(Number(e.target.value))}
                >
                  {pdfs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <input
                  className={styles.input}
                  type="text"
                  placeholder="Ask a question about this PDF..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />

                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="submit"
                  disabled={qaLoading}
                >
                  {qaLoading ? "Asking..." : "Ask"}
                </button>
              </form>
            )}

            {qaError ? <p className={styles.qaError}>{qaError}</p> : null}

            {answer ? (
              <div className={styles.qaAnswer}>
                <h3>Answer</h3>
                <p>{answer}</p>

                {sources?.length ? (
                  <div className={styles.sources}>
                    {sources.map((s, idx) => (
                      <div className={styles.source} key={idx}>
                        <p className={styles.sourceTitle}>
                          {s.page ? `Source: Page ${s.page}` : "Source"}
                        </p>
                        <p>{s.snippet}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </Layout>
  );
}
