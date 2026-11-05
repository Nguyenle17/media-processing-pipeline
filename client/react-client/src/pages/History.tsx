import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clipboard,
  Clock,
  Download,
  FileText,
  Languages,
  ListVideo,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useFileDownload } from '../hooks/useFileDownload';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { translationHistoryApi, TranslationHistoryItem } from '../api/translationHistory';
import SearchInput from '../components/common/SearchInput';

type TextMode = 'original' | 'translated';

const getText = (job: TranslationHistoryItem, mode: TextMode) => mode === 'original' ? job.transcriptText || '' : job.translatedText || job.resultText || '';
const formatDate = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export default function History() {
  const { downloadByFormat } = useFileDownload();
  const [jobs, setJobs] = useState<TranslationHistoryItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<TranslationHistoryItem | null>(null);
  const [mode, setMode] = useState<TextMode>('translated');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true); setError(null);
      const response = await translationHistoryApi.list(page, 8, search);
      const nextJobs = Array.isArray(response.jobs) ? response.jobs : [];
      setJobs(nextJobs);
      setTotalPages(response.totalPages || 1);
      setSelectedJob((current) =>
        nextJobs.find((job) => job._id === current?._id) ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load translation history.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchHistory, 250);
    return () => window.clearTimeout(timer);
  }, [page, search]);

  const openJob = async (job: TranslationHistoryItem) => {
    setSelectedJob(job);
    setMode(job.type === 'translate' ? 'translated' : 'original');
    if (job.status !== 'completed' || job.chunks) return;
    try {
      setDetailLoading(true);
      const detail = await translationHistoryApi.detail(job._id);
      setSelectedJob({
        ...job,
        ...(detail.job || {}),
        chunks: Array.isArray(detail.chunks) ? detail.chunks : [],
      });
    } catch { /* Text fields from /job/user remain available. */ }
    finally { setDetailLoading(false); }
  };

  const copyText = async () => {
    const text = selectedJob ? getText(selectedJob, mode) : '';
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    try {
      await translationHistoryApi.remove(jobToDelete);
      if (selectedJob?._id === jobToDelete) setSelectedJob(null);
      await fetchHistory();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete this record.'); }
    finally { setJobToDelete(null); }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={14} className="vs-text-success" />;
    if (status === 'processing' || status === 'translating') return <Loader2 size={14} className="spin vs-text-accent" />;
    if (status === 'failed') return <AlertCircle size={14} className="vs-text-danger" />;
    return <Clock size={14} />;
  };

  const selectedText = selectedJob ? getText(selectedJob, mode) : '';

  return (
    <div className="vs-history-page fade-in">
      <div className="vs-container vs-history-inner">
        <div className="vs-page-head">
          <div className="vs-page-head__text">
            <span className="vs-page-kicker">Library</span>
            <h1 className="vs-page-title"><Languages size={26} /> Translation history</h1>
            <p className="vs-page-desc">Review the original text and translation for every completed video.</p>
          </div>
          <SearchInput
            placeholder="Search by file name…"
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
          />
        </div>

        <div className="vs-split">
          <section className="vs-panel" aria-label="Translation records">
            <div className="vs-panel-header">
              <div className="vs-panel-header__group">
                <ListVideo size={15} style={{ color: 'var(--vs-accent-light)' }} />
                <h2 className="vs-panel-title">Recent translations</h2>
              </div>
              <button className="vs-btn vs-btn--ghost vs-btn--sm" onClick={fetchHistory} title="Refresh">
                <RefreshCw size={13} /> <span className="vs-hide-sm">Refresh</span>
              </button>
            </div>

            <div className="vs-list-body">
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <LoadingSpinner size={28} />
                </div>
              ) : error ? (
                <div className="vs-empty" role="alert">
                  <AlertCircle size={26} />
                  <p style={{ color: 'var(--vs-danger-light)' }}>{error}</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="vs-empty">
                  <ListVideo size={26} />
                  <p>{search ? 'No matching records.' : 'No translations yet.'}</p>
                </div>
              ) : (
                jobs.map((job) => {
                  const active = selectedJob?._id === job._id;
                  return (
                    <div key={job._id} className={`vs-list-row ${active ? 'is-active' : ''}`}>
                      <button className="vs-list-item" onClick={() => openJob(job)} aria-pressed={active}>
                        <span className="vs-list-item-title">{job.title || 'Untitled job'}</span>
                        <span className="vs-list-item-meta">
                          <span>{statusIcon(job.status)} {job.status}</span>
                          <span>{formatDate(job.createdAt)}</span>
                        </span>
                        {job.status === 'completed' && (
                          <span className="vs-list-item-preview">
                            {job.translatedText || job.transcriptText || 'Translation ready'}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="vs-list-item-delete"
                        onClick={() => setJobToDelete(job._id)}
                        aria-label={`Delete ${job.title || 'translation'}`}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="vs-list-footer">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} delta={1} />
            </div>
          </section>

          <section className="vs-panel" aria-label="Translation details">
            {!selectedJob ? (
              <div className="vs-empty" style={{ flex: 1 }}>
                <FileText size={34} />
                <div>
                  <strong style={{ color: 'var(--vs-text-muted)', fontWeight: 600 }}>Select a record</strong>
                  <p style={{ marginTop: 4 }}>Choose a translation from the list to read it.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="vs-panel-header" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="vs-panel-title" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedJob.title || 'Translation details'}
                    </h2>
                    <div className="vs-meta-row">
                      <span>{formatDate(selectedJob.createdAt)}</span>
                      {selectedJob.targetLang && <span className="vs-badge">{selectedJob.targetLang}</span>}
                    </div>
                  </div>
                  {selectedJob.status === 'completed' && (
                    <div className="vs-history-tabs" role="group" aria-label="Choose text version">
                      <button className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')} aria-pressed={mode === 'original'}>Original</button>
                      {selectedJob.type === 'translate' && (
                        <button className={mode === 'translated' ? 'active' : ''} onClick={() => setMode('translated')} aria-pressed={mode === 'translated'}>Translation</button>
                      )}
                    </div>
                  )}
                </div>

                <div className="vs-history-detail-body">
                  {selectedJob.status === 'processing' || selectedJob.status === 'translating' || selectedJob.status === 'waiting' ? (
                    <div className="vs-empty" style={{ minHeight: '100%' }}>
                      <Loader2 size={32} className="spin" style={{ color: 'var(--vs-accent-light)' }} />
                      <p>Processing this translation…</p>
                    </div>
                  ) : selectedJob.status === 'failed' ? (
                    <div className="vs-empty" style={{ minHeight: '100%' }} role="alert">
                      <AlertCircle size={32} style={{ color: 'var(--vs-danger-light)' }} />
                      <p style={{ color: 'var(--vs-danger-light)' }}>{selectedJob.error || 'Translation failed.'}</p>
                    </div>
                  ) : detailLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                      <LoadingSpinner size={26} />
                    </div>
                  ) : (
                    <div>
                      <div className="vs-history-content-label">
                        <span>{mode === 'original' ? 'Original text' : 'Translated text'}</span>
                        <button className="vs-btn vs-btn--ghost vs-btn--sm" onClick={copyText} title="Copy">
                          {copied ? <><Check size={13} /> Copied</> : <><Clipboard size={13} /> Copy</>}
                        </button>
                      </div>
                      {mode === 'translated' && selectedJob.translatedText ? (
                        <div className="vs-history-text">{selectedJob.translatedText}</div>
                      ) : selectedJob.chunks?.length ? (
                        <div>
                          {selectedJob.chunks.map((chunk) => (
                            <div key={chunk.index} className="vs-history-chunk">
                              <span>#{chunk.index + 1}</span>
                              <p>{chunk.transcript || '—'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="vs-history-text">{selectedText || 'No content available.'}</div>
                      )}
                    </div>
                  )}
                </div>

                {selectedJob.status === 'completed' && (
                  <div className="vs-detail-footer">
                    <button
                      className="vs-btn vs-btn--secondary"
                      onClick={() => downloadByFormat(selectedText, mode === 'original' ? 'original-text' : 'translated-text', 'txt')}
                    >
                      <Download size={15} /> Download {mode === 'original' ? 'original' : 'translation'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <Modal
        isOpen={Boolean(jobToDelete)}
        onClose={() => setJobToDelete(null)}
        title="Delete translation"
        description="This record will be permanently removed. This action cannot be undone."
        onConfirm={confirmDelete}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
