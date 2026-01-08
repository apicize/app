import { createContext, useContext } from "react";
import { WorkspaceStore } from "./workspace.context";

export const OAuth2Context = createContext<WorkspaceStore | null>(null)

export function useOAuth2() {
    const context = useContext(OAuth2Context);
    if (!context) {
        throw new Error('useOAuth2 must be used within a OAuth2Context.Provider');
    }
    return context;
}
