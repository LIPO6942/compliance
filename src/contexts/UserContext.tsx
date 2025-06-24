
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";


export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

interface UserContextType {
  user: UserProfile;
  updateUser: (newProfile: Partial<UserProfile>) => void;
  isLoaded: boolean;
}

const defaultUser: UserProfile = {
  name: 'Utilisateur',
  role: 'Responsable Conformité',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzUwOTgzODg5fDA&ixlib=rb-4.1.0&q=80&w=1080',
};

const userDocPath = "users/main-user"; // Using a single document for this prototype

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Sign in anonymously to satisfy security rules
    signInAnonymously(auth).catch(error => {
        console.error("Anonymous sign-in failed: ", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
        if (authUser) {
            const userDocRef = doc(db, userDocPath);
            const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUser(docSnap.data() as UserProfile);
                } else {
                    // If user profile doesn't exist, create it with default data
                    setDoc(userDocRef, defaultUser);
                    setUser(defaultUser);
                }
                setIsLoaded(true);
            });

            return () => unsubscribeSnapshot();
        } else {
            // Handle user being signed out
            setIsLoaded(true);
            setUser(defaultUser);
        }
    });
    
    return () => unsubscribeAuth();
  }, []);

  const updateUser = async (newProfile: Partial<UserProfile>) => {
    const userDocRef = doc(db, userDocPath);
    const updatedUser = { ...user, ...newProfile };
    await setDoc(userDocRef, updatedUser, { merge: true });
    // The onSnapshot listener will update the state automatically
  };

  return (
    <UserContext.Provider value={{ user, updateUser, isLoaded }}>
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
