import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType } from '@apicize/lib-typescript';

describe('BodyConversion.toXML', () => {
    it('returns the same object when source is already XML', async () => {
        const body = { type: BodyType.XML as const, data: '<root/>' };
        expect(await new BodyConversion(body).toXML()).toBe(body);
    });

    it('returns empty string for None', async () => {
        const result = await new BodyConversion({ type: BodyType.None, data: undefined }).toXML();
        expect(result).toEqual({ type: BodyType.XML, data: '' });
    });

    it('returns empty string for empty JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.JSON, data: '' }).toXML();
        expect(result).toEqual({ type: BodyType.XML, data: '' });
    });

    it('returns empty string for empty Text', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: '' }).toXML();
        expect(result).toEqual({ type: BodyType.XML, data: '' });
    });

    it('returns empty string for empty Raw', async () => {
        const result = await new BodyConversion({ type: BodyType.XML, data: '' }).toXML();
        expect(result).toEqual({ type: BodyType.XML, data: '' });
    });

    it('returns empty string for empty Form', async () => {
        const result = await new BodyConversion({ type: BodyType.Form, data: [] }).toXML();
        expect(result).toEqual({ type: BodyType.XML, data: '' });
    });

    it('converts JSON to XML', async () => {
        const result = await new BodyConversion({
            type: BodyType.JSON,
            data: '{"root":{"item":"value"}}',
        }).toXML();
        expect(result.type).toBe(BodyType.XML);
        expect(result.data).toContain('<item>value</item>');
    });

    it('converts JSON with nested objects to XML', async () => {
        const result = await new BodyConversion({
            type: BodyType.JSON,
            data: '{"root":{"child1":"a","child2":"b"}}',
        }).toXML();
        expect(result.type).toBe(BodyType.XML);
        expect(result.data).toContain('<child1>a</child1>');
        expect(result.data).toContain('<child2>b</child2>');
    });

    it('converts Text containing JSON to XML', async () => {
        const result = await new BodyConversion({
            type: BodyType.Text,
            data: '{"name":"test"}',
        }).toXML();
        expect(result.type).toBe(BodyType.XML);
        expect(typeof result.data).toBe('string');
    });

    it('converts Form with unique names to XML', async () => {
        const result = await new BodyConversion({
            type: BodyType.Form,
            data: [
                { name: 'key1', value: 'value1' },
                { name: 'key2', value: 'value2' },
            ],
        }).toXML();
        expect(result.type).toBe(BodyType.XML);
        expect(result.data).toContain('key1');
        expect(result.data).toContain('value1');
    });

    it('converts Form with duplicate names to repeated XML elements', async () => {
        const result = await new BodyConversion({
            type: BodyType.Form,
            data: [
                { name: 'foo', value: 'bar1' },
                { name: 'foo', value: 'bar2' },
            ],
        }).toXML();
        expect(result.type).toBe(BodyType.XML);
        const matches = result.data.match(/<foo>/g);
        expect(matches).toHaveLength(2);
    });

    it('converts Form without including IDs in XML', async () => {
        const result = await new BodyConversion({
            type: BodyType.Form,
            data: [{ id: 'abc', name: 'key', value: 'val' } as any],
        }).toXML();
        expect(result.data).not.toContain('<id>');
    });

    it('converts Raw containing XML back to XML type', async () => {
        const result = await new BodyConversion({
            type: BodyType.Raw,
            data: 'PHJvb3Q+PHg+MTwveD48L3Jvb3Q+',
        }).toXML();
        expect(result.type).toBe(BodyType.XML);
        expect(typeof result.data).toBe('string');
    });

    it('converts GraphQL with query only to XML', async () => {
        const result = await new BodyConversion({ type: BodyType.GraphQL, data: { query: '{ users { id } }' } }).toXML();
        expect(result.type).toBe(BodyType.XML);
        expect(result.data).toContain('<query>');
    });
});
