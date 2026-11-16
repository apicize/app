import { MultipartFormItem } from "@apicize/lib-typescript";

/**
 * Used for editing multipart form body items
 */
export interface EditableMultipartFormItem extends MultipartFormItem {
    id: string;
}
