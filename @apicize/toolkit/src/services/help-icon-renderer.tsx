/**
 * Help icon renderer - returns React components for help icons.
 * Shared between help.tsx and can be used for validation.
 */

import SvgIcon from '@mui/material/SvgIcon'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import SettingsIcon from '@mui/icons-material/Settings'
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings'
import KeyIcon from '@mui/icons-material/Key'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ScienceIcon from '@mui/icons-material/Science'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import DataSetIcon from '@mui/icons-material/Dataset'
import TuneIcon from '@mui/icons-material/Tune'
import PlayCircleOutlined from '@mui/icons-material/PlayCircleOutlined'
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'
import PostAddIcon from '@mui/icons-material/PostAdd'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import SaveIcon from '@mui/icons-material/Save'
import SaveAsIcon from '@mui/icons-material/SaveAs'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo'
import FormatListBulletedAddIcon from '@mui/icons-material/FormatListBulletedAdd'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import LaunchIcon from '@mui/icons-material/Launch'
import AuthIcon from '../icons/auth-icon'
import ScenarioIcon from '../icons/scenario-icon'
import CertificateIcon from '../icons/certificate-icon'
import ProxyIcon from '../icons/proxy-icon'
import RequestIcon from '../icons/request-icon'
import DefaultsIcon from '../icons/defaults-icon'
import PublicIcon from '../icons/public-icon'
import PrivateIcon from '../icons/private-icon'
import VaultIcon from '../icons/vault-icon'
import ApicizeIcon from '../icons/apicize-icon'
import FolderIcon from '../icons/folder-icon'
import LogIcon from '../icons/log-icon'
import SeedIcon from '../icons/seed-icon'
import ViewIcon from '../icons/view-icon'
import { ScienceOutlinedIcon, PreviewIcon } from '../icons'
import { JSX } from 'react'
/**
 * Renders a help icon by name.
 * Returns JSX element or null if icon name is unknown.
 */
export function renderHelpIcon(name: string): JSX.Element | null {
    switch (name) {
        case 'request':
            return <SvgIcon className='help-icon' color='request'><RequestIcon /></SvgIcon>
        case 'group':
            return <SvgIcon className='help-icon' color='request'><FolderIcon /></SvgIcon>
        case 'info':
            return <DisplaySettingsIcon className='help-icon' />
        case 'query':
            return <ViewListIcon className='help-icon' />
        case 'headers':
            return <ViewListOutlinedIcon className='help-icon' />
        case 'body':
            return <ArticleOutlinedIcon className='help-icon' />
        case 'parameters':
            return <AltRouteIcon className='help-icon' />
        case 'test':
            return <ScienceIcon className='help-icon' />
        case 'dataset':
            return <SvgIcon className='help-icon' color='data'><DataSetIcon /></SvgIcon>
        case 'authorization':
            return <SvgIcon className='help-icon' color='authorization'><AuthIcon /></SvgIcon>
        case 'scenario':
            return <SvgIcon className='help-icon' color='scenario'><ScenarioIcon /></SvgIcon>
        case 'certificate':
            return <SvgIcon className='help-icon' color='certificate'><CertificateIcon /></SvgIcon>
        case 'proxy':
            return <SvgIcon className='help-icon' color='proxy'><ProxyIcon /></SvgIcon>
        case 'defaults':
            return <SvgIcon className='help-icon'><DefaultsIcon /></SvgIcon>
        case 'settings':
            return <SvgIcon className='help-icon'><SettingsIcon /></SvgIcon>
        case 'logs':
            return <SvgIcon className='help-icon'><LogIcon /></SvgIcon>
        case 'display':
            return <SvgIcon className='help-icon'><DisplaySettingsIcon className='help-icon' /></SvgIcon>
        case 'public':
            return <SvgIcon className='help-icon' color='public'><PublicIcon /></SvgIcon>
        case 'private':
            return <SvgIcon className='help-icon' color='private'><PrivateIcon /></SvgIcon>
        case 'vault':
            return <SvgIcon className='help-icon' color='vault'><VaultIcon /></SvgIcon>
        case 'apicize':
            return <SvgIcon className='help-icon'><ApicizeIcon /></SvgIcon>
        case 'runonce':
            return <SvgIcon className='help-icon'><PlayCircleOutlined color='success' /></SvgIcon>
        case 'run':
            return <SvgIcon className='help-icon'><PlayCircleFilledIcon color='success' /></SvgIcon>
        case 'seed':
            return <SvgIcon className='help-icon' color='primary'><SeedIcon /></SvgIcon>
        case 'workbook-new':
            return <SvgIcon className='help-icon'><PostAddIcon /></SvgIcon>
        case 'workbook-open':
            return <SvgIcon className='help-icon'><FileOpenIcon /></SvgIcon>
        case 'file-open':
            return <SvgIcon className='help-icon' color='primary'><FileOpenIcon /></SvgIcon>
        case 'workbook-save':
            return <SvgIcon className='help-icon'><SaveIcon /></SvgIcon>
        case 'workbook-save-as':
            return <SvgIcon className='help-icon'><SaveAsIcon /></SvgIcon>
        case 'appsettings':
            return <SvgIcon className='help-icon'><TuneIcon /></SvgIcon>
        case 'lock':
            return <SvgIcon className='help-icon'><KeyIcon /></SvgIcon>
        case 'clear':
            return <SvgIcon className='help-icon'><ClearAllIcon color='warning' /></SvgIcon>
        case 'copy':
            return <SvgIcon className='help-icon'><ContentCopyIcon color='primary' /></SvgIcon>
        case 'paste':
            return <SvgIcon className='help-icon'><ContentPasteGoIcon color='primary' /></SvgIcon>
        case 'add-header':
            return <SvgIcon className='help-icon'><FormatListBulletedAddIcon color='primary' /></SvgIcon>
        case 'beautify':
            return <SvgIcon className='help-icon'><AutoAwesomeIcon color='primary' /></SvgIcon>
        case 'response-info':
            return <SvgIcon className='help-icon'><ScienceOutlinedIcon /></SvgIcon>
        case 'response-headers':
            return <SvgIcon className='help-icon'><ViewListOutlinedIcon /></SvgIcon>
        case 'response-body-raw':
            return <SvgIcon className='help-icon'><PreviewIcon /></SvgIcon>
        case 'response-body-preview':
            return <SvgIcon className='help-icon'><ArticleOutlinedIcon /></SvgIcon>
        case 'response-curl':
            return <SvgIcon className='help-icon'><LaunchIcon /></SvgIcon>
        case 'response-details':
            return <SvgIcon className='help-icon'><RequestIcon /></SvgIcon>
        case 'response-view':
            return <SvgIcon className='help-icon' color='primary'><ViewIcon /></SvgIcon>
        case 'response-copy':
            return <SvgIcon className='help-icon'><ContentCopyIcon color='primary' /></SvgIcon>
        default:
            return null
    }
}

/**
 * Get all icon names that can be rendered.
 * Useful for validation.
 */
export function getRenderedIconNames(): string[] {
    return [
        'request', 'group', 'info', 'query', 'headers', 'body', 'parameters', 'test',
        'dataset', 'authorization', 'scenario', 'certificate', 'proxy', 'defaults',
        'settings', 'logs', 'display', 'public', 'private', 'vault', 'apicize',
        'runonce', 'run', 'seed', 'workbook-new', 'workbook-open', 'file-open',
        'workbook-save', 'workbook-save-as', 'appsettings', 'lock', 'clear', 'copy',
        'paste', 'add-header', 'beautify', 'response-info', 'response-headers',
        'response-body-raw', 'response-body-preview', 'response-curl', 'response-details',
        'response-view', 'response-copy'
    ]
}
