import React from "react";

export default function useWindowSize() {
    const [windowSize, setWindowSize] = React.useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const changeWindowSize = React.useCallback(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }, []);

    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const debouncedResize = React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(changeWindowSize, 100);
    }, [changeWindowSize]);

    React.useEffect(() => {
        window.addEventListener("resize", debouncedResize);

        return () => {
            window.removeEventListener("resize", debouncedResize);
        };
    }, [debouncedResize]);

    return windowSize;
}