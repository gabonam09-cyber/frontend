"use client";

import styles from "../styles/pdf.module.css";

export default function PDF({ pdf, onChange, onDelete }: any) {
  const hasFile = Boolean(pdf?.file);

  return (
    <div className={styles.row}>
      <input
        className={styles.checkbox}
        type="checkbox"
        name="selected"
        checked={Boolean(pdf.selected)}
        onChange={(e) => onChange(e, pdf.id)}
        aria-label="Selected"
      />

      <input
        className={styles.name}
        type="text"
        name="name"
        value={pdf.name}
        onChange={(e) => onChange(e, pdf.id)}
        placeholder="PDF name"
      />

      <a
        className={`${styles.action} ${!hasFile ? styles.disabled : ""}`}
        href={hasFile ? pdf.file : "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!hasFile) e.preventDefault();
        }}
        aria-disabled={!hasFile}
      >
        Open
      </a>

      <button
        className={styles.delete}
        onClick={() => onDelete(pdf.id)}
        type="button"
      >
        Delete
      </button>
    </div>
  );
}
