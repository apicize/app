import Box from '@mui/material/Box'
import { Button, FormControl, Grid2, IconButton, InputLabel, MenuItem, Select, Stack } from '@mui/material'
import { GenerateIdentifier } from '../../../services/random-identifier-generator'
import { EditableNameValuePair } from '../../../models/workspace/editable-name-value-pair'
import { NameValueEditor } from '../name-value-editor'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import { BodyType, BodyTypes } from '@apicize/lib-typescript'
import { EditableEntityType } from '../../../models/workspace/editable-entity-type'
import { EditableRequest } from '../../../models/workspace/editable-request'
import { observer } from 'mobx-react-lite'
import { useClipboard } from '../../../contexts/clipboard.context'
import { useFileOperations } from '../../../contexts/file-operations.context'
import { toJS } from 'mobx'
import { useWorkspace } from '../../../contexts/workspace.context'
import { ToastSeverity, useFeedback } from '../../../contexts/feedback.context'
import { RichEditor, RichEditorCommands } from '../rich-editor'
import { useRef, useState } from 'react'
import { EditorMode } from '../../../models/editor-mode'

export const RequestBodyEditor = observer(() => {
  const workspace = useWorkspace()
  const clipboard = useClipboard()
  const fileOps = useFileOperations()
  const feedback = useFeedback()

  // const editorRef = React.createRef<AceEditor>()
  const refCommands = useRef<RichEditorCommands>(null)

  if (workspace.active?.entityType !== EditableEntityType.Request) {
    return null
  }

  workspace.nextHelpTopic = 'requests/body'
  const request = workspace.active as EditableRequest

  const headerDoesNotMatchType = (bodyType: BodyType | undefined | null) => {
    let needsContextHeaderUpdate = true
    let mimeType = getBodyTypeMimeType(bodyType)
    const contentTypeHeader = request.headers?.find(h => h.name === 'Content-Type')
    if (contentTypeHeader) {
      needsContextHeaderUpdate = contentTypeHeader.value !== mimeType
    } else {
      needsContextHeaderUpdate = mimeType.length !== 0
    }
    return needsContextHeaderUpdate
  }

  const getBodyTypeMimeType = (bodyType: BodyType | undefined | null) => {
    switch (bodyType) {
      case BodyType.None:
        return ''
      case BodyType.JSON:
        return 'application/json'
      case BodyType.XML:
        return 'application/xml'
      case BodyType.Text:
        return 'text/plain'
      case BodyType.Form:
        return 'application/x-www-form-urlencoded'
      default:
        return 'application/octet-stream'
    }
  }

  const getBodyTypeEditorMode = (bodyType: BodyType | undefined | null) => {
    switch (bodyType) {
      case BodyType.JSON:
        return EditorMode.json
      case BodyType.XML:
        return EditorMode.xml
      case BodyType.Text:
        return EditorMode.txt
      default:
        return undefined
    }
  }

  const [allowUpdateHeader, setAllowUpdateHeader] = useState<boolean>(headerDoesNotMatchType(request.body.type))
  const [editorMode, setEditorMode] = useState(getBodyTypeEditorMode(request.body.type))

  const updateBodyType = (val: BodyType | string) => {
    const v = toJS(val)
    const newBodyType = (v == "" ? undefined : v as unknown as BodyType) ?? BodyType.Text
    workspace.setRequestBodyType(newBodyType)
    setEditorMode(getBodyTypeEditorMode(newBodyType))
    setAllowUpdateHeader(headerDoesNotMatchType(newBodyType))
  }

  function performBeautify() {
    if (refCommands.current) {
      refCommands.current.beautify()
    }
  }

  const updateBodyAsText = (data: string | undefined) => {
    workspace.setRequestBodyData(data ?? '')
  }

  const updateBodyAsFormData = (data: EditableNameValuePair[] | undefined) => {
    workspace.setRequestBodyData(data ?? [])
  }

  const updateTypeHeader = () => {
    const mimeType = getBodyTypeMimeType(request.body.type)
    let newHeaders = request.headers ? toJS(request.headers) : []
    const contentTypeHeader = newHeaders.find(h => h.name === 'Content-Type')
    if (contentTypeHeader) {
      if (mimeType.length === 0) {
        newHeaders = newHeaders.filter(h => h.name !== 'Content-Type')
      } else {
        contentTypeHeader.value = mimeType

      }
    } else {
      if (mimeType.length > 0) {
        newHeaders.push({
          id: GenerateIdentifier(),
          name: 'Content-Type',
          value: mimeType
        })
      }
    }
    setAllowUpdateHeader(false)
    workspace.setRequestHeaders(newHeaders)
  }

  const bodyTypeMenuItems = () => {
    return BodyTypes.map(bodyType => (
      <MenuItem key={bodyType} value={bodyType}>{bodyType}</MenuItem>
    ))
  }

  const pasteImageFromClipboard = async () => {
    try {
      const data = await clipboard.getClipboardImage()
      workspace.setRequestBody({ type: BodyType.Raw, data })
      feedback.toast('Image pasted from clipboard', ToastSeverity.Success)
    } catch (e) {
      feedback.toast(`Unable to access clipboard image - ${e}`, ToastSeverity.Error)
    }
  }

  const openFile = async () => {
    try {
      const data = await fileOps.openFile()
      if (!data) return
      workspace.setRequestBody({ type: BodyType.Raw, data })
    } catch (e) {
      feedback.toast(`Unable to open file - ${e}`, ToastSeverity.Error)
    }
  }

  let mode
  let allowCopy: boolean
  switch (request.body.type) {
    case BodyType.Form:
      allowCopy = request.body.data.length > 0
      break
    case BodyType.JSON:
      mode = 'json'
      allowCopy = request.body.data.length > 0
      break
    case BodyType.XML:
      mode = 'xml'
      allowCopy = request.body.data.length > 0
      break
    case BodyType.Text:
      allowCopy = request.body.data.length > 0
      break
    default:
      allowCopy = false
  }

  const copyToClipboard = async () => {
    switch (request.body.type) {
      case BodyType.Form:
        await clipboard.writeTextToClipboard(
          [...request.body.data.values()].map(pair => `${pair.name}=${pair.value}`).join('\n'))
        break
      case BodyType.JSON:
      case BodyType.XML:
      case BodyType.Text:
        await clipboard.writeTextToClipboard(request.body.data)
        break
    }
  }

  return (
    <Grid2 container direction='column' spacing={3} position='relative' width='100%' height='100%'>
      <Grid2 container direction='row' display='flex' justifyContent='space-between'>
        <Stack direction='row'>
          <FormControl>
            <InputLabel id='request-body-type-label-id'>Body Content Type</InputLabel>
            <Select
              labelId='request-method-label-id'
              id="request-method"
              value={request.body.type}
              label="Body Content Type"
              sx={{
                width: "10em"
              }}
              size='small'
              onChange={e => updateBodyType(e.target.value)}
              aria-labelledby='request-body-type-label-id'
            >
              {bodyTypeMenuItems()}
            </Select>
          </FormControl>
          {
            allowCopy
              ? <IconButton
                aria-label="copy data to clipboard"
                title="Copy Data to Clipboard"
                color='primary'
                sx={{ marginLeft: '16px' }}
                onClick={_ => copyToClipboard()}>
                <ContentCopyIcon />
              </IconButton>
              : <></>
          }
        </Stack>
        <Grid2 container direction='row' spacing={2}>
          <Button variant='outlined' size='small' disabled={![BodyType.JSON, BodyType.XML].includes(request.body.type)} onClick={performBeautify}>Beautify</Button>
          <Button variant='outlined' size='small' disabled={!allowUpdateHeader} onClick={updateTypeHeader}>Update Content-Type Header</Button>
        </Grid2>
      </Grid2>
      {request.body.type == BodyType.None
        ? <></>
        : request.body.type == BodyType.Form
          ? <NameValueEditor
            title='body form data'
            values={request.body.data as EditableNameValuePair[]}
            nameHeader='Name'
            valueHeader='Value'
            onUpdate={updateBodyAsFormData} />
          : request.body.type == BodyType.Raw
            ? <Stack
              direction='row'
              sx={{
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #444!important',
                width: 'fit-content',
              }}
            >
              <IconButton aria-label='load body from file' title='Load Body from File' onClick={() => openFile()} sx={{ marginRight: '4px' }}>
                <FileOpenIcon color='primary' />
              </IconButton>
              <IconButton aria-label='copy body from clipboard' title='Paste Body from Clipboard' disabled={!clipboard.hasImage}
                onClick={() => pasteImageFromClipboard()} sx={{ marginRight: '4px' }}>
                <ContentPasteGoIcon color='primary' />
              </IconButton>
              <Box padding='10px'>{request.body.data ? request.body.data.length.toLocaleString() + ' Bytes' : '(None)'}</Box>
            </Stack>
            :
            <Grid2 flexGrow={1}>
              <RichEditor
                sx={{ width: '100%', height: '100%' }}
                ref={refCommands}
                entity={request}
                mode={editorMode}
                onGetValue={() => request.body.data as string}
                onUpdateValue={updateBodyAsText}
              />
            </Grid2>
      }
    </Grid2>
  )
})
