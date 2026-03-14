import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    HiOutlineArrowLeft,
    HiOutlineOfficeBuilding,
    HiOutlineLocationMarker,
    HiOutlineBriefcase,
    HiOutlineCurrencyRupee,
    HiOutlineCalendar,
    HiOutlineUsers,
    HiOutlineExternalLink,
    HiOutlineTag
} from 'react-icons/hi'
import { fetchJobById } from '../services/api'
import Loader from '../components/Loader'

export default function JobDetail() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [job, setJob] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setIsLoading(true)
        setError(null)
        fetchJobById(id)
            .then(res => setJob(res.data))
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false))
    }, [id])

    if (isLoading) {
        return <Loader message="Loading job details..." />
    }

    if (error || !job) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>Job Not Found</h3>
                <p>{error || "The job you're looking for doesn't exist."}</p>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/jobs')}>
                    Back to Jobs
                </button>
            </div>
        )
    }

    return (
        <div className="job-detail animate-in">
            <div className="job-detail-back" onClick={() => navigate('/jobs')}>
                <HiOutlineArrowLeft /> Back to Jobs
            </div>

            {/* Header */}
            <div className="job-detail-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                    <div>
                        <h2>{job.title}</h2>
                        <div className="job-detail-meta">
                            <span className="job-detail-meta-item">
                                <HiOutlineOfficeBuilding /> {job.company}
                            </span>
                            <span className="job-detail-meta-item">
                                <HiOutlineLocationMarker /> {job.location}
                            </span>
                            <span className="job-detail-meta-item">
                                <HiOutlineBriefcase /> {job.experience}
                            </span>
                            <span className="job-detail-meta-item">
                                <HiOutlineCurrencyRupee /> {job.salary}
                            </span>
                        </div>
                    </div>
                    <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        <HiOutlineExternalLink /> View on Naukri
                    </a>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
                {/* Main Content */}
                <div>
                    {/* Full Description */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                        <div className="job-detail-section" style={{ marginBottom: 0 }}>
                            <h3>Job Description</h3>
                            <p>{job.fullDescription || job.description}</p>
                        </div>
                    </div>

                    {/* Key Skills */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                        <div className="job-detail-section" style={{ marginBottom: 0 }}>
                            <h3>Key Skills</h3>
                            <div className="tags-list" style={{ gap: 'var(--space-3)' }}>
                                {(job.keySkills || []).map(skill => {
                                    const isMatched = (job.matchedSkills || []).some(
                                        ms => ms.toLowerCase() === skill.toLowerCase()
                                    )
                                    return (
                                        <span
                                            key={skill}
                                            className={`tag ${isMatched ? 'secondary' : 'neutral'}`}
                                            style={{ padding: '6px 14px', fontSize: 'var(--font-sm)' }}
                                        >
                                            {isMatched && '✓ '}{skill}
                                        </span>
                                    )
                                })}
                            </div>
                            {(job.matchedSkills || []).length > 0 && (
                                <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-sm)', color: 'var(--accent-secondary)' }}>
                                    ✓ {job.matchedSkills.length} skills matched with your profile
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    {/* Job Info Card */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Job Details</h3>
                        <div className="config-item">
                            <span className="config-item-label"><HiOutlineCalendar style={{ verticalAlign: 'middle', marginRight: '6px' }} />Posted</span>
                            <span className="config-item-value">{job.postedDate}</span>
                        </div>
                        <div className="config-item">
                            <span className="config-item-label"><HiOutlineUsers style={{ verticalAlign: 'middle', marginRight: '6px' }} />Vacancies</span>
                            <span className="config-item-value">{job.totalVacancy}</span>
                        </div>
                        <div className="config-item">
                            <span className="config-item-label"><HiOutlineCurrencyRupee style={{ verticalAlign: 'middle', marginRight: '6px' }} />Salary</span>
                            <span className="config-item-value">{job.salaryOffered}</span>
                        </div>
                        <div className="config-item">
                            <span className="config-item-label"><HiOutlineTag style={{ verticalAlign: 'middle', marginRight: '6px' }} />Keyword</span>
                            <span className="tag primary">{job.searchKeyword}</span>
                        </div>
                    </div>

                    {/* Industry Types */}
                    {(job.industryTypes || []).length > 0 && (
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Industry</h3>
                            <div className="tags-list" style={{ gap: 'var(--space-3)' }}>
                                {job.industryTypes.map(ind => (
                                    <span key={ind} className="tag info" style={{ padding: '6px 14px' }}>{ind}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scraping Metadata */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Scraping Info</h3>
                        <div className="config-item">
                            <span className="config-item-label">Scraped At</span>
                            <span className="config-item-value" style={{ fontSize: 'var(--font-xs)' }}>
                                {new Date(job.scrapedAt).toLocaleString()}
                            </span>
                        </div>
                        <div className="config-item">
                            <span className="config-item-label">Experience Filter</span>
                            <span className="config-item-value">{job.experienceFilter || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
