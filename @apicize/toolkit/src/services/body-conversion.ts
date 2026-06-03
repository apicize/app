// Disabled "any" handling for XML and JSON handling
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, BodyForm, BodyGraphQL, BodyJSON, BodyNone, BodyRaw, BodyText, BodyType, BodyXML, NameValuePair } from "@apicize/lib-typescript";
import { EditableNameValuePair } from "../models/workspace/editable-name-value-pair";
import { GenerateIdentifier } from "./random-identifier-generator";
import { Parser, Builder } from 'xml2js'
import { base64Decode, base64Encode } from "./base64";

export class BodyConversion {
    public constructor(private readonly source: Body) { }

    /**
     * Convert body to destination type
     */
    public convert(destinationType: BodyType): Promise<Body> {
        switch (destinationType) {
            case BodyType.JSON:
                return this.toJson()
            case BodyType.XML:
                return this.toXML()
            case BodyType.Form:
                return this.toForm()
            case BodyType.Raw:
                return this.toRaw()
            case BodyType.Text:
                return Promise.resolve(this.toText())
            case BodyType.None:
                return Promise.resolve(this.toNone())
            case BodyType.GraphQL:
                return this.toGraphQL()
            default:
                throw new Error(`Unhandled body type: ${destinationType satisfies never}`)
        }
    }

    /**
     * Output body as JSON
     */
    public async toJson(): Promise<BodyJSON> {
        const type = this.source.type
        switch (type) {
            case BodyType.JSON:
                return this.source
            case BodyType.Text: {
                const parsed = await BodyConversion.parseText(this.source.data)
                return {
                    type: BodyType.JSON,
                    data: parsed !== undefined ? JSON.stringify(parsed, undefined, '   ') : ''
                }
            }
            case BodyType.Form:
                return {
                    type: BodyType.JSON,
                    data: this.source.data?.length
                        ? JSON.stringify(BodyConversion.formPairsToObject(this.source.data), undefined, '   ')
                        : ''
                }
            case BodyType.XML: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.JSON, data: '' }
                }
                const parsed = await BodyConversion.parseXml(this.source.data)
                return {
                    type: BodyType.JSON,
                    data: JSON.stringify(parsed, undefined, '   ')
                }
            }
            case BodyType.Raw: {
                const parsed = await BodyConversion.parseText(this.source.data)
                return {
                    type: BodyType.JSON,
                    data: parsed !== undefined ? JSON.stringify(parsed, undefined, '   ') : ''
                }
            }
            case BodyType.None:
                return { type: BodyType.JSON, data: '' }
            case BodyType.GraphQL:
                return {
                    type: BodyType.JSON,
                    data: JSON.stringify(BodyConversion.graphqlBodyToObject(this.source), undefined, '   ')
                }
            default:
                throw new Error(`Unhandled body type: ${type satisfies never}`)
        }
    }

    /**
     * Output body as XML
     */
    public async toXML(): Promise<BodyXML> {
        const type = this.source.type
        switch (type) {
            case BodyType.XML:
                return this.source
            case BodyType.Text: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.XML, data: '' }
                }
                const parsed = await BodyConversion.parseText(this.source.data)
                return {
                    type: BodyType.XML,
                    data: parsed !== undefined ? (new Builder()).buildObject(parsed) : ''
                }
            }
            case BodyType.Form:
                return {
                    type: BodyType.XML,
                    data: this.source.data?.length
                        ? (new Builder()).buildObject({ root: BodyConversion.formPairsToObject(this.source.data) })
                        : ''
                }
            case BodyType.JSON: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.XML, data: '' }
                }
                return {
                    type: BodyType.XML,
                    data: (new Builder()).buildObject(JSON.parse(this.source.data))
                }
            }
            case BodyType.Raw: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.XML, data: '' }
                }
                const parsed = await BodyConversion.parseText(this.source.data)
                return {
                    type: BodyType.XML,
                    data: parsed !== undefined ? (new Builder()).buildObject(parsed) : ''
                }
            }
            case BodyType.None:
                return { type: BodyType.XML, data: '' }
            case BodyType.GraphQL:
                return {
                    type: BodyType.XML,
                    data: (new Builder()).buildObject(BodyConversion.graphqlBodyToObject(this.source))
                }
            default:
                throw new Error(`Unhandled body type: ${type satisfies never}`)
        }
    }

    /**
     * Output body as Text
     */
    public toText(): BodyText {
        const type = this.source.type
        switch (type) {
            case BodyType.Text:
                return this.source
            case BodyType.JSON:
            case BodyType.XML:
            case BodyType.Raw:
                return {
                    type: BodyType.Text,
                    data: this.source.data ?? ''
                }
            case BodyType.Form:
                return {
                    type: BodyType.Text,
                    data: (this.source.data ?? []).map((nv) => `${nv.name.replace(',', '\\,')}=${nv.value.replace(',', '\\,')}`).join(', ')
                }
            case BodyType.None:
                return { type: BodyType.Text, data: '' }
            case BodyType.GraphQL:
                return {
                    type: BodyType.Text,
                    data: JSON.stringify(BodyConversion.graphqlBodyToObject(this.source))
                }
            default:
                throw new Error(`Unhandled body type: ${type satisfies never}`)
        }
    }

    /**
     * Output body as Raw (Base64 Binary)
     */
    public async toRaw(): Promise<BodyRaw> {
        const type = this.source.type
        let jsonData: any
        let xmlData: any

        switch (type) {
            case BodyType.Raw:
                return this.source
            case BodyType.Text:
                return {
                    type: BodyType.Raw,
                    data: BodyConversion.isValidBase64(this.source.data)
                        ? this.source.data
                        : base64Encode((new TextEncoder()).encode(this.source.data ?? ''))
                }
            case BodyType.JSON:
                if (!this.source.data?.trim()) {
                    return { type: BodyType.Raw, data: '' }
                }
                jsonData = JSON.parse(this.source.data)
                return {
                    type: BodyType.Raw,
                    data: BodyConversion.isValidBase64(jsonData)
                        ? jsonData
                        : base64Encode((new TextEncoder()).encode(this.source.data))
                }
            case BodyType.XML:
                if (!this.source.data?.trim()) {
                    return { type: BodyType.Raw, data: '' }
                }
                xmlData = await BodyConversion.parseXml(this.source.data)
                return {
                    type: BodyType.Raw,
                    data: BodyConversion.isValidBase64(xmlData)
                        ? xmlData
                        : base64Encode((new TextEncoder()).encode(this.source.data))
                }
            case BodyType.Form:
                return {
                    type: BodyType.Raw,
                    data: base64Encode((new TextEncoder()).encode(
                        JSON.stringify(BodyConversion.parsePairData(this.source.data ?? []))
                    ))
                }
            case BodyType.None:
                return { type: BodyType.Raw, data: '' }
            case BodyType.GraphQL:
                return {
                    type: BodyType.Raw,
                    data: base64Encode((new TextEncoder()).encode(
                        JSON.stringify(BodyConversion.graphqlBodyToObject(this.source))
                    ))
                }
            default:
                throw new Error(`Unhandled body type: ${type satisfies never}`)
        }
    }

    /**
     * Output body as Form
     */
    public async toForm(): Promise<BodyForm> {
        const type = this.source.type
        switch (type) {
            case BodyType.Form:
                return this.source
            case BodyType.JSON: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.Form, data: [] }
                }
                const obj = JSON.parse(this.source.data)
                return {
                    type: BodyType.Form,
                    data: BodyConversion.objectToFormPairs(obj)
                }
            }
            case BodyType.XML: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.Form, data: [] }
                }
                const obj = await BodyConversion.parseXml(this.source.data)
                return {
                    type: BodyType.Form,
                    data: BodyConversion.objectToFormPairs(obj)
                }
            }
            case BodyType.Text:
            case BodyType.Raw: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.Form, data: [] }
                }
                const parsed = await BodyConversion.parseText(this.source.data)
                if (parsed === undefined || typeof parsed === 'string') {
                    return { type: BodyType.Form, data: [] }
                }
                return {
                    type: BodyType.Form,
                    data: BodyConversion.objectToFormPairs(parsed)
                }
            }
            case BodyType.None:
            case BodyType.GraphQL:
                return { type: BodyType.Form, data: [] }
            default:
                throw new Error(`Unhandled body type: ${type satisfies never}`)
        }
    }

    public toNone(): BodyNone {
        return {
            type: BodyType.None,
            data: undefined
        }
    }

    /**
     * Converts form name-value pairs to a plain object for JSON/XML conversion.
     * Entries with duplicate names are combined into arrays; IDs are not included.
     */
    private static formPairsToObject(pairs: NameValuePair[]): Record<string, string | string[]> {
        const result: Record<string, string | string[]> = {}
        for (const pair of pairs) {
            if (!pair.name) continue
            const val = pair.value ?? ''
            if (pair.name in result) {
                const existing = result[pair.name]
                if (Array.isArray(existing)) {
                    existing.push(val)
                } else {
                    result[pair.name] = [existing, val]
                }
            } else {
                result[pair.name] = val
            }
        }
        return result
    }

    /**
     * Converts a plain object or NameValuePair array to EditableNameValuePair entries.
     * Array-valued properties expand to multiple entries with the same name.
     */
    private static objectToFormPairs(obj: any): EditableNameValuePair[] {
        if (!obj) return []

        if (Array.isArray(obj)) {
            return obj
                .map(item => ({
                    id: GenerateIdentifier(),
                    name: String(item?.name ?? ''),
                    value: String(item?.value ?? '')
                }))
                .filter(pair => pair.name || pair.value)
        }

        if (typeof obj !== 'object') return []

        const pairs: EditableNameValuePair[] = []
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                for (const item of value) {
                    pairs.push({
                        id: GenerateIdentifier(),
                        name: key,
                        value: item !== null && item !== undefined
                            ? (typeof item === 'object' ? JSON.stringify(item) : String(item))
                            : ''
                    })
                }
            } else {
                pairs.push({
                    id: GenerateIdentifier(),
                    name: key,
                    value: value !== null && value !== undefined
                        ? (typeof value === 'object' ? JSON.stringify(value) : String(value))
                        : ''
                })
            }
        }
        return pairs
    }

    private static async parseText(source: string, checkBase64: boolean = true): Promise<any> {
        if ((source?.length ?? 0) === 0) {
            return undefined
        }

        // Check if the source is Base64 encoded before treating as comma-separated values
        if (checkBase64 && BodyConversion.isValidBase64(source)) {
            try {
                const decoded = (new TextDecoder()).decode(base64Decode(source))
                const parsed = await this.parseText(decoded, false);
                // If the Base64 doesn't decode to "anything else" then return the source base64 encoded data
                if (decoded === parsed) {
                    return source
                } else {
                    return parsed
                }
            } catch {
                // noop
            }
        }
        // Try and parse as JSON
        try {
            return JSON.parse(source)
        } catch {
            // noop
        }

        // Try and parse as XML
        try {
            return await BodyConversion.parseXml(source)
        } catch {
            // noop
        }

        // Try and parse as Name-Value pairs
        try {
            const formResult = source.replaceAll('\\,', '\t\t').split(',').map(s => s.replaceAll('\t\t', ','))
            if (formResult.length > 0) {
                let ok = true
                const cleansed: NameValuePair[] = []
                for (const segment of formResult) {
                    const parts = segment.replaceAll('\\=', '\t\t').split('=').map(s => s.replaceAll('\t\t', '=').trim())
                    if (parts.length !== 2) {
                        ok = false
                        break
                    }
                    cleansed.push({ name: parts[0], value: parts[1] })
                }
                if (ok) {
                    return cleansed
                }
            }
        } catch {
            // NOOP
        }

        return source
    }


    private static async parseXml(source: string) {
        try {
            const xml = (await (new Parser({ explicitArray: false })).parseStringPromise(source)) as { [name: string]: object }
            const keys = Object.keys(xml)
            if (keys.length > 0) {
                return keys[0] === 'root'
                    ? xml[keys[0]]
                    : xml
            } else {
                throw new Error('no root element')
            }
        } catch (e) {
            throw new Error(`Unable to parse as XML: ${e instanceof Error ? e.message : `${e}`}`, { cause: e })
        }
    }

    private static parsePairData(source: NameValuePair[]): EditableNameValuePair[] {
        if (!Array.isArray(source)) {
            throw new Error('Form data must be a list')
        }
        return source.map((nv) => {
            if (!nv.name || !nv.value) {
                throw new Error('Form data must be a list of "name" and "value" pairs')
            }
            const nv1 = nv as EditableNameValuePair
            return {
                ...nv1,
                id: nv1.id ? nv1.id : GenerateIdentifier(),
            }
        })
    }

    /**
     * Output body as GraphQL
     */
    public async toGraphQL(): Promise<BodyGraphQL> {
        const type = this.source.type
        switch (type) {
            case BodyType.GraphQL:
                return this.source
            case BodyType.JSON: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.GraphQL, data: { query: '' } }
                }
                return BodyConversion.objectToGraphQL(JSON.parse(this.source.data))
            }
            case BodyType.XML: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.GraphQL, data: { query: '' } }
                }
                const obj = await BodyConversion.parseXml(this.source.data)
                return BodyConversion.objectToGraphQL(obj)
            }
            case BodyType.Text: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.GraphQL, data: { query: '' } }
                }
                const parsed = await BodyConversion.parseText(this.source.data)
                if (parsed !== null && typeof parsed === 'object') {
                    return BodyConversion.objectToGraphQL(parsed)
                }
                return { type: BodyType.GraphQL, data: { query: typeof parsed === 'string' ? parsed : '' } }
            }
            case BodyType.Raw: {
                if (!this.source.data?.trim()) {
                    return { type: BodyType.GraphQL, data: { query: '' } }
                }
                try {
                    const decoded = (new TextDecoder()).decode(base64Decode(this.source.data))
                    try {
                        return BodyConversion.objectToGraphQL(JSON.parse(decoded))
                    } catch {
                        return { type: BodyType.GraphQL, data: { query: decoded } }
                    }
                } catch {
                    return { type: BodyType.GraphQL, data: { query: '' } }
                }
            }
            case BodyType.Form:
            case BodyType.None:
                return { type: BodyType.GraphQL, data: { query: '' } }
            default:
                throw new Error(`Unhandled body type: ${type satisfies never}`)
        }
    }

    private static graphqlBodyToObject(source: BodyGraphQL): Record<string, any> {
        const data = source.data
        const obj: Record<string, any> = { query: data.query }
        if (data.extensions !== undefined) {
            try {
                obj.extensions = JSON.parse(data.extensions)
            } catch {
                obj.extensions = data.extensions
            }
        }
        return obj
    }

    private static objectToGraphQL(obj: any): BodyGraphQL {
        const result: BodyGraphQL = {
            type: BodyType.GraphQL,
            data: {
                query: typeof obj?.query === 'string' ? obj.query : ''
            }
        }
        if (obj?.extensions != null) {
            result.data.extensions = typeof obj.extensions === 'object'
                ? JSON.stringify(obj.extensions)
                : String(obj.extensions)
        }
        return result
    }

    /**
     * Tests whether a string appears to be valid Base64 encoded data.
     */
    private static isValidBase64(text: string): boolean {
        if (!text || text.length === 0) {
            return false;
        }

        // Base64 strings should only contain A-Z, a-z, 0-9, +, /, and = for padding
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

        if (!base64Regex.test(text)) {
            return false;
        }

        // Decode and re-encode to validate base64
        try {
            const decoded = base64Decode(text)
            const reencoded = base64Encode(decoded)
            const lastPadChar1 = text.lastIndexOf('=')
            const lastPadChar2 = reencoded.lastIndexOf('=')

            let compareUntil = lastPadChar1 === -1 ? text.length : lastPadChar1
            if (lastPadChar2 !== -1 && lastPadChar2 < lastPadChar1) {
                compareUntil = lastPadChar2
            }

            return reencoded.substring(0, compareUntil) === text.substring(0, compareUntil);
        } catch {
            return false;
        }
    }

}
