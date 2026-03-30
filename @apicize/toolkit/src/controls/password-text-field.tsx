import { TextField, TextFieldProps } from "@mui/material"
import { useState, useCallback, forwardRef } from "react"

export const PasswordTextField = forwardRef<HTMLInputElement, TextFieldProps>(({ onFocus, onBlur, ...rest }, ref) => {
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
            inputRef={ref}
            type={focused ? 'text' : 'password'}
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    )
})
