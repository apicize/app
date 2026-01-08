export default function ResultSuccessWarningErrorIcon(props?: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <clipPath id="top-third">
                    <rect x="0" y="0" width="24" height="8" />
                </clipPath>
                <clipPath id="bottom-left">
                    <path d="M 0,8 L 0,24 L 12,24 L 12,8 Z" />
                </clipPath>
                <clipPath id="bottom-right">
                    <path d="M 12,8 L 12,24 L 24,24 L 24,8 Z" />
                </clipPath>
            </defs>
            <circle cx="12" cy="12" r="10" fill="#f44336" clipPath="url(#top-third)" />
            <circle cx="12" cy="12" r="10" fill="#ffa726" clipPath="url(#bottom-left)" />
            <circle cx="12" cy="12" r="10" fill="#009933" clipPath="url(#bottom-right)" />
        </svg>
    )
}
