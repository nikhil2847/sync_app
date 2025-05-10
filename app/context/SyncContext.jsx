// app/components/SyncContext.jsx

import { createContext, useContext, useState } from "react";

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
    const [isSyncing, setIsSyncing] = useState(false);

    return (
        <SyncContext.Provider value={{ isSyncing, setIsSyncing }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);
