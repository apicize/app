import { SxProps } from '@mui/material/styles'
import { observer } from 'mobx-react-lite';
import { PasswordLockType, useWorkspace } from '../../../contexts/workspace.context';
import { Box, Button, FormControlLabel, Radio, RadioGroup, SvgIcon } from '@mui/material'
import LockIcon from '@mui/icons-material/LockOutline';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import UnlockIcon from '@mui/icons-material/LockOpenOutlined';
import VaultIcon from '../../../icons/vault-icon';
import PrivateIcon from '../../../icons/private-icon';
import { ParameterLockStatus, ParameterStore } from '@apicize/lib-typescript';
import { Stack } from '@mui/system';
import { BorderedSection } from '../../bordered-section';
import KeyIcon from '@mui/icons-material/Key'
import { ToastSeverity, useFeedback } from '../../../contexts/feedback.context';
import { useEffect, useRef, useState } from 'react';
import { PasswordTextField } from '../../password-text-field';

enum LockAction {
    lock,
    unlock,
    none,
}

export const LockEditor = observer(({
    status,
    store,
    envVarSet,
    autoFocus,
}: {
    status: ParameterLockStatus,
    store: ParameterStore,
    envVarSet: boolean,
    autoFocus?: boolean,
}) => {
    const workspace = useWorkspace()
    const feedback = useFeedback()
    const [existingPassword, setExistingPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [operation, setOperation] = useState<string | null>(null)
    const [lockOption, setLockOption] = useState<'password' | 'envvar' | 'none'>('password')
    const refBtnUnlock = useRef<HTMLButtonElement>(null)
    const refBtnLock = useRef<HTMLButtonElement>(null)
    const refTxtNewPwd = useRef<HTMLInputElement>(null)
    const refTxtConfirmNewPwd = useRef<HTMLInputElement>(null)

    let title: string
    let envVar: string
    let icon
    switch (store) {
        case ParameterStore.Vault:
            title = 'Vault'
            envVar = 'APICIZE_VAULT_PWD'
            icon = <SvgIcon className='help-icon' color='vault' sx={{ marginRight: '0.5em' }}><VaultIcon /></SvgIcon>
            break
        case ParameterStore.Private:
            title = 'Private Parameter Store'
            envVar = 'APICIZE_PRIVATE_PWD'
            icon = <SvgIcon className='help-icon' color='private' sx={{ marginRight: '0.5em' }}><PrivateIcon /></SvgIcon>
            break
        default:
            throw new Error(store satisfies ParameterStore)
    }

    const lock = (lockType: PasswordLockType, description: string) => {
        setOperation(`${description}...`)
        workspace.setParametersPassword(store, lockType)
            .then(() => {
                setNewPassword('')
                setConfirmNewPassword('')
                setOperation(null)
                feedback.toast(`${description} for ${title} Successful`, ToastSeverity.Success)

            })
            .catch((err) => {
                setOperation(null)
                feedback.toastError(err)
            })
    }

    const unlock = () => {
        setOperation('Unlocking...')
        workspace.decryptParameters(store, existingPassword)
            .then(() => {
                setExistingPassword('')
                setOperation(null)
                feedback.toast(`${title} Unlocked Successfully`, ToastSeverity.Success)

            })
            .catch((err) => {
                setOperation(null)
                feedback.toastError(err)
            })
    }

    let action: LockAction
    let allowClear: boolean
    let allowEnvVar: boolean
    let s: string
    let description: string
    let keyColor: 'success' | 'warning' | 'error' | 'disabled'

    switch (status) {
        case ParameterLockStatus.Locked:
            s = 'Locked, Password Required'
            keyColor = 'warning'
            action = LockAction.unlock
            allowClear = false
            allowEnvVar = false
            description = `Your ${title} requires a password to be unlocked`
            break
        case ParameterLockStatus.LockedInvalidEnvVar:
            s = 'Locked, Invalid Environment Variable'
            keyColor = 'error'
            action = LockAction.unlock
            allowClear = false
            allowEnvVar = false
            description = `The environment variable ${envVar} is defined but its value does not match the password used to lock your ${title}, a valid password is required`
            break
        case ParameterLockStatus.LockedInvalidPassword:
            s = 'Locked, Invalid Password'
            keyColor = 'error'
            action = LockAction.unlock
            allowClear = false
            allowEnvVar = false
            description = `An invalid password was entered to unlock your ${title}, a valid password is required`
            break
        case ParameterLockStatus.UnlockedNoPassword:
            s = 'Unlocked, No Password Set'
            keyColor = 'disabled'
            action = LockAction.lock
            allowClear = false
            allowEnvVar = envVarSet
            description = `Your ${title} is unlocked`
            break
        case ParameterLockStatus.UnlockedWithEnvVar:
            s = 'Unlocked with Environment Variable'
            keyColor = 'success'
            action = LockAction.lock
            allowClear = true
            allowEnvVar = false
            description = `Your ${title} will be encyrpted using the password stored in the environment variable ${envVar}`
            break
        case ParameterLockStatus.UnlockedWithPassword:
            s = 'Unlocked with Password'
            keyColor = 'success'
            action = LockAction.lock
            allowClear = true
            allowEnvVar = envVarSet
            description = `Your ${title} is unlocked using a valid password`
            break
        default:
            throw new Error(status satisfies ParameterLockStatus)
    }

    if ((!envVarSet && lockOption === 'envvar') || (!allowClear && lockOption === 'none')) {
        setLockOption('password')
    }

    return <Box paddingTop='0.5rem'>
        <BorderedSection title={<Box display='block' alignContent='center'>
            {icon}{title} ({s} <SvgIcon sx={{ verticalAlign: 'middle', marginLeft: '0.5rem', marginRight: '0.1rem' }}><KeyIcon color={keyColor} /></SvgIcon>)</Box>}>
            <Stack direction='column' spacing='1.5em'>
                <Box>{description}</Box>
                <Box display='flex' alignItems='center'>
                    {
                        action === LockAction.unlock
                            ? <Stack direction='row' alignItems='center'>
                                <PasswordTextField
                                    autoFocus={autoFocus}
                                    label='Password'
                                    disabled={!!operation}
                                    size='small'
                                    value={existingPassword}
                                    onKeyUp={(e) => {
                                        if (e.code === 'Enter' && existingPassword.length > 0) {
                                            refBtnUnlock.current?.click()
                                        }
                                    }}
                                    onChange={(e) => {
                                        setExistingPassword(e.target.value)
                                    }}
                                />
                                <Button
                                    ref={refBtnUnlock}
                                    variant='outlined'
                                    disabled={(!!operation) && existingPassword.length > 0}
                                    sx={{ marginLeft: '2.0em' }}
                                    onClick={unlock}
                                    startIcon={<UnlockIcon color='success'
                                    />}>Unlock
                                </Button>
                                {
                                    operation
                                        ? <Box display='inline-block' marginLeft='2em'>{operation}</Box>
                                        : null
                                }
                            </Stack>
                            : action === LockAction.lock
                                ? <Stack direction='column' spacing={1}>
                                    <RadioGroup value={lockOption} onChange={(e) => setLockOption(e.target.value as 'password' | 'envvar' | 'none')}>
                                        <Stack direction='row' alignItems='center'>
                                            <FormControlLabel value='password' control={<Radio />} label='Lock with Password' />
                                            <PasswordTextField
                                                autoFocus={autoFocus}
                                                ref={refTxtNewPwd}
                                                label='New Password'
                                                disabled={!!operation || lockOption !== 'password'}
                                                size='small'
                                                sx={{ marginLeft: '2.0em', marginRight: '1.0em' }}
                                                value={newPassword}
                                                onFocus={() => setLockOption('password')}
                                                onKeyUp={(e) => {
                                                    if (e.code === 'Enter') {
                                                        if (newPassword.length > 0 && confirmNewPassword.length > 0) {
                                                            refBtnLock.current?.click()
                                                        } else {
                                                            refTxtConfirmNewPwd.current?.focus()
                                                        }
                                                    }
                                                }}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                            <PasswordTextField
                                                ref={refTxtConfirmNewPwd}
                                                label='Confirm New Password'
                                                disabled={!!operation || lockOption !== 'password'}
                                                size='small'
                                                value={confirmNewPassword}
                                                onFocus={() => setLockOption('password')}
                                                onKeyUp={(e) => {
                                                    if (e.code === 'Enter') {
                                                        if (newPassword.length > 0 && confirmNewPassword.length > 0) {
                                                            refBtnLock.current?.click()
                                                        } else {
                                                            refTxtNewPwd.current?.focus()
                                                        }
                                                    }
                                                }}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            />
                                        </Stack>
                                        {
                                            allowEnvVar
                                                ? <FormControlLabel value='envvar' control={<Radio />} label={`Lock with ${envVar}`} />
                                                : null
                                        }
                                        {
                                            allowClear
                                                ? <FormControlLabel value='none' control={<Radio />} label='Clear Password' />
                                                : null
                                        }
                                    </RadioGroup>
                                    <Box display='inline-flex' flexDirection='row' alignItems='center' alignSelf='flex-start'>
                                        <Button
                                            ref={refBtnLock}
                                            variant='outlined'
                                            disabled={!!operation || (lockOption === 'password' && (newPassword.length === 0 || newPassword !== confirmNewPassword))}
                                            onClick={() => {
                                                switch (lockOption) {
                                                    case 'password':
                                                        lock({ lock: 'Password', password: newPassword }, 'Set Password')
                                                        break
                                                    case 'envvar':
                                                        lock({ lock: 'EnvVar' }, `Set Password from ${envVar}`)
                                                        break
                                                    case 'none':
                                                        lock({ lock: 'None' }, 'Clear Password')
                                                        break
                                                }
                                            }}
                                            startIcon={
                                                lockOption === 'none' ? <ClearAllIcon color='warning' /> : <LockIcon color='error' />
                                            }>
                                            {lockOption === 'password' ? 'Lock with Password'
                                                : lockOption === 'envvar' ? `Lock with ${envVar}`
                                                    : 'Clear Password'}
                                        </Button>
                                        {
                                            operation
                                                ? <Box display='inline-block' marginLeft='2em'>{operation}</Box>
                                                : null
                                        }
                                    </Box>
                                </Stack>
                                : null
                    }
                </Box>
            </Stack>
        </BorderedSection>
    </Box >
})

export const SettingsLockEditor = observer(({ sx }: { sx?: SxProps }) => {
    const workspace = useWorkspace()
    useEffect(() => { workspace.nextHelpTopic = 'settings/lock' }, [workspace])
    return <Stack spacing={4} sx={sx} className='panels full-width'>
        <LockEditor
            store={ParameterStore.Vault}
            status={workspace.vaultLockStatus}
            envVarSet={workspace.vaultEnvVarSet}
            autoFocus={true}
        />
        <LockEditor
            store={ParameterStore.Private}
            status={workspace.privateLockStatus}
            envVarSet={workspace.privateEnvVarSet}
        />
    </Stack>
})
