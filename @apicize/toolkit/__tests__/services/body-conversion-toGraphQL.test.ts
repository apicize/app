import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType } from '@apicize/lib-typescript';

describe('BodyConversion.toGraphQL', () => {
    it('returns the same object when source is already GraphQL', async () => {
        const body = { type: BodyType.GraphQL as const, data: { query: '{ users { id } }' } };
        expect(await new BodyConversion(body).toGraphQL()).toBe(body);
    });

    it('returns empty query for None', async () => {
        const result = await new BodyConversion({ type: BodyType.None, data: undefined }).toGraphQL();
        expect(result).toEqual({ type: BodyType.GraphQL, data: { query: '' } });
    });

    it('returns empty query for Form', async () => {
        const result = await new BodyConversion({ type: BodyType.Form, data: [] }).toGraphQL();
        expect(result).toEqual({ type: BodyType.GraphQL, data: { query: '' } });
    });

    it('returns empty query for empty JSON', async () => {
        const result = await new BodyConversion({ type: BodyType.JSON, data: '' }).toGraphQL();
        expect(result).toEqual({ type: BodyType.GraphQL, data: { query: '' } });
    });

    it('returns empty query for empty XML', async () => {
        const result = await new BodyConversion({ type: BodyType.XML, data: '' }).toGraphQL();
        expect(result).toEqual({ type: BodyType.GraphQL, data: { query: '' } });
    });

    it('returns empty query for empty Text', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: '' }).toGraphQL();
        expect(result).toEqual({ type: BodyType.GraphQL, data: { query: '' } });
    });

    it('returns empty query for empty Raw', async () => {
        const result = await new BodyConversion({ type: BodyType.Raw, data: '' }).toGraphQL();
        expect(result).toEqual({ type: BodyType.GraphQL, data: { query: '' } });
    });

    it('converts JSON with query to GraphQL', async () => {
        const result = await new BodyConversion({ type: BodyType.JSON, data: '{"query":"{ users { id } }"}' }).toGraphQL();
        expect(result).toEqual({ type: BodyType.GraphQL, data: { query: '{ users { id } }' } });
    });

    it('converts JSON with extensions object to GraphQL storing extensions as string', async () => {
        const result = await new BodyConversion({
            type: BodyType.JSON,
            data: '{"query":"{ users { id } }","extensions":{"version":1}}',
        }).toGraphQL();
        expect(result.type).toBe(BodyType.GraphQL);
        expect(result.data.query).toBe('{ users { id } }');
        expect(result.data.extensions && JSON.parse(result.data.extensions)).toEqual({ version: 1 });
    });

    it('converts JSON without query field to GraphQL with empty query', async () => {
        const result = await new BodyConversion({ type: BodyType.JSON, data: '{}' }).toGraphQL();
        expect(result.type).toBe(BodyType.GraphQL);
        expect(result.data.query).toBe('');
    });

    it('converts XML with query field to GraphQL', async () => {
        const result = await new BodyConversion({
            type: BodyType.XML,
            data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root><query>{ users { id } }</query></root>',
        }).toGraphQL();
        expect(result.type).toBe(BodyType.GraphQL);
        expect(result.data.query).toBe('{ users { id } }');
    });

    it('converts Text containing JSON to GraphQL', async () => {
        const result = await new BodyConversion({
            type: BodyType.Text,
            data: '{"query":"{ users { id } }"',
        }).toGraphQL();
        expect(result.type).toBe(BodyType.GraphQL);
        expect(result.data.query).toBe('{"query":"{ users { id } }"');
    });

    it('converts Text containing a plain string to GraphQL using it as the query', async () => {
        const result = await new BodyConversion({ type: BodyType.Text, data: '{ users { id } }' }).toGraphQL();
        expect(result.type).toBe(BodyType.GraphQL);
        expect(result.data.query).toBe('{ users { id } }');
    });

    it('converts Raw (base64 of JSON) to GraphQL', async () => {
        const b64 = btoa('{"query":"{ users { id } }"');
        const result = await new BodyConversion({ type: BodyType.Raw, data: b64 }).toGraphQL();
        expect(result.type).toBe(BodyType.GraphQL);
        expect(result.data.query).toBe('{"query":"{ users { id } }"');
    });

    it('converts Raw (base64 of plain string) to GraphQL using it as the query', async () => {
        const b64 = btoa('{ users { id } }');
        const result = await new BodyConversion({ type: BodyType.Raw, data: b64 }).toGraphQL();
        expect(result.type).toBe(BodyType.GraphQL);
        expect(result.data.query).toBe('{ users { id } }');
    });
});
