import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    HiOutlineBriefcase,
    HiOutlineOfficeBuilding,
    HiOutlineTag,
    HiOutlineBadgeCheck,
    HiOutlineArrowSmUp,
    HiOutlineExternalLink
} from 'react-icons/hi'
import { fetchDashboard } from '../services/api'
import Loader from '../components/Loader'

function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
}

export default function Dashboard() {
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchDashboard()
            .then(res => setData(res.data))
            .catch(err => console.error('Dashboard fetch error:', err))
            .finally(() => setIsLoading(false))
    }, [])

    if (isLoading) return <Loader message="Loading dashboard..." />

    const stats = data?.stats || { totalJobs: 0, uniqueCompanies: 0, keywordsTracked: 0, skillMatches: 0 }
    const recentJobs = data?.recentJobs || []
    const jobsByKeyword = data?.jobsByKeyword || []
    const topSkills = data?.topSkills || []
    const recentActivity = data?.recentActivity || []

    const activityColors = ['primary', 'secondary', 'warning', 'info']

    return (
        <div className="animate-in">
            {/* Stats Row */}
            <div className="stats-grid">
                <div className="stat-card accent-primary animate-in animate-in-delay-1">
                    <div className="stat-card-icon primary"><HiOutlineBriefcase /></div>
                    <div className="stat-card-content">
                        <h3>{stats.totalJobs}</h3>
                        <p>Total Jobs Scraped</p>
                    </div>
                </div>

                <div className="stat-card accent-secondary animate-in animate-in-delay-2">
                    <div className="stat-card-icon secondary"><HiOutlineOfficeBuilding /></div>
                    <div className="stat-card-content">
                        <h3>{stats.uniqueCompanies}</h3>
                        <p>Unique Companies</p>
                    </div>
                </div>

                <div className="stat-card accent-warning animate-in animate-in-delay-3">
                    <div className="stat-card-icon warning"><HiOutlineTag /></div>
                    <div className="stat-card-content">
                        <h3>{stats.keywordsTracked}</h3>
                        <p>Keywords Tracked</p>
                    </div>
                </div>

                <div className="stat-card accent-info animate-in animate-in-delay-4">
                    <div className="stat-card-icon info"><HiOutlineBadgeCheck /></div>
                    <div className="stat-card-content">
                        <h3>{stats.skillMatches}</h3>
                        <p>Skill Matches</p>
                    </div>
                </div>
            </div>

            <div className="section-grid">
                {/* Recent Jobs */}
                <div className="card animate-in animate-in-delay-2">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Recent Jobs</h3>
                            <p className="card-subtitle">Latest scraped positions</p>
                        </div>
                        <button className="btn btn-ghost" onClick={() => navigate('/jobs')}>
                            View All →
                        </button>
                    </div>
                    {recentJobs.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No jobs scraped yet.</p>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Position</th>
                                        <th>Location</th>
                                        <th>Posted</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentJobs.map(job => (
                                        <tr key={job._id} onClick={() => navigate(`/jobs/${job._id}`)}>
                                            <td>
                                                <span className="table-job-title">{job.title}</span>
                                                <span className="table-company">{job.company}</span>
                                            </td>
                                            <td>{job.location?.split(',')[0]}</td>
                                            <td><span className="tag neutral">{job.postedDate}</span></td>
                                            <td>
                                                <HiOutlineExternalLink style={{ color: 'var(--text-muted)' }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    {/* Jobs by Keyword */}
                    <div className="card animate-in animate-in-delay-3">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Jobs by Keyword</h3>
                                <p className="card-subtitle">Distribution across search terms</p>
                            </div>
                        </div>
                        {jobsByKeyword.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No data yet.</p>
                        ) : (
                            <div className="bar-chart">
                                {jobsByKeyword.map((item, i) => {
                                    const maxCount = jobsByKeyword[0].count
                                    const colors = ['primary', 'secondary', 'warning', 'info']
                                    return (
                                        <div className="bar-chart-item" key={item.keyword}>
                                            <span className="bar-chart-label">{item.keyword}</span>
                                            <div className="bar-chart-bar-wrapper">
                                                <div
                                                    className={`bar-chart-bar ${colors[i % colors.length]}`}
                                                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                                                >
                                                    <span className="bar-chart-value">{item.count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Recent Activity */}
                    <div className="card animate-in animate-in-delay-4">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Recent Activity</h3>
                                <p className="card-subtitle">Scraping timeline</p>
                            </div>
                        </div>
                        {recentActivity.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No activity yet.</p>
                        ) : (
                            <div className="activity-feed">
                                {recentActivity.map((item, i) => (
                                    <div key={i} className="activity-item">
                                        <div className={`activity-dot ${activityColors[i % activityColors.length]}`}></div>
                                        <div className="activity-content">
                                            <h4>{item.message}</h4>
                                            <p>{timeAgo(item.scrapedAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Skills */}
            <div className="card animate-in animate-in-delay-3">
                <div className="card-header">
                    <div>
                        <h3 className="card-title">Top Skills in Demand</h3>
                        <p className="card-subtitle">Most frequently required skills across all jobs</p>
                    </div>
                </div>
                {topSkills.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No data yet.</p>
                ) : (
                    <div className="tags-list" style={{ gap: 'var(--space-3)' }}>
                        {topSkills.map((s, i) => {
                            const variants = ['primary', 'secondary', 'info', 'warning']
                            return (
                                <span key={s.skill} className={`tag ${variants[i % variants.length]}`} style={{ padding: '6px 14px', fontSize: 'var(--font-sm)' }}>
                                    {s.skill} <strong style={{ marginLeft: '6px' }}>({s.count})</strong>
                                </span>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
