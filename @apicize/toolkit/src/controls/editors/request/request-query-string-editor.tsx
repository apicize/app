import { NameValueEditor } from '../name-value-editor'
import { EditableRequest } from '../../../models/workspace/editable-request'
import { observer } from 'mobx-react-lite'
import { useWorkspace } from '../../../contexts/workspace.context'
import { useFeedback } from '../../../contexts/feedback.context'

export const RequestQueryStringEditor = observer(({ request }: { request: EditableRequest }) => {
  const workspace = useWorkspace()
  const feedback = useFeedback()
  workspace.nextHelpTopic = 'requests/query'

  return (<NameValueEditor
    title='query string parameter'
    values={request.queryStringParams}
    nameHeader='Parameter'
    valueHeader='Value'
    onUpdate={(params) => {
      request.setQueryStringParams(params).catch(err => feedback.toastError(err))
    }} />
  )
})