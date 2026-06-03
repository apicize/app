// Roundtrip / integration tests for BodyConversion.
// Unit tests for individual methods live in body-conversion-<method>.test.ts files.
import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType } from '@apicize/lib-typescript';

describe('BodyConversion roundtrips', () => {
    const testBase64 = 'SGVsbG8gV29ybGQ=';
    const testJson = JSON.stringify({ quote: '{{test-quote}}' });
    const testXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root><author>{{author}}</author><quote>{{quote}}</quote></root>`;
    const testPairs = [{ name: 'foo1', value: 'bar1' }, { name: 'foo2', value: 'bar2' }];
    const stripWhite = (s: string) => s.replaceAll(/\s/g, '');

    it('Raw → Text → Raw', async () => {
        const asText = new BodyConversion({ type: BodyType.Raw, data: testBase64 }).toText();
        const asRaw = await new BodyConversion(asText).toRaw();
        expect(asRaw.data).toEqual(testBase64);
    });

    it('JSON → Text → JSON', async () => {
        const asText = new BodyConversion({ type: BodyType.JSON, data: testJson }).toText();
        const asJson = await new BodyConversion(asText).toJson();
        expect(stripWhite(asJson.data)).toEqual(stripWhite(testJson));
    });

    it('JSON → XML → JSON', async () => {
        const asXml = await new BodyConversion({ type: BodyType.JSON, data: testJson }).toXML();
        const asJson = await new BodyConversion(asXml).toJson();
        expect(stripWhite(asJson.data)).toEqual(stripWhite(testJson));
    });

    it('XML → Text → XML', async () => {
        const asText = new BodyConversion({ type: BodyType.XML, data: testXml }).toText();
        const asXml = await new BodyConversion(asText).toXML();
        expect(stripWhite(asXml.data)).toEqual(stripWhite(testXml));
    });

    it('JSON → XML → Text → JSON', async () => {
        const asXml = await new BodyConversion({ type: BodyType.JSON, data: testJson }).toXML();
        const asText = new BodyConversion(asXml).toText();
        const asJson = await new BodyConversion(asText).toJson();
        expect(stripWhite(asJson.data)).toEqual(stripWhite(testJson));
    });

    it('Form → Text → Form (unique names)', async () => {
        const asText = new BodyConversion({ type: BodyType.Form, data: testPairs }).toText();
        const asForm = await new BodyConversion(asText).toForm();
        expect(asForm.data.map(d => ({ name: d.name, value: d.value }))).toEqual(testPairs);
    });

    it('Form → JSON → Form (duplicate names preserved as arrays then re-expanded)', async () => {
        const pairs = [
            { name: 'foo', value: 'bar1' },
            { name: 'foo', value: 'bar2' },
            { name: 'baz', value: 'qux' },
        ];
        const asJson = await new BodyConversion({ type: BodyType.Form, data: pairs }).toJson();
        const asForm = await new BodyConversion(asJson).toForm();
        expect(asForm.data.map(d => ({ name: d.name, value: d.value }))).toEqual(pairs);
    });

    it('Form → XML → Form (duplicate names preserved as repeated elements then re-expanded)', async () => {
        const pairs = [
            { name: 'foo', value: 'bar1' },
            { name: 'foo', value: 'bar2' },
            { name: 'baz', value: 'qux' },
        ];
        const asXml = await new BodyConversion({ type: BodyType.Form, data: pairs }).toXML();
        const asForm = await new BodyConversion(asXml).toForm();
        expect(asForm.data.map(d => ({ name: d.name, value: d.value }))).toEqual(pairs);
    });

    it('GraphQL → JSON → GraphQL', async () => {
        const original = { type: BodyType.GraphQL as const, data: { query: '{ users { id name } }' } };
        const asJson = await new BodyConversion(original).toJson();
        const asGraphQL = await new BodyConversion(asJson).toGraphQL();
        expect(asGraphQL.data.query).toBe(original.data.query);
    });

    it('GraphQL → XML → GraphQL', async () => {
        const original = { type: BodyType.GraphQL as const, data: { query: '{ users { id name } }' } };
        const asXml = await new BodyConversion(original).toXML();
        const asGraphQL = await new BodyConversion(asXml).toGraphQL();
        expect(asGraphQL.data.query).toBe(original.data.query);
    });

    it('GraphQL → Text → GraphQL', async () => {
        const original = { type: BodyType.GraphQL as const, data: { query: '{ users { id name } }' } };
        const asText = new BodyConversion(original).toText();
        const asGraphQL = await new BodyConversion(asText).toGraphQL();
        expect(asGraphQL.data.query).toBe(original.data.query);
    });
});
