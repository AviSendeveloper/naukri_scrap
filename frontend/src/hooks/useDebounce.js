import { useState, useEffect } from 'react';

/**
 * Debounce a value by the given delay (ms).
 * Returns the debounced value which only updates after the user
 * stops changing the input for `delay` milliseconds.
 */
export default function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
