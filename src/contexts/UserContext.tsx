'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
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
  officialFunction?: string;
  email: string;
  authEmail?: string;
  uid?: string;
}

export type EmailLinkStatus = 'idle' | 'verifying' | 'needs-email' | 'success' | 'error';

interface UserContextType {
  user: UserProfile | null;
  isLoaded: boolean;
  error: string | null;
  emailLinkStatus: EmailLinkStatus;
  emailLinkError: string | null;
  login: (email: string) => Promise<void>;
  loginDirectly: (email: string, name?: string, role?: string) => Promise<void>;
  completeEmailSignIn: (email: string) => Promise<void>;
  updateUser: (newProfile: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  clearEmailLinkStatus: () => void;
}

const defaultUser: UserProfile = {
  name: 'Utilisateur',
  role: 'Responsable Conformité',
  email: 'conformite@mae.com.tn',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// Helper to safely get stored email across storage engines
const getStoredEmailForSignIn = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage?.getItem('emailForSignIn') ||
           window.sessionStorage?.getItem('emailForSignIn') ||
           null;
  } catch {
    return null;
  }
};

const setStoredEmailForSignIn = (email: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem('emailForSignIn', email);
  } catch { /* ignore */ }
  try {
    window.sessionStorage?.setItem('emailForSignIn', email);
  } catch { /* ignore */ }
};

const clearStoredEmailForSignIn = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem('emailForSignIn');
  } catch { /* ignore */ }
  try {
    window.sessionStorage?.removeItem('emailForSignIn');
  } catch { /* ignore */ }
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailLinkStatus, setEmailLinkStatus] = useState<EmailLinkStatus>('idle');
  const [emailLinkError, setEmailLinkError] = useState<string | null>(null);

  const pendingLinkRef = useRef<string | null>(null);

  const clearEmailLinkStatus = useCallback(() => {
    setEmailLinkStatus('idle');
    setEmailLinkError(null);
  }, []);

  const formatFirebaseAuthError = (code: string): string => {
    switch (code) {
      case 'auth/quota-exceeded':
        return "Quota journalier d'envoi d'emails Firebase dépassé (limite du forfait gratuit). Utilisez la connexion directe ci-dessous pour accéder immédiatement à l'application.";
      case 'auth/invalid-action-code':
        return 'Ce lien de connexion est invalide ou a déjà été utilisé. Veuillez générer un nouveau lien.';
      case 'auth/expired-action-code':
        return 'Ce lien de connexion a expiré. Veuillez demander un nouveau lien de connexion.';
      case 'auth/invalid-email':
        return "L'adresse email saisie est incorrecte ou ne correspond pas au destinataire du lien.";
      case 'auth/user-disabled':
        return 'Ce compte utilisateur a été temporairement désactivé.';
      default:
        return 'Impossible de vérifier votre identité avec ce lien. Veuillez réessayer.';
    }
  };

  const completeEmailSignIn = useCallback(async (email: string) => {
    if (!auth || typeof window === 'undefined') return;

    const currentUrl = pendingLinkRef.current || window.location.href;
    if (!isSignInWithEmailLink(auth, currentUrl)) {
      setEmailLinkStatus('error');
      setEmailLinkError("Le lien actuel n'est pas un lien de connexion valide.");
      return;
    }

    setEmailLinkStatus('verifying');
    setEmailLinkError(null);

    try {
      await signInWithEmailLink(auth, email.trim(), currentUrl);
      clearStoredEmailForSignIn();
      pendingLinkRef.current = null;
      setEmailLinkStatus('success');

      // Clean up URL without reload
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {
        // ignore history errors
      }
    } catch (err: any) {
      console.error("Error signing in with email link:", err);
      const code = err?.code || '';
      const friendlyMessage = formatFirebaseAuthError(code);
      setEmailLinkStatus('error');
      setEmailLinkError(friendlyMessage);
      setError(friendlyMessage);
      throw err;
    }
  }, []);

  // Direct login without relying on email link quota (for dev, testing, or quota fallback)
  const loginDirectly = useCallback(async (email: string, name?: string, role?: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) throw new Error("Veuillez saisir une adresse email.");

    let targetName = name;
    let targetRole = role;

    // Auto-match name and role from team if not provided
    if (!targetName && db && isFirebaseConfigured) {
      try {
        const teamSnap = await getDocs(collection(db, 'team'));
        const member = teamSnap.docs.find(d => {
          const mData = d.data();
          return mData.email === trimmedEmail || mData.secondaryEmail === trimmedEmail;
        });
        if (member) {
          targetName = member.data().name;
          targetRole = member.data().role;
        }
      } catch { /* ignore */ }
    }

    if (!targetName) {
      if (trimmedEmail.toLowerCase().includes('moslem') || trimmedEmail.toLowerCase().includes('gouia')) {
        targetName = 'Moslem G.';
        targetRole = 'Direction Compliance & GRC';
      } else if (trimmedEmail.toLowerCase().includes('sarah')) {
        targetName = 'Sarah L.';
        targetRole = 'Legal Counsel';
      } else if (trimmedEmail.toLowerCase().includes('karim')) {
        targetName = 'Karim B.';
        targetRole = 'Risk Officer';
      } else {
        targetName = trimmedEmail.split('@')[0];
        targetRole = 'Responsable Conformité';
      }
    }

    // Try signing in anonymously to Firebase Auth if not already logged in
    let uid = auth?.currentUser?.uid;
    if (auth && isFirebaseConfigured && !uid) {
      try {
        const { signInAnonymously } = await import("firebase/auth");
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      } catch (anonErr) {
        console.warn("Anonymous sign-in not available, falling back to local UID:", anonErr);
        uid = `usr-${Date.now()}`;
      }
    } else if (!uid) {
      uid = `usr-${Date.now()}`;
    }

    const newProfile: UserProfile = {
      name: targetName || 'Utilisateur',
      role: targetRole || 'Responsable Conformité',
      email: trimmedEmail,
      authEmail: trimmedEmail,
      uid: uid
    };

    if (db && isFirebaseConfigured && uid) {
      try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, newProfile, { merge: true });
      } catch (err) {
        console.warn("Could not sync user profile to Firestore (non-blocking):", err);
      }
    }

    try {
      window.localStorage?.setItem('compliance_saved_user', JSON.stringify(newProfile));
    } catch { /* ignore */ }

    setUser(newProfile);
    setIsLoaded(true);
  }, []);

  // Handle incoming email links on mount (Mobile & Desktop)
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || typeof window === 'undefined') return;

    const href = window.location.href;
    if (isSignInWithEmailLink(auth, href)) {
      pendingLinkRef.current = href;
      const storedEmail = getStoredEmailForSignIn();

      if (storedEmail) {
        // We have the email stored locally -> auto-login immediately
        completeEmailSignIn(storedEmail).catch(() => {
          setEmailLinkStatus('needs-email');
        });
      } else {
        // User opened email on mobile / new browser -> show email confirmation in UI
        setEmailLinkStatus('needs-email');
      }
    }
  }, [completeEmailSignIn]);

  // Listen to Auth State and sync user profile
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      // Check for locally saved user session
      try {
        const saved = typeof window !== 'undefined' ? window.localStorage?.getItem('compliance_saved_user') : null;
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch { /* ignore */ }
      setIsLoaded(true);
      return;
    }

    // Safety timeout: ensure isLoaded is true within 6 seconds
    const safetyTimer = setTimeout(() => {
      setIsLoaded((prev) => {
        if (!prev) {
          console.warn("Firebase Auth load timed out; forcing isLoaded to true.");
          return true;
        }
        return prev;
      });
    }, 6000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const userDocRef = doc(db!, 'users', authUser.uid);

          // Register device safely (non-blocking)
          try {
            const deviceId = getDeviceId();
            const deviceRef = doc(db!, 'users', authUser.uid, 'devices', deviceId);
            await setDoc(deviceRef, getDeviceInfo(), { merge: true });
          } catch (devErr) {
            console.warn("Device registration failed (non-blocking):", devErr);
          }

          const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
            try {
              if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;

                // Auto-upgrade "Utilisateur" name if team data exists
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
                      setUser({ ...updatedData, uid: authUser.uid, authEmail: authUser.email });
                      setIsLoaded(true);
                      clearTimeout(safetyTimer);
                      return;
                    }
                  } catch (teamErr) {
                    console.warn("Failed to auto-upgrade profile:", teamErr);
                  }
                }

                setUser({
                  ...data,
                  uid: authUser.uid,
                  authEmail: authUser.email || ''
                });
              } else {
                // Initialize default profile
                let initialProfile: UserProfile = {
                  ...defaultUser,
                  email: authUser.email || '',
                  authEmail: authUser.email || '',
                  uid: authUser.uid
                };

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
                } catch (teamErr) {
                  console.warn("Could not auto-match team member:", teamErr);
                }

                try {
                  await setDoc(userDocRef, initialProfile);
                } catch (setErr) {
                  console.warn("Could not persist initial profile:", setErr);
                }
                setUser(initialProfile);
              }
            } catch (snapErr) {
              console.error("Error processing user profile snapshot:", snapErr);
              setUser({
                ...defaultUser,
                email: authUser.email || '',
                authEmail: authUser.email || '',
                uid: authUser.uid,
              });
            } finally {
              setIsLoaded(true);
              clearTimeout(safetyTimer);
            }
          }, (snapErr) => {
            console.error("Error fetching user profile snapshot:", snapErr);
            setUser({
              ...defaultUser,
              email: authUser.email || '',
              authEmail: authUser.email || '',
              uid: authUser.uid,
            });
            setIsLoaded(true);
            clearTimeout(safetyTimer);
          });

          return () => unsubscribeSnapshot();
        } catch (authProcErr) {
          console.error("Error initializing authenticated user:", authProcErr);
          setIsLoaded(true);
          clearTimeout(safetyTimer);
        }
      } else {
        // If not logged into Firebase, check localStorage
        try {
          const saved = typeof window !== 'undefined' ? window.localStorage?.getItem('compliance_saved_user') : null;
          if (saved) {
            setUser(JSON.parse(saved));
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
        setIsLoaded(true);
        clearTimeout(safetyTimer);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeAuth();
    };
  }, []);

  const login = async (email: string) => {
    if (typeof window === 'undefined') return;

    if (!isFirebaseConfigured || !auth) {
      throw new Error("Configuration Firebase manquante. Veuillez vérifier vos identifiants dans .env.local.");
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error("Veuillez saisir une adresse email valide.");
    }

    const actionCodeSettings = {
      url: window.location.origin + '/login',
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, trimmedEmail, actionCodeSettings);
      setStoredEmailForSignIn(trimmedEmail);
    } catch (err: any) {
      console.error("Firebase sendSignInLinkToEmail error:", err);
      const code = err?.code || '';
      let msg = "Une erreur est survenue lors de l'envoi du lien magique.";

      if (code === 'auth/quota-exceeded') {
        msg = "Quota journalier d'envoi d'emails Firebase dépassé (limite du forfait gratuit). Utilisez la connexion directe ci-dessous pour accéder immédiatement à l'application sans attendre.";
      } else if (code === 'auth/unauthorized-domain') {
        msg = `Le domaine "${window.location.hostname}" n'est pas autorisé dans Firebase. Ajoutez ce domaine dans la Console Firebase > Authentication > Paramètres > Domaines autorisés.`;
      } else if (code === 'auth/operation-not-allowed') {
        msg = "La méthode 'Lien par e-mail (connexion sans mot de passe)' doit être activée dans la Console Firebase > Authentication > Modes de connexion.";
      } else if (code === 'auth/invalid-email') {
        msg = "L'adresse email saisie n'est pas valide.";
      } else if (code === 'auth/too-many-requests') {
        msg = "Trop de tentatives envoyées récemment. Veuillez patienter quelques minutes avant de réessayer.";
      } else if (code === 'auth/network-request-failed') {
        msg = "Échec de connexion au réseau. Vérifiez votre accès Internet.";
      } else if (err?.message) {
        msg = err.message;
      }

      throw new Error(msg);
    }
  };

  const updateUser = async (newProfile: Partial<UserProfile>) => {
    if (!isFirebaseConfigured || !db || !user?.uid) {
      if (user) {
        const updated = { ...user, ...newProfile };
        setUser(updated);
        try {
          window.localStorage?.setItem('compliance_saved_user', JSON.stringify(updated));
        } catch { /* ignore */ }
      }
      return;
    }
    const userDocRef = doc(db, 'users', user.uid);
    const sanitized = Object.fromEntries(
      Object.entries(newProfile).filter(([, v]) => v !== undefined)
    );
    await setDoc(userDocRef, sanitized, { merge: true });
  };

  const logout = async () => {
    if (auth) {
      try {
        await auth.signOut();
      } catch { /* ignore */ }
    }
    try {
      window.localStorage?.removeItem('compliance_saved_user');
    } catch { /* ignore */ }
    setUser(null);
    clearStoredEmailForSignIn();
    clearEmailLinkStatus();
  };

  return (
    <UserContext.Provider value={{
      user,
      isLoaded,
      error,
      emailLinkStatus,
      emailLinkError,
      login,
      loginDirectly,
      completeEmailSignIn,
      updateUser,
      logout,
      clearEmailLinkStatus
    }}>
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


