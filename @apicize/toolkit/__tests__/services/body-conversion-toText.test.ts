import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType } from '@apicize/lib-typescript';

describe('BodyConversion.toText', () => {
    it('returns the same object when source is already Text', () => {
        const body = { type: BodyType.Text as const, data: 'hello' };
        expect(new BodyConversion(body).toText()).toBe(body);
    });

    it('passes JSON data through as text unchanged', () => {
        const result = new BodyConversion({ type: BodyType.JSON, data: '{"a":1}' }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: '{"a":1}' });
    });

    it('passes XML data through as text unchanged', () => {
        const result = new BodyConversion({ type: BodyType.XML, data: '<root/>' }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: '<root/>' });
    });

    it('passes Raw data through as text unchanged', () => {
        const result = new BodyConversion({ type: BodyType.Raw, data: 'SGVsbG8=' }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: 'SGVsbG8=' });
    });

    it('returns empty string for None', () => {
        const result = new BodyConversion({ type: BodyType.None, data: undefined }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: '' });
    });

    it('returns empty string for empty JSON data', () => {
        const result = new BodyConversion({ type: BodyType.JSON, data: '' }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: '' });
    });

    it('converts Form pairs to comma-separated name=value string', () => {
        const result = new BodyConversion({
            type: BodyType.Form,
            data: [
                { name: 'key1', value: 'value1' },
                { name: 'key2', value: 'value2' },
            ],
        }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: 'key1=value1, key2=value2' });
    });

    it('converts single Form pair to name=value', () => {
        const result = new BodyConversion({
            type: BodyType.Form,
            data: [{ name: 'k', value: 'v' }],
        }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: 'k=v' });
    });

    it('returns empty string for empty Form data', () => {
        const result = new BodyConversion({ type: BodyType.Form, data: [] }).toText();
        expect(result).toEqual({ type: BodyType.Text, data: '' });
    });

    it('escapes the first comma in Form field names', () => {
        const result = new BodyConversion({
            type: BodyType.Form,
            data: [{ name: 'a,b', value: 'v' }],
        }).toText();
        expect(result.data).toContain('a\\,b=v');
    });

    it('escapes the first comma in Form field values', () => {
        const result = new BodyConversion({
            type: BodyType.Form,
            data: [{ name: 'k', value: 'x,y' }],
        }).toText();
        expect(result.data).toContain('k=x\\,y');
    });

    it('converts GraphQL to Text as JSON string', () => {
        const result = new BodyConversion({ type: BodyType.GraphQL as const, data: { query: '{ users { id } }' } }).toText();
        expect(result.type).toBe(BodyType.Text);
        expect(JSON.parse(result.data)).toEqual({ query: '{ users { id } }' });
    });
});
