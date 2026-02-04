import TextField from '@mui/material/TextField'
import { SxProps } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import DatasetIcon from '@mui/icons-material/Dataset';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { EditorTitle } from '../editor-title';
import { observer } from 'mobx-react-lite';
import { useWorkspace, WorkspaceStore } from '../../contexts/workspace.context';
import { useApicizeSettings } from '../../contexts/apicize-settings.context';
import { EditableDataSet, EditableDataSetType } from '../../models/workspace/editable-data-set'
import { DataSourceType } from '@apicize/lib-typescript'
import { FormControl, InputLabel, Select, MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions, ListItemIcon, Divider, IconButton, Box, Typography } from '@mui/material'
import { FeedbackStore, useFeedback } from '../../contexts/feedback.context'
import { useState, useEffect, useRef, useMemo } from 'react'
import MonacoEditor from 'react-monaco-editor';
import { IDataSetEditorTextModel } from '../../models/editor-text-model'
import { FileOperationsStore, useFileOperations } from '../../contexts/file-operations.context'
import { runInAction } from 'mobx'
import { DataGrid, GridColDef, GridColumnMenuProps, GridColumnMenu } from '@mui/x-data-grid'
import { GridApiCommunity } from '@mui/x-data-grid/internals'
import PostAddIcon from '@mui/icons-material/PostAdd'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import SaveAsIcon from '@mui/icons-material/SaveAs'
import { EditableSettings } from '../../models/editable-settings'

interface JsonEditorProps {
    dataSet: EditableDataSet
    feedback: FeedbackStore
    fileOps: FileOperationsStore
    sourceFileActive: boolean
    settings: EditableSettings
    workspace: WorkspaceStore
}

const JsonEditor = observer(({ dataSet, feedback, fileOps, sourceFileActive, settings, workspace }: JsonEditorProps) => {
    const [model, setModel] = useState<IDataSetEditorTextModel | null>(null)

    // Make sure we have the editor test model
    if (!model || model.dataSetId !== dataSet.id) {
        workspace.getDataSetEditModel(dataSet)
            .then(setModel)
            .catch(e => feedback.toastError(e))
        return null
    }

    return <MonacoEditor
        language='json'
        theme={settings.colorScheme === "dark" ? 'vs-dark' : 'vs-light'}
        value={dataSet.text}
        onChange={(text: string) => {
            dataSet.setJson(text)
            if (dataSet.type === DataSourceType.FileJSON && sourceFileActive) {
                fileOps.queueSaveDataSetFile(dataSet.sourceFileName, text)
            }
        }}
        options={{
            automaticLayout: true,
            minimap: { enabled: false },
            model,
            detectIndentation: settings.editorDetectExistingIndent,
            tabSize: settings.editorIndentSize,
            folding: true,
            formatOnType: true,
            formatOnPaste: true,
            fontSize: settings.fontSize
        }}
    />
})

interface CsvEditorProps {
    dataSet: EditableDataSet
    feedback: FeedbackStore
    fileOps: FileOperationsStore
    sourceFileActive: boolean
    csvColumnWidths: React.MutableRefObject<{ [field: string]: number }>
}

const CsvEditor = observer(({ dataSet, feedback, fileOps, sourceFileActive, csvColumnWidths }: CsvEditorProps) => {
    const dataGridRef = useRef<GridApiCommunity>(null)
    const unsizedColumns = dataSet.csvColumns.filter(c => !csvColumnWidths.current[c])

    const CustomColumnMenu = useMemo(() => {
        return observer((props: GridColumnMenuProps) => {
            const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
            const [newColumnName, setNewColumnName] = useState('')

            const isRowNumberColumn = props.colDef.field === 'rowNumber'

            const handleAddColumn = (event: React.SyntheticEvent) => {
                if (newColumnName.trim().length > 0) {
                    dataSet.addColumnAfter(props.colDef.field, newColumnName.trim())
                    setNewColumnName('')
                    setShowAddColumnDialog(false)
                    props.hideMenu?.(event)
                }
            }

            const handleDeleteColumn = (event: React.SyntheticEvent) => {
                props.hideMenu?.(event)
                feedback.confirm({
                    title: 'Delete Column',
                    message: `Are you sure you want to delete "${props.colDef.field}"?`,
                    okButton: 'Yes',
                    cancelButton: 'No',
                    defaultToCancel: true,
                }).then(ok => {
                    if (!ok) return
                    const csv = dataSet.deleteColumn(props.colDef.field)
                    if (sourceFileActive) {
                        fileOps.queueSaveDataSetFile(dataSet.sourceFileName, csv)
                    }
                })
            }

            return (
                <>
                    <GridColumnMenu {...props} />
                    <Divider />
                    <MenuItem
                        onClick={() => {
                            setShowAddColumnDialog(true)
                        }}
                    >
                        <ListItemIcon>
                            <AddIcon />
                        </ListItemIcon>
                        Add Column
                    </MenuItem>
                    {!isRowNumberColumn && (
                        <MenuItem
                            onClick={(e) => handleDeleteColumn(e)}
                        >
                            <ListItemIcon>
                                <DeleteIcon />
                            </ListItemIcon>
                            Delete Column...
                        </MenuItem>
                    )}
                    <Dialog
                        open={showAddColumnDialog}
                        onClose={() => {
                            setShowAddColumnDialog(false)
                            setNewColumnName('')
                        }}
                    >
                        <DialogTitle>Add Column</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Column Name"
                                fullWidth
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddColumn(e)
                                    }
                                }}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={handleAddColumn}
                                disabled={newColumnName.trim().length === 0}
                            >
                                Add
                            </Button>
                            <Button onClick={() => {
                                setShowAddColumnDialog(false)
                                setNewColumnName('')
                            }}>
                                Cancel
                            </Button>
                        </DialogActions>
                    </Dialog>

                </>
            )
        })
    }, [dataSet, feedback, fileOps, sourceFileActive])

    const columnsWithActions: GridColDef[] = [
        {
            field: 'rowNumber',
            headerName: '#',
            width: 70,
            valueGetter: (value, row, column, apiRef) => {
                return apiRef.current.getRowIndexRelativeToVisibleRows(row._id) + 1;
            }
        },
        ...dataSet.csvColumns.map(c => {
            return {
                field: c,
                headerName: c,
                editable: true,
                minWidth: 100,
                width: csvColumnWidths.current[c] ? csvColumnWidths.current[c] : 200
            }
        }),
        {
            field: 'actions',
            headerName: '',
            width: 60,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <Button
                    size="small"
                    onClick={() => {
                        feedback.confirm({
                            title: 'Delete Row',
                            message: `Are you sure you want to delete this row?`,
                            okButton: 'Yes',
                            cancelButton: 'No',
                            defaultToCancel: true
                        }).then(ok => {
                            if (!ok) return
                            const csv = dataSet.deleteRow(params.row._id)
                            if (sourceFileActive) {
                                fileOps.queueSaveDataSetFile(dataSet.sourceFileName, csv)
                            }
                        })
                    }}
                    sx={{ minWidth: 'auto', padding: '4px' }}
                >
                    <DeleteIcon fontSize="small" />
                </Button>
            )
        }
    ]

    return <DataGrid
        apiRef={dataGridRef}
        rows={dataSet.csvRows}
        columns={columnsWithActions}
        getRowId={(r) => r._id}
        sx={{ overflowX: 'scroll', overflow: 'auto', position: 'relative', display: 'grid', gridTemplateRows: 'auto 1f auto', }}
        autosizeOnMount={unsizedColumns.length > 0}
        autosizeOptions={{
            disableColumnVirtualization: true,
            includeHeaders: true,
            includeOutliers: true,
            columns: unsizedColumns
        }}
        slots={{
            columnMenu: CustomColumnMenu,
        }}
        onColumnWidthChange={(params) => {
            csvColumnWidths.current[params.colDef.field] = params.width
        }}
        processRowUpdate={(updatedRow) => {
            try {
                const csv = dataSet.updateRow(updatedRow)
                if (sourceFileActive) {
                    fileOps.queueSaveDataSetFile(dataSet.sourceFileName, csv)
                }
            } catch (e) {
                feedback.toastError(e)
            }

            return updatedRow
        }}
        onProcessRowUpdateError={(e) => feedback.toastError(e)}
    />
})

export const DataSetEditor = observer(({ dataSet, sx }: { dataSet: EditableDataSet, sx?: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const fileOps = useFileOperations()
    const feedback = useFeedback()

    const csvColumnWidths = useRef<{ [field: string]: number }>({})

    workspace.nextHelpTopic = 'workspace/data-sets'

    const [showDataTypeMenu, setShowDataTypeMenu] = useState(false)

    const sourceFileActive = !!(dataSet.sourceFileName && dataSet.sourceFileName.length > 0)

    useEffect(() => {
        const disposer = feedback.registerModalBlocker(() => setShowDataTypeMenu(false))
        return (() => {
            disposer()
        })
    })

    const isInternal = dataSet.type === DataSourceType.JSON
    const sourceError = !isInternal && workspace.fileName.length === 0
        ? "Workbook must be saved before linking to a data file"
        : dataSet.sourceError

    const openDataFile = (type: DataSourceType) => {
        fileOps.promptAndOpenDataSetFile(type)
            .then(results => {
                if (!results) return
                const [data, fileName] = results
                runInAction(() => {
                    try {
                        if (type === DataSourceType.FileCSV) {
                            dataSet.setCsv(data)
                        } else {
                            dataSet.setJson(data)
                        }
                    } catch (e) {
                        feedback.toastError(e)
                    }
                    dataSet.setFileName(fileName, true)
                })
            })
    }

    const saveDataFile = () => {
        const data = dataSet.getTextToSave()
        fileOps.promptAndSaveDataSetFile(dataSet.type, data)
            .then(sourceName => {
                if (sourceName) {
                    runInAction(() => {
                        dataSet.setFileName(sourceName, true)
                    })
                }
            })
            .catch(e => feedback.toastError(e))
    }


    if (dataSet.triggerFileLoad) {
        fileOps.openDataSetFile(dataSet.sourceFileName)
            .then(results => {
                if (!results) {
                    throw new Error(`Unable to open ${dataSet.sourceFileName}`)
                }
                const data = results[0]
                const relativeFileName = results[1]
                runInAction(() => {
                    try {
                        if (dataSet.type === DataSourceType.FileCSV) {
                            dataSet.setCsv(data)
                        } else {
                            dataSet.setJson(data)
                        }
                    } catch (e) {
                        feedback.toastError(e)
                    }
                    dataSet.setFileName(relativeFileName, false)
                })
            })
            .catch(e => {
                dataSet.setSourceType(DataSourceType.JSON)
                dataSet.setJson('')
                feedback.toastError(e)
            })
        return null
    }

    const handleClear = () => {
        feedback.confirm({
            title: 'Clear Data Set?',
            message: 'Are you sure you want to clear this data set?',
            okButton: 'Yes',
            cancelButton: 'No',
            defaultToCancel: true,
        }).then(ok => {
            if (ok) {
                runInAction(() => {
                    dataSet.clearDataSet()
                })
            }
        })
    }

    return (
        <Grid container direction='column' className='editor data' sx={sx}>
            <Grid className='editor-panel-header'>
                <EditorTitle
                    icon={<DatasetIcon color='data' />}
                    name={dataSet.name.length > 0 ? dataSet.name : '(Unnamed)'}
                    diag={settings.showDiagnosticInfo ? dataSet.id : undefined}
                />
            </Grid>
            <Grid className='editor-panel' flexGrow={1}>
                <Grid container className='editor-content' direction={'column'} spacing={3} paddingTop='0.5em' overflow='hidden' height='100%'>
                    <Grid alignContent='center'>
                        <TextField
                            id='data-name'
                            label='Name'
                            aria-label='data set name'
                            size='small'
                            value={dataSet.name}
                            autoFocus={dataSet.name === ''}
                            onChange={e => {
                                dataSet.setName(e.target.value)
                            }}
                            error={!!dataSet.nameError}
                            helperText={dataSet.nameError ?? ''}
                            fullWidth
                        />
                    </Grid>
                    <Grid container direction='row' spacing={3}>
                        <Grid alignContent='center'>
                            <FormControl fullWidth>
                                <InputLabel id='data-type-lbl'>Type</InputLabel>
                                <Select
                                    id='data-type'
                                    labelId='data-type-lbl'
                                    label='Type'
                                    arial-label='variable-type'
                                    size='small'
                                    value={dataSet.type}
                                    sx={{ minWidth: '8rem' }}
                                    open={showDataTypeMenu}
                                    onClose={() => setShowDataTypeMenu(false)}
                                    onOpen={() => setShowDataTypeMenu(true)}
                                    onChange={e => dataSet.setSourceType(e.target.value as DataSourceType)}
                                >
                                    <MenuItem key='data-type-json' value={DataSourceType.JSON}>JSON (Workbook)</MenuItem>
                                    <MenuItem key='data-type-file-json' value={DataSourceType.FileJSON}>JSON (External File)</MenuItem>
                                    <MenuItem key='data-type-file-csv' value={DataSourceType.FileCSV}>CSV (External File)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid container alignContent='center' flexGrow={1}>
                            {isInternal ? null : (<Grid container justifyContent='center'>
                                <Grid alignContent='center'>
                                    {sourceFileActive ? dataSet.sourceFileName : <Box display='inline-block' color='warn'>(Not Saved)</Box>}
                                </Grid>
                                <Grid marginLeft='2em' alignContent='center'>
                                    <IconButton
                                        size="large"
                                        aria-label='new'
                                        id='datasource-new-btn'
                                        title='Start New Data Source File'
                                        onClick={() => handleClear()}>
                                        <PostAddIcon />
                                    </IconButton>
                                    <IconButton
                                        size="large"
                                        aria-label='open'
                                        id='datasource-open-btn'
                                        title='Open Data Source File'
                                        disabled={workspace.fileName.length == 0}
                                        onClick={() => openDataFile(dataSet.type)}>
                                        <FileOpenIcon />
                                    </IconButton>
                                    <IconButton
                                        size="large"
                                        aria-label='save'
                                        id='datasource-save-as-btn'
                                        title='Save Data Source File As'
                                        disabled={workspace.fileName.length == 0}
                                        onClick={() => saveDataFile()}>
                                        <SaveAsIcon />
                                    </IconButton>
                                </Grid>
                            </Grid>)}
                            {
                                sourceError
                                    ? <Grid display='inline-block' alignContent='center'><Typography color='error'>{sourceError}</Typography></Grid>
                                    : null
                            }
                        </Grid>
                        {
                            dataSet.editType === EditableDataSetType.CSV
                                ? <Grid justifyContent='end' alignContent='center'>
                                    <IconButton
                                        size="large"
                                        aria-label='save'
                                        id='datasource-add-btn'
                                        title='Add New Row'
                                        onClick={() => runInAction(() => {
                                            const csv = dataSet.addRow()
                                            if (sourceFileActive) {
                                                fileOps.queueSaveDataSetFile(dataSet.sourceFileName, csv)
                                            }
                                        })}>
                                        <AddIcon />
                                    </IconButton>
                                </Grid>
                                : <></>
                        }
                    </Grid>
                    <Grid flexGrow={1}>
                        {
                            dataSet.editType === EditableDataSetType.JSON
                                ? <JsonEditor dataSet={dataSet} feedback={feedback} fileOps={fileOps} sourceFileActive={sourceFileActive} settings={settings} workspace={workspace} />
                                : dataSet.editType === EditableDataSetType.CSV
                                    ? <CsvEditor dataSet={dataSet} feedback={feedback} fileOps={fileOps} sourceFileActive={sourceFileActive} csvColumnWidths={csvColumnWidths} />
                                    : <></>
                        }
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )
})
