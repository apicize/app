import { editor } from "monaco-editor";
import { RequestEditSessionType, ResultEditSessionType } from "../controls/editors/editor-types";

export interface IRequestEditorTextModel extends editor.ITextModel {
    requestId: string
    type: RequestEditSessionType
}

export interface IResultEditorTextModel extends editor.ITextModel {
    resultId: string
    execCtr: number
    type: ResultEditSessionType

}