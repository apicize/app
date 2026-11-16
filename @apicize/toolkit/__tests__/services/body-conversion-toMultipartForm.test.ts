import { describe, it, expect } from 'vitest';
import { BodyConversion } from '../../src/services/body-conversion';
import { BodyType, MultipartFormItemType } from '@apicize/lib-typescript';

const multipart = {
    type: BodyType.MultipartForm as const,
    data: [
        { name: 'note', value: 'hello' },
        { name: 'upload', type: MultipartFormItemType.File, fileName: 'hello.txt', data: 'aGVsbG8=' },
    ],
};

describe('BodyConversion.toMultipartForm', () => {
    it('returns the same object when source is already MultipartForm', async () => {
        expect(await new BodyConversion(multipart).toMultipartForm()).toBe(multipart);
    });

    it('returns empty array for None', async () => {
        const result = await new BodyConversion({ type: BodyType.None, data: undefined }).toMultipartForm();
        expect(result).toEqual({ type: BodyType.MultipartForm, data: [] });
    });

    it('converts Form pairs to Text items', async () => {
        const result = await new BodyConversion({
            type: BodyType.Form,
            data: [{ name: 'a', value: 'b', disabled: true }],
        }).toMultipartForm();
        expect(result).toEqual({
            type: BodyType.MultipartForm,
            data: [{ name: 'a', value: 'b', disabled: true }],
        });
    });

    it('converts flat JSON object to Text items', async () => {
        const result = await new BodyConversion({
            type: BodyType.JSON,
            data: '{"foo":"bar"}',
        }).toMultipartForm();
        expect(result.data.map(i => ({ name: i.name, value: i.value }))).toEqual([
            { name: 'foo', value: 'bar' },
        ]);
    });

    it('is selected by convert', async () => {
        const result = await new BodyConversion({ type: BodyType.Form, data: [] }).convert(BodyType.MultipartForm);
        expect(result.type).toBe(BodyType.MultipartForm);
    });
});

describe('BodyConversion from MultipartForm', () => {
    it('converts Text items to Form and drops File items', async () => {
        const result = await new BodyConversion(multipart).toForm();
        expect(result.type).toBe(BodyType.Form);
        expect(result.data.map(p => ({ name: p.name, value: p.value }))).toEqual([
            { name: 'note', value: 'hello' },
        ]);
    });

    it('converts Text items to JSON', async () => {
        const result = await new BodyConversion(multipart).toJson();
        expect(JSON.parse(result.data)).toEqual({ note: 'hello' });
    });

    it('converts Text items to Text', () => {
        expect(new BodyConversion(multipart).toText()).toEqual({ type: BodyType.Text, data: 'note=hello' });
    });

    it('converts to empty GraphQL', async () => {
        expect(await new BodyConversion(multipart).toGraphQL()).toEqual({ type: BodyType.GraphQL, data: { query: '' } });
    });
});

describe('BodyConversion multipart file retention', () => {
    const fileA = { name: 'a', type: MultipartFormItemType.File, fileName: 'a.txt', data: 'YQ==' };
    const fileB = { name: 'b', type: MultipartFormItemType.File, fileName: 'b.txt', data: 'Yg==', disabled: true };
    const source = {
        type: BodyType.MultipartForm as const,
        data: [fileA, { name: 'x', value: '1' }, fileB, { name: 'y', value: '2' }],
    };

    it('extracts File items with their positions', () => {
        expect(BodyConversion.extractMultipartFiles(source)).toEqual([
            { index: 0, item: fileA },
            { index: 2, item: fileB },
        ]);
    });

    it('round trips through Form retaining File items and positions', async () => {
        const files = BodyConversion.extractMultipartFiles(source);
        const form = await new BodyConversion(source).toForm();
        const multipart = await new BodyConversion(form).toMultipartForm();
        expect(BodyConversion.restoreMultipartFiles(multipart, files).data).toEqual([
            fileA, { name: 'x', value: '1', disabled: undefined }, fileB, { name: 'y', value: '2', disabled: undefined },
        ]);
    });

    it('appends File items when Form items were removed', () => {
        const files = BodyConversion.extractMultipartFiles(source);
        const restored = BodyConversion.restoreMultipartFiles({ type: BodyType.MultipartForm, data: [] }, files);
        expect(restored.data).toEqual([fileA, fileB]);
    });
});
