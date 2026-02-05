"use client";

import styles from "../styles/pdf.module.css";

export default function PDF({ pdf, onChange, onDelete }: any) {
  return (
    <div className={styles.pdf}>
      <a
        href={pdf.file}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open PDF--

      </a>

      <input
        type="text"
        name="name"
        value={pdf.name}
        onChange={(e) => onChange(e, pdf.id)}
      />

      <label>
        <input
          type="checkbox"
          name="selected"
          checked={pdf.selected}
          onChange={(e) => onChange(e, pdf.id)}
        />
        Selected--
      </label>

      <button onClick={() => onDelete(pdf.id)}>Delete</button>
    </div>
  );
}
