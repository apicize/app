import { observer } from 'mobx-react-lite'
import { BodyType } from '@apicize/lib-typescript';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Grid from '@mui/material/Grid';
import MonacoEditor from 'react-monaco-editor';
import { editor } from 'monaco-editor';
import { useApicizeSettings } from '../../../../contexts/apicize-settings.context';
import { useMonacoClipboard } from '../../../../hooks/use-monaco-clipboard';
import { useFeedback } from '../../../../contexts/feedback.context';
import { Box, useTheme } from '@mui/material';
import { EditableRequest } from '../../../../models/workspace/editable-request';
import { runInAction } from 'mobx';
import { useWorkspace } from '../../../../contexts/workspace.context';

export interface GraphQLBodyEditorHandle {
    performBeautify: () => void
}

export const GraphQLBodyEditor = observer(forwardRef<GraphQLBodyEditorHandle, { request: EditableRequest }>(({ request }, ref) => {

    const workspace = useWorkspace()
    const feedback = useFeedback()
    const theme = useTheme()
    const settings = useApicizeSettings()
    const colorTheme = settings.colorScheme === 'dark' ? 'vs-dark' : 'vs-light'

    const queryEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    useMonacoClipboard(queryEditorRef, false)

    const extensionsEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    useMonacoClipboard(extensionsEditorRef, false)

    const [queryFocused, setQueryFocused] = useState(false)
    const [extensionsFocused, setExtensionsFocused] = useState(false)

    useEffect(() => { workspace.nextHelpTopic = 'requests/headers' }, [workspace])

    useImperativeHandle(ref, () => ({
        performBeautify() {
            if (queryEditorRef.current) {
                const action = queryEditorRef.current.getAction('editor.action.formatDocument')
                if (action) {
                    action.run().catch(err => feedback.toastError(err))
                }
            }
            if (extensionsEditorRef.current) {
                const action = extensionsEditorRef.current.getAction('editor.action.formatDocument')
                if (!action) return
                action.run().catch(err => feedback.toastError(err))
            }
        }
    }), [feedback])

    const data = request.body.type === BodyType.GraphQL ? request.body.data : undefined
    if (!data) {
        return null
    }

    const saveGraphQL = () => {
        request.setBodyData({
            query: data.query,
            extensions: (data.extensions?.length ?? 0 > 0) ? data.extensions : undefined,
        }).catch(e => feedback.toastError(e))
    }

    const updateQuery = (value: string) => {
        runInAction(() => {
            data.query = value
            saveGraphQL()

        })
    }

    const updateExtensions = (value: string) => {
        runInAction(() => {
            data.extensions = value.length > 0 ? value : undefined
            saveGraphQL()
        })
    }

    return <Grid container display='flex' direction='column' flexGrow={1} gap={2}>
        <Grid container component='fieldset' display='flex' direction='column'
            flex={3} border={2} padding='0.5em' sx={{ borderColor: queryFocused ? theme.palette.primary.main : theme.palette.divider }}>
            <Box component='legend' sx={{ color: queryFocused ? theme.palette.primary.main : theme.palette.text.secondary }}><label style={{ padding: '0 0.5rem' }}>GraphQL Query</label></Box>
            <Grid flex={1}>
                <MonacoEditor
                    language='graphql'
                    theme={colorTheme}
                    value={data.query}
                    onChange={updateQuery}
                    editorDidMount={me => {
                        queryEditorRef.current = me
                        me.onDidFocusEditorWidget(() => setQueryFocused(true))
                        me.onDidBlurEditorWidget(() => setQueryFocused(false))
                    }}
                    options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        detectIndentation: settings.editorDetectExistingIndent,
                        tabSize: settings.editorIndentSize,
                        folding: true,
                        formatOnType: true,
                        formatOnPaste: true,
                        fontSize: settings.fontSize
                    }}
                />
            </Grid>
        </Grid>
        <Grid container component='fieldset' display='flex' direction='column' flex={1} border={2} padding='0.5em' sx={{ borderColor: extensionsFocused ? theme.palette.primary.main : theme.palette.divider }}>
            <Box component='legend' sx={{ color: extensionsFocused ? theme.palette.primary.main : theme.palette.text.secondary }}><label style={{ padding: '0 0.5rem' }}>GraphQL Extensions (Optional)</label></Box>
            <Grid flex={1}>
                <MonacoEditor
                    language='json'
                    theme={colorTheme}
                    value={data.extensions ?? ''}
                    onChange={updateExtensions}
                    editorDidMount={me => {
                        extensionsEditorRef.current = me
                        me.onDidFocusEditorWidget(() => setExtensionsFocused(true))
                        me.onDidBlurEditorWidget(() => setExtensionsFocused(false))
                    }}
                    options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        detectIndentation: settings.editorDetectExistingIndent,
                        tabSize: settings.editorIndentSize,
                        folding: true,
                        formatOnType: true,
                        formatOnPaste: true,
                        fontSize: settings.fontSize
                    }}
                />
            </Grid>
        </Grid>
    </Grid>

}))