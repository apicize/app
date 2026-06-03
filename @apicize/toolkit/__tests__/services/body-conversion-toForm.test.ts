import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType } from '@apicize/lib-typescript';

describe('BodyConversion.toForm', () => {
    it('returns the same object when source is already Form', async () => {
        const body = { type: BodyType.Form as const, data: [{ name: 'a', value: 'b' }] };
        expect(await new BodyConversion(body).toForm()).toBe(body);
    });

    it('returns empty array for None', async () => {
        const result = await new BodyConversion({ type: BodyType.None, data: undefined }).toForm();
        expect(result).toEqual({ type: BodyType.Form, data: [] });
    });

    it('returns empty array for empty JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.JSON, data: '' }).toForm();
        expect(result).toEqual({ type: BodyType.Form, data: [] });
    });

    it('returns empty array for empty XML', async () => {
        const result = await new BodyConversion({ type: BodyType.XML, data: '' }).toForm();
        expect(result).toEqual({ type: BodyType.Form, data: [] });
    });

    it('returns empty array for empty Text', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: '' }).toForm();
        expect(result).toEqual({ type: BodyType.Form, data: [] });
    });

    it('returns empty array for empty Raw', async () => {
        const result = await new BodyConversion({ type: BodyType.Raw, data: '' }).toForm();
        expect(result).toEqual({ type: BodyType.Form, data: [] });
    });

    it('returns empty array for plain-text that cannot become pairs', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: 'just a string' }).toForm();
        expect(result).toEqual({ type: BodyType.Form, data: [] });
    });

    it('converts flat JSON object to form pairs with IDs', async () => {
        const result = await new BodyConversion({
            type: BodyType.JSON,
            data: '{"foo":"bar","baz":"qux"}',
        }).toForm();
        expect(result.type).toBe(BodyType.Form);
        expect(result.data.map(p => ({ name: p.name, value: p.value }))).toEqual([
            { name: 'foo', value: 'bar' },
            { name: 'baz', value: 'qux' },
        ]);
        expect(result.data[0].id).toBeTruthy();
    });

    it('expands JSON array values to multiple form entries', async () => {
        const result = await new BodyConversion({
            type: BodyType.JSON,
            data: '{"foo":["bar1","bar2"],"baz":"qux"}',
        }).toForm();
        expect(result.type).toBe(BodyType.Form);
        const fooEntries = result.data.filter(p => p.name === 'foo');
        expect(fooEntries).toHaveLength(2);
        expect(fooEntries[0].value).toBe('bar1');
        expect(fooEntries[1].value).toBe('bar2');
        const bazEntries = result.data.filter(p => p.name === 'baz');
        expect(bazEntries).toHaveLength(1);
        expect(bazEntries[0].value).toBe('qux');
    });

    it('converts XML to form pairs', async () => {
        const result = await new BodyConversion({
            type: BodyType.XML,
            data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root><foo>bar</foo><baz>qux</baz></root>',
        }).toForm();
        expect(result.type).toBe(BodyType.Form);
        expect(result.data.map(p => ({ name: p.name, value: p.value }))).toEqual([
            { name: 'foo', value: 'bar' },
            { name: 'baz', value: 'qux' },
        ]);
    });

    it('expands repeated XML elements to multiple form entries', async () => {
        const result = await new BodyConversion({
            type: BodyType.XML,
            data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root><foo>bar1</foo><foo>bar2</foo></root>',
        }).toForm();
        expect(result.type).toBe(BodyType.Form);
        const fooEntries = result.data.filter(p => p.name === 'foo');
        expect(fooEntries).toHaveLength(2);
        expect(fooEntries.map(p => p.value)).toEqual(['bar1', 'bar2']);
    });

    it('converts Text name-value pairs to form pairs', async () => {
        const result = await new BodyConversion({
            type: BodyType.Text,
            data: 'key1=value1, key2=value2',
        }).toForm();
        expect(result.type).toBe(BodyType.Form);
        expect(result.data.map(p => ({ name: p.name, value: p.value }))).toEqual([
            { name: 'key1', value: 'value1' },
            { name: 'key2', value: 'value2' },
        ]);
    });

    it('converts Raw name-value pairs to form pairs', async () => {
        const b64 = btoa('key1=value1, key2=value2');
        const result = await new BodyConversion({ type: BodyType.Raw, data: b64 }).toForm();
        expect(result.type).toBe(BodyType.Form);
        expect(result.data.map(p => ({ name: p.name, value: p.value }))).toEqual([
            { name: 'key1', value: 'value1' },
            { name: 'key2', value: 'value2' },
        ]);
    });

    it('returns empty array for GraphQL', async () => {
        const result = await new BodyConversion({ type: BodyType.GraphQL as const, data: { query: '{ users { id } }' } }).toForm();
        expect(result).toEqual({ type: BodyType.Form, data: [] });
    });
});
