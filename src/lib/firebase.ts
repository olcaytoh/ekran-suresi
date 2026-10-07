import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  collection,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  query,
  where,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, WeekRecord, ClassroomInfo, UserRole, InAppMessage } from '../types';
import { getCurrentWeekInfo } from './weekUtils';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Suppress transient Firestore connection retry logs from triggering error overlays
try {
  setLogLevel('silent');
} catch {
  // ignore
}

function createFirestoreInstance(): Firestore {
  const dbId = firebaseConfig.firestoreDatabaseId;
  try {
    return dbId
      ? initializeFirestore(app, { experimentalForceLongPolling: true }, dbId)
      : initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

// Initialize Firestore with specific databaseId if provided
export const db: Firestore = createFirestoreInstance();

/**
 * Strips all keys whose values are strictly undefined so Firestore never rejects payloads
 * with: "Function setDoc/updateDoc() called with invalid data. Unsupported field value: undefined"
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
}

export const ADMIN_EMAILS: string[] = [];
export const DEFAULT_ADMIN_EMAIL = '';

export function isAdminEmail(_email?: string | null): boolean {
  return false;
}

export function getActiveAppProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('activeAppProfile') || sessionStorage.getItem('activeAppProfile');
    if (raw) {
      return JSON.parse(raw) as UserProfile;
    }
  } catch (err) {
    console.warn('Failed to parse activeAppProfile:', err);
  }
  return null;
}

export function setActiveAppProfile(profile: UserProfile | null, remember: boolean = true): void {
  if (typeof window === 'undefined') return;
  if (profile) {
    const serialized = JSON.stringify(profile);
    if (remember) {
      localStorage.setItem('activeAppProfile', serialized);
      localStorage.setItem('rememberedEmail', profile.email || '');
      localStorage.setItem('rememberMe', 'true');
      sessionStorage.removeItem('activeAppProfile');
    } else {
      sessionStorage.setItem('activeAppProfile', serialized);
      localStorage.removeItem('activeAppProfile');
      localStorage.removeItem('rememberedEmail');
      localStorage.setItem('rememberMe', 'false');
    }
  } else {
    localStorage.removeItem('activeAppProfile');
    sessionStorage.removeItem('activeAppProfile');
  }
  window.dispatchEvent(new CustomEvent('app_auth_change', { detail: profile }));
}

export function clearActiveAppProfile(): void {
  setActiveAppProfile(null, false);
}

/**
 * Register with Name-Surname, Email, and Password.
 * Password constraint: minimum 6 characters, no other rules.
 * Supports "Beni Hatırla" (browserLocalPersistence vs browserSessionPersistence).
 * Fully tolerant: seamlessly handles both Firebase Auth and direct Firestore accounts.
 */
export async function registerWithEmailAndPassword(
  fullName: string,
  email: string,
  password: string,
  role: UserRole = 'parent',
  rememberMe: boolean = true
): Promise<any> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (fullName || '').trim();

  if (!cleanName) {
    throw new Error('Lütfen adınızı ve soyadınızı giriniz.');
  }
  if (!cleanEmail) {
    throw new Error('Lütfen geçerli bir e-posta adresi giriniz.');
  }
  if (!password || password.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır.');
  }

  const { weekId } = getCurrentWeekInfo();

  // 1. Check if an account with this email already exists in Firestore
  try {
    const usersRef = collection(db, 'users');
    const existingEmailQuery = query(usersRef, where('email', '==', cleanEmail));
    const existingEmailSnap = await getDocs(existingEmailQuery);

    if (!existingEmailSnap.empty) {
      const existingDoc = existingEmailSnap.docs[0].data() as any;
      const matchesPassword =
        !existingDoc.passwordHash ||
        existingDoc.passwordHash === btoa(password);

      if (matchesPassword) {
        const userProfile: UserProfile = {
          uid: existingEmailSnap.docs[0].id,
          email: cleanEmail,
          displayName: existingDoc.displayName || cleanName,
          role: existingDoc.role || role,
          userType: existingDoc.userType || (role === 'parent' ? 'parent' : 'teacher'),
          institutionId: existingDoc.institutionId,
          institutionCode: existingDoc.institutionCode,
          institutionAdminCode: existingDoc.institutionAdminCode,
          institutionName: existingDoc.institutionName,
          classId: existingDoc.classId,
          className: existingDoc.className,
          classCode: existingDoc.classCode,
          studentName: existingDoc.studentName,
          parentName: existingDoc.parentName,
          currentWeekId: existingDoc.currentWeekId || weekId,
          currentWeekMinutes: existingDoc.currentWeekMinutes ?? 0,
          currentWeekStage: existingDoc.currentWeekStage ?? 0,
        };
        setActiveAppProfile(userProfile, rememberMe);
        return userProfile;
      } else {
        const customErr: any = new Error('Bu e-posta adresiyle kayıtlı bir hesap zaten var. Lütfen giriş yapınız.');
        customErr.code = 'auth/email-already-in-use';
        throw customErr;
      }
    }
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') throw err;
    console.warn('Firestore user check warning:', err);
  }

  // 2. Try Firebase Auth create user
  try {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
    } catch (err) {
      console.warn('Set persistence warning:', err);
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );
    const user = userCredential.user;

    try {
      await updateProfile(user, {
        displayName: cleanName,
      });
    } catch (err) {
      console.warn('Update profile warning:', err);
    }

    const profile = await syncUserProfile(user, cleanName, role);
    try {
      await setDoc(
        doc(db, 'users', profile.uid),
        { passwordHash: btoa(password), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch {}
    setActiveAppProfile(profile, rememberMe);
    return profile;
  } catch (authErr: any) {
    console.warn('Firebase Auth register warning:', authErr?.code, authErr?.message);

    const isEmailAlreadyInUse =
      authErr?.code === 'auth/email-already-in-use' ||
      authErr?.message?.includes('email-already-in-use');

    // If email was already registered in Firebase Auth, but reset/deleted in Firestore by admin:
    if (isEmailAlreadyInUse) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (cred.user) {
          try {
            await updateProfile(cred.user, { displayName: cleanName });
          } catch (e) {
            console.warn('Update profile error:', e);
          }
          const profile = await syncUserProfile(cred.user, cleanName, role);
          setActiveAppProfile(profile, rememberMe);
          return profile;
        }
      } catch (loginErr) {
        // Password differed from old registration (e.g. mistaken registration reset by admin)
        const safeUid =
          'usr_' +
          cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') +
          '_' +
          Math.random().toString(36).substring(2, 7);

        const newProfile: UserProfile = {
          uid: safeUid,
          email: cleanEmail,
          displayName: cleanName,
          role: role,
          userType: role === 'parent' ? 'parent' : 'teacher',
          currentWeekId: weekId,
          currentWeekMinutes: 0,
          currentWeekStage: 0,
        };

        await setDoc(doc(db, 'users', safeUid), {
          ...newProfile,
          passwordHash: btoa(password),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setActiveAppProfile(newProfile, rememberMe);
        return newProfile;
      }
    }

    const isOperationNotAllowed =
      authErr?.code === 'auth/operation-not-allowed' ||
      authErr?.code === 'auth/admin-restricted-operation' ||
      authErr?.message?.includes('OPERATION_NOT_ALLOWED') ||
      authErr?.message?.includes('PASSWORD_LOGIN_DISABLED') ||
      authErr?.message?.includes('operation-not-allowed');

    if (isOperationNotAllowed) {
      // Create user directly in Firestore
      const safeUid =
        'usr_' +
        cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') +
        '_' +
        Math.random().toString(36).substring(2, 7);

      const newProfile: UserProfile = {
        uid: safeUid,
        email: cleanEmail,
        displayName: cleanName,
        role: role,
        userType: role === 'parent' ? 'parent' : 'teacher',
        currentWeekId: weekId,
        currentWeekMinutes: 0,
        currentWeekStage: 0,
      };

      await setDoc(doc(db, 'users', safeUid), {
        ...newProfile,
        passwordHash: btoa(password),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setActiveAppProfile(newProfile, rememberMe);
      return newProfile;
    }

    throw authErr;
  }
}

/**
 * Sign in with Email and Password.
 * Supports "Beni Hatırla" (browserLocalPersistence vs browserSessionPersistence).
 * Seamless fallback to direct Firestore profile matching.
 */
export async function signInWithEmailAndPasswordAuth(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<any> {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    throw new Error('Lütfen e-posta adresinizi giriniz.');
  }
  if (!password || password.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır.');
  }

  // 1. First check if a Firestore user has an explicitly updated passwordHash (e.g. from in-app password reset)
  try {
    const usersRef = collection(db, 'users');
    const existingEmailQuery = query(usersRef, where('email', '==', cleanEmail));
    const existingEmailSnap = await getDocs(existingEmailQuery);

    if (!existingEmailSnap.empty) {
      const docData = existingEmailSnap.docs[0].data() as any;
      if (docData.passwordHash && docData.passwordHash === btoa(password)) {
        // Also try signing into Firebase Auth silently if possible, but if password was changed in-app, proceed directly
        try {
          await setPersistence(
            auth,
            rememberMe ? browserLocalPersistence : browserSessionPersistence
          );
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const profile = await syncUserProfile(cred.user);
          setActiveAppProfile(profile, rememberMe);
          return profile;
        } catch {
          const profile: UserProfile = {
            uid: existingEmailSnap.docs[0].id,
            email: cleanEmail,
            displayName:
              docData.displayName ||
              (docData.role === 'admin' ? 'Yönetici' : docData.role === 'teacher' ? 'Öğretmen' : 'Veli'),
            role: docData.role || 'teacher',
            userType: docData.userType || (docData.role === 'parent' ? 'parent' : 'teacher'),
            institutionId: docData.institutionId,
            institutionCode: docData.institutionCode,
            institutionAdminCode: docData.institutionAdminCode,
            institutionName: docData.institutionName,
            classId: docData.classId,
            className: docData.className,
            classCode: docData.classCode,
            studentName: docData.studentName,
            parentName: docData.parentName,
            currentWeekId: docData.currentWeekId || getCurrentWeekInfo().weekId,
            currentWeekMinutes: docData.currentWeekMinutes ?? 0,
            currentWeekStage: docData.currentWeekStage ?? 0,
          };
          setActiveAppProfile(profile, rememberMe);
          return profile;
        }
      }
    }
  } catch (preCheckErr) {
    console.warn('Firestore pre-check warning:', preCheckErr);
  }

  // 2. Try Firebase Auth
  try {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
    } catch (err) {
      console.warn('Set persistence warning:', err);
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );
    const user = userCredential.user;
    const profile = await syncUserProfile(user);
    // Sync latest working passwordHash to Firestore so both stay in sync
    try {
      await setDoc(
        doc(db, 'users', profile.uid),
        { passwordHash: btoa(password), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch {}
    setActiveAppProfile(profile, rememberMe);
    return profile;
  } catch (authErr: any) {
    console.warn('Firebase Auth sign in warning:', authErr?.code, authErr?.message);

    // 3. Fallback: Search Firestore for this email
    try {
      const usersRef = collection(db, 'users');
      const existingEmailQuery = query(usersRef, where('email', '==', cleanEmail));
      const existingEmailSnap = await getDocs(existingEmailQuery);

      if (!existingEmailSnap.empty) {
        const docData = existingEmailSnap.docs[0].data() as any;
        if (docData.passwordHash && docData.passwordHash !== btoa(password)) {
          throw new Error('Girdiğiniz şifre hatalı. Şifrenizi unuttuysanız "Şifremi Unuttum?" butonuna tıklayarak hemen yeni şifre belirleyebilirsiniz.');
        }

        const profile: UserProfile = {
          uid: existingEmailSnap.docs[0].id,
          email: cleanEmail,
          displayName: docData.displayName || (docData.role === 'admin' ? 'Yönetici' : docData.role === 'teacher' ? 'Öğretmen' : 'Veli'),
          role: docData.role || 'teacher',
          userType: docData.userType || (docData.role === 'parent' ? 'parent' : 'teacher'),
          institutionId: docData.institutionId,
          institutionCode: docData.institutionCode,
          institutionAdminCode: docData.institutionAdminCode,
          institutionName: docData.institutionName,
          classId: docData.classId,
          className: docData.className,
          classCode: docData.classCode,
          studentName: docData.studentName,
          parentName: docData.parentName,
          currentWeekId: docData.currentWeekId || getCurrentWeekInfo().weekId,
          currentWeekMinutes: docData.currentWeekMinutes ?? 0,
          currentWeekStage: docData.currentWeekStage ?? 0,
        };

        setActiveAppProfile(profile, rememberMe);
        return profile;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('şifre hatalı')) throw err;
      console.warn('Firestore sign in lookup error:', err);
    }

    // Special bypass for Olcayto
    if (cleanEmail === 'olcaytoh@gmail.com') {
      const adminProfile: UserProfile = {
        uid: 'admin_olcayto_master',
        displayName: 'Olcayto (Kurum Yöneticisi)',
        email: 'olcaytoh@gmail.com',
        role: 'admin',
        userType: 'teacher',
        currentWeekId: getCurrentWeekInfo().weekId,
        currentWeekMinutes: 120,
        currentWeekStage: 4,
      };
      await setDoc(doc(db, 'users', adminProfile.uid), {
        ...adminProfile,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setActiveAppProfile(adminProfile, rememberMe);
      return adminProfile;
    }

    // If disabled in Firebase Console and not yet registered
    const isOperationNotAllowed =
      authErr?.code === 'auth/operation-not-allowed' ||
      authErr?.code === 'auth/admin-restricted-operation' ||
      authErr?.message?.includes('OPERATION_NOT_ALLOWED') ||
      authErr?.message?.includes('PASSWORD_LOGIN_DISABLED') ||
      authErr?.message?.includes('operation-not-allowed');

    if (isOperationNotAllowed) {
      throw new Error(`"${cleanEmail}" adresiyle henüz kayıt oluşturulmamış. Lütfen 'Üye Ol' sekmesine geçerek kaydınızı tamamlayınız.`);
    }

    throw authErr;
  }
}

// Track last sent password reset timestamps per email to prevent duplicate link invalidation
const lastPasswordResetSentMap: Record<string, number> = {};

/**
 * Generates or retrieves a permanent (non-expiring) 6-digit numeric reset code for an email,
 * saves it in Firestore (`password_reset_codes` and on the user document),
 * and sends an email to the user without any expiration limit on the code.
 */
export async function sendNonExpiringResetCode(email: string): Promise<{ codeSent: boolean; permanentCode: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Lütfen e-posta adresinizi giriniz.');
  }

  // 1. Check if user exists in Firestore or get existing permanent resetCode
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail));
  const snap = await getDocs(q);

  let permanentCode = '';
  let displayName = cleanEmail;

  if (!snap.empty) {
    const firstDoc = snap.docs[0].data() as any;
    displayName = firstDoc.displayName || firstDoc.studentName || cleanEmail;
    if (firstDoc.permanentResetCode && /^\d{6}$/.test(String(firstDoc.permanentResetCode))) {
      permanentCode = String(firstDoc.permanentResetCode);
    }
  }

  // Also check `password_reset_codes` collection by email key
  const emailDocId = cleanEmail.replace(/[^a-z0-9@._-]/gi, '_');
  if (!permanentCode) {
    try {
      const codeDocSnap = await getDoc(doc(db, 'password_reset_codes', emailDocId));
      if (codeDocSnap.exists()) {
        const cData = codeDocSnap.data() as any;
        if (cData?.code && /^\d{6}$/.test(String(cData.code))) {
          permanentCode = String(cData.code);
        }
      }
    } catch {}
  }

  // Generate a new 6-digit code if none exists yet (kept permanent until used so it NEVER expires!)
  if (!permanentCode) {
    permanentCode = String(Math.floor(100000 + Math.random() * 900000));
  }

  // Save in `password_reset_codes` with NO expiration
  try {
    await setDoc(
      doc(db, 'password_reset_codes', emailDocId),
      {
        email: cleanEmail,
        code: permanentCode,
        neverExpires: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not save password_reset_codes doc:', err);
  }

  // Also save on all matching user docs in Firestore
  for (const d of snap.docs) {
    try {
      await setDoc(
        doc(db, 'users', d.id),
        {
          permanentResetCode: permanentCode,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {}
  }

  // 2. Call backend endpoint to send the 6-digit code email
  try {
    await fetch('/api/send-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        code: permanentCode,
        displayName,
      }),
    });
  } catch {}

  // 3. Also trigger Firebase's email delivery (with a continueUrl containing the permanent 6-digit code so even if Firebase's oobCode expires, the email itself contains the permanent 6-digit code in the URL and works forever!)
  const now = Date.now();
  const lastSent = lastPasswordResetSentMap[cleanEmail] || 0;
  if (now - lastSent >= 45000) {
    try {
      auth.languageCode = 'tr';
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://ais-pre-jo3qfqilx5x2p77h3rgriv-854792743663.europe-west2.run.app';
      await sendPasswordResetEmail(auth, cleanEmail, {
        url: `${origin}/?resetEmail=${encodeURIComponent(cleanEmail)}&permanentCode=${encodeURIComponent(permanentCode)}`,
        handleCodeInApp: false,
      });
      lastPasswordResetSentMap[cleanEmail] = Date.now();
    } catch {
      // Fallback without ActionCodeSettings if domain isn't whitelisted for continueUrl
      try {
        auth.languageCode = 'tr';
        await sendPasswordResetEmail(auth, cleanEmail);
        lastPasswordResetSentMap[cleanEmail] = Date.now();
      } catch (innerErr) {
        console.warn('sendPasswordResetEmail warning:', innerErr);
      }
    }
  }

  return { codeSent: true, permanentCode };
}

/**
 * Send password reset email (with cooldown guard so a second click doesn't invalidate the first email link)
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  await sendNonExpiringResetCode(email);
}

/**
 * Extracts `oobCode` or a 6-digit permanent code from either a full Firebase password reset URL or a raw code string.
 * Notice: Even if Firebase's `oobCode` is marked "expired" by Firebase's server, we also extract `permanentCode` or
 * allow using the `oobCode` / 6-digit code without expiration!
 */
export function extractOobCodeFromInput(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('permanentCode=')) {
      const pMatch = trimmed.match(/[?&]permanentCode=([^&#\s]+)/);
      if (pMatch && pMatch[1]) {
        return decodeURIComponent(pMatch[1]);
      }
    }
    if (trimmed.includes('oobCode=')) {
      const match = trimmed.match(/[?&]oobCode=([^&#\s]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
  } catch {}
  return trimmed;
}

/**
 * Verify and complete a password reset using either:
 * 1) The non-expiring 6-digit code (`permanentResetCode`)
 * 2) Any code/link from the email (even if Firebase's 1-hour / single-use oobCode limit expired!)
 */
export async function verifyAndConfirmResetCode(
  rawLinkOrCode: string,
  newPassword: string,
  rememberMe: boolean = true,
  targetEmailHint?: string
): Promise<UserProfile> {
  const rawTrimmed = (rawLinkOrCode || '').trim();
  const extractedCode = extractOobCodeFromInput(rawTrimmed);
  if (!extractedCode) {
    throw new Error('Lütfen e-postanıza gelen 6 haneli sıfırlama kodunu (veya maildeki bağlantıyı) giriniz.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Yeni şifreniz en az 6 karakter olmalıdır.');
  }

  let verifiedEmail = (targetEmailHint || '').trim().toLowerCase();

  // Check if URL itself has resetEmail=...
  try {
    if (rawTrimmed.includes('resetEmail=')) {
      const eMatch = rawTrimmed.match(/[?&]resetEmail=([^&#\s]+)/);
      if (eMatch && eMatch[1]) {
        verifiedEmail = decodeURIComponent(eMatch[1]).trim().toLowerCase();
      }
    }
  } catch {}

  let codeVerified = false;

  // A. Check if the user entered the 6-digit non-expiring code!
  const cleanDigits = extractedCode.replace(/\s+/g, '');
  if (/^\d{6}$/.test(cleanDigits)) {
    // Look up in `password_reset_codes` collection
    if (verifiedEmail) {
      const emailDocId = verifiedEmail.replace(/[^a-z0-9@._-]/gi, '_');
      const codeDocSnap = await getDoc(doc(db, 'password_reset_codes', emailDocId));
      if (codeDocSnap.exists() && String(codeDocSnap.data()?.code) === cleanDigits) {
        codeVerified = true;
      }
    }

    if (!codeVerified) {
      // Search `password_reset_codes` by code
      const codesRef = collection(db, 'password_reset_codes');
      const codeSnap = await getDocs(query(codesRef, where('code', '==', cleanDigits)));
      if (!codeSnap.empty) {
        const cData = codeSnap.docs[0].data() as any;
        verifiedEmail = (cData.email || verifiedEmail).trim().toLowerCase();
        codeVerified = true;
      }
    }

    if (!codeVerified) {
      // Search `users` by permanentResetCode
      const usersRef = collection(db, 'users');
      const uSnap = await getDocs(query(usersRef, where('permanentResetCode', '==', cleanDigits)));
      if (!uSnap.empty) {
        const uData = uSnap.docs[0].data() as any;
        verifiedEmail = (uData.email || verifiedEmail).trim().toLowerCase();
        codeVerified = true;
      }
    }

    if (!codeVerified) {
      throw new Error('Girdiğiniz 6 haneli doğrulama kodu hatalı. Lütfen kodu kontrol edip tekrar deneyin.');
    }
  } else {
    // B. The user pasted the email link or oobCode string
    try {
      const fbEmail = await verifyPasswordResetCode(auth, extractedCode);
      if (fbEmail) {
        verifiedEmail = fbEmail.trim().toLowerCase();
      }
      await confirmPasswordReset(auth, extractedCode, newPassword);
      codeVerified = true;
    } catch {
      // Even if Firebase says the link/oobCode is "expired or already used" (because email scanner clicked it),
      // if it is a genuine Firebase oobCode (or URL containing oobCode/apiKey) and we have the user's email,
      // accept it WITHOUT expiration!
      const looksLikeGenuineResetToken =
        rawTrimmed.includes('oobCode=') ||
        rawTrimmed.includes('mode=resetPassword') ||
        extractedCode.length >= 20;

      if (looksLikeGenuineResetToken && verifiedEmail) {
        codeVerified = true;
      } else if (looksLikeGenuineResetToken && !verifiedEmail) {
        throw new Error('Lütfen 1. kutucuğa e-posta adresinizi de yazarak tekrar "Doğrula ve Yeni Şifreyi Kaydet" butonuna basınız.');
      } else {
        throw new Error('Girdiğiniz kod geçersiz. Lütfen 6 haneli doğrulama kodunu veya maildeki bağlantıyı tam olarak giriniz.');
      }
    }
  }

  if (!verifiedEmail) {
    throw new Error('E-posta adresi doğrulanamadı. Lütfen e-posta adresinizi giriniz.');
  }

  // Generate a fresh permanent code for next time so a used code can't be reused by someone else,
  // while any newly requested code never expires based on time!
  const nextPermanentCode = String(Math.floor(100000 + Math.random() * 900000));
  const emailDocId = verifiedEmail.replace(/[^a-z0-9@._-]/gi, '_');
  try {
    await setDoc(
      doc(db, 'password_reset_codes', emailDocId),
      {
        email: verifiedEmail,
        code: nextPermanentCode,
        neverExpires: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {}

  // Update passwordHash in Firestore for this verified email
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', verifiedEmail));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(`"${verifiedEmail}" adresiyle kayıtlı bir kullanıcı bulunamadı.`);
  }

  for (const d of snap.docs) {
    await setDoc(
      doc(db, 'users', d.id),
      {
        passwordHash: btoa(newPassword),
        permanentResetCode: nextPermanentCode,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Sign in the user immediately with their new password
  return await signInWithEmailAndPasswordAuth(verifiedEmail, newPassword, rememberMe);
}

/**
 * Optional Google Sign-In helper (useful if user account was created with Google)
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const result = await signInWithPopup(auth, provider);
    if (result && result.user) {
      await syncUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('canceled') ||
      error?.message?.includes('cancelled')
    ) {
      return null;
    }
    console.error('Google sign in error:', error);
    throw error;
  }
}

/**
 * Friendly error message parser for Firebase Auth
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  const code = (error?.code || '').toLowerCase();
  const rawMsg = error?.message || String(error || '');
  const msg = rawMsg.toLowerCase();

  if (code.includes('email-already-in-use') || msg.includes('email-already-in-use')) {
    return 'Bu e-posta adresiyle kayıtlı bir hesap zaten var. Hesabınıza giriş yapmak için şifrenizi girebilir veya aşağıdaki butonla yeni şifre bağlantısı isteyebilirsiniz.';
  }
  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found') ||
    msg.includes('invalid-credential') ||
    msg.includes('wrong-password') ||
    msg.includes('user-not-found')
  ) {
    return 'E-posta veya şifre hatalı. Şifrenizi bilmiyorsanız veya daha önce Google ile açtıysanız aşağıdaki "Şifremi Sıfırla" butonuyla yeni şifre belirleyebilirsiniz.';
  }
  if (code.includes('invalid-email') || msg.includes('invalid-email')) {
    return 'Lütfen geçerli bir e-posta adresi giriniz.';
  }
  if (code.includes('weak-password') || msg.includes('weak-password')) {
    return 'Şifre en az 6 karakter olmalıdır.';
  }
  if (code.includes('too-many-requests') || msg.includes('too-many-requests')) {
    return 'Çok fazla başarısız deneme yapıldı. Lütfen biraz bekleyip tekrar deneyiniz veya şifrenizi sıfırlayınız.';
  }
  if (code.includes('network-request-failed') || msg.includes('network-request-failed')) {
    return 'İnternet bağlantınızı kontrol edip tekrar deneyiniz.';
  }
  if (code.includes('popup-closed-by-user') || msg.includes('popup-closed-by-user')) {
    return 'Giriş penceresi kapatıldı.';
  }
  if (code.includes('unauthorized-domain') || msg.includes('unauthorized-domain')) {
    return 'Google oturumu bu web adresi için yapılandırılmamış. Lütfen e-posta & şifre ile veya şifresiz test girişi ile devam ediniz.';
  }
  if (code.includes('user-disabled') || msg.includes('user-disabled')) {
    return 'Bu hesap devre dışı bırakılmış. Lütfen yöneticiyle iletişime geçiniz.';
  }

  if (msg.includes('auth/') || msg.includes('firebase')) {
    return 'Giriş yapılamadı. Bilgilerinizi kontrol ediniz veya şifre sıfırlama bağlantısı isteyiniz.';
  }

  return error?.message || 'İşlem gerçekleştirilemedi. Lütfen tekrar deneyiniz.';
}

/**
 * Quick demo/test sign in
 */
export async function signInAsGuest(
  customName?: string,
  customEmail?: string,
  customRole?: UserRole
): Promise<any> {
  const role = customRole || 'teacher';
  const name =
    customName?.trim() ||
    (role === 'admin'
      ? 'Olcayto (Yönetici)'
      : role === 'teacher'
      ? 'Örnek Öğretmen'
      : 'Örnek Veli');
  const email =
    customEmail?.trim().toLowerCase() ||
    (role === 'admin'
      ? 'olcaytoh@gmail.com'
      : role === 'teacher'
      ? 'ogretmen.ornek@okul.k12.tr'
      : 'veli.ornek@aile.com');

  try {
    // KRİTİK: signInAnonymously çağrısı App.tsx'teki genel onAuthStateChanged
    // dinleyicisini de AYRICA tetikler; o dinleyici syncUserProfile'ı rol
    // bilgisi olmadan çağırır. Bu yarış durumunda doğru rolün kaybolmaması
    // (ör. admin -> parent'a düşmesi) için rolü önce localStorage'a yazıyoruz.
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingUserRole', role);
    }
    const result = await signInAnonymously(auth);
    if (name) {
      try {
        await updateProfile(result.user, {
          displayName: name,
        });
      } catch {}
    }
    const profile = await syncUserProfile(result.user, name, role, email);
    setActiveAppProfile(profile, true);
    return profile;
  } catch (err) {
    console.warn('Anonymous sign-in unavailable, creating local guest session:', err);
    const guestUid =
      'guest_' +
      role +
      '_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).substring(2, 6);

    const { weekId } = getCurrentWeekInfo();
    const guestProfile: UserProfile = {
      uid: guestUid,
      email,
      displayName: name,
      role: role,
      userType: role === 'parent' ? 'parent' : 'teacher',
      currentWeekId: weekId,
      currentWeekMinutes: role === 'parent' ? 120 : 0,
      currentWeekStage: role === 'parent' ? 4 : 0,
      studentName: role === 'parent' ? 'Ali Yılmaz' : undefined,
      parentName: role === 'parent' ? name : undefined,
    };

    try {
      await setDoc(doc(db, 'users', guestUid), {
        ...guestProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn('Firestore guest doc set warning:', fsErr);
    }

    setActiveAppProfile(guestProfile, true);
    return guestProfile;
  }
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  clearActiveAppProfile();
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out error:', e);
  }
}

/**
 * Completely forgets account credentials from this device
 */
export async function forgetAndClearAllDeviceData(): Promise<void> {
  clearActiveAppProfile();
  try {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch (e) {
    console.warn('Storage clear error:', e);
  }

  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signOut error:', e);
  }

  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    try {
      const knownDbs = [
        'firebaseLocalStorageDb',
        'firebase-heartbeat-database',
        'firebase-installations-database',
        'firestore/[DEFAULT]/[DEFAULT]/main',
      ];
      for (const dbName of knownDbs) {
        try {
          window.indexedDB.deleteDatabase(dbName);
        } catch {}
      }
    } catch (e) {
      console.warn('IndexedDB cleanup error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.location.href = window.location.origin + window.location.pathname;
  }
}

/**
 * Permanently deletes the current user's account from Firebase Auth and Firestore
 */
export async function deleteCurrentUserAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Aktif bir oturum bulunamadı.');
  }

  const uid = user.uid;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (e) {
    console.warn('Delete user doc warning:', e);
  }

  // Delete from Firebase Authentication
  await deleteUser(user);

  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
}

/**
 * Ensure user document exists in Firestore and sync role
 */
export async function syncUserProfile(
  user: User,
  customName?: string,
  roleOverride?: UserRole,
  emailOverride?: string
): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const { weekId } = getCurrentWeekInfo();

  let pendingRole: UserRole | null = roleOverride || null;
  if (!pendingRole && typeof window !== 'undefined') {
    const stored = localStorage.getItem('pendingUserRole');
    if (stored === 'teacher' || stored === 'parent' || stored === 'admin') {
      pendingRole = stored as UserRole;
      localStorage.removeItem('pendingUserRole');
    }
  }

  let userProfile: UserProfile;

  if (snap.exists()) {
    const data = snap.data() as Partial<UserProfile>;

    let role: UserRole;
    let userType: 'teacher' | 'parent';

    if (pendingRole) {
      role = pendingRole;
      userType = pendingRole === 'parent' ? 'parent' : 'teacher';
    } else if (data.role) {
      role = data.role;
      userType = data.userType || (role === 'parent' ? 'parent' : 'teacher');
    } else {
      role = data.userType === 'teacher' ? 'teacher' : 'parent';
      userType = data.userType || 'parent';
    }

    userProfile = {
      uid: user.uid,
      email: emailOverride || user.email || data.email || 'misafir@ekran.takip',
      displayName: data.displayName || user.displayName || customName || (role === 'admin' ? 'Yönetici' : role === 'teacher' ? 'Öğretmen' : 'Veli'),
      photoURL: user.photoURL || data.photoURL || undefined,
      role: role,
      userType: userType,
      studentName: role === 'parent' ? data.studentName : undefined,
      parentName: role === 'parent' ? data.parentName : undefined,
      institutionId: data.institutionId,
      institutionCode: data.institutionCode,
      institutionAdminCode: role === 'admin' ? data.institutionAdminCode : undefined,
      institutionName: data.institutionName,
      classId: data.classId,
      classCode: data.classCode,
      className: data.className,
      currentWeekId: data.currentWeekId || weekId,
      currentWeekMinutes: data.currentWeekMinutes ?? 0,
      currentWeekStage: data.currentWeekStage ?? 0,
      updatedAt: serverTimestamp(),
    };

    const updatePayload: any = {
      uid: user.uid,
      displayName: userProfile.displayName,
      email: userProfile.email,
      role: userProfile.role,
      userType: userProfile.userType,
      updatedAt: serverTimestamp(),
      ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    };

    if (role !== 'admin' && data.institutionAdminCode) {
      updatePayload.institutionAdminCode = deleteField();
    }

    await setDoc(userRef, updatePayload, { merge: true });
  } else {
    let role: UserRole;
    let userType: 'teacher' | 'parent';

    if (pendingRole) {
      role = pendingRole;
      userType = pendingRole === 'parent' ? 'parent' : 'teacher';
    } else {
      role = 'parent';
      userType = 'parent';
    }

    userProfile = {
      uid: user.uid,
      email: emailOverride || user.email || 'misafir@ekran.takip',
      displayName: user.displayName || customName || (role === 'admin' ? 'Yönetici' : role === 'teacher' ? 'Öğretmen' : 'Veli'),
      photoURL: user.photoURL || undefined,
      role: role,
      userType: userType,
      currentWeekId: weekId,
      currentWeekMinutes: 0,
      currentWeekStage: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, {
      ...userProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return userProfile;
}

export function subscribeUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void
) {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({
          uid: snap.id,
          ...(snap.data() as Partial<UserProfile>),
        } as UserProfile);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error('User profile subscription error:', error);
      if (onError) onError(error);
    }
  );
}

export async function updateStageProgress(
  uid: string,
  newStageCount: number,
  notes?: string
): Promise<void> {
  const clampedStage = Math.max(0, Math.min(14, newStageCount));
  const totalMinutes = clampedStage * 30;
  const { weekId, weekLabel, weekNumber, year } = getCurrentWeekInfo();

  const userRef = doc(db, 'users', uid);
  const weekRef = doc(db, 'users', uid, 'weeks', weekId);

  const timestamp = Date.now();
  const dateStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  await setDoc(
    userRef,
    {
      currentWeekStage: clampedStage,
      currentWeekMinutes: totalMinutes,
      currentWeekId: weekId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const weekSnap = await getDoc(weekRef);
  let stageTimestamps = [];
  if (weekSnap.exists()) {
    const data = weekSnap.data() as WeekRecord;
    stageTimestamps = data.stageTimestamps || [];
  }

  stageTimestamps.push({
    stage: clampedStage,
    timestamp,
    addedAt: dateStr,
  });

  if (stageTimestamps.length > 50) {
    stageTimestamps = stageTimestamps.slice(-50);
  }

  await setDoc(
    weekRef,
    {
      weekId,
      weekNumber,
      year,
      weekLabel,
      completedStages: clampedStage,
      totalMinutes,
      stageTimestamps,
      updatedAt: serverTimestamp(),
      ...(notes !== undefined ? { notes } : {}),
    },
    { merge: true }
  );
}

export async function resetCurrentWeekProgress(uid: string): Promise<void> {
  await updateStageProgress(uid, 0, 'Hafta sıfırlandı');
}

export function subscribeUserWeeks(
  uid: string,
  onUpdate: (weeksMap: Record<string, WeekRecord>) => void,
  onError?: (err: Error) => void
) {
  const weeksRef = collection(db, 'users', uid, 'weeks');
  return onSnapshot(
    weeksRef,
    (snap) => {
      const weeksMap: Record<string, WeekRecord> = {};
      snap.forEach((doc) => {
        weeksMap[doc.id] = doc.data() as WeekRecord;
      });
      onUpdate(weeksMap);
    },
    (error) => {
      console.error('Subscribe user weeks error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeAllUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const users: UserProfile[] = [];
      snap.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      onUpdate(users);
    },
    (error) => {
      console.error('Subscribe all users error:', error);
      onSnapshot(usersRef, (snap) => {
        const users: UserProfile[] = [];
        snap.forEach((doc) => {
          users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        onUpdate(users);
      }, onError);
    }
  );
}

export async function setUserRole(
  targetUid: string,
  role: UserRole,
  extraFields?: { classId?: string; className?: string; classCode?: string; preserveAdminCode?: boolean }
): Promise<void> {
  const userRef = doc(db, 'users', targetUid);
  const payload: any = {
    role,
    userType: role === 'admin' || role === 'teacher' ? 'teacher' : 'parent',
    updatedAt: serverTimestamp(),
  };
  if (extraFields?.classId) payload.classId = extraFields.classId;
  if (extraFields?.className) payload.className = extraFields.className;
  if (extraFields?.classCode) payload.classCode = extraFields.classCode;

  if (role !== 'admin' && !extraFields?.preserveAdminCode) {
    payload.institutionAdminCode = deleteField();
  }
  await setDoc(userRef, payload, { merge: true });
}

export async function updateUserProfile(targetUid: string, data: Partial<UserProfile>): Promise<void> {
  const cleanUid = (targetUid || '').trim();
  if (!cleanUid) {
    console.warn('updateUserProfile skipped: targetUid is invalid or empty');
    return;
  }
  const userRef = doc(db, 'users', cleanUid);
  await setDoc(
    userRef,
    removeUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );
}

/**
 * Profil güncellemesini güvenli kaydeder.
 * Kullanıcı belgesi yoksa ya da "role" alanı eksikse (ör. yerel/anonim profil), yalnızca isim
 * alanları yazılırsa profil rolsüz kalıp veli ekranına düşer. Bu yüzden böyle durumda tüm profil yazılır.
 */
export async function saveProfileUpdates(
  currentUser: UserProfile,
  updates: Partial<UserProfile>
): Promise<void> {
  const cleanUid = (currentUser?.uid || '').trim();
  if (!cleanUid) {
    console.warn('saveProfileUpdates skipped: uid is invalid or empty');
    return;
  }
  const userRef = doc(db, 'users', cleanUid);
  const snap = await getDoc(userRef);
  const existing = snap.exists() ? (snap.data() as Partial<UserProfile>) : null;

  if (!existing || !existing.role) {
    const { createdAt, updatedAt, ...rest } = currentUser as any;
    await updateUserProfile(cleanUid, { ...rest, ...updates });
  } else {
    await updateUserProfile(cleanUid, updates);
  }
}

/**
 * Öğretmen/yönetici adı değişince, kendisine ait sınıf kayıtlarındaki teacherName alanını da günceller.
 */
export async function updateTeacherNameInClasses(
  teacherUid: string,
  teacherName: string
): Promise<void> {
  const cleanUid = (teacherUid || '').trim();
  const cleanName = (teacherName || '').trim();
  if (!cleanUid || !cleanName) return;

  const classesRef = collection(db, 'classes');
  const snap = await getDocs(query(classesRef, where('teacherUid', '==', cleanUid)));
  await Promise.all(
    snap.docs.map((d) =>
      setDoc(
        doc(db, 'classes', d.id),
        { teacherName: cleanName, updatedAt: serverTimestamp() },
        { merge: true }
      )
    )
  );
}

function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateInstitutionCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KRM-${num}`;
}

function generateAdminCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ADM-${num}`;
}

async function isCodeTaken(field: 'code' | 'adminCode', code: string): Promise<boolean> {
  const instRef = collection(db, 'institutions');
  const q = query(instRef, where(field, '==', code));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createInstitution(
  adminUid: string,
  adminName: string,
  adminEmail: string,
  institutionName: string
): Promise<{ id: string; code: string; adminCode: string; name: string }> {
  let code = generateInstitutionCode();
  let codeTries = 0;
  while ((await isCodeTaken('code', code)) && codeTries < 5) {
    code = generateInstitutionCode();
    codeTries += 1;
  }

  let adminCode = generateAdminCode();
  let adminCodeTries = 0;
  while ((await isCodeTaken('adminCode', adminCode)) && adminCodeTries < 5) {
    adminCode = generateAdminCode();
    adminCodeTries += 1;
  }

  const instRef = doc(collection(db, 'institutions'));
  const trimmedName = (institutionName || 'Okulumuz').trim();
  const instData = {
    id: instRef.id,
    code,
    adminCode,
    name: trimmedName,
    adminUid,
    adminName: adminName || 'Admin',
    adminEmail: adminEmail || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(instRef, instData, { merge: true });

  const adminRef = doc(db, 'users', adminUid);
  await setDoc(
    adminRef,
    {
      role: 'admin',
      userType: 'teacher',
      institutionId: instRef.id,
      institutionCode: code,
      institutionAdminCode: adminCode,
      institutionName: trimmedName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { id: instRef.id, code, adminCode, name: trimmedName };
}

export async function ensureInstitutionAdminCode(
  institutionId: string,
  adminUid?: string
): Promise<string> {
  const effectiveUid = adminUid || auth.currentUser?.uid;
  let targetInstRef = institutionId ? doc(db, 'institutions', institutionId) : null;
  let snap = targetInstRef ? await getDoc(targetInstRef) : null;

  if (!snap || !snap.exists()) {
    if (effectiveUid) {
      const instCol = collection(db, 'institutions');
      const q = query(instCol, where('adminUid', '==', effectiveUid));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        targetInstRef = querySnap.docs[0].ref;
        snap = querySnap.docs[0];
      }
    }
  }

  if (snap && snap.exists()) {
    const data = snap.data();
    if (data?.adminCode) {
      return data.adminCode as string;
    }
  }

  let adminCode = generateAdminCode();
  let tries = 0;
  while ((await isCodeTaken('adminCode', adminCode)) && tries < 5) {
    adminCode = generateAdminCode();
    tries += 1;
  }

  if (!targetInstRef) {
    targetInstRef = doc(collection(db, 'institutions'));
  }

  const instPayload: Record<string, any> = {
    id: targetInstRef.id,
    adminCode,
    updatedAt: serverTimestamp(),
  };
  if (effectiveUid) {
    instPayload.adminUid = effectiveUid;
  }

  await setDoc(targetInstRef, instPayload, { merge: true });

  if (effectiveUid) {
    await setDoc(
      doc(db, 'users', effectiveUid),
      {
        institutionId: targetInstRef.id,
        institutionAdminCode: adminCode,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return adminCode;
}

export async function updateInstitutionName(
  institutionId: string,
  adminUid?: string,
  newName?: string
): Promise<{ id: string; name: string }> {
  const trimmed = (newName || '').trim();
  if (!trimmed) {
    throw new Error('Lütfen geçerli bir kurum / okul adı girin.');
  }

  const effectiveUid = adminUid || auth.currentUser?.uid;
  let instRef = institutionId ? doc(db, 'institutions', institutionId) : doc(collection(db, 'institutions'));

  const instPayload: Record<string, any> = {
    id: instRef.id,
    name: trimmed,
    updatedAt: serverTimestamp(),
  };
  if (effectiveUid) {
    instPayload.adminUid = effectiveUid;
  }

  await setDoc(instRef, instPayload, { merge: true });

  if (effectiveUid) {
    const adminRef = doc(db, 'users', effectiveUid);
    await setDoc(
      adminRef,
      {
        institutionId: instRef.id,
        institutionName: trimmed,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return { id: instRef.id, name: trimmed };
}

export async function regenerateInstitutionCode(
  institutionId: string,
  adminUid?: string
): Promise<string> {
  const effectiveUid = adminUid || auth.currentUser?.uid;
  let code = generateInstitutionCode();
  let tries = 0;
  while ((await isCodeTaken('code', code)) && tries < 5) {
    code = generateInstitutionCode();
    tries += 1;
  }

  let instRef = institutionId ? doc(db, 'institutions', institutionId) : null;
  if (instRef) {
    const snap = await getDoc(instRef);
    if (!snap.exists()) {
      instRef = null;
    }
  }

  if (!instRef) {
    if (effectiveUid) {
      const instCol = collection(db, 'institutions');
      const q = query(instCol, where('adminUid', '==', effectiveUid));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        instRef = querySnap.docs[0].ref;
      }
    }
    if (!instRef) {
      instRef = doc(collection(db, 'institutions'));
    }
  }

  const instPayload: Record<string, any> = {
    id: instRef.id,
    code,
    updatedAt: serverTimestamp(),
  };
  if (effectiveUid) {
    instPayload.adminUid = effectiveUid;
  }

  await setDoc(instRef, instPayload, { merge: true });

  if (effectiveUid) {
    const adminRef = doc(db, 'users', effectiveUid);
    await setDoc(
      adminRef,
      {
        institutionId: instRef.id,
        institutionCode: code,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return code;
}

export async function regenerateInstitutionAdminCode(
  institutionId: string,
  adminUid?: string
): Promise<string> {
  const effectiveUid = adminUid || auth.currentUser?.uid;
  let adminCode = generateAdminCode();
  let tries = 0;
  while ((await isCodeTaken('adminCode', adminCode)) && tries < 5) {
    adminCode = generateAdminCode();
    tries += 1;
  }

  let instRef = institutionId ? doc(db, 'institutions', institutionId) : null;
  if (instRef) {
    const snap = await getDoc(instRef);
    if (!snap.exists()) {
      instRef = null;
    }
  }

  if (!instRef) {
    if (effectiveUid) {
      const instCol = collection(db, 'institutions');
      const q = query(instCol, where('adminUid', '==', effectiveUid));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        instRef = querySnap.docs[0].ref;
      }
    }
    if (!instRef) {
      instRef = doc(collection(db, 'institutions'));
    }
  }

  const instPayload: Record<string, any> = {
    id: instRef.id,
    adminCode,
    updatedAt: serverTimestamp(),
  };
  if (effectiveUid) {
    instPayload.adminUid = effectiveUid;
  }

  await setDoc(instRef, instPayload, { merge: true });

  if (effectiveUid) {
    const adminRef = doc(db, 'users', effectiveUid);
    await setDoc(
      adminRef,
      {
        institutionId: instRef.id,
        institutionAdminCode: adminCode,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return adminCode;
}

const DEMO_INSTITUTION_FALLBACK = {
  id: 'demo-institution-1',
  name: 'AKÇAKOCA İLKOKULU',
  code: 'KRM-AKC1',
  adminCode: 'ADM-AKC1',
};

const DEMO_CLASSES_FALLBACK = [
  {
    id: 'demo-class-1a',
    code: 'AKC-1A',
    name: '1-A Sınıfı',
    teacherUid: 'teacher_demo_olcayto',
    teacherName: 'Olcayto Yılmaz',
    teacherEmail: 'olcaytoh@gmail.com',
    institutionId: 'demo-institution-1',
    institutionCode: 'KRM-AKC1',
    institutionName: 'AKÇAKOCA İLKOKULU',
    studentTargetCount: 10,
  },
  {
    id: 'demo-class-2b',
    code: 'AKC-2B',
    name: '2-B Sınıfı',
    teacherUid: 'teacher_demo_ayse',
    teacherName: 'Ayşe Öğretmen',
    teacherEmail: 'ayse@akcakocailkokulu.k12.tr',
    institutionId: 'demo-institution-1',
    institutionCode: 'KRM-AKC1',
    institutionName: 'AKÇAKOCA İLKOKULU',
    studentTargetCount: 10,
  },
  {
    id: 'demo-class-3c',
    code: 'AKC-3C',
    name: '3-C Sınıfı',
    teacherUid: 'teacher_demo_mehmet',
    teacherName: 'Mehmet Öğretmen',
    teacherEmail: 'mehmet@akcakocailkokulu.k12.tr',
    institutionId: 'demo-institution-1',
    institutionCode: 'KRM-AKC1',
    institutionName: 'AKÇAKOCA İLKOKULU',
    studentTargetCount: 10,
  },
];

export async function joinInstitutionWithCode(
  userUid: string,
  rawCode: string
): Promise<{ id: string; code: string; name: string }> {
  const cleanedCode = rawCode.trim().toUpperCase();
  if (!cleanedCode) {
    throw new Error('Lütfen geçerli bir kurum kodu girin.');
  }

  const instRef = collection(db, 'institutions');
  const q = query(instRef, where('code', '==', cleanedCode));
  const snap = await getDocs(q);

  let instDoc = snap.empty ? null : snap.docs[0];
  let instData = instDoc ? instDoc.data() : null;

  if (!instDoc) {
    const normalized = cleanedCode.replace(/[^A-Z0-9]/g, '');
    if (normalized === 'KRMAKC1' || cleanedCode === DEMO_INSTITUTION_FALLBACK.code) {
      const demoRef = doc(db, 'institutions', DEMO_INSTITUTION_FALLBACK.id);
      await setDoc(
        demoRef,
        {
          id: DEMO_INSTITUTION_FALLBACK.id,
          name: DEMO_INSTITUTION_FALLBACK.name,
          code: DEMO_INSTITUTION_FALLBACK.code,
          adminCode: DEMO_INSTITUTION_FALLBACK.adminCode,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      const fetched = await getDoc(demoRef);
      if (fetched.exists()) {
        instDoc = fetched as any;
        instData = fetched.data();
      }
    }
  }

  if (!instDoc || !instData) {
    throw new Error(`"${cleanedCode}" koduna sahip bir kurum bulunamadı.`);
  }

  const userRef = doc(db, 'users', userUid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  await setDoc(
    userRef,
    {
      institutionId: instDoc.id,
      institutionCode: instData.code,
      institutionName: instData.name,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // If teacher already has a classroom, link that classroom to the institution too
  if (userData?.classId) {
    try {
      await setDoc(
        doc(db, 'classes', userData.classId),
        {
          institutionId: instDoc.id,
          institutionCode: instData.code,
          institutionName: instData.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not link teacher active class to institution:', err);
    }
  }

  // Also link any classes created by this teacher and their students
  try {
    const classesQ = query(collection(db, 'classes'), where('teacherUid', '==', userUid));
    const classesSnap = await getDocs(classesQ);
    for (const cDoc of classesSnap.docs) {
      await setDoc(
        cDoc.ref,
        {
          institutionId: instDoc.id,
          institutionCode: instData.code,
          institutionName: instData.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      const studentsQ = query(collection(db, 'users'), where('classId', '==', cDoc.id));
      const studentsSnap = await getDocs(studentsQ);
      for (const sDoc of studentsSnap.docs) {
        await setDoc(
          sDoc.ref,
          {
            institutionId: instDoc.id,
            institutionCode: instData.code,
            institutionName: instData.name,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.warn('Could not link teacher classes to institution:', err);
  }

  return { id: instDoc.id, code: instData.code, name: instData.name };
}

export async function joinInstitutionAsAdmin(
  userUid: string,
  rawAdminCode: string
): Promise<{ id: string; code: string; adminCode: string; name: string }> {
  const cleanedCode = rawAdminCode.trim().toUpperCase();
  if (!cleanedCode) {
    throw new Error('Lütfen geçerli bir Admin Kodu girin.');
  }

  const instRef = collection(db, 'institutions');
  const q = query(instRef, where('adminCode', '==', cleanedCode));
  const snap = await getDocs(q);

  let instDoc = snap.empty ? null : snap.docs[0];
  let instData = instDoc ? instDoc.data() : null;

  if (!instDoc) {
    const normalized = cleanedCode.replace(/[^A-Z0-9]/g, '');
    if (normalized === 'ADMAKC1' || cleanedCode === DEMO_INSTITUTION_FALLBACK.adminCode) {
      const demoRef = doc(db, 'institutions', DEMO_INSTITUTION_FALLBACK.id);
      await setDoc(
        demoRef,
        {
          id: DEMO_INSTITUTION_FALLBACK.id,
          name: DEMO_INSTITUTION_FALLBACK.name,
          code: DEMO_INSTITUTION_FALLBACK.code,
          adminCode: DEMO_INSTITUTION_FALLBACK.adminCode,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      const fetched = await getDoc(demoRef);
      if (fetched.exists()) {
        instDoc = fetched as any;
        instData = fetched.data();
      }
    }
  }

  if (!instDoc || !instData) {
    throw new Error(`"${cleanedCode}" koduna sahip bir kurum bulunamadı.`);
  }

  const userRef = doc(db, 'users', userUid);
  await setDoc(
    userRef,
    {
      role: 'admin',
      userType: 'teacher',
      institutionId: instDoc.id,
      institutionCode: instData.code,
      institutionAdminCode: instData.adminCode,
      institutionName: instData.name,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { id: instDoc.id, code: instData.code, adminCode: instData.adminCode, name: instData.name };
}

export async function verifyAdminCodeAndUpgrade(
  userUid: string,
  rawAdminCode: string,
  currentInstitutionId?: string
): Promise<{ id: string; code: string; adminCode: string; name: string }> {
  const cleanedCode = rawAdminCode.trim().toUpperCase();
  if (!cleanedCode) {
    throw new Error('Lütfen kurumunuzun Admin Kodunu giriniz.');
  }

  let matchedDoc: any = null;

  // 1. Doğrudan mevcut kurum üzerinden kontrol
  if (currentInstitutionId) {
    try {
      const directRef = doc(db, 'institutions', currentInstitutionId);
      const snap = await getDoc(directRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.adminCode && data.adminCode.trim().toUpperCase() === cleanedCode) {
          matchedDoc = snap;
        }
      }
    } catch {
      // Devam et, koleksiyonu tara
    }
  }

  // 2. Admin koduna göre tüm kurumları tara
  if (!matchedDoc) {
    try {
      const instRef = collection(db, 'institutions');
      const q = query(instRef, where('adminCode', '==', cleanedCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      }
    } catch {
      // Sessizce devam et
    }
  }

  // 3. Kullanıcının kendi oluşturduğu bir kurum var mı ve admin kodu eşleşiyor mu?
  if (!matchedDoc && userUid) {
    try {
      const instRef = collection(db, 'institutions');
      const qAdmin = query(instRef, where('adminUid', '==', userUid));
      const snapAdmin = await getDocs(qAdmin);
      if (!snapAdmin.empty) {
        // Kullanıcının kurumu var, bu kurumun admin kodu ile eşleşiyor mu?
        for (const docSnap of snapAdmin.docs) {
          const d = docSnap.data();
          if (d?.adminCode && d.adminCode.trim().toUpperCase() === cleanedCode) {
            matchedDoc = docSnap;
            break;
          }
        }
      }
    } catch {
      // Sessizce devam et
    }
  }

  // 4. Eğer hiçbir kurumun admin kodu ile eşleşmediyse KESİNLİKLE HATA VER
  if (!matchedDoc) {
    throw new Error(
      `"${cleanedCode}" admin kodu bulunamadı veya geçersiz! Lütfen kurumunuza ait doğru Admin Kodunu (Örn: ADM-XXXX) giriniz.`
    );
  }

  const instData = matchedDoc.data();
  const userRef = doc(db, 'users', userUid);
  await setDoc(
    userRef,
    {
      role: 'admin',
      userType: 'teacher',
      institutionId: matchedDoc.id,
      institutionCode: instData?.code || 'KRM-1001',
      institutionAdminCode: instData?.adminCode || cleanedCode,
      institutionName: instData?.name || 'Okulum / Kurumum',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    id: matchedDoc.id,
    code: instData?.code || 'KRM-1001',
    adminCode: instData?.adminCode || cleanedCode,
    name: instData?.name || 'Okulum / Kurumum',
  };
}

export async function createClassroom(
  teacherUid: string,
  teacherName: string,
  teacherEmail: string,
  className: string,
  studentTargetCount = 25,
  institution?: { id?: string; code: string; name: string }
): Promise<ClassroomInfo> {
  const trimmedName = className.trim();
  const classesRef = collection(db, 'classes');

  const qExisting = query(classesRef, where('teacherUid', '==', teacherUid));
  const snapExisting = await getDocs(qExisting);

  if (!snapExisting.empty) {
    const primaryDoc = snapExisting.docs[0];
    const classId = primaryDoc.id;
    const existingData = primaryDoc.data() as ClassroomInfo;

    const updatedData: Record<string, any> = {
      name: trimmedName,
      studentTargetCount,
      teacherName: teacherName || existingData.teacherName || 'Öğretmen',
      teacherEmail: teacherEmail || existingData.teacherEmail || '',
      updatedAt: serverTimestamp(),
    };

    if (institution && institution.code) {
      if (institution.id) updatedData.institutionId = institution.id;
      updatedData.institutionCode = institution.code;
      if (institution.name) updatedData.institutionName = institution.name;
    }

    await setDoc(doc(db, 'classes', classId), removeUndefined(updatedData), { merge: true });

    if (snapExisting.docs.length > 1) {
      for (let i = 1; i < snapExisting.docs.length; i++) {
        try {
          await deleteDoc(doc(db, 'classes', snapExisting.docs[i].id));
        } catch (err) {
          console.warn('Duplicate class cleanup error:', err);
        }
      }
    }

    const teacherRef = doc(db, 'users', teacherUid);
    const teacherUpdate: Record<string, any> = {
      role: 'teacher',
      userType: 'teacher',
      classId: classId,
      classCode: existingData.code,
      className: trimmedName,
      updatedAt: serverTimestamp(),
    };
    if (institution && institution.code) {
      if (institution.id) teacherUpdate.institutionId = institution.id;
      teacherUpdate.institutionCode = institution.code;
      if (institution.name) teacherUpdate.institutionName = institution.name;
    }
    await setDoc(teacherRef, removeUndefined(teacherUpdate), { merge: true });

    return {
      ...existingData,
      id: classId,
      name: trimmedName,
      studentTargetCount,
      ...(institution && institution.code ? {
        ...(institution.id ? { institutionId: institution.id } : {}),
        institutionCode: institution.code,
        ...(institution.name ? { institutionName: institution.name } : {}),
      } : {}),
    };
  }

  const classCode = generateClassCode();
  const classRef = doc(collection(db, 'classes'));
  const classroomData: Record<string, any> = {
    id: classRef.id,
    code: classCode,
    name: trimmedName,
    teacherUid,
    teacherName: teacherName || 'Öğretmen',
    teacherEmail: teacherEmail || '',
    studentTargetCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (institution && institution.code) {
    if (institution.id) classroomData.institutionId = institution.id;
    classroomData.institutionCode = institution.code;
    if (institution.name) classroomData.institutionName = institution.name;
  }

  await setDoc(classRef, removeUndefined(classroomData));

  const teacherRef = doc(db, 'users', teacherUid);
  const teacherData: Record<string, any> = {
    role: 'teacher',
    userType: 'teacher',
    classId: classRef.id,
    classCode: classCode,
    className: trimmedName,
    updatedAt: serverTimestamp(),
  };
  if (institution && institution.code) {
    if (institution.id) teacherData.institutionId = institution.id;
    teacherData.institutionCode = institution.code;
    if (institution.name) teacherData.institutionName = institution.name;
  }
  await setDoc(teacherRef, removeUndefined(teacherData), { merge: true });

  return {
    ...classroomData,
    id: classRef.id,
    code: classCode,
    name: trimmedName,
    teacherUid,
    teacherName: teacherName || 'Öğretmen',
    teacherEmail: teacherEmail || '',
    studentTargetCount,
  } as ClassroomInfo;
}

export async function adminDeleteUser(userUid: string): Promise<void> {
  if (!userUid) return;

  try {
    // 1. Delete all weeks subcollection documents for this user
    const weeksRef = collection(db, 'users', userUid, 'weeks');
    const weeksSnap = await getDocs(weeksRef);
    const deleteWeeks = weeksSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deleteWeeks);
  } catch (err) {
    console.warn('Error deleting user weeks subcollection:', err);
  }

  try {
    // 2. If user had created any classrooms as teacher, update or clear teacher info
    const classesQ = query(collection(db, 'classes'), where('teacherUid', '==', userUid));
    const classesSnap = await getDocs(classesQ);
    const updateClasses = classesSnap.docs.map((d) =>
      deleteDoc(d.ref) // Delete empty class owned by deleted teacher
    );
    await Promise.all(updateClasses);
  } catch (err) {
    console.warn('Error clearing classes for deleted user:', err);
  }

  // 3. Delete user document from Firestore
  const userRef = doc(db, 'users', userUid);
  await deleteDoc(userRef);
}

export async function adminSendPasswordResetEmail(email: string): Promise<string> {
  if (!email) throw new Error('E-posta adresi belirtilmemiş.');
  const res = await sendNonExpiringResetCode(email.trim());
  return res.permanentCode;
}

export async function adminResetUserProgress(userUid: string): Promise<void> {
  if (!userUid) return;
  const userRef = doc(db, 'users', userUid);
  await setDoc(userRef, {
    currentWeekStage: 0,
    currentWeekMinutes: 0,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function adminDeleteClassroom(classId: string, teacherUid?: string): Promise<void> {
  if (!classId) return;

  const classRef = doc(db, 'classes', classId);
  await deleteDoc(classRef);

  if (teacherUid) {
    try {
      const teacherRef = doc(db, 'users', teacherUid);
      const snap = await getDoc(teacherRef);
      if (snap.exists()) {
        await updateDoc(teacherRef, {
          classId: deleteField(),
          classCode: deleteField(),
          className: deleteField(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Error unlinking teacher profile:', err);
    }
  }

  try {
    const studentsQ = query(collection(db, 'users'), where('classId', '==', classId));
    const snap = await getDocs(studentsQ);
    const unlinks = snap.docs.map((d) =>
      updateDoc(d.ref, {
        classId: deleteField(),
        classCode: deleteField(),
        className: deleteField(),
        updatedAt: serverTimestamp(),
      })
    );
    await Promise.all(unlinks);
  } catch (err) {
    console.warn('Error unlinking classroom students:', err);
  }
}

export async function adminUpdateClassroom(
  classId: string,
  newClassName: string,
  teacherUid?: string,
  newTeacherName?: string
): Promise<void> {
  const cleanClassId = (classId || '').trim();
  const cleanName = (newClassName || '').trim();
  if (!cleanClassId || !cleanName) {
    throw new Error('Lütfen geçerli bir sınıf adı giriniz.');
  }

  const classRef = doc(db, 'classes', cleanClassId);
  const classPayload: Record<string, any> = {
    name: cleanName,
    updatedAt: serverTimestamp(),
  };
  if (newTeacherName && newTeacherName.trim()) {
    classPayload.teacherName = newTeacherName.trim();
  }
  await setDoc(classRef, removeUndefined(classPayload), { merge: true });

  if (teacherUid && teacherUid.trim()) {
    try {
      const teacherRef = doc(db, 'users', teacherUid.trim());
      const teacherPayload: Record<string, any> = {
        className: cleanName,
        updatedAt: serverTimestamp(),
      };
      if (newTeacherName && newTeacherName.trim()) {
        teacherPayload.displayName = newTeacherName.trim();
      }
      await setDoc(teacherRef, removeUndefined(teacherPayload), { merge: true });
    } catch (err) {
      console.warn('Error updating teacher className:', err);
    }
  }

  try {
    const studentsQ = query(collection(db, 'users'), where('classId', '==', cleanClassId));
    const snap = await getDocs(studentsQ);
    await Promise.all(
      snap.docs.map((d) =>
        setDoc(
          d.ref,
          {
            className: cleanName,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      )
    );
  } catch (err) {
    console.warn('Error syncing className to students:', err);
  }
}

export async function updateClassroom(
  classId: string,
  teacherUid: string,
  className: string,
  studentTargetCount?: number,
  institution?: { id?: string; code: string; name: string },
  teacherProfile?: { displayName?: string; email?: string }
): Promise<void> {
  const trimmedName = className.trim();
  const classRef = doc(db, 'classes', classId);
  const classUpdate: Record<string, any> = {
    name: trimmedName,
    updatedAt: serverTimestamp(),
  };
  if (studentTargetCount !== undefined) {
    classUpdate.studentTargetCount = studentTargetCount;
  }
  if (institution && institution.code) {
    if (institution.id) classUpdate.institutionId = institution.id;
    classUpdate.institutionCode = institution.code;
    if (institution.name) classUpdate.institutionName = institution.name;
  }
  await setDoc(classRef, removeUndefined(classUpdate), { merge: true });

  if (teacherUid) {
    const teacherRef = doc(db, 'users', teacherUid);
    const teacherUpdate: Record<string, any> = {
      className: trimmedName,
      role: 'teacher',
      userType: 'teacher',
      classId: classId,
      updatedAt: serverTimestamp(),
    };
    if (teacherProfile?.displayName) {
      teacherUpdate.displayName = teacherProfile.displayName;
    }
    if (teacherProfile?.email) {
      teacherUpdate.email = teacherProfile.email;
    }
    if (institution && institution.code) {
      if (institution.id) teacherUpdate.institutionId = institution.id;
      teacherUpdate.institutionCode = institution.code;
      if (institution.name) teacherUpdate.institutionName = institution.name;
    }
    await setDoc(teacherRef, removeUndefined(teacherUpdate), { merge: true });
  }
}

export function subscribeInstitutionClassrooms(
  institutionId: string,
  onUpdate: (classrooms: ClassroomInfo[]) => void,
  onError?: (err: Error) => void
) {
  const classesRef = collection(db, 'classes');
  const q = query(classesRef, where('institutionId', '==', institutionId));

  return onSnapshot(
    q,
    (snap) => {
      const list: ClassroomInfo[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ClassroomInfo);
      });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
      onUpdate(list);
    },
    (error) => {
      console.error('Subscribe institution classrooms error:', error);
      if (onError) onError(error);
    }
  );
}

export async function joinClassroomWithCode(
  userUid: string,
  rawCode: string,
  studentName: string,
  parentName: string
): Promise<ClassroomInfo> {
  const cleanedCode = rawCode.trim().toUpperCase();
  if (!cleanedCode) {
    throw new Error('Lütfen geçerli bir sınıf kodu girin.');
  }

  const classesRef = collection(db, 'classes');
  const q = query(classesRef, where('code', '==', cleanedCode));
  const snap = await getDocs(q);

  let classDoc = snap.empty ? null : snap.docs[0];
  let classData = classDoc ? (classDoc.data() as ClassroomInfo) : null;
  if (classData && classDoc) {
    classData.id = classDoc.id;
  }

  if (!classDoc || !classData) {
    const normalized = cleanedCode.replace(/[^A-Z0-9]/g, '');
    const matchedDemo = DEMO_CLASSES_FALLBACK.find(
      (c) => c.code.toUpperCase() === cleanedCode || c.code.replace(/[^A-Z0-9]/g, '') === normalized
    );
    if (matchedDemo) {
      const demoClassRef = doc(db, 'classes', matchedDemo.id);
      await setDoc(
        demoClassRef,
        {
          id: matchedDemo.id,
          code: matchedDemo.code,
          name: matchedDemo.name,
          teacherUid: matchedDemo.teacherUid,
          teacherName: matchedDemo.teacherName,
          teacherEmail: matchedDemo.teacherEmail,
          institutionId: matchedDemo.institutionId,
          institutionCode: matchedDemo.institutionCode,
          institutionName: matchedDemo.institutionName,
          studentTargetCount: matchedDemo.studentTargetCount,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      const fetched = await getDoc(demoClassRef);
      if (fetched.exists()) {
        classDoc = fetched as any;
        classData = { ...matchedDemo, id: matchedDemo.id } as ClassroomInfo;
      }
    }
  }

  if (!classDoc || !classData) {
    throw new Error(`"${cleanedCode}" koduna ait bir sınıf bulunamadı.`);
  }

  if (classData.teacherUid === userUid) {
    throw new Error('Siz bu sınıfın öğretmenisiniz!');
  }

  const userRef = doc(db, 'users', userUid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.role === 'teacher' || userData.userType === 'teacher' || userData.role === 'admin') {
      throw new Error('Öğretmen veya Yönetici yetkisine sahip bir hesapla veli olarak katılamazsınız!');
    }
  }

  await setDoc(
    userRef,
    removeUndefined({
      role: 'parent',
      userType: 'parent',
      classId: classDoc.id,
      classCode: classData.code,
      className: classData.name,
      ...(classData.institutionId
        ? {
            institutionId: classData.institutionId,
            institutionCode: classData.institutionCode,
            institutionName: classData.institutionName,
          }
        : {}),
      studentName: studentName.trim(),
      parentName: parentName.trim() || undefined,
      displayName: studentName.trim() ? `${studentName.trim()} (${parentName.trim() || 'Velisi'})` : undefined,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  // Öğretmene ilk katılım bilgi mesajı kutucuğu bildirimini kaydet
  try {
    await recordNewStudentJoinNotice(classDoc.id, studentName.trim(), parentName.trim(), userUid);
  } catch (noticeErr) {
    console.warn('Could not record student join notice:', noticeErr);
  }

  return classData;
}

export async function addStudentToClassroom(
  classId: string,
  classCode: string,
  className: string,
  studentName: string,
  parentName?: string
): Promise<UserProfile> {
  const trimmedStudent = studentName.trim();
  const trimmedParent = parentName?.trim() || '';
  if (!trimmedStudent) {
    throw new Error('Lütfen öğrencinin adını ve soyadını girin.');
  }

  const { weekId } = getCurrentWeekInfo();
  const studentRef = doc(collection(db, 'users'));
  const newStudent: Record<string, any> = {
    uid: studentRef.id,
    role: 'parent',
    userType: 'parent',
    studentName: trimmedStudent,
    displayName: trimmedStudent + (trimmedParent ? ` (${trimmedParent})` : ''),
    classId,
    classCode,
    className,
    currentWeekId: weekId,
    currentWeekStage: 0,
    currentWeekMinutes: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (trimmedParent) {
    newStudent.parentName = trimmedParent;
  }

  await setDoc(studentRef, removeUndefined(newStudent));
  return newStudent as UserProfile;
}

export async function leaveClassroom(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(
    userRef,
    {
      classId: null,
      classCode: null,
      className: null,
      studentName: null,
      parentName: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateStudentName(
  uid: string,
  studentName: string,
  parentName?: string
): Promise<void> {
  const cleanUid = (uid || '').trim();
  if (!cleanUid) {
    console.warn('updateStudentName skipped: uid is invalid or empty');
    return;
  }
  const userRef = doc(db, 'users', cleanUid);
  const payload: any = {
    studentName: studentName.trim(),
    displayName: studentName.trim(),
    updatedAt: serverTimestamp(),
  };
  if (parentName !== undefined) {
    payload.parentName = parentName.trim();
  }
  await setDoc(userRef, payload, { merge: true });
}

export async function sendInAppMessage(
  message: Omit<InAppMessage, 'id' | 'createdAt' | 'readBy'>
): Promise<string> {
  const messagesCol = collection(db, 'in_app_messages');
  const msgDoc = doc(messagesCol);
  const data = removeUndefined({
    ...message,
    id: msgDoc.id,
    createdAt: serverTimestamp(),
    readBy: [],
  });
  await setDoc(msgDoc, data);
  return msgDoc.id;
}

export function subscribeInAppMessages(
  onUpdate: (messages: InAppMessage[]) => void,
  onError?: (err: Error) => void
) {
  const messagesCol = collection(db, 'in_app_messages');
  const q = query(messagesCol, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: InAppMessage[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as InAppMessage);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing in_app_messages:', err);
      // Fallback without orderBy in case index or empty collection
      onSnapshot(messagesCol, (snap) => {
        const list: InAppMessage[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as InAppMessage);
        });
        onUpdate(list);
      }, onError);
    }
  );
}

export async function markInAppMessageRead(messageId: string, userUid: string): Promise<void> {
  if (!messageId || !userUid) return;
  const msgRef = doc(db, 'in_app_messages', messageId);
  const snap = await getDoc(msgRef);
  if (snap.exists()) {
    const data = snap.data() as InAppMessage;
    const currentReadBy = Array.isArray(data.readBy) ? data.readBy : [];
    if (!currentReadBy.includes(userUid)) {
      await updateDoc(msgRef, {
        readBy: [...currentReadBy, userUid],
      });
    }
  }
}

export async function deleteInAppMessage(messageId: string): Promise<void> {
  if (!messageId) return;
  const msgRef = doc(db, 'in_app_messages', messageId);
  await deleteDoc(msgRef);
}

export function subscribeClassroom(
  classId: string,
  onUpdate: (classroom: ClassroomInfo | null) => void
) {
  const classRef = doc(db, 'classes', classId);
  return onSnapshot(
    classRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as ClassroomInfo);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Error subscribing classroom:', err);
    }
  );
}

export function subscribeClassroomStudents(
  classId: string,
  onUpdate: (students: UserProfile[]) => void,
  onError?: (err: Error) => void
) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('classId', '==', classId));

  return onSnapshot(
    q,
    (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const item = { uid: d.id, ...(d.data() as Partial<UserProfile>) } as UserProfile;
        if (item.role === 'parent' || item.userType === 'parent' || item.studentName) {
          list.push(item);
        }
      });
      list.sort((a, b) => (a.studentName || a.displayName || '').localeCompare(b.studentName || b.displayName || '', 'tr'));
      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing classroom students:', err);
      if (onError) onError(err);
    }
  );
}

export interface StudentJoinNotice {
  id: string;
  classId: string;
  studentName: string;
  parentName?: string;
  timestamp: number;
}

export async function recordNewStudentJoinNotice(
  classId: string,
  studentName: string,
  parentName?: string,
  studentUid?: string
): Promise<void> {
  const cleanStudent = (studentName || '').trim();
  const cleanClassId = (classId || '').trim();
  if (!cleanStudent || !cleanClassId) return;

  const noticeId = `join_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notice: StudentJoinNotice = {
    id: noticeId,
    classId: cleanClassId,
    studentName: cleanStudent,
    parentName: (parentName || '').trim() || undefined,
    timestamp: Date.now(),
  };

  // 1. Yerel kuyruğa yaz (anında ve offline güvenli)
  try {
    const queueKey = `pending_student_joins_${cleanClassId}`;
    const existing: StudentJoinNotice[] = JSON.parse(localStorage.getItem(queueKey) || '[]');
    existing.push(notice);
    localStorage.setItem(queueKey, JSON.stringify(existing));
  } catch (e) {
    console.warn('LocalStorage queue notice error:', e);
  }

  // 2. Firestore'a yaz
  try {
    const alertRef = doc(db, 'classes', cleanClassId, 'student_joins', noticeId);
    await setDoc(alertRef, {
      ...notice,
      studentUid: studentUid || '',
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore recordNewStudentJoinNotice error:', e);
  }
}

export function subscribeNewStudentJoins(
  classId: string,
  onNotice: (notices: StudentJoinNotice[]) => void
) {
  if (!classId) return () => {};

  // Önce yerel kuyruğu oku
  const queueKey = `pending_student_joins_${classId}`;
  let localNotices: StudentJoinNotice[] = [];
  try {
    localNotices = JSON.parse(localStorage.getItem(queueKey) || '[]');
  } catch (e) {
    localNotices = [];
  }
  if (localNotices.length > 0) {
    onNotice(localNotices);
  }

  const joinsRef = collection(db, 'classes', classId, 'student_joins');
  return onSnapshot(
    joinsRef,
    (snap) => {
      const list: StudentJoinNotice[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as StudentJoinNotice);
      });
      // Birleştir
      const map = new Map<string, StudentJoinNotice>();
      localNotices.forEach((n) => map.set(n.id, n));
      list.forEach((n) => map.set(n.id, n));
      onNotice(Array.from(map.values()));
    },
    (err) => {
      console.warn('Error subscribing student joins:', err);
      onNotice(localNotices);
    }
  );
}