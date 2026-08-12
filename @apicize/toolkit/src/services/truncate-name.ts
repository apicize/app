/**
 * Truncate an entity name for display. Names longer than 40 characters are
 * shortened to the first 37 characters followed by an ellipsis, keeping the
 * displayed text at a maximum of 40 characters.
 */
export function truncateName(name: string): string {
    return name.length > 40 ? `${name.substring(0, 37)}...` : name
}

// Trailing run/row indicator appended to execution result names, e.g. " (Row 1 of 3)"
// or " (Run 2 of 5)". Only the name portion should be truncated; this suffix is left intact.
const RESULT_INDEX_SUFFIX = / \((?:Row|Run) \d+ of \d+\)$/

/**
 * Truncate an execution result name, preserving any trailing run/row indicator
 * (e.g. " (Row 1 of 3)") so the index information is never truncated away.
 */
export function truncateResultName(name: string): string {
    const match = name.match(RESULT_INDEX_SUFFIX)
    if (match) {
        const suffix = match[0]
        return `${truncateName(name.substring(0, name.length - suffix.length))}${suffix}`
    }
    return truncateName(name)
}
