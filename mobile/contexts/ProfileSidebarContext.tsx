import React, { createContext, useContext, useState, useCallback } from 'react';

interface ContextValue {
  openSidebar: () => void;
  closeSidebar: () => void;
  sidebarVisible: boolean;
}

const ProfileSidebarContext = createContext<ContextValue>({
  openSidebar: () => {},
  closeSidebar: () => {},
  sidebarVisible: false,
});

export function ProfileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const openSidebar = useCallback(() => setSidebarVisible(true), []);
  const closeSidebar = useCallback(() => setSidebarVisible(false), []);
  return (
    <ProfileSidebarContext.Provider value={{ openSidebar, closeSidebar, sidebarVisible }}>
      {children}
    </ProfileSidebarContext.Provider>
  );
}

export const useProfileSidebar = () => useContext(ProfileSidebarContext);
