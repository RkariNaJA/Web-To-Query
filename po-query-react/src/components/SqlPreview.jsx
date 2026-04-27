import { buildSqlPreview } from '../sqlPreview';

export default function SqlPreview({ mode, poInput, execInput }) {
  const html = buildSqlPreview(mode, poInput, execInput);

  return (
    <div>
      <div className="sql-preview">
        <div className="sql-preview-header">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-accent)', display: 'inline-block' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-accent)', display: 'inline-block', marginLeft: 4 }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-accent)', display: 'inline-block', marginLeft: 4 }} />
          <span className="sql-preview-title">SQL PREVIEW</span>
        </div>
        <div className="sql-preview-body" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
