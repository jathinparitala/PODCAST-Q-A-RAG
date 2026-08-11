import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, MessageSquare, AlertCircle, CheckCircle2, Loader2, Sparkles, Plus } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { api, Document } from '../../../services/api';
import { useToast } from '../../ui/Toast';

export const PdfLibraryView: React.FC<{
  searchQuery: string;
  onStartChatForDocument: (documentId: string, documentName: string) => void;
}> = ({ searchQuery, onStartChatForDocument }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressStatus, setUploadProgressStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  // Poll processing status for any documents in 'processing' or 'pending'
  useEffect(() => {
    const processingDocs = documents.filter(d => d.status === 'processing' || d.status === 'pending');
    if (processingDocs.length === 0) return;

    const interval = setInterval(() => {
      processingDocs.forEach(async (doc) => {
        try {
          const res = await api.getDocumentStatus(doc.id);
          if (res.status !== doc.status || res.pageCount !== doc.pageCount) {
            setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: res.status as any, pageCount: res.pageCount, errorMessage: res.errorMessage } : d));
            if (res.status === 'ready') {
              showToast(`PDF document "${doc.fileName}" is ready for Q&A!`, 'success');
            } else if (res.status === 'failed') {
              showToast(`PDF processing failed: ${res.errorMessage || 'Unknown error'}`, 'error');
            }
          }
        } catch (err) {}
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [documents]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load PDF documents', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Only PDF files (.pdf) are supported.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgressStatus('Uploading file...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          setUploadProgressStatus('Extracting text & page chunking...');
          const res = await api.uploadDocument({
            fileName: selectedFile.name,
            fileData: base64Data,
            fileSize: selectedFile.size,
          });

          showToast('PDF uploaded! Indexing pages & embeddings...', 'info');
          setIsUploadModalOpen(false);
          setSelectedFile(null);
          loadDocuments();
        } catch (err: any) {
          const msg = err.message || 'Failed to upload PDF document';
          setUploadError(msg);
          showToast(msg, 'error');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read PDF file content.');
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setUploadError(err.message || 'Upload error');
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      showToast(`Document "${name}" deleted.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocs = documents.filter(d =>
    !searchQuery || d.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-h2 text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            PDF Document Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload PDF research papers, reports, or books for page-aware AI Q&A
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsUploadModalOpen(true)} className="gap-2 shrink-0">
          <Upload className="w-4 h-4" /> Upload PDF Document
        </Button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading document library...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center mx-auto mb-4 border border-brand-200 dark:border-brand-800">
            <FileText className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="font-h3 text-slate-800 dark:text-slate-200 mb-2">No PDF documents found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            {searchQuery ? `No documents matching "${searchQuery}"` : 'Upload your first PDF document to enable page-by-page RAG question answering with exact page citations.'}
          </p>
          <Button variant="primary" onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Upload PDF Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all border-slate-200 dark:border-slate-800 group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    doc.status === 'ready' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                    doc.status === 'failed' ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                    'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {doc.status === 'ready' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {doc.status === 'failed' && <AlertCircle className="w-3.5 h-3.5" />}
                    {(doc.status === 'processing' || doc.status === 'pending') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span className="capitalize">{doc.status}</span>
                  </span>
                </div>

                <h3 className="font-h4 text-slate-900 dark:text-slate-100 truncate mb-1" title={doc.fileName}>
                  {doc.fileName}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span>{doc.pageCount > 0 ? `${doc.pageCount} pages` : 'Calculating pages...'}</span>
                  <span>•</span>
                  <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                </div>

                {doc.status === 'failed' && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 mb-4">
                    <p className="font-semibold flex items-center gap-1.5 mb-1"><AlertCircle className="w-3.5 h-3.5" /> Processing Failed</p>
                    <p className="opacity-90">{doc.errorMessage || 'Scanned or unreadable PDF file format.'}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                <Button
                  variant="primary" size="sm"
                  disabled={doc.status !== 'ready'}
                  onClick={() => onStartChatForDocument(doc.id, doc.fileName)}
                  className="gap-1.5 flex-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Start PDF Q&A
                </Button>
                <button
                  onClick={() => handleDeleteDocument(doc.id, doc.fileName)}
                  disabled={deletingId === doc.id}
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Delete Document"
                >
                  {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload PDF Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => { if (!isUploading) { setIsUploadModalOpen(false); setSelectedFile(null); setUploadError(null); } }}
        title="Upload PDF Document"
        subtitle="Select a text-based PDF file to extract, chunk, embed, and enable Q&A"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {uploadError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2.5 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            {selectedFile ? (
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB • PDF Document</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Click to browse or drag & drop PDF</p>
                <p className="text-xs text-slate-400 mt-1">Supports text-based .pdf files up to 50MB</p>
              </div>
            )}
          </div>

          {isUploading && (
            <div className="p-3 bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 rounded-xl flex items-center gap-3 text-xs text-brand-700 dark:text-brand-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-brand-600" />
              <span>{uploadProgressStatus}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button" variant="outline"
              disabled={isUploading}
              onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUploading} disabled={!selectedFile}>
              Upload & Process PDF
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
