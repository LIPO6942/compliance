
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";


export interface UserProfile {
  name: string;
  role: string;
  email: string;
}

interface UserContextType {
  user: UserProfile;
  updateUser: (newProfile: Partial<UserProfile>) => void;
  isLoaded: boolean;
}

const defaultUser: UserProfile = {
  name: 'Utilisateur',
  role: 'Responsable Conformité',
  email: 'conformite@mae.com.tn',
};

const userDocPath = "users/main-user"; // Using a single document for this prototype

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
        setIsLoaded(true);
        setUser(defaultUser);
        console.warn("Firebase not configured. Using default user profile. Profile changes will not be saved.");
        return;
    }

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
            }, (error) => {
                console.error("Error fetching user profile:", error);
                setUser(defaultUser);
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
    if (!isFirebaseConfigured || !db) return;
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
