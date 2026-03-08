import { useNavigate } from 'react-router-dom'
import {
    HiOutlineBriefcase,
    HiOutlineOfficeBuilding,
    HiOutlineTag,
    HiOutlineBadgeCheck,
    HiOutlineArrowSmUp,
    HiOutlineExternalLink
} from 'react-icons/hi'
import { mockJobs, mockStats, topSkills, recentActivity, jobsByKeyword } from '../data/mockData'

export default function Dashboard() {
    const navigate = useNavigate()

    return (
        <div className="animate-in">
            {/* Stats Row */}
            <div className="stats-grid">
                <div className="stat-card accent-primary animate-in animate-in-delay-1">
                    <div className="stat-card-icon primary"><HiOutlineBriefcase /></div>
                    <div className="stat-card-content">
                        <h3>{mockStats.totalJobs}</h3>
                        <p>Total Jobs Scraped</p>
                        <div className="stat-card-trend up">
                            <HiOutlineArrowSmUp /> +12 this week
                        </div>
                    </div>
                </div>

                <div className="stat-card accent-secondary animate-in animate-in-delay-2">
                    <div className="stat-card-icon secondary"><HiOutlineOfficeBuilding /></div>
                    <div className="stat-card-content">
                        <h3>{mockStats.uniqueCompanies}</h3>
                        <p>Unique Companies</p>
                        <div className="stat-card-trend up">
                            <HiOutlineArrowSmUp /> +5 new
                        </div>
                    </div>
                </div>

                <div className="stat-card accent-warning animate-in animate-in-delay-3">
                    <div className="stat-card-icon warning"><HiOutlineTag /></div>
                    <div className="stat-card-content">
                        <h3>{mockStats.keywordsSearched.length}</h3>
                        <p>Keywords Tracked</p>
                    </div>
                </div>

                <div className="stat-card accent-info animate-in animate-in-delay-4">
                    <div className="stat-card-icon info"><HiOutlineBadgeCheck /></div>
                    <div className="stat-card-content">
                        <h3>{mockStats.jobsWithMatchedSkills}</h3>
                        <p>Skill Matches</p>
                        <div className="stat-card-trend up">
                            <HiOutlineArrowSmUp /> 100% match rate
                        </div>
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
                                {mockJobs.slice(0, 6).map(job => (
                                    <tr key={job._id} onClick={() => navigate(`/jobs/${job._id}`)}>
                                        <td>
                                            <span className="table-job-title">{job.title}</span>
                                            <span className="table-company">{job.company}</span>
                                        </td>
                                        <td>{job.location.split(',')[0]}</td>
                                        <td><span className="tag neutral">{job.postedDate}</span></td>
                                        <td>
                                            <HiOutlineExternalLink style={{ color: 'var(--text-muted)' }} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                    </div>

                    {/* Recent Activity */}
                    <div className="card animate-in animate-in-delay-4">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Recent Activity</h3>
                                <p className="card-subtitle">Scraping timeline</p>
                            </div>
                        </div>
                        <div className="activity-feed">
                            {recentActivity.map((item, i) => (
                                <div key={i} className="activity-item">
                                    <div className={`activity-dot ${item.color}`}></div>
                                    <div className="activity-content">
                                        <h4>{item.message}</h4>
                                        <p>{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
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
            </div>
        </div>
    )
}
