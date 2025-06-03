import React from "react";
import styles from "@/styles/GuidePage.module.css";
import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import Link from "next/link";

export default function Guide({ markdown }) {
  return (
    <div className={styles.container}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: '#2a5bd7', fontWeight: 600, fontSize: 16, fontFamily: 'Geist, Arial, sans-serif', letterSpacing: '0.01em', textDecoration: 'none', display: 'inline-block', padding: '2px 0' }}>&larr; Still Okay Home</Link>
      </div>
      <div className={styles.markdown}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'src/pages/guide.md');
  const markdown = fs.readFileSync(filePath, 'utf8');
  return { props: { markdown } };
} 