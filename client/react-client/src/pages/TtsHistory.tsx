import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clipboard,
  Clock,
  Download,
  FileAudio,
  ListVideo,
  Loader2,
  RefreshCw,
  Trash2,
  Volume2,
} from 'lucide-react';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ttsHistoryApi, TtsHistoryItem } from '../api/ttsHistory';

const PAGE_SIZE = 8;

const formatDate = (value: string) =>
  new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const formatDuration = (seconds: number) => {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export default function TtsHistory() {
  const [items, setItems] = useState<TtsHistoryItem[]>([]);
  const [selected, setSelected] = useState<TtsHistoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ttsHistoryApi.list(page, PAGE_SIZE, search);
      const list = Array.isArray(response.items) ? response.items : [];
      setItems(list);
      setTotalPages(response.totalPages || 1);
      setSelected((current) => list.find((item) => item.id === current?.id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load voice history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchHistory, 250);
    return () => window.clearTimeout(timer);
  }, [page, search]);

  const copyText = async () => {
    if (!selected?.originalText) return;
    try {
      await navigator.clipboard.writeText(selected.originalText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy this text.');
    }
  };

  const downloadAudio = async () => {
    if (!selected?.audioUrl) return;
    try {
      setDownloading(true);
      const response = await fetch(selected.audioUrl);
      if (!response.ok) throw new Error();
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `tts_${selected.language || 'audio'}_${selected.id}.mp3`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setError('Could not download this audio.');
    } finally {
      setDownloading(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await ttsHistoryApi.remove(itemToDelete);
      if (selected?.id === itemToDelete) setSelected(null);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this record.');
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="vs-history-page fade-in">
      <div className="vs-container vs-history-inner">
        <div className="vs-page-head">
          <div className="vs-page-head__text">
            <span className="vs-page-kicker">Library</span>
            <h1 className="vs-page-title"><Volume2 size={26} /> Voice history</h1>
            <p className="vs-page-desc">Replay generated audio and review the original script.</p>
          </div>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search text or language…"
          />
        </div>

        <div className="vs-split">
          <section className="vs-panel" aria-label="Voice records">
            <div className="vs-panel-header">
              <div className="vs-panel-header__group">
                <ListVideo size={15} style={{ color: 'var(--vs-accent-light)' }} />
                <h2 className="vs-panel-title">Recent audio</h2>
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
              ) : items.length === 0 ? (
                <div className="vs-empty">
                  <Volume2 size={26} />
                  <p>{search ? 'No matching audio.' : 'No audio generated yet.'}</p>
                </div>
              ) : (
                items.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <div key={item.id} className={`vs-list-row ${active ? 'is-active' : ''}`}>
                      <button className="vs-list-item" onClick={() => setSelected(item)} aria-pressed={active}>
                        <span className="vs-list-item-title">{item.originalText || 'Untitled audio'}</span>
                        <span className="vs-list-item-meta">
                          <span><Clock size={12} /> {formatDate(item.createdAt)}</span>
                          {item.language && <span>{item.language.toUpperCase()}</span>}
                          {item.duration != null && item.duration > 0 && (
                            <span>{formatDuration(item.duration)}</span>
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="vs-list-item-delete"
                        onClick={() => setItemToDelete(item.id)}
                        aria-label="Delete voice record"
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

          <section className="vs-panel" aria-label="Voice details">
            {!selected ? (
              <div className="vs-empty" style={{ flex: 1 }}>
                <FileAudio size={34} />
                <div>
                  <strong style={{ color: 'var(--vs-text-muted)', fontWeight: 600 }}>Select a recording</strong>
                  <p style={{ marginTop: 4 }}>Choose a voice record to listen and read along.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="vs-panel-header" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="vs-panel-title">Audio details</h2>
                    <div className="vs-meta-row">
                      <span>{formatDate(selected.createdAt)}</span>
                      {selected.language && <span className="vs-badge">{selected.language.toUpperCase()}</span>}
                      {selected.duration != null && selected.duration > 0 && (
                        <span className="vs-badge">{formatDuration(selected.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vs-history-detail-body">
                  <div className="vs-history-content-label">
                    <span>Original text</span>
                    <button className="vs-btn vs-btn--ghost vs-btn--sm" onClick={copyText} title="Copy">
                      {copied ? <><Check size={13} /> Copied</> : <><Clipboard size={13} /> Copy</>}
                    </button>
                  </div>
                  <div className="vs-history-text">
                    {selected.originalText || 'No content available.'}
                  </div>
                </div>

                <div className="vs-detail-footer">
                  {selected.audioUrl ? (
                    <>
                      <audio controls preload="metadata" src={selected.audioUrl}>
                        Your browser does not support audio playback.
                      </audio>
                      <button
                        className="vs-btn vs-btn--secondary"
                        onClick={downloadAudio}
                        disabled={downloading}
                      >
                        {downloading
                          ? <Loader2 size={15} className="spin" />
                          : <Download size={15} />}
                        Download audio
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--vs-danger-light)', fontSize: 13 }}>
                      <AlertCircle size={16} /> This record has no audio URL.
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Delete voice record"
        description="This record and its audio will be permanently removed. This action cannot be undone."
        onConfirm={confirmDelete}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
