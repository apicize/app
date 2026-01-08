export default function ResultSuccessFailureIcon(props?: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <clipPath id="left-half">
                    <rect x="2" y="2" width="10" height="20" />
                </clipPath>
                <clipPath id="right-half">
                    <rect x="12" y="2" width="10" height="20" />
                </clipPath>
            </defs>
            <circle cx="12" cy="12" r="10" fill="#009933" clipPath="url(#left-half)" />
            <circle cx="12" cy="12" r="10" fill="#ffa726" clipPath="url(#right-half)" />
        </svg>
    )
}
