import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineExternalLink,
    HiOutlineChevronLeft,
    HiOutlineChevronRight
} from 'react-icons/hi'
import { fetchJobs, fetchKeywords } from '../services/api'
import useDebounce from '../hooks/useDebounce'
import Loader from '../components/Loader'

const ITEMS_PER_PAGE = 10

export default function Jobs() {
    const navigate = useNavigate()

    // Filter state
    const [search, setSearch] = useState('')
    const [keywordFilter, setKeywordFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

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

    // Fetch jobs whenever page, debouncedSearch, or keyword filter changes
    const loadJobs = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await fetchJobs({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch,
                keyword: keywordFilter
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
    }, [currentPage, debouncedSearch, keywordFilter])

    useEffect(() => {
        loadJobs()
    }, [loadJobs])

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [debouncedSearch, keywordFilter])

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

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>All Jobs</h2>
                    <p>{totalJobs} jobs found</p>
                </div>
                <button className="btn btn-primary">
                    <HiOutlineFilter /> Export
                </button>
            </div>

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
                                            <span className="tag primary">{job.searchKeyword}</span>
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
                                onClick={() => setCurrentPage(p => p - 1)}
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
                                        onClick={() => setCurrentPage(item)}
                                    >
                                        {item}
                                    </button>
                                )
                            ))}
                            <button
                                className="pagination-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
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
