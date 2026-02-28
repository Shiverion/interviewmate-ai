"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import {
    hasAllKeys,
    getStoredKeys,
    clearAllKeys,
    saveOpenAIKey,
    type StoredKeys,
} from "@/lib/keys/store";

interface KeyContextType {
    isConfigured: boolean;
    isLoading: boolean;
    keys: StoredKeys;
    saveKeys: (openai: string) => void;
    resetKeys: () => void;
    refreshStatus: () => void;
}

const KeyContext = createContext<KeyContextType>({
    isConfigured: false,
    isLoading: true,
    keys: { openai: null },
    saveKeys: () => { },
    resetKeys: () => { },
    refreshStatus: () => { },
});

export function useKeys() {
    return useContext(KeyContext);
}

export function KeyProvider({ children }: { children: React.ReactNode }) {
    const [isConfigured, setIsConfigured] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [keys, setKeys] = useState<StoredKeys>({
        openai: null,
    });

    const refreshStatus = useCallback(() => {
        const configured = hasAllKeys();
        setIsConfigured(configured);
        setKeys(getStoredKeys());
    }, []);

    useEffect(() => {
        refreshStatus();
        setIsLoading(false);
    }, [refreshStatus]);

    const saveKeys = useCallback(
        (openai: string) => {
            saveOpenAIKey(openai);
            refreshStatus();
        },
        [refreshStatus]
    );

    const resetKeys = useCallback(() => {
        clearAllKeys();
        setIsConfigured(false);
        setKeys({ openai: null });
    }, []);

    return (
        <KeyContext.Provider
            value={{ isConfigured, isLoading, keys, saveKeys, resetKeys, refreshStatus }}
        >
            {children}
        </KeyContext.Provider>
    );
}
