import MuiAlert, { AlertProps } from '@mui/material/Alert';
import React from 'react';
import { Snackbar } from '@mui/material';
import { useFeedback } from '@apicize/toolkit';
import { observer } from 'mobx-react-lite';

export const Toast = observer(() => {
    const store = useFeedback()
    const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
        props,
        ref,
    ) {
        return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
    });

    return (
        <>
            <Snackbar open={store.toastOpen} autoHideDuration={6000} onClose={() => store.closeToast()}>
                <Alert data-testid='toast' data-severity={store.toastSeverity} onClose={() => store.closeToast()} severity={store.toastSeverity} sx={{ width: '100%' }}>
                    {store.toastMessage}
                </Alert>
            </Snackbar>
        </>
    )
})
