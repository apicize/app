/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import { LinkProps } from '@mui/material/Link'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import SvgIcon from '@mui/material/SvgIcon'
import { SxProps, TypographyVariant } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { TypographyProps, TypographyPropsVariantOverrides } from '@mui/material/Typography'
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AltRouteIcon from '@mui/icons-material/AltRoute'
import MenuIcon from '@mui/icons-material/Menu';
import { createElement, Fragment, HTMLAttributes, useRef, useState, JSX, useEffect } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import SettingsIcon from '@mui/icons-material/Settings';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings'
import KeyIcon from '@mui/icons-material/Key';
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ScienceIcon from '@mui/icons-material/Science';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { Logo } from './logo';
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeReact from 'rehype-react'
import remarkGfm from 'remark-gfm'
import { Element } from 'hast';
import { OverridableStringUnion } from '@mui/types'
import { unified } from 'unified';
import remarkDirective from 'remark-directive';
import { ExtraProps } from 'hast-util-to-jsx-runtime';
import { observer } from 'mobx-react-lite';
import { useFeedback } from '../contexts/feedback.context';
import { useFileOperations } from '../contexts/file-operations.context';
import AuthIcon from '../icons/auth-icon';
import DataSetIcon from '@mui/icons-material/Dataset';
import ScenarioIcon from '../icons/scenario-icon';
import CertificateIcon from '../icons/certificate-icon';
import ProxyIcon from '../icons/proxy-icon';
import RequestIcon from '../icons/request-icon';
import DefaultsIcon from '../icons/defaults-icon';
import PublicIcon from '../icons/public-icon';
import PrivateIcon from '../icons/private-icon';
import VaultIcon from '../icons/vault-icon';
import ApicizeIcon from '../icons/apicize-icon';
import TuneIcon from '@mui/icons-material/Tune'
import FolderIcon from '../icons/folder-icon';
import LogIcon from "../icons/log-icon";
import PlayCircleOutlined from '@mui/icons-material/PlayCircleOutlined'
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'
import PostAddIcon from '@mui/icons-material/PostAdd'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import SaveIcon from '@mui/icons-material/Save'
import SaveAsIcon from '@mui/icons-material/SaveAs'

import { useApicizeSettings } from '../contexts/apicize-settings.context';
import { useWorkspace } from '../contexts/workspace.context';
import { DropdownMenu } from './navigation/dropdown-menu';
import { HelpContents } from '../models/help-contents';
import { createRemarkApicizeDirectives } from '../services/help-formatter';
import SeedIcon from '../icons/seed-icon'

export const HelpPanel = observer(({ sx }: { sx?: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const fileOps = useFileOperations()
    const feedback = useFeedback()

    const name = settings.appName
    const version = settings.appVersion

    const [isLoading, setIsLoading] = useState(false)
    const [content, setContent] = useState(createElement(Fragment));
    const [contentsMenu, setContentsMenu] = useState<null | HTMLElement>(null)
    const [helpContents, setHelpContents] = useState<null | HelpContents>(null)

    const activeTopic = useRef('')

    const handleShowContents = () => {
        const target = document.getElementById('help-contents-button')
        if (helpContents) {
            setContentsMenu(target)
        } else {
            fileOps.retrieveHelpContents()
                .then(contents => {
                    setHelpContents(contents)
                    setContentsMenu(target)
                })
                .catch(e => feedback.toastError(e))
        }
    };

    const handleShowHelp = (topic: string) => {
        setContentsMenu(null);
        workspace.showHelp(topic)
    }

    const handleContentsMenuClose = () => {
        setContentsMenu(null);
    };

    const remarkApicizeDirectives = createRemarkApicizeDirectives({
        appName: name,
        appVersion: version,
        ctrlKey: settings.ctrlKey,
    })

    const rehypeTransformHeader = (attrs: JSX.IntrinsicElements['h1'] & TypographyProps & ExtraProps): React.ReactNode => {
        let id
        if (attrs.children && attrs.node) {
            if (Array.isArray(attrs.children)) {
                const first = attrs.children[0]
                if (first) id = first.toString()
            } else if (typeof (attrs.children) === 'string') {
                id = attrs.children
            } else {
                id = null // attrs.children.toString()
            }
        }
        if (id) {
            id = id.trim().toLowerCase().replace(/[^\s\w]/g, '').replace(/\s/g, '-')
            const name = (attrs.node as Element).tagName as OverridableStringUnion<TypographyVariant | 'inherit', TypographyPropsVariantOverrides>
            return <Typography id={id} component='div' variant={name} {...attrs} />
        } else {
            return null
        }
    }

    const rehypeTransformIcon = (attrs: HTMLAttributes<any>) => {
        const attrsWithNode = attrs as any
        const name = (attrsWithNode.node).properties.name
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
            case 'workbook-save':
                return <SvgIcon className='help-icon'><SaveIcon /></SvgIcon>
            case 'workbook-save-as':
                return <SvgIcon className='help-icon'><SaveAsIcon /></SvgIcon>
            case 'app-settings':
                return <SvgIcon className='help-icon'><TuneIcon /></SvgIcon>
            case 'lock':
                return <SvgIcon className='help-icon'><KeyIcon /></SvgIcon>
            case 'clear':
                return <SvgIcon className='help-icon'><ClearAllIcon color='warning' /></SvgIcon>
            default:
                return null
        }
    }

    const rehypeTranformAnchor = (attrs: JSX.IntrinsicElements['a'] & LinkProps & ExtraProps): React.ReactNode => {
        if (attrs.href) {
            if (attrs.href.startsWith('help:')) {
                const topic = attrs.href.substring(5)
                attrs = { ...attrs, href: '#' }
                return <Link {...attrs} onClick={() => workspace.showHelp(topic)} />
            }
            else if (/^https:\/\//.test(attrs.href)) {
                const url = attrs.href
                attrs = { ...attrs, href: '#' }
                return <Link {...attrs} onClick={() => workspace.openUrl(url)} />
            }
            else if (attrs.href.startsWith('icon:')) {
                return <DisplaySettingsIcon />
            }
        }
        return <Link {...attrs} />
    }

    const rehypeTransformParagraph = (attrs: ExtraProps): React.ReactNode => {
        return <Typography component='div' variant='body1' {...attrs} />
    }

    const rehypeTransformToolbar = (/*attrs: ExtraProps*/): React.ReactNode => renderToolbar()

    const rehypeTransformToolbarTop = (/*attrs: ExtraProps*/): React.ReactNode => renderToolbar('help-toolbar top')

    const renderToolbar = (className: string = 'help-toolbar') => {
        return (
            <Box className={className}>
                <Box className='help-toolbar-start'>
                    {
                        workspace.allowHelpBack
                            ? <IconButton color='primary' size='medium' aria-label='Back' title='Back' onClick={() => workspace.helpBack()}><ArrowBackIcon fontSize='inherit' /></IconButton>
                            : <></>
                    }
                    <IconButton id='close-button' color='primary' size='large' aria-label='Close' title='Close' onClick={() => workspace.returnToNormal()}><CloseIcon fontSize='inherit' color='error' /></IconButton>
                </Box>
                <Box className='help-toolbar-end'>
                    {
                        workspace.allowHelpHome
                            ? <IconButton color='primary' size='large' aria-label='Home' title='Home' onClick={() => workspace.showHelp('home')}><HomeIcon fontSize='inherit' /></IconButton>
                            : <></>
                    }
                    <IconButton id='help-contents-button' color='default' size='large' aria-label='Contents' title='Contents' onClick={() => handleShowContents()}><MenuIcon fontSize='inherit' /></IconButton>
                    {
                        workspace.allowHelpAbout
                            ? <IconButton color='primary' size='large' aria-label='About' title='About' onClick={() => workspace.showHelp('about')}><QuestionMarkIcon fontSize='inherit' /></IconButton>
                            : <></>
                    }
                </Box>
            </Box>
        )
    }

    // Make sure we do not go through overhead of re-rendering the existing topic
    useEffect(() => {
        if (workspace.helpTopic !== activeTopic.current) {
            activeTopic.current = workspace.helpTopic ?? ''
            setIsLoading(true)
            fileOps.retrieveHelpTopic(activeTopic.current)
                .then(contents =>
                    unified()
                        .use(remarkParse)
                        .use(remarkGfm)
                        .use(remarkDirective)
                        .use(remarkApicizeDirectives)
                        .use(remarkRehype)
                        // @ts-expect-error rehypeReact typing issue 
                        .use(rehypeReact, {
                            Fragment,
                            jsx,
                            jsxs,
                            passNode: true,
                            components: {
                                logo: Logo,
                                icon: rehypeTransformIcon,
                                toolbar: rehypeTransformToolbar,
                                toolbarTop: rehypeTransformToolbarTop,
                                h1: rehypeTransformHeader,
                                h2: rehypeTransformHeader,
                                h3: rehypeTransformHeader,
                                h4: rehypeTransformHeader,
                                h5: rehypeTransformHeader,
                                h6: rehypeTransformHeader,
                                a: rehypeTranformAnchor,
                                p: rehypeTransformParagraph,
                            }
                        })
                        .process(contents)
                ).then(r => {
                    setIsLoading(false)
                    setContent(r.result)
                }).catch(err => {
                    setIsLoading(false)
                    setContent(<></>)
                    feedback.toastError(err)
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace.helpTopic])

    const HelpContents = () => {
        if (helpContents === null) {
            return null
        }

        let idx = 0
        const nextKey = () => {
            idx += 1
            return `helpCnt-${idx}`
        }

        const renderHelpContent = ([name, value]: [string, string | HelpContents]): any => {
            return (typeof value == 'string')
                ? <MenuItem key={nextKey()} disableRipple onClick={() => handleShowHelp(value)}>
                    <Box display='block'>
                        {name}
                    </Box>
                </MenuItem>
                : <Box key={nextKey()}>
                    <ListSubheader key={nextKey()}>{name}</ListSubheader>
                    <Box key={nextKey()} className='child-menu'>
                        {Object.entries(value).map(renderHelpContent)}
                    </Box>
                </Box >
        }
        return Object.entries(helpContents).map(renderHelpContent)
    }

    return <Box className='help' sx={sx}>
        {
            isLoading
                ? <Box display='flex' alignItems='center' justifyContent='center' height='100%' width='100%'><Typography variant='h2'>Loading Help, One Moment Please...</Typography></Box>
                : <>
                    <Box className='help-text'>
                        {content}
                    </Box>
                    <DropdownMenu
                        id="help-contents-menu"
                        autoFocus
                        className="drop-down-menu help-contents"
                        anchorEl={contentsMenu}
                        open={contentsMenu !== null}
                        onClose={handleContentsMenuClose}
                    >
                        <HelpContents />
                    </DropdownMenu>
                </>
        }
    </Box>
})
