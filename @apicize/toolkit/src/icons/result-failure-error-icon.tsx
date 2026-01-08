export default function ResultFailureErrorIcon(props?: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <clipPath id="left-half-we">
                    <rect x="2" y="2" width="10" height="20" />
                </clipPath>
                <clipPath id="right-half-we">
                    <rect x="12" y="2" width="10" height="20" />
                </clipPath>
            </defs>
            <circle cx="12" cy="12" r="10" fill="#ffa726" clipPath="url(#left-half-we)" />
            <circle cx="12" cy="12" r="10" fill="#f44336" clipPath="url(#right-half-we)" />
        </svg>
    )
}
