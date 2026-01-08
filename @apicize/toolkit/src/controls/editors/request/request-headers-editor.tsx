import { NameValueEditor } from '../name-value-editor'
import { observer } from 'mobx-react-lite'
import { Box } from '@mui/material'
import { useWorkspace } from '../../../contexts/workspace.context'
import { EditableRequest } from '../../../models/workspace/editable-request'

export const RequestHeadersEditor = observer(({ request }: { request: EditableRequest }) => {
  const workspace = useWorkspace()
  workspace.nextHelpTopic = 'requests/headers'

  return (
    <Box width='100%' height='100' position='relative'>
      <NameValueEditor
        title='request header'
        values={request.headers}
        nameHeader='Header'
        valueHeader='Value'
        onUpdate={(pairs) => request.setHeaders(pairs)} />
    </Box>
  )
})