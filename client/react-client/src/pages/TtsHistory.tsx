import React, { useEffect, useState } from 'react';
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
      setError(err instanceof Error ? err.message : 'Không thể tải lịch sử TTS.');
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
      setError('Không thể sao chép nội dung.');
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
      setError('Không thể tải audio.');
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
      setError(err instanceof Error ? err.message : 'Không thể xoá bản ghi.');
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="history-container fade-in p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <h1 className="vs-section-title text-3xl font-bold mb-2 flex items-center gap-3">
            <Volume2 size={28} className="text-indigo-400" /> TTS history
          </h1>
          <p className="text-gray-400">Xem lại text gốc và nghe lại audio đã tạo.</p>
        </div>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Tìm theo nội dung, ngôn ngữ..."
        />
      </div>

      <div className="history-layout flex gap-6 flex-1 min-h-0">
        {/* ---------- List ---------- */}
        <section className="history-list vs-panel flex flex-col">
          <div className="vs-panel-header">
            <div className="flex items-center justify-between w-full">
              <h2 className="vs-panel-title flex items-center gap-2">
                <ListVideo size={16} /> Recent audio
              </h2>
              <button
                className="vs-btn vs-btn--ghost !p-2"
                onClick={fetchHistory}
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="vs-panel-body flex-1 overflow-y-auto vs-scroll p-0">
            {loading ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner size={32} color="#6366f1" />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-300 text-sm">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {search ? 'Không tìm thấy kết quả.' : 'Chưa có audio nào được tạo.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`history-item w-full text-left p-4 ${
                      selected?.id === item.id ? 'history-item--active' : ''
                    }`}
                    onClick={() => setSelected(item)}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="font-medium text-gray-200 truncate">
                        {item.originalText || 'Untitled audio'}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        className="text-gray-500 hover:text-red-400 shrink-0"
                        title="Delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          setItemToDelete(item.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            setItemToDelete(item.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={15} className="text-gray-500" />
                        {formatDate(item.createdAt)}
                      </span>
                      {item.language && <span>{item.language}</span>}
                      {item.duration != null && item.duration > 0 && (
                        <span>{formatDuration(item.duration)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-800">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} delta={1} />
          </div>
        </section>

        {/* ---------- Detail ---------- */}
        <section className="history-detail vs-panel flex flex-col">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileAudio size={48} className="mb-4 opacity-20" />
              <p>Chọn một bản ghi để xem nội dung</p>
            </div>
          ) : (
            <>
              <div className="vs-panel-header flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <h2 className="vs-panel-title text-lg truncate">Audio details</h2>
                  <div className="text-xs text-gray-500 mt-2">
                    {formatDate(selected.createdAt)}
                    {selected.language ? ` • ${selected.language}` : ''}
                    {selected.duration != null && selected.duration > 0
                      ? ` • ${formatDuration(selected.duration)}`
                      : ''}
                  </div>
                </div>
              </div>

              <div className="vs-panel-body flex-1 overflow-y-auto vs-scroll bg-[#0a0a0f]">
                <div className="history-content p-4">
                  <div className="history-content-label">
                    <span>Original text</span>
                    <button
                      className="vs-btn vs-btn--ghost !p-2"
                      onClick={copyText}
                      title="Copy"
                    >
                      {copied ? <Check size={14} /> : <Clipboard size={14} />}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-200 leading-8">
                    {selected.originalText || 'Chưa có nội dung.'}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 flex flex-wrap items-center gap-4">
                {selected.audioUrl ? (
                  <>
                    <audio
                      className="flex-1 min-w-[220px]"
                      controls
                      preload="metadata"
                      src={selected.audioUrl}
                    >
                      Trình duyệt không hỗ trợ phát audio.
                    </audio>
                    <button
                      className="vs-btn vs-btn--ghost"
                      onClick={downloadAudio}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Download size={15} />
                      )}
                      Tải audio
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle size={16} /> Bản ghi này không có URL audio.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Delete TTS record"
        description="Bạn có chắc muốn xoá bản ghi này không?"
        onConfirm={confirmDelete}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
