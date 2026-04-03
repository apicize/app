import Box from '@mui/material/Box'
import { FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Stack } from '@mui/material'
import { NameValueEditor } from '../name-value-editor'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import FormatListBulletedAddIcon from '@mui/icons-material/FormatListBulletedAdd';
import { BodyType, BodyTypes } from '@apicize/lib-typescript'
import { observer } from 'mobx-react-lite'
import { useClipboard } from '../../../contexts/clipboard.context'
import { useFileOperations } from '../../../contexts/file-operations.context'
import { toJS } from 'mobx'
import { useWorkspace } from '../../../contexts/workspace.context'
import { ToastSeverity, useFeedback } from '../../../contexts/feedback.context'
import { useEffect, useRef, useState } from 'react'
import { DroppedFile, useFileDragDrop } from '../../../contexts/file-dragdrop.context'
import { GenerateIdentifier } from '../../../services/random-identifier-generator'
import { editor } from 'monaco-editor'
import MonacoEditor from 'react-monaco-editor'
import { useApicizeSettings } from '../../../contexts/apicize-settings.context'
import { EditableRequest } from '../../../models/workspace/editable-request'
import { RequestEditSessionType } from '../editor-types';
import { ImageViewer, KNOWN_IMAGE_EXTENSIONS } from '../../viewers/image-viewer';
import { EditorMode } from '../../../models/editor-mode';
import { IRequestEditorTextModel } from '../../../models/editor-text-model';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useMonacoClipboard } from '../../../hooks/use-monaco-clipboard';

const BODY_TYPE_MENU_ITEMS = BodyTypes.map(bodyType => (
  <MenuItem key={bodyType} value={bodyType}>{bodyType === BodyType.Raw ? 'Binary' : bodyType}</MenuItem>
))

interface RawEditorProps {
  bodyLength: number | null
  bodyMimeType: string | null
  data: string
  hasClipboardImage: boolean
  onOpenFile: () => void
  onPasteFromClipboard: () => void
}

const RawEditor = observer(({ bodyLength, bodyMimeType, data, hasClipboardImage, onOpenFile, onPasteFromClipboard }: RawEditorProps) => {
  let isImage: boolean
  let ext: string | undefined

  if (bodyMimeType?.startsWith('image/')) {
    ext = bodyMimeType.substring(6).toLocaleLowerCase()
    const idx = ext.indexOf('+')
    if (idx !== -1) {
      ext = ext.substring(0, idx)
    }
    isImage = KNOWN_IMAGE_EXTENSIONS.includes(ext)
  } else {
    isImage = false
  }

  return <Stack
    display='flex'
    direction='column'
    flexGrow={1}
    position='relative'
    boxSizing='border-box'
    width='100%'
    maxWidth='100%'
    height='100%'
    gap='10px'
  >
    <Stack
      direction='row'
      sx={{
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #444!important',
        width: 'fit-content',
      }}
    >
      <IconButton aria-label='load body from file' title='Load Body from File' onClick={onOpenFile} sx={{ marginRight: '4px' }}>
        <FileOpenIcon color='primary' />
      </IconButton>
      <IconButton aria-label='copy body from clipboard' title='Paste Body from Clipboard' disabled={!hasClipboardImage}
        onClick={onPasteFromClipboard} sx={{ marginRight: '4px' }}>
        <ContentPasteGoIcon color={hasClipboardImage ? 'primary' : 'disabled'} />
      </IconButton>
      <Stack direction='row' padding='10px' spacing='1rem'>
        <Box>{bodyLength ? bodyLength.toLocaleString() + ' Bytes' : ''}</Box>
        <Box>{bodyMimeType ? bodyMimeType : ''}</Box>
      </Stack>
    </Stack>
    {
      isImage
        ? <ImageViewer base64Data={data} extensionToRender={ext} />
        : null
    }
  </Stack>
})

export const RequestBodyEditor = observer(({ request }: { request: EditableRequest }) => {
  const workspace = useWorkspace()
  const clipboard = useClipboard()
  const settings = useApicizeSettings()
  const fileOps = useFileOperations()
  const feedback = useFeedback()
  const fileDragDrop = useFileDragDrop()

  useEffect(() => { workspace.nextHelpTopic = 'requests/body' }, [workspace])

  const refContainer = useRef<HTMLElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [model, setModel] = useState<IRequestEditorTextModel | null>(null)
  const editor = useRef<editor.IStandaloneCodeEditor | null>(null)

  // Hook Monaco clipboard to Tauri clipboard
  useMonacoClipboard(editor, false)

  // let [allowUpdateHeader, setAllowUpdateHeader] = useState(false)

  // Register dropdowns so they can be hidden on modal dialogs
  const [showBodyTypeMenu, setShowBodyTypeMenu] = useState(false)
  useEffect(() => {
    const disposer = feedback.registerModalBlocker(() => setShowBodyTypeMenu(false))
    return (() => {
      disposer()
    })
  }, [feedback])

  useEffect(() => {
    if (refContainer.current) {
      const unregisterDragDrop = fileDragDrop.register(refContainer, {
        onEnter: (_x, _y, _paths) => {
          setIsDragging(true)
        },
        onOver: (_x, _y) => {
          setIsDragging(true)
        },
        onLeave: () => {
          setIsDragging(false)
        },
        onDrop: (file: DroppedFile) => {
          setIsDragging(false)
          switch (file.type) {
            case 'binary':
              request.setBodyFromRawData(file.data).catch(e => feedback.toastError(e))
              break
            case 'text':
              switch (file.extension) {
                case 'json':
                  request.setBody({ type: BodyType.JSON, data: file.data }).catch(e => feedback.toastError(e))
                  break
                case 'xml':
                  request.setBody({ type: BodyType.XML, data: file.data }).catch(e => feedback.toastError(e))
                  break
                default:
                  request.setBody({ type: BodyType.Text, data: file.data }).catch(e => feedback.toastError(e))
              }
              break
          }
        }
      })

      return (() => {
        unregisterDragDrop()
      })
    }
  }, [feedback, fileDragDrop, refContainer, request])

  // Request body hasn't been retrieved yet, wait for it
  if (!request.isBodyInitialized) {
    return null
  }

  // If we are editing text, ensure we have a model
  if (request.bodyLanguage &&
    (!model
      ||
      (model.requestId !== request.id
        || model.type !== RequestEditSessionType.Body
        || model.getLanguageId() as EditorMode !== request.bodyLanguage
      ))) {
    setModel(workspace.getRequestEditModel(request, RequestEditSessionType.Body, request.bodyLanguage))
    return null
  }


  let allowUpdateHeader
  const contentTypeHeader = request.headers?.find(h => h.name === 'Content-Type')
  if (request.bodyMimeType) {
    if (contentTypeHeader && request.bodyMimeType.length > 0) {
      allowUpdateHeader = contentTypeHeader.value !== request.bodyMimeType
    } else {
      allowUpdateHeader = request.bodyMimeType.length !== 0
    }
  } else {
    allowUpdateHeader = false
  }

  const updateBodyType = (val: BodyType | string) => {
    const v = toJS(val)
    const newBodyType = (v == "" ? undefined : v as unknown as BodyType) ?? BodyType.Text
    request.setBodyType(newBodyType).catch(e => feedback.toastError(e))
  }

  function performBeautify() {
    if (editor.current) {
      try {
        const action = editor.current.getAction('editor.action.formatDocument')
        if (!action) throw new Error('Format action not found')
        action.run().catch(err => feedback.toastError(err))
      } catch (e) {
        feedback.toastError(e)
      }
    }
  }

  const updateTypeHeader = () => {
    if (!request.bodyMimeType) return
    let newHeaders = request.headers?.map(h => ({
      id: h.id,
      isNew: h.isNew,
      disabled: h.disabled,
      name: h.name,
      value: h.value
    }))
    const contentTypeHeader = newHeaders?.find(h => h.name === 'Content-Type')
    let action: string
    if (contentTypeHeader) {
      if (request.bodyMimeType.length === 0) {
        newHeaders = newHeaders?.filter(h => h.name !== 'Content-Type')
        action = 'Removed Content-Type Header'
      } else {
        contentTypeHeader.value = request.bodyMimeType
        action = 'Updated Content-Type Header'
      }
    } else {
      if (request.bodyMimeType.length > 0) {
        if (!newHeaders) {
          newHeaders = []
          action = ''
        } else {
          newHeaders.push({
            id: GenerateIdentifier(),
            isNew: true,
            disabled: undefined,
            name: 'Content-Type',
            value: request.bodyMimeType
          })
          action = 'AddedContent-Type Header'
        }
      }
    }
    // setAllowUpdateHeader(false)
    request.setHeaders(newHeaders)
      .then(() => { if (action.length > 0) feedback.toast(action, ToastSeverity.Info) })
      .catch(err => feedback.toastError(err))
  }

  const pasteImageFromClipboard = () => {
    workspace.updateRequestBodyFromClipboard(request.id)
      .then((bodyInfo) => {
        feedback.toast(`Image pasted from clipboard (${bodyInfo.bodyMimeType ?? '(No Type)'})`, ToastSeverity.Success)
      })
      .catch(err => feedback.toastError(err))
  }

  const openFile = () => {
    fileOps.openFile()
      .then(data => {
        if (data) {
          request.setBodyFromRawData(data).catch(e => feedback.toastError(e))
        }
      })
      .catch(e => feedback.toast(`Unable to open file - ${e}`, ToastSeverity.Error))
  }

  let allowCopy: boolean
  const allowBeautify = [BodyType.JSON, BodyType.XML].includes(request.body.type)
  switch (request.body.type) {
    case BodyType.Form:
    case BodyType.JSON:
    case BodyType.XML:
    case BodyType.Text:
    case BodyType.Raw:
      allowCopy = (request.body.data?.length ?? 0) > 0
      break
    default:
      allowCopy = false
  }

  return (
    <Box id='request-body-container' ref={refContainer} position='relative' width='100%' height='100%'>
      <Box top={0}
        left={0}
        width='100%'
        height='100%'
        position='absolute'
        display={isDragging ? 'block' : 'none'}
        className="MuiBackdrop-root MuiModal-backdrop"
        sx={{ zIndex: 99999, opacity: 0.5, transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms" }} />

      <Stack direction='column' spacing={3} position='relative' width='100%' height='100%'>
        <Grid container direction='row' display='flex' justifyContent='space-between' maxWidth='65em' paddingTop='0.5rem'>
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
                open={showBodyTypeMenu}
                onClose={() => setShowBodyTypeMenu(false)}
                onOpen={() => setShowBodyTypeMenu(true)}
                onChange={e => {
                  updateBodyType(e.target.value)
                }}
                aria-labelledby='request-body-type-label-id'
              >
                {BODY_TYPE_MENU_ITEMS}
              </Select>
            </FormControl>
            {
              allowCopy
                ? <IconButton
                  aria-label="copy data to clipboard"
                  title="Copy Data to Clipboard"
                  color='primary'
                  sx={{ marginLeft: '16px' }}
                  onClick={_ => {
                    workspace.copyToClipboard({
                      payloadType: 'RequestBody',
                      requestId: request.id,
                    }, 'Body').catch(err => feedback.toastError(err))
                  }}>
                  <ContentCopyIcon />
                </IconButton>
                : <></>
            }
          </Stack>
          <Grid container direction='row' spacing={2}>
            {
              allowBeautify
                ? <IconButton
                  aria-label='beautify body'
                  id='beautify-json-btn'
                  title='"Beautify" Body'
                  color='primary'
                  onClick={performBeautify}>
                  <AutoAwesomeIcon />
                </IconButton>
                : null
            }
            <IconButton
              aria-label='update content-type header'
              id='update-cnt-hdr-btn'
              title='Update Content-Type Header'
              disabled={!allowUpdateHeader}
              color='primary'
              onClick={updateTypeHeader}>
              <FormatListBulletedAddIcon />
            </IconButton>
          </Grid>
        </Grid>
        {request.body.type == BodyType.None
          ? <></>
          : request.body.type == BodyType.Form
            ? <NameValueEditor
              title='body form data'
              values={request.body.data}
              nameHeader='Name'
              valueHeader='Value'
              onUpdate={(data) => {
                request.setBodyData(data ?? []).catch(e => feedback.toastError(e))
              }} />
            : request.body.type == BodyType.Raw
              ? <RawEditor
                bodyLength={request.bodyLength}
                bodyMimeType={request.bodyMimeType}
                data={request.body.data}
                hasClipboardImage={clipboard.hasImage}
                onOpenFile={openFile}
                onPasteFromClipboard={pasteImageFromClipboard}
              />
              : <MonacoEditor
                language={request.bodyLanguage ?? undefined}
                width='100%'
                height='100%'
                theme={settings.colorScheme === "dark" ? 'vs-dark' : 'vs-light'}
                value={request.body.data}
                onChange={(text: string) => {
                  request.setBodyData(text).catch(e => feedback.toastError(e))
                }}
                editorDidMount={(me) => {
                  editor.current = me
                }}
                options={{
                  automaticLayout: true,
                  minimap: { enabled: false },
                  model,
                  detectIndentation: settings.editorDetectExistingIndent,
                  tabSize: settings.editorIndentSize,
                  autoIndent: 'full',
                  formatOnType: true,
                  formatOnPaste: true,
                  fontSize: settings.fontSize
                }}
              />
        }
      </Stack>
    </Box>
  )
})
