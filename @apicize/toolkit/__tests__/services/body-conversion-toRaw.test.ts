import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType } from '@apicize/lib-typescript';

describe('BodyConversion.toRaw', () => {
    it('returns the same object when source is already Raw', async () => {
        const body = { type: BodyType.Raw as const, data: 'SGVsbG8=' };
        expect(await new BodyConversion(body).toRaw()).toBe(body);
    });

    it('returns empty string for None', async () => {
        const result = await new BodyConversion({ type: BodyType.None, data: undefined }).toRaw();
        expect(result).toEqual({ type: BodyType.Raw, data: '' });
    });

    it('returns empty string for empty JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.JSON, data: '' }).toRaw();
        expect(result).toEqual({ type: BodyType.Raw, data: '' });
    });

    it('returns empty string for empty XML', async () => {
        const result = await new BodyConversion({ type: BodyType.XML, data: '' }).toRaw();
        expect(result).toEqual({ type: BodyType.Raw, data: '' });
    });

    it('returns empty string for empty Text', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: '' }).toRaw();
        expect(result).toEqual({ type: BodyType.Raw, data: '' });
    });

    it('base64-encodes plain text', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: 'Hello World' }).toRaw();
        expect(result.type).toBe(BodyType.Raw);
        expect(atob(result.data)).toBe('Hello World');
    });

    it('preserves text that is already valid base64', async () => {
        const b64 = 'SGVsbG8gV29ybGQ=';
        const result = await new BodyConversion({ type: BodyType.Text, data: b64 }).toRaw();
        expect(result.data).toBe(b64);
    });

    it('base64-encodes JSON string', async () => {
        const result = await new BodyConversion({ type: BodyType.JSON, data: '{"name":"test"}' }).toRaw();
        expect(result.type).toBe(BodyType.Raw);
        expect(atob(result.data)).toBe('{"name":"test"}');
    });

    it('base64-encodes XML string', async () => {
        const result = await new BodyConversion({ type: BodyType.XML, data: '<root><x>1</x></root>' }).toRaw();
        expect(result.type).toBe(BodyType.Raw);
        expect(atob(result.data)).toBe('<root><x>1</x></root>');
    });

    it('encodes Form as base64 JSON array', async () => {
        const result = await new BodyConversion({
            type: BodyType.Form,
            data: [
                { name: 'key1', value: 'value1' },
                { name: 'key2', value: 'value2' },
            ],
        }).toRaw();
        expect(result.type).toBe(BodyType.Raw);
        const parsed = JSON.parse(atob(result.data));
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(2);
        expect(parsed[0]).toHaveProperty('name', 'key1');
        expect(parsed[0]).toHaveProperty('value', 'value1');
    });

    it('encodes empty Form as base64 empty JSON array', async () => {
        const result = await new BodyConversion({ type: BodyType.Form, data: [] }).toRaw();
        expect(result.type).toBe(BodyType.Raw);
        expect(JSON.parse(atob(result.data))).toEqual([]);
    });

    it('preserves UTF-8 characters', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: 'Hello 世界 🌍' }).toRaw();
        const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
        expect(new TextDecoder().decode(bytes)).toBe('Hello 世界 🌍');
    });

    it('converts GraphQL to Raw as base64-encoded JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.GraphQL as const, data: { query: '{ users { id } }' } }).toRaw();
        expect(result.type).toBe(BodyType.Raw);
        expect(JSON.parse(atob(result.data))).toEqual({ query: '{ users { id } }' });
    });
});
