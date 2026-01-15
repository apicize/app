import { Body, BodyForm, BodyJSON, BodyNone, BodyRaw, BodyText, BodyType, BodyXML, NameValuePair } from "@apicize/lib-typescript";
import { EditableNameValuePair } from "../models/workspace/editable-name-value-pair";
import { GenerateIdentifier } from "./random-identifier-generator";
import { Parser, Builder } from 'xml2js'
import { base64Decode, base64Encode } from "./base64";

export class BodyConversion {
    public constructor(private readonly source: Body) { }

    /**
     * Convert body to destination type
     * @param destinationType 
     * @returns 
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
                return this.toText()
            case BodyType.None:
                return Promise.resolve(this.toNone())
            default:
                throw destinationType satisfies never
        }
    }

    /**
     * Output body as JSON
     * @returns Body object of type JSON
     */
    public async toJson(): Promise<BodyJSON> {
        const type = this.source.type
        switch (type) {
            case BodyType.JSON:
                return this.source
            case BodyType.Text:
                return {
                    type: BodyType.JSON,
                    data: JSON.stringify(await BodyConversion.parseText(this.source.data), undefined, '   ')
                }
            case BodyType.Form:
                return {
                    type: BodyType.JSON,
                    data: JSON.stringify(BodyConversion.parsePairData(this.source.data), undefined, '   ')
                }
            case BodyType.XML:
                return {
                    type: BodyType.JSON,
                    data: JSON.stringify(await BodyConversion.parseXml(this.source.data), undefined, '   ')
                }
            case BodyType.Raw:
                return {
                    type: BodyType.JSON,
                    data: JSON.stringify(await BodyConversion.parseText(this.source.data), undefined, '   ')
                }
            case BodyType.None:
                return {
                    type: BodyType.JSON,
                    data: ''
                }
            default:
                throw type satisfies never
        }
    }

    /**
     * Output body as XML
     * @returns Body object of type XML
     */
    public async toXML(): Promise<BodyXML> {
        const type = this.source.type
        switch (type) {
            case BodyType.XML:
                return this.source
            case BodyType.Text:
                return {
                    type: BodyType.XML,
                    data: (new Builder()).buildObject(await BodyConversion.parseText(this.source.data))
                }
            case BodyType.Form:
                return {
                    type: BodyType.XML,
                    data: (new Builder()).buildObject(BodyConversion.parsePairData(this.source.data))
                }
            case BodyType.JSON:
                return {
                    type: BodyType.XML,
                    data: (new Builder()).buildObject(JSON.parse(this.source.data))
                }
            case BodyType.Raw:
                return {
                    type: BodyType.XML,
                    data: (new Builder()).buildObject(await BodyConversion.parseText(this.source.data))
                }
            case BodyType.None:
                return {
                    type: BodyType.XML,
                    data: ''
                }
            default:
                throw type satisfies never
        }
    }

    /**
     * Output body as Text
     * @returns Body object of type Text
     */
    public async toText(): Promise<BodyText> {
        const type = this.source.type
        switch (type) {
            case BodyType.Text:
                return this.source
            case BodyType.JSON:
            case BodyType.XML:
            case BodyType.Raw:
                return {
                    type: BodyType.Text,
                    data: this.source.data
                }
            case BodyType.Form:
                return {
                    type: BodyType.Text,
                    data: this.source.data.map((nv) => `${nv.name.replace(',', '\\,')}=${nv.value.replace(',', '\\,')}`).join(', ')
                }
            case BodyType.None:
                return {
                    type: BodyType.Text,
                    data: ''
                }
            default:
                throw type satisfies never
        }
    }

    /**
     * Output body as Raw (Base64 Binary)
     * @returns Body object of type Raw
     */
    public async toRaw(): Promise<BodyRaw> {
        const type = this.source.type
        switch (type) {
            case BodyType.Raw:
                return this.source
            case BodyType.Text:
                return {
                    type: BodyType.Raw,
                    data: BodyConversion.isValidBase64(this.source.data)
                        ? this.source.data
                        : base64Encode((new TextEncoder()).encode(this.source.data))
                }
            case BodyType.JSON:
                const jsonData = JSON.parse(this.source.data)
                return {
                    type: BodyType.Raw,
                    data: BodyConversion.isValidBase64(jsonData)
                        ? jsonData
                        : base64Encode((new TextEncoder()).encode(this.source.data))
                }
            case BodyType.XML:
                const xmlData = await BodyConversion.parseXml(this.source.data)
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
                        JSON.stringify(BodyConversion.parsePairData(this.source.data))
                    ))
                }
            case BodyType.None:
                return {
                    type: BodyType.Raw,
                    data: ''
                }
            default:
                throw type satisfies never
        }
    }

    /**
     * Output body as Form
     * @returns Body object of type Form
     */
    public async toForm(): Promise<BodyForm> {
        const type = this.source.type
        switch (type) {
            case BodyType.Form:
                return this.source
            case BodyType.JSON:
            case BodyType.Text:
            case BodyType.XML:
                const obj = await BodyConversion.parseText(this.source.data)
                return {
                    type: BodyType.Form,
                    data: BodyConversion.parsePairData(obj)
                }
            case BodyType.Raw:
                const raw = await BodyConversion.parseText(this.source.data)
                return {
                    type: BodyType.Form,
                    data: BodyConversion.parsePairData(raw as unknown as NameValuePair[])
                }
            case BodyType.None:
                return {
                    type: BodyType.Form,
                    data: []
                }
            default:
                throw type satisfies never
        }
    }

    public toNone(): BodyNone {
        return {
            type: BodyType.None,
            data: undefined
        }
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
            } catch { }
        }
        // Try and parse as JSON
        try {
            return JSON.parse(source)
        } catch { }

        // Try and parse as XML
        try {
            return await BodyConversion.parseXml(source)
        } catch { }

        // Try and parse as Name-Value pairs
        try {
            const formResult = source.replaceAll('\\,', '\t\t').split(',').map(s => s.replaceAll('\t\t', ','))
            if (formResult.length > 0) {
                let ok = true
                let cleansed: NameValuePair[] = []
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
        } catch { }

        return source
    }

    private static async parseXml(source: string) {
        try {
            const xml = (await (new Parser({ explicitArray: false })).parseStringPromise(source))
            const keys = Object.keys(xml)
            if (keys.length > 0) {
                return keys[0] === 'root'
                    ? xml[keys[0]]
                    : xml
            } else {
                throw new Error('no root element')
            }
        } catch (e) {
            throw new Error(`Unable to parse as XML: ${e instanceof Error ? e.message : `${e}`}`)
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
     * Tests whether a string appears to be valid Base64 encoded data.
     * @param text The text to test
     * @returns true if the text appears to be valid Base64, false otherwise
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
            let reencoded = base64Encode(decoded)
            let lastPadChar1 = text.lastIndexOf('=')
            let lastPadChar2 = reencoded.lastIndexOf('=')

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