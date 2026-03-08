import { NavLink, useLocation } from 'react-router-dom'
import {
    HiOutlineViewGrid,
    HiOutlineBriefcase,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineSearch,
    HiOutlineLightningBolt
} from 'react-icons/hi'

const navItems = [
    {
        section: 'Main',
        items: [
            { to: '/', icon: HiOutlineViewGrid, label: 'Dashboard' },
            { to: '/jobs', icon: HiOutlineBriefcase, label: 'Jobs' },
            { to: '/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
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
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'var(--accent-primary-muted)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                }}>
                    <HiOutlineSearch style={{ fontSize: '20px', color: 'var(--accent-primary)', marginBottom: '4px' }} />
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Last scrape: 6h ago
                    </p>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 'var(--font-xs)', padding: '6px 12px' }}>
                        Run Scraper
                    </button>
                </div>
            </div>
        </aside>
    )
}
