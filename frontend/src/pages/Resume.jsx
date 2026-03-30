import { useState, useEffect, useRef } from 'react'
import {
    HiOutlineDocumentText,
    HiOutlineDocumentAdd,
    HiOutlineTrash,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineX,
    HiOutlineUpload,
    HiOutlineCalendar,
    HiOutlineCloudUpload,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
    HiOutlineExclamationCircle,
    HiOutlineRefresh,
} from 'react-icons/hi'
import {
    fetchResumes,
    uploadResume,
    deleteResume,
    selectResumeForSchedule,
    fetchResumeSchedule,
    fetchSchedulerLogs,
    uploadResumeInNaukri
} from '../services/api'
import Loader from '../components/Loader'

// File type icons and colors
const FILE_TYPE_MAP = {
    'application/pdf': { label: 'PDF', color: 'var(--accent-danger)' },
    'application/msword': { label: 'DOC', color: 'var(--accent-info)' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', color: 'var(--accent-info)' },
    'application/rtf': { label: 'RTF', color: 'var(--accent-warning)' },
    'text/rtf': { label: 'RTF', color: 'var(--accent-warning)' },
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Resume() {
    const [resumes, setResumes] = useState([])
    const [schedule, setSchedule] = useState(null)
    const [scheduleDetails, setScheduleDetails] = useState(null)
    const [logs, setLogs] = useState([])
    const [logsPagination, setLogsPagination] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showLogs, setShowLogs] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [isScheduleSelect, setIsScheduleSelect] = useState(false)
    const [actionLoading, setActionLoading] = useState(null)
    const fileInputRef = useRef(null)

    // Load initial data
    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setIsLoading(true)
        try {
            const [resumeRes, scheduleRes] = await Promise.all([
                fetchResumes(),
                fetchResumeSchedule(),
            ])
            setResumes(resumeRes.data?.resumes || [])
            setSchedule(resumeRes.data?.schedule || null)
            setScheduleDetails(scheduleRes.data || null)

            if (scheduleRes.data?.resumeId) {
                setIsScheduleSelect(true)
            }
        } catch (err) {
            console.error('Error loading resume data:', err)
        } finally {
            setIsLoading(false)
        }
    }

    async function loadLogs(page = 1) {
        try {
            const res = await fetchSchedulerLogs(page, 5)
            setLogs(res.data || [])
            setLogsPagination(res.pagination || null)
        } catch (err) {
            console.error('Error loading scheduler logs:', err)
        }
    }

    // Toggle logs section
    function toggleLogs() {
        if (!showLogs) {
            loadLogs()
        }
        setShowLogs(!showLogs)
    }

    // File validation
    function validateFile(file) {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/rtf',
            'text/rtf',
        ]
        const maxSize = 2 * 1024 * 1024 // 2MB

        if (!allowedTypes.includes(file.type)) {
            return 'Invalid file type. Supported: PDF, DOC, DOCX, RTF'
        }
        if (file.size > maxSize) {
            return 'File too large. Maximum size is 2MB.'
        }
        return null
    }

    // File selection
    function handleFileSelect(file) {
        if (!file) return
        const error = validateFile(file)
        if (error) {
            setUploadError(error)
            setSelectedFile(null)
            return
        }
        setUploadError('')
        setSelectedFile(file)
    }

    // Upload handler
    async function handleUpload() {
        if (!selectedFile) return
        setUploading(true)
        setUploadError('')
        try {
            const formData = new FormData()
            formData.append('resume', selectedFile)
            await uploadResume(formData)
            setShowModal(false)
            setSelectedFile(null)
            await loadData()
        } catch (err) {
            setUploadError(err.message || 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    // Delete handler
    async function handleDelete(id) {
        if (!window.confirm('Are you sure you want to delete this resume?')) return
        setActionLoading(id)
        try {
            await deleteResume(id)
            await loadData()
        } catch (err) {
            console.error('Delete error:', err)
        } finally {
            setActionLoading(null)
        }
    }

    // Select for schedule handler
    async function handleSelect(id) {
        setActionLoading(id)
        try {
            await selectResumeForSchedule(id)
            await loadData()
        } catch (err) {
            console.error('Select error:', err)
        } finally {
            setActionLoading(null)
        }
    }

    async function handleUploadInNaukri() {
        console.log("isScheduleSelect", isScheduleSelect);
        
        if (!isScheduleSelect) return
        try {
            await uploadResumeInNaukri()
        } catch (err) {
            
        } finally {
            
        }
    }

    // Drag and drop handlers
    function handleDragOver(e) {
        e.preventDefault()
        setDragOver(true)
    }
    function handleDragLeave(e) {
        e.preventDefault()
        setDragOver(false)
    }
    function handleDrop(e) {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        handleFileSelect(file)
    }

    // Close modal
    function closeModal() {
        setShowModal(false)
        setSelectedFile(null)
        setUploadError('')
    }

    if (isLoading) return <Loader message="Loading resumes..." />

    return (
        <div className="animate-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h2>Resume Manager</h2>
                    <p>Upload and manage resumes for Naukri profile updates</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleUploadInNaukri()}>
                    <HiOutlineDocumentAdd /> Upload Resume in Naukri
                </button>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <HiOutlineDocumentAdd /> Add Resume
                </button>
            </div>

            {/* Schedule Info Banner */}
            {scheduleDetails && (
                <div className="schedule-banner animate-in animate-in-delay-1">
                    <div className="schedule-banner-icon">
                        <HiOutlineCloudUpload />
                    </div>
                    <div className="schedule-banner-content">
                        <div className="schedule-banner-title">Scheduled for Daily Upload</div>
                        <div className="schedule-banner-details">
                            <span><HiOutlineDocumentText /> {scheduleDetails.originalName}</span>
                            <span><HiOutlineCalendar /> Selected {formatDate(scheduleDetails.selectedAt)}</span>
                            {scheduleDetails.lastUploadStatus && (
                                <span className={`tag ${scheduleDetails.lastUploadStatus === 'success' ? 'secondary' : 'danger'}`}>
                                    Last: {scheduleDetails.lastUploadStatus}
                                    {scheduleDetails.lastUploadedAt && ` • ${formatDateTime(scheduleDetails.lastUploadedAt)}`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Resume Grid */}
            {resumes.length === 0 ? (
                <div className="empty-state animate-in animate-in-delay-2">
                    <div className="empty-state-icon"><HiOutlineDocumentText /></div>
                    <h3>No resumes uploaded yet</h3>
                    <p>Upload your first resume to get started</p>
                </div>
            ) : (
                <div className="resume-grid">
                    {resumes.map((resume, i) => {
                        const fileInfo = FILE_TYPE_MAP[resume.mimeType] || { label: 'FILE', color: 'var(--text-muted)' }
                        const isSelected = resume.isSelected
                        const isActionLoading = actionLoading === resume._id

                        return (
                            <div
                                key={resume._id}
                                className={`resume-card animate-in animate-in-delay-${Math.min(i + 1, 4)} ${isSelected ? 'resume-card-selected' : ''}`}
                            >
                                {isSelected && (
                                    <div className="resume-card-badge">
                                        <HiOutlineCheckCircle /> Selected for Upload
                                    </div>
                                )}
                                <div className="resume-card-body">
                                    <div className="file-type-icon" style={{ '--file-color': fileInfo.color }}>
                                        {fileInfo.label}
                                    </div>
                                    <div className="resume-card-info">
                                        <h4 className="resume-card-name" title={resume.originalName}>
                                            {resume.originalName}
                                        </h4>
                                        <div className="resume-card-meta">
                                            <span><HiOutlineClock /> {formatDate(resume.uploadedAt)}</span>
                                            <span>{formatFileSize(resume.fileSize)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="resume-card-actions">
                                    {!isSelected && (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleSelect(resume._id)}
                                            disabled={isActionLoading}
                                        >
                                            <HiOutlineCheckCircle /> {isActionLoading ? 'Selecting...' : 'Select for Upload'}
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-outline btn-sm btn-danger-outline"
                                        onClick={() => handleDelete(resume._id)}
                                        disabled={isActionLoading}
                                    >
                                        <HiOutlineTrash /> {isActionLoading ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Scheduler Logs Section */}
            <div className="scheduler-logs-section animate-in animate-in-delay-4">
                <button className="scheduler-logs-toggle" onClick={toggleLogs}>
                    <span><HiOutlineRefresh /> Scheduler Run History</span>
                    {showLogs ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                </button>

                {showLogs && (
                    <div className="scheduler-logs-content">
                        {logs.length === 0 ? (
                            <div className="scheduler-logs-empty">
                                <HiOutlineExclamationCircle /> No scheduler runs recorded yet
                            </div>
                        ) : (
                            <>
                                <table className="scheduler-logs-table">
                                    <thead>
                                        <tr>
                                            <th>Run Time</th>
                                            <th>Resume</th>
                                            <th>Status</th>
                                            <th>Completed</th>
                                            <th>Error</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log._id}>
                                                <td>{formatDateTime(log.schedulerRunAt)}</td>
                                                <td>{log.resumeName || '—'}</td>
                                                <td>
                                                    <span className={`tag ${log.status === 'success' ? 'secondary' : 'danger'}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td>{formatDateTime(log.completedAt)}</td>
                                                <td className="scheduler-log-error">{log.errorMessage || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {logsPagination && logsPagination.totalPages > 1 && (
                                    <div className="scheduler-logs-pagination">
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={logsPagination.page <= 1}
                                            onClick={() => loadLogs(logsPagination.page - 1)}
                                        >
                                            Previous
                                        </button>
                                        <span className="scheduler-logs-page-info">
                                            Page {logsPagination.page} of {logsPagination.totalPages}
                                        </span>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={logsPagination.page >= logsPagination.totalPages}
                                            onClick={() => loadLogs(logsPagination.page + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showModal && (
                <div className="upload-modal-overlay" onClick={closeModal}>
                    <div className="upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="upload-modal-header">
                            <h3><HiOutlineUpload /> Upload Resume</h3>
                            <button className="btn btn-ghost" onClick={closeModal}>
                                <HiOutlineX />
                            </button>
                        </div>

                        <div className="upload-modal-body">
                            <div
                                className={`upload-dropzone ${dragOver ? 'upload-dropzone-active' : ''} ${selectedFile ? 'upload-dropzone-has-file' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.rtf"
                                    style={{ display: 'none' }}
                                    onChange={e => handleFileSelect(e.target.files[0])}
                                />

                                {selectedFile ? (
                                    <div className="upload-dropzone-file">
                                        <div className="file-type-icon" style={{ '--file-color': (FILE_TYPE_MAP[selectedFile.type] || {}).color || 'var(--text-muted)' }}>
                                            {(FILE_TYPE_MAP[selectedFile.type] || {}).label || 'FILE'}
                                        </div>
                                        <div>
                                            <p className="upload-file-name">{selectedFile.name}</p>
                                            <p className="upload-file-size">{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="upload-dropzone-placeholder">
                                        <HiOutlineCloudUpload className="upload-dropzone-icon" />
                                        <p>Drag & drop your resume here</p>
                                        <p className="upload-dropzone-hint">or click to browse</p>
                                        <p className="upload-dropzone-formats">PDF, DOC, DOCX, RTF — Max 2MB</p>
                                    </div>
                                )}
                            </div>

                            {uploadError && (
                                <div className="upload-error">
                                    <HiOutlineExclamationCircle /> {uploadError}
                                </div>
                            )}
                        </div>

                        <div className="upload-modal-footer">
                            <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                            >
                                <HiOutlineUpload /> {uploading ? 'Uploading...' : 'Upload Resume'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
