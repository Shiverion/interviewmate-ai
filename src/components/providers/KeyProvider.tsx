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
    saveFirebaseConfig,
    saveOpenAIKey,
    type FirebaseConfig,
    type StoredKeys,
} from "@/lib/keys/store";
import { initializeFirebase, resetFirebase } from "@/lib/firebase/config";

interface KeyContextType {
    isConfigured: boolean;
    isLoading: boolean;
    keys: StoredKeys;
    saveKeys: (firebase: FirebaseConfig, openai: string) => void;
    resetKeys: () => void;
    refreshStatus: () => void;
}

const KeyContext = createContext<KeyContextType>({
    isConfigured: false,
    isLoading: true,
    keys: { firebase: null, openai: null },
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
        firebase: null,
        openai: null,
    });

    const refreshStatus = useCallback(() => {
        const configured = hasAllKeys();
        setIsConfigured(configured);
        setKeys(getStoredKeys());

        // Initialize Firebase if keys are present
        if (configured) {
            initializeFirebase();
        }
    }, []);

    useEffect(() => {
        refreshStatus();
        setIsLoading(false);
    }, [refreshStatus]);

    const saveKeys = useCallback(
        (firebase: FirebaseConfig, openai: string) => {
            saveFirebaseConfig(firebase);
            saveOpenAIKey(openai);
            initializeFirebase(firebase);
            refreshStatus();
        },
        [refreshStatus]
    );

    const resetKeys = useCallback(() => {
        clearAllKeys();
        resetFirebase();
        setIsConfigured(false);
        setKeys({ firebase: null, openai: null });
    }, []);

    return (
        <KeyContext.Provider
            value={{ isConfigured, isLoading, keys, saveKeys, resetKeys, refreshStatus }}
        >
            {children}
        </KeyContext.Provider>
    );
}
