import { editor } from "monaco-editor";
import { ExecutionResultDetail } from "@apicize/lib-typescript";
import { RequestEditSessionType, ResultEditSessionType } from "../controls/editors/editor-types";

export interface IRequestEditorTextModel extends editor.ITextModel {
    requestId: string
    type: RequestEditSessionType
}

export interface IResultEditorTextModel extends editor.ITextModel {
    resultId: string
    execCtr: number
    type: ResultEditSessionType
    // Detail the text was generated from, used to detect when it needs regenerating
    source: ExecutionResultDetail
    // Formatting settings the text was generated with
    formatKey: string
}

export interface IDataSetEditorTextModel extends editor.ITextModel {
    dataSetId: string
}