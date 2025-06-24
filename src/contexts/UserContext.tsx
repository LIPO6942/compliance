
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

interface UserContextType {
  user: UserProfile;
  updateUser: (newProfile: Partial<UserProfile>) => void;
}

const defaultUser: UserProfile = {
  name: 'Utilisateur',
  role: 'Responsable Conformité',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzUwOTgzODg5fDA&ixlib=rb-4.1.0&q=80&w=1080',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('userProfile');
      try {
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            // Basic validation to ensure it's a user profile
            if(parsedUser.name && parsedUser.role) {
                return parsedUser;
            }
        }
      } catch (e) {
        console.error("Failed to parse user profile from localStorage", e);
      }
    }
    return defaultUser;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userProfile', JSON.stringify(user));
    }
  }, [user]);
  
  const updateUser = (newProfile: Partial<UserProfile>) => {
    setUser(prevUser => ({...prevUser, ...newProfile}));
  };

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
