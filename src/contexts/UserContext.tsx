'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { getDeviceId, getDeviceInfo } from '@/lib/deviceHelper';

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  authEmail?: string;
  uid?: string;
}

interface UserContextType {
  user: UserProfile | null;
  isLoaded: boolean;
  error: string | null;
  login: (email: string) => Promise<void>;
  updateUser: (newProfile: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const defaultUser: UserProfile = {
  name: 'Utilisateur',
  role: 'Responsable Conformité',
  email: 'conformite@mae.com.tn',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle incoming email links
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const handleEmailLink = async () => {
      if (isSignInWithEmailLink(auth!, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Veuillez confirmer votre email pour la connexion :');
        }
        if (email) {
          try {
            await signInWithEmailLink(auth!, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            // URL cleanup
            window.history.replaceState({}, '', window.location.pathname);
          } catch (err: any) {
            console.error("Error signing in with email link:", err);
            setError("Impossible de valider le lien de connexion.");
          }
        }
      }
    };

    handleEmailLink();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setIsLoaded(true);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDocRef = doc(db!, 'users', authUser.uid);

        // Register device
        const deviceId = getDeviceId();
        const deviceRef = doc(db!, 'users', authUser.uid, 'devices', deviceId);
        await setDoc(deviceRef, getDeviceInfo(), { merge: true });

        const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;

            // Auto-upgrade "Utilisateur" name if team data exists and we haven't checked yet
            if (data.name === 'Utilisateur' && authUser.email) {
              try {
                const teamSnap = await getDocs(collection(db!, 'team'));
                const matchingMember = teamSnap.docs.find(d => {
                  const mData = d.data();
                  return mData.email === authUser.email || mData.secondaryEmail === authUser.email;
                });

                if (matchingMember) {
                  const mData = matchingMember.data();
                  const updatedData = { ...data, name: mData.name, role: mData.role };
                  await setDoc(userDocRef, updatedData, { merge: true });
                  // The snapshot will fire again, but we update locally for immediate effect
                  setUser({ ...updatedData, uid: authUser.uid, authEmail: authUser.email });
                  return;
                }
              } catch (err: unknown) { // Fixed 'any' type
                console.warn("Failed to auto-upgrade profile:", err);
              }
            }

            setUser({
              ...data,
              uid: authUser.uid,
              authEmail: authUser.email || undefined
            });
          } else {
            // Try to find matching team member for auto-initialization
            let initialProfile = { ...defaultUser, email: authUser.email || '', authEmail: authUser.email || '', uid: authUser.uid };

            try {
              const teamSnap = await getDocs(collection(db!, 'team'));
              const matchingMember = teamSnap.docs.find(d => {
                const data = d.data();
                return data.email === authUser.email || data.secondaryEmail === authUser.email;
              });

              if (matchingMember) {
                const memberData = matchingMember.data();
                initialProfile = {
                  ...initialProfile,
                  name: memberData.name,
                  role: memberData.role,
                };
              }
            } catch (err) {
              console.warn("Could not auto-match team member:", err);
            }

            await setDoc(userDocRef, initialProfile);
            setUser(initialProfile);
          }
          setIsLoaded(true);
        }, (err) => {
          console.error("Error fetching user profile:", err);
          setIsLoaded(true);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setIsLoaded(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string) => {
    if (!auth) return;
    const actionCodeSettings = {
      url: window.location.origin + '/login', // Redirect specifically to login page to handle link
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth!, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  };

  const updateUser = async (newProfile: Partial<UserProfile>) => {
    if (!isFirebaseConfigured || !db || !user?.uid) return;
    const userDocRef = doc(db!, 'users', user.uid);
    await setDoc(userDocRef, newProfile, { merge: true });
  };

  const logout = async () => {
    if (auth) await auth.signOut();
  };

  return (
    <UserContext.Provider value={{ user, isLoaded, error, login, updateUser, logout }}>
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
