export default function ResultSuccessErrorIcon(props?: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <clipPath id="left-half-oe">
                    <rect x="2" y="2" width="10" height="20" />
                </clipPath>
                <clipPath id="right-half-oe">
                    <rect x="12" y="2" width="10" height="20" />
                </clipPath>
            </defs>
            <circle cx="12" cy="12" r="10" fill="#009933" clipPath="url(#left-half-oe)" />
            <circle cx="12" cy="12" r="10" fill="#cc2900" clipPath="url(#right-half-oe)" />
        </svg>
    )
}
