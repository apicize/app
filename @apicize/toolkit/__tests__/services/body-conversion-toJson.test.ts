import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType } from '@apicize/lib-typescript';

describe('BodyConversion.toJson', () => {
    it('returns the same object when source is already JSON', async () => {
        const body = { type: BodyType.JSON as const, data: '{"a":1}' };
        expect(await new BodyConversion(body).toJson()).toBe(body);
    });

    it('returns empty string for None', async () => {
        const result = await new BodyConversion({ type: BodyType.None, data: undefined }).toJson();
        expect(result).toEqual({ type: BodyType.JSON, data: '' });
    });

    it('returns empty string for empty XML', async () => {
        const result = await new BodyConversion({ type: BodyType.XML, data: '' }).toJson();
        expect(result).toEqual({ type: BodyType.JSON, data: '' });
    });

    it('returns empty string for empty Text', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: '' }).toJson();
        expect(result).toEqual({ type: BodyType.JSON, data: '' });
    });

    it('returns empty string for empty Raw', async () => {
        const result = await new BodyConversion({ type: BodyType.Raw, data: '' }).toJson();
        expect(result).toEqual({ type: BodyType.JSON, data: '' });
    });

    it('returns empty string for empty Form', async () => {
        const result = await new BodyConversion({ type: BodyType.Form, data: [] }).toJson();
        expect(result).toEqual({ type: BodyType.JSON, data: '' });
    });

    it('converts Text containing JSON to JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: '{"x":1}' }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        expect(JSON.parse(result.data)).toEqual({ x: 1 });
    });

    it('converts XML to JSON', async () => {
        const result = await new BodyConversion({
            type: BodyType.XML,
            data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root><name>test</name></root>',
        }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        expect(JSON.parse(result.data)).toEqual({ name: 'test' });
    });

    it('converts Form with unique names to JSON object without IDs', async () => {
        const result = await new BodyConversion({
            type: BodyType.Form,
            data: [
                { name: 'foo', value: 'bar' },
                { name: 'baz', value: 'qux' },
            ],
        }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        const parsed = JSON.parse(result.data);
        expect(parsed).toEqual({ foo: 'bar', baz: 'qux' });
        expect(parsed).not.toHaveProperty('id');
    });

    it('converts Form with duplicate names to JSON array values', async () => {
        const result = await new BodyConversion({
            type: BodyType.Form,
            data: [
                { name: 'foo', value: 'bar1' },
                { name: 'foo', value: 'bar2' },
                { name: 'baz', value: 'qux' },
            ],
        }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        const parsed = JSON.parse(result.data);
        expect(parsed.foo).toEqual(['bar1', 'bar2']);
        expect(parsed.baz).toBe('qux');
    });

    it('converts Raw containing JSON to JSON', async () => {
        const b64 = btoa('{"val":42}');
        const result = await new BodyConversion({ type: BodyType.Raw, data: b64 }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        expect(JSON.parse(result.data)).toEqual({ val: 42 });
    });

    it('converts GraphQL with query only to JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.GraphQL, data: { query: '{ users { id } }' } }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        expect(JSON.parse(result.data)).toEqual({ query: '{ users { id } }' });
    });

    it('converts GraphQL with JSON extensions to JSON with parsed extensions object', async () => {
        const result = await new BodyConversion({ type: BodyType.GraphQL, data: { query: '{ users { id } }', extensions: '{"version":1}' } }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        expect(JSON.parse(result.data)).toEqual({ query: '{ users { id } }', extensions: { version: 1 } });
    });

    it('converts GraphQL with empty query to JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.GraphQL, data: { query: '' } }).toJson();
        expect(result.type).toBe(BodyType.JSON);
        expect(JSON.parse(result.data)).toEqual({ query: '' });
    });
});
