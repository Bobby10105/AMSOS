'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, Paperclip, File as FileIcon, X, ChevronDown, ChevronRight, MessageSquare, RefreshCw, Send, User, CheckCircle, Clock } from 'lucide-react';
import type { Attachment, ProcedureMessage } from '@prisma/client';
import type { ProcedureWithRelations } from '@/lib/types';

export default function ProcedureItem({ 
  procedure, 
  nomenclature, 
  onDelete,
  user
}: { 
  procedure: ProcedureWithRelations, 
  nomenclature: string, 
  onDelete: () => void,
  user?: { username: string; role: string; id: string }
}) {
  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [data, setData] = useState(procedure);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(procedure.attachments || []);
  const [messages, setMessages] = useState<ProcedureMessage[]>(procedure.messages || []);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);
  
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    setData(procedure);
    setAttachments(procedure.attachments || []);
    setMessages(procedure.messages || []);
  }, [procedure]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    
    const payload = {
      title: data.title,
      purpose: data.purpose,
      source: data.source,
      scope: data.scope,
      methodology: data.methodology,
      results: data.results,
      conclusions: data.conclusions,
      preparedBy: data.preparedBy,
      preparedDate: data.preparedDate,
      reviewedBy: data.reviewedBy,
      reviewedDate: data.reviewedDate,
    };

    try {
      const res = await fetch(`/api/procedures/${procedure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert('Failed to save procedure: ' + (err.error || 'Unknown error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentChange = (id: string, name: string, value: string) => {
    setAttachments(attachments.map(att => {
      if (att.id === id) {
        return { ...att, [name]: value };
      }
      return att;
    }));
  };

  const handleSaveAttachmentMetadata = async (att: Attachment) => {
    setSavingAttachmentId(att.id);
    try {
      const res = await fetch(`/api/attachments/${att.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preparedBy: att.preparedBy,
          preparedDate: att.preparedDate,
          reviewedBy: att.reviewedBy,
          reviewedDate: att.reviewedDate,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to save attachment details');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSavingAttachmentId(null);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/procedures/${procedure.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages([...messages, message]);
        setNewMessage('');
        setTimeout(scrollToBottom, 100);
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('procedureId', procedure.id);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const newAttachment = await res.json();
        setAttachments([...attachments, newAttachment]);
        router.refresh();
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReplaceClick = (id: string) => {
    setReplacingId(id);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !replacingId) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`/api/attachments/${replacingId}`, {
        method: 'PUT',
        body: formData,
      });
      if (res.ok) {
        const updatedAtt = await res.json();
        setAttachments(attachments.map(a => a.id === replacingId ? updatedAtt : a));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to replace attachment');
      }
    } finally {
      setUploading(false);
      setReplacingId(null);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAttachments(attachments.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this procedure?')) {
      onDelete();
    }
  };

  const fields = [
    { name: 'purpose', label: 'Purpose' },
    { name: 'source', label: 'Source' },
    { name: 'scope', label: 'Scope' },
    { name: 'methodology', label: 'Methodology' },
    { name: 'results', label: 'Results' },
    { name: 'conclusions', label: 'Conclusions' },
  ];

  const isReviewed = data.reviewedBy && data.reviewedDate;
  const isPrepared = data.preparedBy && data.preparedDate;

  let statusColor = 'border-gray-200 bg-white';
  let headerColor = 'bg-gray-50 border-gray-200 hover:bg-gray-100';
  let statusBadge = null;

  if (isReviewed) {
    statusColor = 'border-blue-200 bg-blue-50/10';
    headerColor = 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    statusBadge = <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white uppercase tracking-wider flex items-center">Reviewed</span>;
  } else if (isPrepared) {
    statusColor = 'border-green-200 bg-green-50/10';
    headerColor = 'bg-green-50 border-green-200 hover:bg-green-100';
    statusBadge = <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white uppercase tracking-wider">Prepared</span>;
  }

  const canDelete = user?.role !== 'Specialist';

  return (
    <div className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${statusColor}`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3 border-b flex justify-between items-center cursor-pointer transition-colors ${headerColor}`}
      >
        <div className="flex items-center space-x-3 flex-1">
          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
          <span className="text-sm font-bold text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded">{nomenclature}</span>
          <input
            name="title"
            value={data.title || ''}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 font-semibold placeholder:font-normal text-lg"
            placeholder="Untitled Procedure"
          />
          {statusBadge}
        </div>
        <div className="flex items-center space-x-2">
          {saving && <span className="text-xs text-blue-600 animate-pulse font-medium">Saving...</span>}
          <button 
            onClick={(e) => { e.stopPropagation(); handleSave(); }} 
            disabled={saving}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
          {canDelete && (
            <button 
              onClick={handleDelete} 
              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete Procedure"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-6 space-y-6">
          <div className="space-y-6 text-gray-800">
            {fields.map(field => (
              <div key={field.name} className="flex flex-col">
                <label className="text-sm font-bold text-gray-700 mb-2 tracking-wide uppercase">{field.label}</label>
                <textarea
                  name={field.name}
                  value={String(data[field.name as keyof ProcedureWithRelations] || '')}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors text-gray-800"
                  placeholder={`Document ${field.label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center tracking-wide uppercase">
              <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
              Review Comments
            </h4>
            
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-[400px]">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">No messages yet. Use the chat to discuss review points.</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.author === user?.username ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{msg.author}</span>
                      <span className="text-[9px] text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                      msg.author === user?.username 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex space-x-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-bold text-gray-700 mb-2 tracking-wide uppercase">Prepared By</label>
                <input
                  name="preparedBy"
                  value={String(data.preparedBy || '')}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors text-gray-800"
                  placeholder="Name of Auditor"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-bold text-gray-700 mb-2 tracking-wide uppercase">Prepared Date</label>
                <input
                  name="preparedDate"
                  type="date"
                  value={formatDateForInput(data.preparedDate)}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors text-gray-800"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-bold text-gray-700 mb-2 tracking-wide uppercase">Reviewed By</label>
                <input
                  name="reviewedBy"
                  value={String(data.reviewedBy || '')}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors text-gray-800"
                  placeholder="Name of Reviewer"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-bold text-gray-700 mb-2 tracking-wide uppercase">Reviewed Date</label>
                <input
                  name="reviewedDate"
                  type="date"
                  value={formatDateForInput(data.reviewedDate)}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors text-gray-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center tracking-wide uppercase">
              <Paperclip className="w-4 h-4 mr-2 text-blue-500" />
              Attachments
            </h4>
            
            <div className="space-y-4 mb-4">
              {attachments.length === 0 && <p className="text-sm text-gray-500 italic">No documents attached yet.</p>}
              {attachments.map((att, index) => {
                const isAttReviewed = att.reviewedBy && att.reviewedDate;
                const isAttPrepared = att.preparedBy && att.preparedDate;
                
                return (
                  <div key={att.id} className={`flex flex-col bg-white border rounded-xl shadow-sm transition-all overflow-hidden ${
                    isAttReviewed ? 'border-blue-200' : isAttPrepared ? 'border-green-200' : 'border-gray-200'
                  }`}>
                    {/* Attachment Header */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${
                      isAttReviewed ? 'bg-blue-50/50' : isAttPrepared ? 'bg-green-50/50' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center min-w-0 flex-1">
                        <span className="text-xs font-bold text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded mr-3 flex-shrink-0">
                          {nomenclature}.{index + 1}
                        </span>
                        <a href={att.filepath} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900 truncate">
                          <FileIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{att.filename}</span>
                        </a>
                        <div className="ml-4 flex items-center space-x-2">
                          {isAttReviewed ? (
                            <span className="flex items-center text-[10px] font-bold text-blue-700 uppercase"><CheckCircle className="w-3 h-3 mr-1" /> Reviewed</span>
                          ) : isAttPrepared ? (
                            <span className="flex items-center text-[10px] font-bold text-green-700 uppercase"><CheckCircle className="w-3 h-3 mr-1" /> Prepared</span>
                          ) : (
                            <span className="flex items-center text-[10px] font-bold text-gray-400 uppercase"><Clock className="w-3 h-3 mr-1" /> Pending</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleReplaceClick(att.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Replace File"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAttachment(att.id)} 
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete File"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Attachment Metadata Grid */}
                    <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Prepared By</label>
                        <input
                          value={att.preparedBy || ''}
                          onChange={(e) => handleAttachmentChange(att.id, 'preparedBy', e.target.value)}
                          className="text-xs px-2 py-1.5 border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="Initials/Name"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Prepared Date</label>
                        <input
                          type="date"
                          value={formatDateForInput(att.preparedDate)}
                          onChange={(e) => handleAttachmentChange(att.id, 'preparedDate', e.target.value)}
                          className="text-xs px-2 py-1.5 border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Reviewed By</label>
                        <input
                          value={att.reviewedBy || ''}
                          onChange={(e) => handleAttachmentChange(att.id, 'reviewedBy', e.target.value)}
                          className="text-xs px-2 py-1.5 border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="Initials/Name"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Reviewed Date</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="date"
                            value={formatDateForInput(att.reviewedDate)}
                            onChange={(e) => handleAttachmentChange(att.id, 'reviewedDate', e.target.value)}
                            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <button
                            onClick={() => handleSaveAttachmentMetadata(att)}
                            disabled={savingAttachmentId === att.id}
                            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            title="Save Details"
                          >
                            {savingAttachmentId === att.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex">
              <label className="inline-flex items-center px-4 py-2 border border-blue-200 shadow-sm text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
                <Paperclip className="w-4 h-4 mr-2" />
                <span>{uploading ? 'Processing...' : 'Attach Document'}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt" />
              </label>
              
              <input 
                type="file" 
                ref={replaceInputRef} 
                className="hidden" 
                onChange={handleReplaceFile} 
                disabled={uploading} 
                accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
