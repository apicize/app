import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';

describe('BodyConversion helpers', () => {
    describe('isValidBase64', () => {
        it('returns false for empty string', () => {
            expect(BodyConversion['isValidBase64']('')).toBe(false);
        });

        it('returns false for null', () => {
            expect(BodyConversion['isValidBase64'](null as any)).toBe(false);
        });

        it('returns false for undefined', () => {
            expect(BodyConversion['isValidBase64'](undefined as any)).toBe(false);
        });

        it('returns true for valid base64', () => {
            expect(BodyConversion['isValidBase64']('SGVsbG8gV29ybGQ=')).toBe(true);
            expect(BodyConversion['isValidBase64']('VGVzdA==')).toBe(true);
            expect(BodyConversion['isValidBase64']('YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=')).toBe(true);
        });

        it('returns false for strings with invalid characters', () => {
            expect(BodyConversion['isValidBase64']('Invalid@Base64')).toBe(false);
            expect(BodyConversion['isValidBase64']('Hello World')).toBe(false);
        });

        it('returns false for strings with incorrect length', () => {
            expect(BodyConversion['isValidBase64']('SGVsb')).toBe(false);
        });

        it('returns false for strings with too much padding', () => {
            expect(BodyConversion['isValidBase64']('SGVsbG8===')).toBe(false);
        });

        it('returns true for base64-encoded binary data', () => {
            const binary = btoa(String.fromCharCode(0, 1, 2, 3, 255, 254, 128, 64, 32, 16, 8, 4, 2, 1, 0, 0));
            expect(BodyConversion['isValidBase64'](binary)).toBe(true);
        });
    });

    describe('parseText', () => {
        it('returns undefined for empty string', async () => {
            expect(await BodyConversion['parseText']('')).toBeUndefined();
        });

        it('returns undefined for null', async () => {
            expect(await BodyConversion['parseText'](null as any)).toBeUndefined();
        });

        it('returns undefined for undefined', async () => {
            expect(await BodyConversion['parseText'](undefined as any)).toBeUndefined();
        });

        it('parses valid JSON object', async () => {
            expect(await BodyConversion['parseText']('{"name":"John","age":30}')).toEqual({ name: 'John', age: 30 });
        });

        it('parses valid JSON array', async () => {
            expect(await BodyConversion['parseText']('[1,2,3]')).toEqual([1, 2, 3]);
        });

        it('parses valid XML', async () => {
            const result = await BodyConversion['parseText']('<root><name>John</name></root>');
            expect(result).toHaveProperty('name', 'John');
        });

        it('parses name-value pairs separated by commas', async () => {
            const result = await BodyConversion['parseText']('key1=value1,key2=value2');
            expect(result).toEqual([
                { name: 'key1', value: 'value1' },
                { name: 'key2', value: 'value2' },
            ]);
        });

        it('handles escaped commas in name-value pairs', async () => {
            const result = await BodyConversion['parseText']('key1=value1\\,a,key2=value2');
            expect(result).toEqual([
                { name: 'key1', value: 'value1,a' },
                { name: 'key2', value: 'value2' },
            ]);
        });

        it('handles escaped equals in name-value pairs', async () => {
            const result = await BodyConversion['parseText']('abc\\==123,def=456\\=');
            expect(result).toEqual([
                { name: 'abc=', value: '123' },
                { name: 'def', value: '456=' },
            ]);
        });

        it('returns string for plain text that cannot be parsed', async () => {
            const text = 'plain text that is not JSON or XML';
            expect(await BodyConversion['parseText'](text)).toEqual(text);
        });

        it('returns string for text with commas but no equals signs', async () => {
            const text = 'plain text, with commas, no equals';
            expect(await BodyConversion['parseText'](text)).toEqual(text);
        });

        it('decodes and parses base64-encoded JSON', async () => {
            // base64 of '{"name":"John","age":30}'
            const result = await BodyConversion['parseText']('eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9');
            expect(result).toEqual({ name: 'John', age: 30 });
        });

        it('returns base64 string when it decodes only to plain text', async () => {
            // base64 of 'Hello World'
            const b64 = 'SGVsbG8gV29ybGQ=';
            expect(await BodyConversion['parseText'](b64)).toEqual(b64);
        });
    });

    describe('formPairsToObject', () => {
        it('returns empty object for empty array', () => {
            expect(BodyConversion['formPairsToObject']([])).toEqual({});
        });

        it('converts unique name-value pairs to flat object', () => {
            const result = BodyConversion['formPairsToObject']([
                { name: 'foo', value: 'bar' },
                { name: 'baz', value: 'qux' },
            ]);
            expect(result).toEqual({ foo: 'bar', baz: 'qux' });
        });

        it('combines duplicate names into an array', () => {
            const result = BodyConversion['formPairsToObject']([
                { name: 'foo', value: 'bar1' },
                { name: 'foo', value: 'bar2' },
                { name: 'baz', value: 'qux' },
            ]);
            expect(result).toEqual({ foo: ['bar1', 'bar2'], baz: 'qux' });
        });

        it('accumulates three or more duplicates into array', () => {
            const result = BodyConversion['formPairsToObject']([
                { name: 'x', value: '1' },
                { name: 'x', value: '2' },
                { name: 'x', value: '3' },
            ]);
            expect(result).toEqual({ x: ['1', '2', '3'] });
        });

        it('skips entries with no name', () => {
            const result = BodyConversion['formPairsToObject']([
                { name: '', value: 'ignored' },
                { name: 'foo', value: 'bar' },
            ]);
            expect(result).toEqual({ foo: 'bar' });
        });

        it('treats undefined value as empty string', () => {
            const result = BodyConversion['formPairsToObject']([
                { name: 'foo', value: undefined as any },
            ]);
            expect(result).toEqual({ foo: '' });
        });

        it('does not include IDs in the output', () => {
            const result = BodyConversion['formPairsToObject']([
                { id: 'some-id', name: 'foo', value: 'bar' } as any,
            ]);
            expect(result).not.toHaveProperty('id');
            expect(result).toEqual({ foo: 'bar' });
        });
    });

    describe('objectToFormPairs', () => {
        it('returns empty array for null', () => {
            expect(BodyConversion['objectToFormPairs'](null)).toEqual([]);
        });

        it('returns empty array for undefined', () => {
            expect(BodyConversion['objectToFormPairs'](undefined)).toEqual([]);
        });

        it('returns empty array for non-object primitive', () => {
            expect(BodyConversion['objectToFormPairs']('string')).toEqual([]);
        });

        it('converts plain object to form pairs with generated IDs', () => {
            const result = BodyConversion['objectToFormPairs']({ foo: 'bar', baz: 'qux' });
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({ name: 'foo', value: 'bar' });
            expect(result[1]).toMatchObject({ name: 'baz', value: 'qux' });
            expect(result[0].id).toBeTruthy();
            expect(result[1].id).toBeTruthy();
        });

        it('expands array values to multiple entries with the same name', () => {
            const result = BodyConversion['objectToFormPairs']({ foo: ['bar1', 'bar2'], baz: 'qux' });
            const fooEntries = result.filter(p => p.name === 'foo');
            expect(fooEntries).toHaveLength(2);
            expect(fooEntries[0].value).toBe('bar1');
            expect(fooEntries[1].value).toBe('bar2');
            const bazEntries = result.filter(p => p.name === 'baz');
            expect(bazEntries).toHaveLength(1);
            expect(bazEntries[0].value).toBe('qux');
        });

        it('handles array input as name-value pairs', () => {
            const result = BodyConversion['objectToFormPairs']([
                { name: 'foo', value: 'bar' },
                { name: 'baz', value: 'qux' },
            ]);
            expect(result.map(p => ({ name: p.name, value: p.value }))).toEqual([
                { name: 'foo', value: 'bar' },
                { name: 'baz', value: 'qux' },
            ]);
        });

        it('filters out array items with no name and no value', () => {
            const result = BodyConversion['objectToFormPairs']([
                { name: '', value: '' },
                { name: 'foo', value: 'bar' },
            ]);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ name: 'foo', value: 'bar' });
        });

        it('stringifies nested object values', () => {
            const result = BodyConversion['objectToFormPairs']({ foo: { nested: true } });
            expect(result[0].value).toBe('{"nested":true}');
        });

        it('treats null property value as empty string', () => {
            const result = BodyConversion['objectToFormPairs']({ foo: null });
            expect(result[0]).toMatchObject({ name: 'foo', value: '' });
        });
    });
});
