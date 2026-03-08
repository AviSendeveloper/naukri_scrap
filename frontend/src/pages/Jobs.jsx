import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineExternalLink,
    HiOutlineChevronLeft,
    HiOutlineChevronRight
} from 'react-icons/hi'
import { mockJobs } from '../data/mockData'

const ITEMS_PER_PAGE = 8

export default function Jobs() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [keywordFilter, setKeywordFilter] = useState('')
    const [experienceFilter, setExperienceFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    const uniqueKeywords = [...new Set(mockJobs.map(j => j.searchKeyword))]

    const filteredJobs = useMemo(() => {
        return mockJobs.filter(job => {
            const matchesSearch = !search ||
                job.title.toLowerCase().includes(search.toLowerCase()) ||
                job.company.toLowerCase().includes(search.toLowerCase()) ||
                job.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))

            const matchesKeyword = !keywordFilter || job.searchKeyword === keywordFilter

            const matchesExperience = !experienceFilter || (() => {
                const minExp = parseInt(job.experience)
                if (experienceFilter === '0-2') return minExp <= 2
                if (experienceFilter === '3-5') return minExp >= 2 && minExp <= 5
                if (experienceFilter === '5+') return minExp >= 5
                return true
            })()

            return matchesSearch && matchesKeyword && matchesExperience
        })
    }, [search, keywordFilter, experienceFilter])

    const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE)
    const paginatedJobs = filteredJobs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Reset page when filters change
    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value)
        setCurrentPage(1)
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>All Jobs</h2>
                    <p>{filteredJobs.length} jobs found</p>
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
                        placeholder="Search by title, company, or skill..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <select
                    className="form-select"
                    style={{ width: 'auto', minWidth: '180px' }}
                    value={keywordFilter}
                    onChange={handleFilterChange(setKeywordFilter)}
                >
                    <option value="">All Keywords</option>
                    {uniqueKeywords.map(kw => (
                        <option key={kw} value={kw}>{kw}</option>
                    ))}
                </select>

                <select
                    className="form-select"
                    style={{ width: 'auto', minWidth: '160px' }}
                    value={experienceFilter}
                    onChange={handleFilterChange(setExperienceFilter)}
                >
                    <option value="">All Experience</option>
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5+">5+ years</option>
                </select>
            </div>

            {/* Jobs Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Position</th>
                                <th>Location</th>
                                <th>Experience</th>
                                <th>Salary</th>
                                <th>Skills Match</th>
                                <th>Posted</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedJobs.map(job => (
                                <tr key={job._id} onClick={() => navigate(`/jobs/${job._id}`)}>
                                    <td>
                                        <span className="table-job-title">{job.title}</span>
                                        <span className="table-company">{job.company}</span>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{job.location.split(',')[0]}</td>
                                    <td><span className="tag neutral">{job.experience}</span></td>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-sm)' }}>
                                        {job.salary}
                                    </td>
                                    <td>
                                        <div className="tags-list">
                                            {job.matchedSkills.slice(0, 3).map(s => (
                                                <span key={s} className="tag secondary">{s}</span>
                                            ))}
                                            {job.matchedSkills.length > 3 && (
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination" style={{ padding: 'var(--space-4) var(--space-6)' }}>
                        <span className="pagination-info">
                            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length}
                        </span>
                        <div className="pagination-controls">
                            <button
                                className="pagination-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                <HiOutlineChevronLeft />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
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
