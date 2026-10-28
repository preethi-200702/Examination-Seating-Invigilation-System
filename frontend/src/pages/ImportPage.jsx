import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

export const ImportPage = () => {
  const { success, error, info } = useToast();

  const [file, setFile] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Preview result from backend
  const [previewData, setPreviewData] = useState(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // User override for dataType if needed
  const [selectedDataType, setSelectedDataType] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setSelectedDataType('');
    }
  };

  const handleUploadPreview = async (e) => {
    e.preventDefault();
    if (!file) {
      error('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoadingPreview(true);
      const res = await api.importPreview(formData);
      if (res.success) {
        setPreviewData(res);
        setActiveSheetIndex(0);
        if (res.sheets && res.sheets.length > 0) {
          setSelectedDataType(res.sheets[0].detectedType);
        }
        success(`File parsed successfully! Found ${res.sheets?.length || 0} sheet(s).`);
      }
    } catch (err) {
      error(err.message || 'Could not parse the uploaded file.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.sheets || previewData.sheets.length === 0) return;

    const currentSheet = previewData.sheets[activeSheetIndex];
    const dataType = selectedDataType || currentSheet.detectedType;

    if (!dataType || dataType === 'unknown') {
      error('Please select the correct data type before importing.');
      return;
    }

    if (!currentSheet.validRecords || currentSheet.validRecords.length === 0) {
      error('No valid records found in this sheet to import.');
      return;
    }

    try {
      setConfirming(true);
      const res = await api.importConfirm(dataType, currentSheet.validRecords);
      if (res.success) {
        success(res.message);
        setPreviewData(null);
        setFile(null);
      }
    } catch (err) {
      error(err.message || 'Import failed.');
    } finally {
      setConfirming(false);
    }
  };

  const currentSheet = previewData?.sheets?.[activeSheetIndex];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document & Excel Data Import</h1>
          <p className="page-subtitle">
            Upload Excel (.xlsx/.xls), CSV, or structured PDF files to bulk-populate student, faculty, venue, or timetable records.
          </p>
        </div>
      </div>

      {/* Import File Upload Card */}
      {!previewData ? (
        <div className="card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', color: 'var(--text-primary)' }}>
            Upload File for Analysis
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
            The system automatically scans your spreadsheet or document to detect whether it contains Student data, Faculty profiles, Venue capacities, or Examination Timetables.
          </p>

          <form onSubmit={handleUploadPreview}>
            <div
              style={{
                border: '2px dashed var(--primary-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-bg)',
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '18px',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('file-input').click()}
            >
              <Upload size={36} color="var(--primary)" style={{ marginBottom: '10px' }} />
              <h4 style={{ color: 'var(--primary-dark)', marginBottom: '4px' }}>
                {file ? file.name : 'Click to choose file or drag & drop'}
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Supports .xlsx, .xls, .csv, and structured .pdf files (Max 10 MB)
              </p>

              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {file && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '18px',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {file.name.endsWith('.pdf') ? (
                    <FileText size={18} color="#dc2626" />
                  ) : (
                    <FileSpreadsheet size={18} color="#059669" />
                  )}
                  <span>{file.name}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFile(null)}
                >
                  Change
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={!file || loadingPreview}
            >
              <Upload size={18} />
              <span>{loadingPreview ? 'Analyzing & Extracting Data...' : 'Analyze & Preview Document'}</span>
            </button>
          </form>

          {/* Sample Format Guide */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}
          >
            <strong>Supported Header Columns:</strong>
            <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
              <li><strong>Students:</strong> Register Number, Name, Department, Year, Section, Email</li>
              <li><strong>Faculty:</strong> Faculty ID, Name, Department, Availability, Email, Phone</li>
              <li><strong>Venues:</strong> Room Number, Venue Name, Capacity, Floor</li>
              <li><strong>Exams:</strong> Subject, Exam Date, Start Time, End Time, Department, Year, Section</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Preview & Confirmation Screen */
        <div>
          {/* Sheet Selector Tabs */}
          {previewData.sheets?.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {previewData.sheets.map((sheet, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSheetIndex(idx);
                    setSelectedDataType(sheet.detectedType);
                  }}
                  className={`btn ${activeSheetIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  <FileSpreadsheet size={16} />
                  <span>{sheet.sheetName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Detected Data Type Bar */}
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--primary-bg)',
              borderColor: 'var(--primary-border)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Detected Data Type:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary-dark)', textTransform: 'capitalize' }}>
                  {currentSheet?.detectedType !== 'unknown'
                    ? `${currentSheet?.detectedType} Data`
                    : 'Unidentified Format'}
                </strong>
                {currentSheet?.detectedType === 'unknown' && (
                  <span className="badge badge-warning">Review Required</span>
                )}
              </div>
            </div>

            {/* Type Override Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className="form-label" style={{ margin: 0, fontSize: '0.85rem' }}>
                Import as:
              </label>
              <select
                className="form-control"
                style={{ width: '160px', padding: '6px 10px' }}
                value={selectedDataType || currentSheet?.detectedType || 'student'}
                onChange={(e) => setSelectedDataType(e.target.value)}
              >
                <option value="student">Student Data</option>
                <option value="faculty">Faculty Data</option>
                <option value="venue">Venue Data</option>
                <option value="exam">Exam Timetable</option>
              </select>
            </div>

            {/* Summary Counters */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.88rem' }}>
              <div>
                Total Found: <strong>{currentSheet?.totalRecords || 0}</strong>
              </div>
              <div style={{ color: '#059669' }}>
                Valid: <strong>{currentSheet?.validRecords?.length || 0}</strong>
              </div>
              {currentSheet?.invalidRecords?.length > 0 && (
                <div style={{ color: '#dc2626' }}>
                  Invalid: <strong>{currentSheet.invalidRecords.length}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Warning Banner if PDF or low confidence */}
          {currentSheet?.warning && (
            <div
              style={{
                backgroundColor: 'var(--warning-bg)',
                color: 'var(--warning)',
                border: '1px solid var(--warning-border)',
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                marginBottom: '16px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={18} />
              <span>{currentSheet.warning}</span>
            </div>
          )}

          {/* Preview Table of Valid Records */}
          {currentSheet?.validRecords?.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '12px 18px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                }}
              >
                Preview Valid Records ({currentSheet.validRecords.length} ready to save)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {Object.keys(currentSheet.validRecords[0]).map((key) => (
                        <th key={key} style={{ textTransform: 'capitalize' }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentSheet.validRecords.slice(0, 50).map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        {Object.values(row).map((val, vIdx) => (
                          <td key={vIdx}>{val !== undefined && val !== null ? String(val) : '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {currentSheet.validRecords.length > 50 && (
                <div style={{ padding: '8px 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Showing first 50 records of {currentSheet.validRecords.length}.
                </div>
              )}
            </div>
          )}

          {/* Errors / Warnings List */}
          {currentSheet?.invalidRecords?.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--danger-border)' }}>
              <h4 style={{ color: 'var(--danger)', fontSize: '0.95rem', marginBottom: '8px' }}>
                Skipped Invalid Records ({currentSheet.invalidRecords.length})
              </h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.82rem' }}>
                {currentSheet.invalidRecords.map((inv, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Row {inv.rowIndex}: <strong>{inv.errors.join(', ')}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '20px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setPreviewData(null);
                setFile(null);
              }}
            >
              <RotateCcw size={16} />
              <span>Cancel / Upload Another</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmImport}
              disabled={confirming || !currentSheet?.validRecords?.length}
            >
              <CheckCircle2 size={16} />
              <span>
                {confirming
                  ? 'Saving Records to MongoDB...'
                  : `Confirm & Save ${currentSheet?.validRecords?.length || 0} Records`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
