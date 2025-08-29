import React, { useMemo, useCallback } from "react"
import { EditableNameValuePair } from "../../models/workspace/editable-name-value-pair";
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { toJS } from "mobx";
import { GenerateIdentifier } from "../../services/random-identifier-generator";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export const NameValueEditor = React.memo((props: {
    values: EditableNameValuePair[] | undefined,
    title: string,
    nameHeader: string,
    valueHeader: string,
    onUpdate: (pair: EditableNameValuePair[] | undefined) => void
}) => {
    const onAdd = () => {
        const values = toJS(props.values ?? [])
        values.push({
            id: GenerateIdentifier(),
            name: '',
            value: ''
        })
        props.onUpdate(values)
    }

    const onDelete = (id: string) => {
        const values = toJS(props.values ?? []).filter(v => v.id !== id)
        props.onUpdate(values)
    }

    const updateName = (id: string, value: string) => {
        if (!props.values) return
        const values = toJS(props.values)
        const match = values.find(v => v.id === id)
        if (match) {
            match.name = value
            props.onUpdate(values)
        }
    }

    const updateValue = (id: string, value: string) => {
        if (!props.values) return
        const values = toJS(props.values)
        const match = values.find(v => v.id === id)
        if (match) {
            match.value = value
            props.onUpdate(values)
        }
    }

    let ctr = 0
    return <Stack direction='column' position='relative' spacing={4} width='100%'>
        {
            (props.values ?? []).map(value => [
                <Grid container key={`nv-${ctr++}`} rowSpacing={2} spacing={1} size={12} columns={12}>
                    <Grid size={4}>
                        <TextField
                            id={`${value.id}-name`}
                            label={props.nameHeader}
                            aria-label={props.nameHeader}
                            size="small"
                            value={value.name}
                            onChange={(e) => updateName(value.id, e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={7}>
                        <TextField
                            id={`${value.id}-value`}
                            label={props.valueHeader}
                            aria-label={props.valueHeader}
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
            ])
        }
        <Box>
            <Button variant="outlined" aria-label="add" startIcon={<AddIcon />} size='small' onClick={() => onAdd()}>Add {props.title}</Button>
        </Box>
    </Stack>
})
