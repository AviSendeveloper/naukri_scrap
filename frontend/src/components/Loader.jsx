import '../styles/loader.css';

/**
 * A modern pulsing-dot loader matching the dark theme.
 * Optionally accepts a `message` prop.
 */
export default function Loader({ message = 'Loading...' }) {
    return (
        <div className="loader-container">
            <div className="loader-dots">
                <span className="loader-dot" />
                <span className="loader-dot" />
                <span className="loader-dot" />
            </div>
            {message && <p className="loader-message">{message}</p>}
        </div>
    );
}
