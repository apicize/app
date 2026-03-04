import { TextField, TextFieldProps } from "@mui/material"
import { useState, useCallback } from "react"

export const PasswordTextField = ({ onFocus, onBlur, ...rest }: TextFieldProps) => {
    const [focused, setFocused] = useState(false)

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true)
        onFocus?.(e)
    }, [onFocus])

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false)
        onBlur?.(e)
    }, [onBlur])

    return (
        <TextField
            {...rest}
            type={focused ? 'text' : 'password'}
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    )
}
