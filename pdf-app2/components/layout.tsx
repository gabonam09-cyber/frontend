"use client";

import styles from "../styles/layout.module.css";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true" />
          <div className={styles.titles}>
            <h1 className={styles.title}>PDF Studio</h1>
            <p className={styles.subtitle}>
              Upload PDFs, organize them, open them instantly, and ask questions
              with RAG.
            </p>
          </div>
        </div>
      </header>

      <div className={styles.content}>{children}</div>

      <footer className={styles.footer}>
        <span className={styles.footerText}>
          Tip: PDFs open in a new tab. If Q&amp;A fails, make sure the backend has
          an OpenAI key configured.
        </span>
      </footer>
    </div>
  );
}
