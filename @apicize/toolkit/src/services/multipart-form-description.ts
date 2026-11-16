import { ApicizeBodyMultipartForm } from "@apicize/lib-typescript";

/**
 * Describe dispatched multipart form data as text, one item per line
 * (file contents are not included in dispatched request information)
 */
export function describeMultipartFormBody(body: ApicizeBodyMultipartForm): string {
    return Object.entries(body.data)
        .map(([name, value]) => typeof value === 'string'
            ? `${name} = ${value}`
            : `${name} = [File: ${value.fileName}, ${value.contentType}, ${value.size} bytes]`)
        .join('\n')
}
