import { TextField, TextFieldProps } from "@mui/material"
import { useState, useCallback } from "react"

export const PasswordTextField = (props: TextFieldProps) => {
    const [focused, setFocused] = useState(false)

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true)
        props.onFocus?.(e)
    }, [props.onFocus])

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false)
        props.onBlur?.(e)
    }, [props.onBlur])

    return (
        <TextField
            {...props}
            type={focused ? 'text' : 'password'}
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    )
}
