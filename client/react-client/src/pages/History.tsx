import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle, Clipboard, Clock, Download, FileText, Languages, ListVideo, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useFileDownload } from '../hooks/useFileDownload';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { translationHistoryApi, TranslationHistoryItem } from '../api/translationHistory';

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
      setJobs(Array.isArray(response.jobs) ? response.jobs : []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch sử translate.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchHistory, 250);
    return () => window.clearTimeout(timer);
  }, [page, search]);

  const openJob = async (job: TranslationHistoryItem) => {
    setSelectedJob(job);
    if (job.status !== 'completed' || job.chunks) return;
    try {
      setDetailLoading(true);
      const chunks = await translationHistoryApi.chunks(job._id);
      setSelectedJob({ ...job, chunks: Array.isArray(chunks) ? chunks : [] });
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
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể xoá bản ghi.'); }
    finally { setJobToDelete(null); }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={15} className="text-green-400" />;
    if (status === 'processing' || status === 'translating') return <Loader2 size={15} className="text-indigo-400 animate-spin" />;
    if (status === 'failed') return <AlertCircle size={15} className="text-red-400" />;
    return <Clock size={15} className="text-gray-500" />;
  };
  const selectedText = selectedJob ? getText(selectedJob, mode) : '';

  return (
    <div className="history-container fade-in p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div><h1 className="vs-section-title text-3xl font-bold mb-2 flex items-center gap-3"><Languages size={28} className="text-indigo-400" /> Translate history</h1><p className="text-gray-400">Xem lại text gốc và bản translate của từng video.</p></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={17} /><input className="vs-search-input pl-10" placeholder="Tìm theo tên file..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
      </div>

      <div className="history-layout flex gap-6 flex-1 min-h-0">
        <section className="history-list vs-panel flex flex-col">
          <div className="vs-panel-header"><div className="flex items-center justify-between w-full"><h2 className="vs-panel-title flex items-center gap-2"><ListVideo size={16} /> Recent translations</h2><button className="vs-btn vs-btn--ghost !p-2" onClick={fetchHistory} title="Refresh"><RefreshCw size={14} /></button></div></div>
          <div className="vs-panel-body flex-1 overflow-y-auto vs-scroll p-0">
            {loading ? <div className="flex justify-center p-8"><LoadingSpinner size={32} color="#6366f1" /></div> : error ? <div className="p-8 text-center text-red-300 text-sm">{error}</div> : jobs.length === 0 ? <div className="p-8 text-center text-gray-500">Chưa có lịch sử translate.</div> : <div className="divide-y divide-gray-800">{jobs.map((job) => <button key={job._id} className={`history-item w-full text-left p-4 ${selectedJob?._id === job._id ? 'history-item--active' : ''}`} onClick={() => openJob(job)}><div className="flex justify-between items-start gap-2 mb-2"><span className="font-medium text-gray-200 truncate">{job.title || 'Untitled job'}</span><span role="button" tabIndex={0} className="text-gray-500 hover:text-red-400 shrink-0" title="Delete" onClick={(event) => { event.stopPropagation(); setJobToDelete(job._id); }}><Trash2 size={16} /></span></div><div className="flex items-center gap-3 text-xs text-gray-400"><span className="flex items-center gap-1">{statusIcon(job.status)} {job.status}</span><span>{formatDate(job.createdAt)}</span></div>{job.status === 'completed' && <p className="mt-2 text-xs text-gray-500 truncate">{job.translatedText || job.transcriptText || 'Translation ready'}</p>}</button>)}</div>}
          </div>
          <div className="p-4 border-t border-gray-800"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} delta={1} /></div>
        </section>

        <section className="history-detail vs-panel flex flex-col">
          {!selectedJob ? <div className="flex flex-col items-center justify-center h-full text-gray-500"><FileText size={48} className="mb-4 opacity-20" /><p>Chọn một bản ghi để xem nội dung</p></div> : <>
            <div className="vs-panel-header flex justify-between items-start gap-4"><div className="min-w-0"><h2 className="vs-panel-title text-lg truncate">{selectedJob.title || 'Translation details'}</h2><div className="text-xs text-gray-500 mt-2">{formatDate(selectedJob.createdAt)} {selectedJob.targetLang ? `• ${selectedJob.targetLang}` : ''}</div></div>{selectedJob.status === 'completed' && <div className="history-tabs shrink-0"><button className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')}>Text gốc</button><button className={mode === 'translated' ? 'active' : ''} onClick={() => setMode('translated')}>Text translate</button></div>}</div>
            <div className="vs-panel-body flex-1 overflow-y-auto vs-scroll bg-[#0a0a0f]">
              {selectedJob.status === 'processing' || selectedJob.status === 'translating' || selectedJob.status === 'waiting' ? <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4"><Loader2 size={42} className="animate-spin text-indigo-500" /><p>Đang xử lý bản translate...</p></div> : selectedJob.status === 'failed' ? <div className="flex flex-col items-center justify-center h-full text-red-400 gap-4"><AlertCircle size={42} /><p>{selectedJob.error || 'Translate thất bại.'}</p></div> : detailLoading ? <div className="flex justify-center p-8"><LoadingSpinner size={28} color="#6366f1" /></div> : <div className="history-content p-4"><div className="history-content-label"><span>{mode === 'original' ? 'Original text' : 'Translated text'}</span><button className="vs-btn vs-btn--ghost !p-2" onClick={copyText} title="Copy">{copied ? <Check size={14} /> : <Clipboard size={14} />}</button></div>{selectedJob.chunks?.length ? <div className="space-y-3">{selectedJob.chunks.map((chunk) => <div key={chunk.index} className="history-chunk"><span>#{chunk.index + 1}</span><p>{mode === 'original' ? chunk.transcript || '—' : chunk.translation || '—'}</p></div>)}</div> : <div className="whitespace-pre-wrap text-gray-200 leading-8">{selectedText || 'Chưa có nội dung.'}</div>}</div>}
            </div>
            {selectedJob.status === 'completed' && <div className="p-4 border-t border-gray-800 flex justify-end"><button className="vs-btn vs-btn--ghost" onClick={() => downloadByFormat(selectedText, mode === 'original' ? 'original-text' : 'translated-text', 'txt')}><Download size={15} /> Tải {mode === 'original' ? 'text gốc' : 'bản translate'}</button></div>}
          </>}
        </section>
      </div>
      <Modal isOpen={Boolean(jobToDelete)} onClose={() => setJobToDelete(null)} title="Delete translation" description="Bạn có chắc muốn xoá bản ghi này không?" onConfirm={confirmDelete} confirmText="Delete" danger />
    </div>
  );
}
