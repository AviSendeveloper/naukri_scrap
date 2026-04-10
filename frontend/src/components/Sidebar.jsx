import { useState, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
    HiOutlineViewGrid,
    HiOutlineBriefcase,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineLightningBolt,
    HiOutlineDocumentText,
    HiOutlineRefresh,
} from 'react-icons/hi'
import { fetchScraperStats } from '../services/api'

const navItems = [
    {
        section: 'Main',
        items: [
            { to: '/', icon: HiOutlineViewGrid, label: 'Dashboard' },
            { to: '/jobs', icon: HiOutlineBriefcase, label: 'Jobs' },
            { to: '/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
            { to: '/resume', icon: HiOutlineDocumentText, label: 'Resume' },
        ]
    },
    {
        section: 'System',
        items: [
            { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
        ]
    }
]

export default function Sidebar() {
    const location = useLocation()
    const [stats, setStats] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const loadStats = useCallback(async () => {
        setIsRefreshing(true)
        try {
            const res = await fetchScraperStats()
            setStats(res.data)
        } catch (err) {
            // Silently fail — stats are optional
        } finally {
            setIsRefreshing(false)
        }
    }, [])

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <HiOutlineLightningBolt />
                </div>
                <div>
                    <h1>NaukriScrap</h1>
                    <span>Job Scraper Dashboard</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(section => (
                    <div key={section.section} className="sidebar-nav-section">
                        <div className="sidebar-nav-section-title">{section.section}</div>
                        {section.items.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `sidebar-nav-link ${isActive && (item.to === '/' ? location.pathname === '/' : true) ? 'active' : ''}`
                                }
                                end={item.to === '/'}
                            >
                                <span className="sidebar-nav-link-icon">
                                    <item.icon />
                                </span>
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="scraper-stats-widget">
                    <div className="scraper-stats-header">
                        <HiOutlineLightningBolt />
                        <span>Scraper Stats</span>
                        <button
                            className="scraper-stats-refresh-btn"
                            onClick={loadStats}
                            disabled={isRefreshing}
                            title="Refresh stats"
                        >
                            <HiOutlineRefresh className={isRefreshing ? 'spin' : ''} />
                        </button>
                    </div>

                    {stats ? (
                        <div className="scraper-stats-grid">
                            <div className="scraper-stat-item">
                                <span className="scraper-stat-value dispatched">{stats.jobsDispatched}</span>
                                <span className="scraper-stat-label">Dispatched</span>
                            </div>
                            <div className="scraper-stat-item">
                                <span className="scraper-stat-value processed">{stats.jobsProcessed}</span>
                                <span className="scraper-stat-label">Processed</span>
                            </div>
                            <div className="scraper-stat-item">
                                <span className="scraper-stat-value results">{stats.totalSearchResults}</span>
                                <span className="scraper-stat-label">Results</span>
                            </div>
                            <div className="scraper-stat-item">
                                <span className="scraper-stat-value pages">
                                    {stats.currentPage}/{stats.totalPages}
                                </span>
                                <span className="scraper-stat-label">Pages</span>
                            </div>
                            <div className="scraper-stat-item span-2">
                                <span className="scraper-stat-value skipped">{stats.totalSkipped}</span>
                                <span className="scraper-stat-label">Skipped (threshold)</span>
                            </div>
                        </div>
                    ) : (
                        <p className="scraper-stats-loading">Click refresh to load stats</p>
                    )}
                </div>
            </div>
        </aside>
    )
}
