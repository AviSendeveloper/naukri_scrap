import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineExternalLink,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineChevronUp,
    HiOutlineChevronDown,
    HiOutlineSortDescending,
    HiOutlineDownload,
    HiOutlineX
} from 'react-icons/hi'
import { fetchJobs, fetchKeywords, exportJobs } from '../services/api'
import useDebounce from '../hooks/useDebounce'
import Loader from '../components/Loader'

const ITEMS_PER_PAGE = 10

const MATCH_FILTER_OPTIONS = [
    { label: 'All', value: '' },
    { label: '≥ 80%', value: '80' },
    { label: '≥ 60%', value: '60' },
    { label: '≥ 40%', value: '40' },
    { label: '≥ 20%', value: '20' },
    { label: '> 0%', value: '1' },
]

/**
 * Returns a color class for a match percentage value.
 */
function getMatchColor(value) {
    if (value == null) return 'neutral'
    if (value >= 70) return 'success'
    if (value >= 40) return 'warning'
    return 'danger'
}

export default function Jobs() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    // Filter state
    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [keywordFilter, setKeywordFilter] = useState(searchParams.get('keyword') || '')
    const [aiMatchFilter, setAiMatchFilter] = useState(searchParams.get('minAiMatch') || '')
    const [manualMatchFilter, setManualMatchFilter] = useState(searchParams.get('minManualMatch') || '')
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1)

    // Sort state
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || '')
    const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc')

    // Track previous filter/sort values to distinguish user interaction from initial mount/navigation
    const prevFiltersRef = useRef({
        debouncedSearch: searchParams.get('search') || '',
        keywordFilter: searchParams.get('keyword') || '',
        aiMatchFilter: searchParams.get('minAiMatch') || '',
        manualMatchFilter: searchParams.get('minManualMatch') || '',
        sortBy: searchParams.get('sortBy') || '',
        sortOrder: searchParams.get('sortOrder') || 'desc',
    })

    // Data state
    const [jobs, setJobs] = useState([])
    const [pagination, setPagination] = useState(null)
    const [keywords, setKeywords] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    // Debounced search (500ms)
    const debouncedSearch = useDebounce(search, 500)

    // Fetch unique keywords once for the dropdown
    useEffect(() => {
        fetchKeywords()
            .then(res => setKeywords(res.data || []))
            .catch(err => console.error('Failed to load keywords:', err))
    }, [])

    // Fetch jobs whenever page, debouncedSearch, keyword, match filters, or sort changes
    const loadJobs = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await fetchJobs({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch,
                keyword: keywordFilter,
                minAiMatch: aiMatchFilter,
                minManualMatch: manualMatchFilter,
                sortBy,
                sortOrder
            })
            setJobs(res.data || [])
            setPagination(res.pagination || null)
        } catch (err) {
            console.error('Failed to load jobs:', err)
            setJobs([])
            setPagination(null)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, debouncedSearch, keywordFilter, aiMatchFilter, manualMatchFilter, sortBy, sortOrder])

    useEffect(() => {
        loadJobs()
    }, [loadJobs])

    // Reset page to 1 only when filters/sort actually change (user interaction), not on initial mount
    useEffect(() => {
        const prev = prevFiltersRef.current
        if (
            prev.debouncedSearch !== debouncedSearch ||
            prev.keywordFilter !== keywordFilter ||
            prev.aiMatchFilter !== aiMatchFilter ||
            prev.manualMatchFilter !== manualMatchFilter ||
            prev.sortBy !== sortBy ||
            prev.sortOrder !== sortOrder
        ) {
            setCurrentPage(1)
        }
        prevFiltersRef.current = {
            debouncedSearch, keywordFilter,
            aiMatchFilter, manualMatchFilter,
            sortBy, sortOrder
        }
    }, [debouncedSearch, keywordFilter, aiMatchFilter, manualMatchFilter, sortBy, sortOrder])

    const totalPages = pagination?.totalPages || 1
    const totalJobs = pagination?.totalJobs || 0

    // Generate pagination numbers with ellipsis
    const getPaginationGroup = () => {
        const pages = []
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
            }
        }
        return pages
    }

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        setSearchParams({ 
            page: newPage, 
            // search, 
            // keyword: keywordFilter 
        })
    }

    // Sort handler for clickable column headers
    const handleSort = (column) => {
        if (sortBy === column) {
            // Toggle direction
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
        } else {
            setSortBy(column)
            setSortOrder('desc')
        }
    }

    // Render sort indicator arrow
    const renderSortIndicator = (column) => {
        if (sortBy !== column) {
            return <HiOutlineSortDescending style={{ opacity: 0.3, marginLeft: '4px', verticalAlign: 'middle' }} />
        }
        return sortOrder === 'asc'
            ? <HiOutlineChevronUp style={{ marginLeft: '4px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
            : <HiOutlineChevronDown style={{ marginLeft: '4px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
    }
    // Export state
    const today = new Date().toISOString().split('T')[0]
    const [showExportForm, setShowExportForm] = useState(false)
    const [exportStartDate, setExportStartDate] = useState(today)
    const [exportEndDate, setExportEndDate] = useState(today)
    const [exportStatus, setExportStatus] = useState('idle') // idle | exporting | done | error
    const [exportMessage, setExportMessage] = useState('')

    // Export handler
    const handleExport = async () => {
        setExportStatus('exporting')
        setExportMessage('')
        try {
            const { blob, jobCount, emailSent } = await exportJobs({
                startDate: exportStartDate,
                endDate: exportEndDate
            })

            // Trigger browser download
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `jobs_export_${exportStartDate}_to_${exportEndDate}.xlsx`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            setExportStatus('done')
            setExportMessage(
                `✓ ${jobCount} jobs exported${emailSent ? ' & emailed' : '. Email not configured — set it in Settings.'}`
            )
            setTimeout(() => {
                setExportStatus('idle')
                setExportMessage('')
            }, 4000)
        } catch (err) {
            setExportStatus('error')
            setExportMessage(`Export failed: ${err.message}`)
            setTimeout(() => {
                setExportStatus('idle')
                setExportMessage('')
            }, 4000)
        }
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>All Jobs</h2>
                    <p>{totalJobs} jobs found</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowExportForm(prev => !prev)}
                >
                    {showExportForm ? <HiOutlineX /> : <HiOutlineDownload />}
                    {showExportForm ? 'Close' : 'Export'}
                </button>
            </div>

            {/* Export Form */}
            {showExportForm && (
                <div className="card" style={{
                    marginBottom: 'var(--space-6)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 'var(--space-4)',
                    flexWrap: 'wrap',
                    padding: 'var(--space-5) var(--space-6)'
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Start Date</label>
                        <input
                            className="form-input"
                            type="date"
                            value={exportStartDate}
                            onChange={e => setExportStartDate(e.target.value)}
                            style={{ width: '180px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">End Date</label>
                        <input
                            className="form-input"
                            type="date"
                            value={exportEndDate}
                            onChange={e => setExportEndDate(e.target.value)}
                            style={{ width: '180px' }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={exportStatus === 'exporting'}
                        style={{ height: '42px' }}
                    >
                        <HiOutlineDownload />
                        {exportStatus === 'exporting' ? 'Exporting...' : 'Export & Email'}
                    </button>
                    {exportMessage && (
                        <span style={{
                            fontSize: 'var(--font-sm)',
                            color: exportStatus === 'error' ? 'var(--accent-danger)' : 'var(--accent-secondary)',
                            fontWeight: 500
                        }}>
                            {exportMessage}
                        </span>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="filter-bar">
                <div className="filter-search">
                    <HiOutlineSearch className="filter-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="form-select"
                    style={{ width: 'auto', minWidth: '180px' }}
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                >
                    <option value="">All Keywords</option>
                    {keywords.map(kw => (
                        <option key={kw} value={kw}>{kw}</option>
                    ))}
                </select>

                <select
                    id="ai-match-filter"
                    className="form-select"
                    style={{ width: 'auto', minWidth: '150px' }}
                    value={aiMatchFilter}
                    onChange={(e) => setAiMatchFilter(e.target.value)}
                >
                    <option value="">AI Match: All</option>
                    {MATCH_FILTER_OPTIONS.slice(1).map(opt => (
                        <option key={`ai-${opt.value}`} value={opt.value}>AI {opt.label}</option>
                    ))}
                </select>

                <select
                    id="manual-match-filter"
                    className="form-select"
                    style={{ width: 'auto', minWidth: '170px' }}
                    value={manualMatchFilter}
                    onChange={(e) => setManualMatchFilter(e.target.value)}
                >
                    <option value="">Manual Match: All</option>
                    {MATCH_FILTER_OPTIONS.slice(1).map(opt => (
                        <option key={`manual-${opt.value}`} value={opt.value}>Manual {opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Jobs Table */}
            <div className="card" style={{ padding: 0 }}>
                {isLoading ? (
                    <Loader message="Fetching jobs..." />
                ) : jobs.length === 0 ? (
                    <div className="loader-container">
                        <p className="loader-message">No jobs found.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Position</th>
                                    <th>Location</th>
                                    <th>Experience</th>
                                    <th>Search Keyword</th>
                                    <th>Skills Match</th>
                                    <th
                                        className="sortable-header"
                                        onClick={() => handleSort('matchPercentage')}
                                        title="Sort by Manual Match %"
                                    >
                                        Manual % {renderSortIndicator('matchPercentage')}
                                    </th>
                                    <th
                                        className="sortable-header"
                                        onClick={() => handleSort('aiMatchPercentage')}
                                        title="Sort by AI Match %"
                                    >
                                        AI % {renderSortIndicator('aiMatchPercentage')}
                                    </th>
                                    <th>Posted</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => (
                                    <tr key={job._id} onClick={() => navigate(`/jobs/${job._id}`)}>
                                        <td>
                                            <span className="table-job-title">{job.title}</span>
                                            <span className="table-company">{job.company}</span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{job.location?.split(',')[0]}</td>
                                        <td><span className="tag neutral">{job.experience}</span></td>
                                        <td>
                                            <div className="tags-list">
                                                {(job.searchKeyword || []).slice(0, 3).map(s => (
                                                    <span key={s} className="tag primary">{s}</span>
                                                ))}
                                                {(job.searchKeyword || []).length > 3 && (
                                                    <span className="tag neutral">+{job.searchKeyword.length - 3}</span>
                                                )}
                                            </div>
                                            {/* <span className="tag primary">{job.searchKeyword}</span> */}
                                        </td>
                                        <td>
                                            <div className="tags-list">
                                                {(job.matchedSkills || []).slice(0, 3).map(s => (
                                                    <span key={s} className="tag secondary">{s}</span>
                                                ))}
                                                {(job.matchedSkills || []).length > 3 && (
                                                    <span className="tag neutral">+{job.matchedSkills.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Manual Match % */}
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`tag ${getMatchColor(job.matchPercentage)}`}>
                                                {job.matchPercentage != null ? `${job.matchPercentage}%` : '—'}
                                            </span>
                                        </td>
                                        {/* AI Match % */}
                                        <td style={{ textAlign: 'center' }}>
                                            {job.aiMatchStatus === 'done' ? (
                                                <span className={`tag ${getMatchColor(job.aiMatchPercentage)}`}>
                                                    {job.aiMatchPercentage != null ? `${job.aiMatchPercentage}%` : '—'}
                                                </span>
                                            ) : job.aiMatchStatus === 'failed' ? (
                                                <span className="tag danger" style={{ fontSize: 'var(--font-xs)' }}>Failed</span>
                                            ) : (
                                                <span className="tag neutral" style={{ fontSize: 'var(--font-xs)' }}>Pending</span>
                                            )}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                                            {job.postedDate}
                                        </td>
                                        <td>
                                            <a
                                                href={job.jobUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                <HiOutlineExternalLink />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="pagination" style={{ padding: 'var(--space-4) var(--space-6)' }}>
                        <span className="pagination-info">
                            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalJobs)} of {totalJobs}
                        </span>
                        <div className="pagination-controls">
                            <button
                                className="pagination-btn"
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                <HiOutlineChevronLeft />
                            </button>
                            {getPaginationGroup().map((item, index) => (
                                item === '...' ? (
                                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                                ) : (
                                    <button
                                        key={item}
                                        className={`pagination-btn ${item === currentPage ? 'active' : ''}`}
                                        onClick={() => handlePageChange(item)}
                                    >
                                        {item}
                                    </button>
                                )
                            ))}
                            <button
                                className="pagination-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage+ 1)}
                            >
                                <HiOutlineChevronRight />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
