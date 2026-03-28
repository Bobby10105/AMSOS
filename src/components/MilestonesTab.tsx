'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Calendar, Upload, FileSpreadsheet, Trash2, Loader2 } from 'lucide-react';
import type { Audit } from '@prisma/client';

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

const getInitialState = (a: Audit) => ({
  fieldworkStartDate: formatDateForInput(a.fieldworkStartDate),
  fieldworkEndDate: formatDateForInput(a.fieldworkEndDate),
  reportIssuedDate: formatDateForInput(a.reportIssuedDate),
});

export default function MilestonesTab({ audit }: { audit: Audit }) {
  const [data, setData] = useState(getInitialState(audit));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(audit.milestoneAttachmentUrl);
  const [attachmentName, setAttachmentName] = useState<string | null>(audit.milestoneAttachmentName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setData(getInitialState(audit));
    setAttachmentUrl(audit.milestoneAttachmentUrl);
    setAttachmentName(audit.milestoneAttachmentName);
  }, [audit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!audit.id) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.refresh();
      } else {
        let errorMsg = 'Server error';
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch {
          errorMsg = await res.text() || errorMsg;
        }
        alert(`Failed to save milestones: ${errorMsg}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`An error occurred: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audit.id) {
      alert("Error: Cannot upload, Audit ID is missing.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      alert("Invalid file type. Please upload a .xlsx, .xls, or .csv file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auditId', audit.id);
    formData.append('type', 'milestone');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const updatedAudit = await res.json();
        setAttachmentUrl(updatedAudit.milestoneAttachmentUrl);
        setAttachmentName(updatedAudit.milestoneAttachmentName);
        router.refresh();
      } else {
        let errorMsg = 'Upload failed';
        try {
          const responseData = await res.json();
          errorMsg = responseData.error || errorMsg;
        } catch {
          errorMsg = await res.text() || errorMsg;
        }
        alert(`Upload failed: ${errorMsg}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`An error occurred during upload: ${errorMessage}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async () => {
    if (!audit.id) return;
    if (!confirm('Are you sure you want to remove this attachment?')) return;

    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneAttachmentUrl: null }),
      });

      if (res.ok) {
        setAttachmentUrl(null);
        setAttachmentName(null);
        router.refresh();
      } else {
        alert("Failed to remove attachment.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${errorMessage}`);
    }
  };

  const milestones = [
    { name: 'fieldworkStartDate', label: 'Fieldwork Start Date' },
    { name: 'fieldworkEndDate', label: 'Fieldwork End Date' },
    { name: 'reportIssuedDate', label: 'Report Issued Date' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Milestone Dates</h3>
          {milestones.map((milestone) => (
            <div key={milestone.name} className="flex flex-col">
              <label className="text-sm font-bold text-gray-700 mb-2 tracking-wide uppercase flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                {milestone.label}
              </label>
              <input
                name={milestone.name}
                type="date"
                value={data[milestone.name as keyof typeof data]}
                onChange={handleChange}
                className="max-w-xs w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors text-gray-800"
              />
            </div>
          ))}
          <div className="flex pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{saving ? 'Saving...' : 'Save Dates'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Detailed Milestones Spreadsheet</h3>
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
            {attachmentUrl ? (
              <div className="w-full space-y-4">
                <div className="flex items-center p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <div className="p-3 bg-blue-50 rounded-lg mr-4">
                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {attachmentName || 'Milestone Details'}
                    </p>
                    <a
                      href={attachmentUrl}
                      download={attachmentName || 'milestones.xlsx'}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Download Spreadsheet
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAttachment}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Replace Spreadsheet</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-blue-50 rounded-full">
                  <FileSpreadsheet className="w-10 h-10 text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700">No spreadsheet attached</p>
                  <p className="text-xs text-gray-500 mt-1">Upload a .xlsx or .csv with more milestone details</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-white border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span>{uploading ? 'Uploading...' : 'Upload Spreadsheet'}</span>
                </button>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".xlsx,.xls,.csv"
            />
          </div>
          <p className="text-xs text-gray-500 italic">
            Tip: Use a spreadsheet to track granular milestones, task assignments, and completion percentages.
          </p>
        </div>
      </div>
    </div>
  );
}
