import React from "react"
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { toJS } from "mobx";
import { MultipartFormItemType } from "@apicize/lib-typescript";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import { EditableMultipartFormItem } from "../../../../models/workspace/editable-multipart-form-item";
import { GenerateIdentifier } from "../../../../services/random-identifier-generator";
import { base64Encode } from "../../../../services/base64";
import { useFileOperations } from "../../../../contexts/file-operations.context";
import { useFeedback } from "../../../../contexts/feedback.context";

/**
 * Return the decoded size of Base64 data
 */
function base64Size(data: string | undefined) {
    if (!data) return 0
    const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
    return Math.floor(data.length * 3 / 4) - padding
}

export const MultipartFormEditor = React.memo(({ values, onUpdate }: {
    values: EditableMultipartFormItem[],
    onUpdate: (items: EditableMultipartFormItem[]) => void
}) => {
    const fileOps = useFileOperations()
    const feedback = useFeedback()

    const update = (id: string, change: (item: EditableMultipartFormItem) => void) => {
        const vals = toJS(values ?? [])
        const match = vals.find(v => v.id === id)
        if (match) {
            change(match)
            onUpdate(vals)
        }
    }

    const onAdd = () => {
        const vals = toJS(values ?? [])
        vals.push({
            id: GenerateIdentifier(),
            name: '',
            type: MultipartFormItemType.Text,
            value: ''
        })
        onUpdate(vals)
    }

    const onDelete = (id: string) => {
        onUpdate(toJS(values ?? []).filter(v => v.id !== id))
    }

    const updateType = (id: string, type: MultipartFormItemType) => update(id, item => {
        item.type = type
        if (type === MultipartFormItemType.File) {
            item.value = undefined
        } else {
            item.value = ''
            item.fileName = undefined
            item.data = undefined
        }
    })

    const selectFile = (id: string) => {
        fileOps.openFile()
            .then(file => {
                if (file) {
                    update(id, item => {
                        item.fileName = file.fileName
                        item.data = base64Encode(file.data)
                    })
                }
            })
            .catch(e => feedback.toastError(e))
    }

    return <Stack direction='column' position='relative' spacing={4} width='100%'>
        {
            (values ?? []).map(item => {
                const isFile = item.type === MultipartFormItemType.File
                const dimmed = { opacity: item.disabled ? 0.5 : 1 }
                return <Grid container key={item.id} rowSpacing={2} spacing={1} size={12} columns={12}>
                    <Grid size='auto'>
                        <Checkbox
                            id={`${item.id}-enabled`}
                            aria-label='enabled'
                            title={item.disabled ? 'Disabled' : 'Enabled'}
                            checked={!item.disabled}
                            onChange={(e) => update(item.id, i => { i.disabled = e.target.checked ? undefined : true })}
                        />
                    </Grid>
                    <Grid size={3} sx={dimmed}>
                        <TextField
                            id={`${item.id}-name`}
                            label='Name'
                            aria-label='Name'
                            size="small"
                            value={item.name}
                            onChange={(e) => update(item.id, i => { i.name = e.target.value })}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={2} sx={dimmed}>
                        <TextField
                            id={`${item.id}-type`}
                            select
                            label='Type'
                            aria-label='Type'
                            size="small"
                            value={isFile ? MultipartFormItemType.File : MultipartFormItemType.Text}
                            onChange={(e) => updateType(item.id, e.target.value as MultipartFormItemType)}
                            fullWidth
                        >
                            <MenuItem value={MultipartFormItemType.Text}>Text</MenuItem>
                            <MenuItem value={MultipartFormItemType.File}>File</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid size='grow' sx={dimmed}>
                        {
                            isFile
                                ? <TextField
                                    id={`${item.id}-file-name`}
                                    label='File Name'
                                    aria-label='File Name'
                                    size="small"
                                    value={item.fileName ?? ''}
                                    onChange={(e) => update(item.id, i => { i.fileName = e.target.value })}
                                    helperText={item.data ? `${base64Size(item.data).toLocaleString()} bytes` : 'No file selected'}
                                    fullWidth
                                    slotProps={{
                                        input: {
                                            endAdornment: <InputAdornment position='end'>
                                                <IconButton
                                                    aria-label='select file'
                                                    title='Select File'
                                                    edge='end'
                                                    color='primary'
                                                    onClick={() => selectFile(item.id)}>
                                                    <FileOpenIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        }
                                    }}
                                />
                                : <TextField
                                    id={`${item.id}-value`}
                                    label='Value'
                                    aria-label='Value'
                                    size="small"
                                    value={item.value ?? ''}
                                    onChange={(e) => update(item.id, i => { i.value = e.target.value })}
                                    fullWidth
                                />
                        }
                    </Grid>
                    <Grid className='namevalue-col-btn' size={1}>
                        <IconButton aria-label="delete" onClick={() => onDelete(item.id)}>
                            <DeleteIcon color='primary' />
                        </IconButton>
                    </Grid>
                </Grid>
            })
        }
        <Box>
            <Button variant="outlined" aria-label="add" startIcon={<AddIcon />} size='small' onClick={() => onAdd()}>Add form data</Button>
        </Box>
    </Stack>
})
