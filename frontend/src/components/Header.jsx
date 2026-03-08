import { useLocation } from 'react-router-dom'
import { HiOutlineSearch, HiOutlineBell } from 'react-icons/hi'

const pageTitles = {
    '/': { title: 'Dashboard', breadcrumb: 'Overview' },
    '/jobs': { title: 'Jobs', breadcrumb: 'All Scraped Jobs' },
    '/analytics': { title: 'Analytics', breadcrumb: 'Insights & Charts' },
    '/settings': { title: 'Settings', breadcrumb: 'Configuration' },
}

export default function Header() {
    const location = useLocation()

    // Handle job detail pages
    const isJobDetail = location.pathname.startsWith('/jobs/')
    const pageInfo = isJobDetail
        ? { title: 'Job Detail', breadcrumb: 'Jobs / Detail View' }
        : pageTitles[location.pathname] || { title: 'Page', breadcrumb: '' }

    return (
        <header className="header">
            <div className="header-left">
                <div>
                    <h1 className="header-title">{pageInfo.title}</h1>
                    <span className="header-breadcrumb">{pageInfo.breadcrumb}</span>
                </div>
            </div>

            <div className="header-right">
                <div className="header-search">
                    <HiOutlineSearch className="header-search-icon" />
                    <input type="text" placeholder="Search jobs, companies..." />
                </div>

                <button className="header-icon-btn">
                    <HiOutlineBell />
                    <span className="badge"></span>
                </button>

                <div className="header-avatar" title="Avijit">
                    AV
                </div>
            </div>
        </header>
    )
}
