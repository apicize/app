/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import { LinkProps } from '@mui/material/Link'
import { SxProps, TypographyVariant } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { TypographyProps, TypographyPropsVariantOverrides } from '@mui/material/Typography'
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { createElement, Fragment, useRef, useState, JSX, useEffect } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings'
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


import { useApicizeSettings } from '../contexts/apicize-settings.context';
import { useWorkspace } from '../contexts/workspace.context';
import { createRemarkApicizeDirectives } from '../services/help-formatter';
import { renderHelpIcon } from '../services/help-icon-renderer';

export const HelpPanel = observer(({ sx }: { sx?: SxProps }) => {
    const settings = useApicizeSettings()
    const workspace = useWorkspace()
    const fileOps = useFileOperations()
    const feedback = useFeedback()

    const name = settings.appName
    const version = settings.appVersion

    const [isLoading, setIsLoading] = useState(false)
    const [content, setContent] = useState(createElement(Fragment));

    const activeTopic = useRef('')

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
        }
        const name = (attrs.node as Element).tagName as OverridableStringUnion<TypographyVariant | 'inherit', TypographyPropsVariantOverrides>
        return <Typography id={id ?? undefined} component='div' variant={name} {...attrs} />
    }

    const rehypeTransformIcon = (attrs: ExtraProps) => {
        const name = attrs.node?.properties.name
        if (typeof name === 'string') {
            return renderHelpIcon(name)
        } else {
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

    const rehypeTransformColumns = (attrs: ExtraProps): React.ReactNode => {
        return <Box className='help-columns' {...attrs} />
    }

    const rehypeTransformColumn = (attrs: ExtraProps): React.ReactNode => {
        return <Box className='help-column' {...attrs} />
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
                        workspace.allowHelpContents
                            ? <IconButton color='primary' size='large' aria-label='Home' title='Home' onClick={() => workspace.showHelp('contents')}><HomeIcon fontSize='inherit' /></IconButton>
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
                                columns: rehypeTransformColumns,
                                column: rehypeTransformColumn,
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

    return <Box className='help' sx={sx}>
        {
            isLoading
                ? <Box display='flex' alignItems='center' justifyContent='center' height='100%' width='100%'><Typography variant='h2'>Loading Help, One Moment Please...</Typography></Box>
                : <>
                    <Box className='help-text'>
                        {content}
                    </Box>
                </>
        }
    </Box>
})
