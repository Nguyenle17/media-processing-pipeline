import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFileDownload } from '../hooks/useFileDownload';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { saveAs } from 'file-saver';
import { Trash2, Download, Search, Clock, FileText, CheckCircle, AlertCircle, Loader2, ListVideo, RefreshCw } from 'lucide-react';
import Api from '../api/Api';

interface Segment {
  speaker?: string;
  text: string;
  start: number;
  end: number;
}

interface Job {
  _id: string;
  title: string;
  status: 'completed' | 'processing' | 'failed' | 'waiting';
  createdAt: string;
  updatedAt: string;
  duration?: number;
  language?: string;
  transcriptText?: string;
  translatedText?: string;
  resultText?: string;
  segments?: Segment[];
  processedChunks?: number;
  totalChunks?: number;
  countChunks?: number;
  error?: string;
  chunks?: Array<{ index: number; transcript?: string; translation?: string; startTime: number; endTime: number }>;
}

export default function History() {
  const { token } = useAuth();
  const { downloadByFormat } = useFileDownload();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'speaker'>('text');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await Api.get(`/job/user?page=${page}&limit=8`);
      setJobs(res.jobs || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, search]);

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await Api.delete(`/job/delete?jobId=${encodeURIComponent(jobToDelete)}`);
      if (selectedJob?._id === jobToDelete) {
        setSelectedJob(null);
      }
      fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleteModalOpen(false);
      setJobToDelete(null);
    }
  };

  const openJob = async (job: Job) => {
    setSelectedJob(job);
    if (job.status !== 'completed') return;
    try {
      const res = await Api.get(`/job/chunks?jobId=${encodeURIComponent(job._id)}`);
      setSelectedJob({ ...job, chunks: Array.isArray(res) ? res : [] });
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJobToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle size={16} className="text-green-500" />;
      case 'processing': return <Loader2 size={16} className="text-indigo-500 animate-spin" />;
      case 'failed': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-gray-500" />;
    }
  };

  const visibleJobs = jobs.filter((job) => {
    const query = search.trim().toLowerCase();
    return !query || (job.title || 'Untitled Job').toLowerCase().includes(query);
  });

  return (
    <div className="history-container fade-in p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="vs-section-title text-3xl font-bold mb-2">History</h1>
          <p className="text-gray-400">Your transcriptions, translations and processing history.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search jobs..." 
            className="vs-search-input pl-10 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-1/3 flex flex-col vs-panel">
          <div className="vs-panel-header">
            <div className="flex items-center justify-between w-full">
              <h2 className="vs-panel-title flex items-center gap-2"><ListVideo size={16} /> Recent jobs</h2>
              <button className="vs-btn vs-btn--ghost !p-2" onClick={fetchJobs} title="Refresh history"><RefreshCw size={14} /></button>
            </div>
          </div>
          <div className="vs-panel-body flex-1 overflow-y-auto vs-scroll p-0">
            {loading ? (
              <div className="flex justify-center p-8"><LoadingSpinner size={32} color="#6366f1" /></div>
            ) : error ? (
              <div className="p-8 text-center text-red-300 text-sm">{error}</div>
            ) : visibleJobs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No transcription found.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {visibleJobs.map(job => (
                  <div 
                    key={job._id} 
                    className={`p-4 cursor-pointer hover:bg-gray-800/50 transition-colors ${selectedJob?._id === job._id ? 'bg-gray-800/80 border-l-2 border-indigo-500' : ''}`}
                    onClick={() => openJob(job)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-200 truncate pr-2">{job.title || 'Untitled Job'}</div>
                      <button onClick={(e) => confirmDelete(job._id, e)} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">{getStatusIcon(job.status)} {job.status}</span>
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                    {job.status === 'completed' && <div className="mt-2 text-xs text-gray-500 truncate">{job.transcriptText || job.translatedText || 'Transcript ready'}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-800">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} delta={1} />
          </div>
        </div>

        <div className="w-2/3 flex flex-col vs-panel">
          {selectedJob ? (
            <>
              <div className="vs-panel-header flex justify-between items-center">
                <div>
                  <h2 className="vs-panel-title text-lg">{selectedJob.title || 'Job Details'}</h2>
                  <div className="text-sm text-gray-400 mt-1 flex gap-4">
                    <span>Status: {selectedJob.status}</span>
                    <span>Date: {formatDate(selectedJob.createdAt)}</span>
                  </div>
                </div>
                {selectedJob.status === 'completed' && (
                  <div className="flex gap-2">
                    <button className={`vs-btn ${viewMode === 'text' ? 'vs-btn--primary' : 'vs-btn--ghost'} text-xs`} onClick={() => setViewMode('text')}>
                      <FileText size={14} className="mr-1" /> Text
                    </button>
                    {selectedJob.chunks && selectedJob.chunks.length > 0 && (
                      <button className={`vs-btn ${viewMode === 'speaker' ? 'vs-btn--primary' : 'vs-btn--ghost'} text-xs`} onClick={() => setViewMode('speaker')}>
                        <Users size={14} className="mr-1" /> Speakers
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="vs-panel-body flex-1 overflow-y-auto vs-scroll bg-[#0a0a0f]">
                {selectedJob.status === 'processing' || selectedJob.status === 'waiting' ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                    <p>This job is currently being processed...</p>
                  </div>
                ) : selectedJob.status === 'failed' ? (
                  <div className="flex flex-col items-center justify-center h-full text-red-400 space-y-4">
                    <AlertCircle size={48} />
                    <p>{selectedJob.error || 'This job failed to process.'}</p>
                  </div>
                ) : (
                  <div className="p-4 text-gray-200 text-sm leading-relaxed">
                    {viewMode === 'text' ? (
                      <div className="whitespace-pre-wrap">{selectedJob.resultText || selectedJob.translatedText || selectedJob.transcriptText || 'No transcript available.'}</div>
                    ) : (
                      <div className="space-y-4">
                        {selectedJob.chunks?.map((seg, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-24 shrink-0 text-right">
                              <div className="font-medium text-indigo-400">Part {seg.index + 1}</div>
                              <div className="text-xs text-gray-500">{Math.floor(seg.startTime)}s - {Math.floor(seg.endTime)}s</div>
                            </div>
                            <div className="bg-[#13131f] p-3 rounded-lg flex-1 border border-gray-800">
                              {seg.transcript || seg.translation || 'No text'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedJob.status === 'completed' && (
                <div className="p-4 border-t border-gray-800 flex justify-end gap-2 bg-[#13131f]">
                  <button className="vs-btn vs-btn--ghost" onClick={() => downloadByFormat(selectedJob.resultText || selectedJob.transcriptText || '', 'transcript', 'txt')}>
                    <Download size={16} className="mr-2" /> TXT
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>Select a job from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Job"
        description="Are you sure you want to delete this job? This action cannot be undone."
        onConfirm={handleDeleteJob}
        confirmText="Delete"
        danger={true}
      />
    </div>
  );
}
