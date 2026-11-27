import React, { useState } from "react"
import { EditableNameValuePair } from "../../models/workspace/editable-name-value-pair";
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { toJS } from "mobx";
import { GenerateIdentifier } from "../../services/random-identifier-generator";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';

export const NameValueEditor = React.memo(({ values, title, nameHeader, valueHeader, onUpdate }: {
    values: EditableNameValuePair[],
    title: string,
    nameHeader: string,
    valueHeader: string,
    onUpdate: (pair: EditableNameValuePair[]) => void
}) => {
    // ID of the most recently added pair, used to focus its name field
    const [newId, setNewId] = useState<string | null>(null)

    const onAdd = () => {
        const id = GenerateIdentifier()
        setNewId(id)
        const vals = toJS(values ?? [])
        vals.push({
            id,
            name: '',
            value: ''
        })
        onUpdate(vals)
    }

    const onDelete = (id: string) => {
        const vals = toJS(values ?? []).filter(v => v.id !== id)
        onUpdate(vals)
    }

    const updateName = (id: string, value: string) => {
        if (!values) return
        const vals = toJS(values)
        const match = vals.find(v => v.id === id)
        if (match) {
            match.name = value
            onUpdate(vals)
        }
    }

    const updateValue = (id: string, value: string) => {
        if (!values) return
        const vals = toJS(values)
        const match = vals.find(v => v.id === id)
        if (match) {
            match.value = value
            onUpdate(vals)
        }
    }

    const updateEnabled = (id: string, enabled: boolean) => {
        if (!values) return
        const vals = toJS(values)
        const match = vals.find(v => v.id === id)
        if (match) {
            match.disabled = enabled ? undefined : true
            onUpdate(vals)
        }
    }

    return <Stack direction='column' position='relative' spacing={4} width='100%'>
        {
            (values ?? []).map(value => (
                <Grid container key={value.id} rowSpacing={2} spacing={1} size={12} columns={12}>
                    <Grid size='auto'>
                        <Checkbox
                            id={`${value.id}-enabled`}
                            aria-label='enabled'
                            title={value.disabled ? 'Disabled' : 'Enabled'}
                            checked={!value.disabled}
                            onChange={(e) => updateEnabled(value.id, e.target.checked)}
                        />
                    </Grid>
                    <Grid size={4} sx={{ opacity: value.disabled ? 0.5 : 1 }}>
                        <TextField
                            id={`${value.id}-name`}
                            label={nameHeader}
                            aria-label={nameHeader}
                            size="small"
                            autoFocus={value.id === newId}
                            value={value.name}
                            onChange={(e) => updateName(value.id, e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid size='grow' sx={{ opacity: value.disabled ? 0.5 : 1 }}>
                        <TextField
                            id={`${value.id}-value`}
                            label={valueHeader}
                            aria-label={valueHeader}
                            size="small"
                            value={value.value}
                            onChange={(e) => updateValue(value.id, e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid className='namevalue-col-btn' size={1}>
                        <IconButton aria-label="delete" onClick={() => onDelete(value.id)}>
                            <DeleteIcon color='primary' />
                        </IconButton>
                    </Grid>
                </Grid>
            ))
        }
        <Box>
            <Button variant="outlined" aria-label="add" startIcon={<AddIcon />} size='small' onClick={() => onAdd()}>Add {title}</Button>
        </Box>
    </Stack>
})
