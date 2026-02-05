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

// debounce sin NodeJS
function debounceFn<F extends (...args: any[]) => void>(fn: F, delay: number) {
  let timeout: number | undefined;
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), delay);
  };
}

export const API_URL = "http://127.0.0.1:8000";


export default function Page() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<boolean | undefined>();
  const didFetch = useRef(false);

  // PDF Q&A (RAG)
  const [qaPdfId, setQaPdfId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<{ page?: number; snippet: string }[]>([]);
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

    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error("Error fetching PDFs");

    const data: PDF[] = await res.json();
    setPdfs(data);
    setQaPdfId((prev) => prev ?? (data.length ? data[0].id : null));
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    id: number
  ) {
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

    const form = new FormData();
    form.append("file", selectedFile);

    const res = await fetch(`${API_URL}/pdfs/upload`, {
      method: "POST",
      body: form,
    });

    const newPdf = await res.json();
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

      const data = await res.json();
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

        {/* 🔷 UPLOAD */}
        <section className={styles.box}>
          <h2>Upload PDF</h2>
          <form onSubmit={handleUpload} className={styles.upload}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <button type="submit">Upload</button>
          </form>
        </section>

        {/* 🔷 LIST */}
        <section className={styles.box}>
          <h2>PDF List</h2>
          {!pdfs.length ? (
            <p>No PDFs</p>
          ) : (
            pdfs.map((pdf) => (
              <PDFComponent
                key={pdf.id}
                pdf={pdf}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))
          )}
        </section>

        {/* 🔷 FILTERS */}
        <section className={styles.box}>
          <h2>Filters</h2>
          <div className={styles.filters}>
            <button onClick={() => { setFilter(undefined); fetchPdfs(); }}>
              All
            </button>
            <button onClick={() => { setFilter(true); fetchPdfs(true); }}>
              Selected
            </button>
            <button onClick={() => { setFilter(false); fetchPdfs(false); }}>
              Not selected
            </button>
          </div>
        </section>

        {/* 🔷 Q&A */}
        <section className={styles.box}>
          <h2>Ask Your PDF (RAG)</h2>
          {!pdfs.length ? (
            <p>Upload a PDF first.</p>
          ) : (
            <form onSubmit={handleAsk} className={styles.qaForm}>
              <select
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
                type="text"
                placeholder="Ask a question about this PDF..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />

              <button type="submit" disabled={qaLoading}>
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
                <>
                  <h3>Sources</h3>
                  {sources.map((s, idx) => (
                    <p key={idx}>
                      {s.page ? `Page ${s.page}: ` : ""}
                      {s.snippet}
                    </p>
                  ))}
                </>
              ) : null}
            </div>
          ) : null}
        </section>

      </div>
    </Layout>
  );
}
