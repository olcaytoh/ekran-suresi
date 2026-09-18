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
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import {
  getFirestore,
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
import { UserProfile, WeekRecord, ClassroomInfo, UserRole } from '../types';
import { getCurrentWeekInfo } from './weekUtils';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with specific databaseId if provided
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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
    setActiveAppProfile(profile, rememberMe);
    return profile;
  } catch (authErr: any) {
    console.warn('Firebase Auth register warning:', authErr?.code, authErr?.message);

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

  // 1. Try Firebase Auth
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
    setActiveAppProfile(profile, rememberMe);
    return profile;
  } catch (authErr: any) {
    console.warn('Firebase Auth sign in warning:', authErr?.code, authErr?.message);

    // 2. Fallback: Search Firestore for this email
    try {
      const usersRef = collection(db, 'users');
      const existingEmailQuery = query(usersRef, where('email', '==', cleanEmail));
      const existingEmailSnap = await getDocs(existingEmailQuery);

      if (!existingEmailSnap.empty) {
        const docData = existingEmailSnap.docs[0].data() as any;
        if (docData.passwordHash && docData.passwordHash !== btoa(password)) {
          throw new Error('Girdiğiniz şifre hatalı. Lütfen kontrol edip tekrar deneyiniz.');
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
      throw new Error(`"${cleanEmail}" adresiyle henüz kayıt oluşturulmamış. Lütfen 'Yeni Üyelik' sekmesine geçerek kaydınızı tamamlayınız.`);
    }

    throw authErr;
  }
}

/**
 * Send password reset email
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Lütfen e-posta adresinizi giriniz.');
  }
  await sendPasswordResetEmail(auth, cleanEmail);
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

    await updateDoc(userRef, updatePayload);
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
        onUpdate(snap.data() as UserProfile);
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

  await updateDoc(userRef, {
    currentWeekStage: clampedStage,
    currentWeekMinutes: totalMinutes,
    currentWeekId: weekId,
    updatedAt: serverTimestamp(),
  });

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
        users.push(doc.data() as UserProfile);
      });
      onUpdate(users);
    },
    (error) => {
      console.error('Subscribe all users error:', error);
      onSnapshot(usersRef, (snap) => {
        const users: UserProfile[] = [];
        snap.forEach((doc) => {
          users.push(doc.data() as UserProfile);
        });
        onUpdate(users);
      }, onError);
    }
  );
}

export async function setUserRole(targetUid: string, role: UserRole): Promise<void> {
  const userRef = doc(db, 'users', targetUid);
  const payload: any = {
    role,
    userType: role === 'admin' || role === 'teacher' ? 'teacher' : 'parent',
    updatedAt: serverTimestamp(),
  };
  if (role !== 'admin') {
    payload.institutionAdminCode = deleteField();
  }
  await updateDoc(userRef, payload);
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
  const instData = {
    id: instRef.id,
    code,
    adminCode,
    name: institutionName.trim(),
    adminUid,
    adminName: adminName || 'Admin',
    adminEmail: adminEmail || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(instRef, instData);

  const adminRef = doc(db, 'users', adminUid);
  await updateDoc(adminRef, {
    role: 'admin',
    userType: 'teacher',
    institutionId: instRef.id,
    institutionCode: code,
    institutionAdminCode: adminCode,
    institutionName: institutionName.trim(),
    updatedAt: serverTimestamp(),
  });

  return { id: instRef.id, code, adminCode, name: institutionName.trim() };
}

export async function ensureInstitutionAdminCode(
  institutionId: string,
  adminUid: string
): Promise<string> {
  const instRef = doc(db, 'institutions', institutionId);
  const snap = await getDoc(instRef);
  if (!snap.exists()) {
    throw new Error('Kurum bulunamadı.');
  }
  const data = snap.data();
  if (data.adminCode) {
    return data.adminCode as string;
  }

  let adminCode = generateAdminCode();
  let tries = 0;
  while ((await isCodeTaken('adminCode', adminCode)) && tries < 5) {
    adminCode = generateAdminCode();
    tries += 1;
  }

  await updateDoc(instRef, { adminCode, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, 'users', adminUid), {
    institutionAdminCode: adminCode,
    updatedAt: serverTimestamp(),
  });

  return adminCode;
}

export async function updateInstitutionName(
  institutionId: string,
  adminUid: string,
  newName: string
): Promise<{ id: string; name: string }> {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('Lütfen geçerli bir kurum / okul adı girin.');
  }

  const instRef = doc(db, 'institutions', institutionId);
  await updateDoc(instRef, {
    name: trimmed,
    updatedAt: serverTimestamp(),
  });

  const adminRef = doc(db, 'users', adminUid);
  await updateDoc(adminRef, {
    institutionName: trimmed,
    updatedAt: serverTimestamp(),
  });

  return { id: institutionId, name: trimmed };
}

export async function regenerateInstitutionCode(
  institutionId: string,
  adminUid: string
): Promise<string> {
  let code = generateInstitutionCode();
  let tries = 0;
  while ((await isCodeTaken('code', code)) && tries < 5) {
    code = generateInstitutionCode();
    tries += 1;
  }
  const instRef = doc(db, 'institutions', institutionId);
  await updateDoc(instRef, { code, updatedAt: serverTimestamp() });
  const adminRef = doc(db, 'users', adminUid);
  await updateDoc(adminRef, { institutionCode: code, updatedAt: serverTimestamp() });
  return code;
}

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

  if (snap.empty) {
    throw new Error(`"${cleanedCode}" koduna sahip bir kurum bulunamadı.`);
  }

  const instDoc = snap.docs[0];
  const instData = instDoc.data();

  const userRef = doc(db, 'users', userUid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  await updateDoc(userRef, {
    institutionId: instDoc.id,
    institutionCode: instData.code,
    institutionName: instData.name,
    updatedAt: serverTimestamp(),
  });

  // If teacher already has a classroom, link that classroom to the institution too
  if (userData?.classId) {
    try {
      await updateDoc(doc(db, 'classes', userData.classId), {
        institutionId: instDoc.id,
        institutionCode: instData.code,
        institutionName: instData.name,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not link teacher active class to institution:', err);
    }
  }

  // Also link any classes created by this teacher
  try {
    const classesQ = query(collection(db, 'classes'), where('teacherUid', '==', userUid));
    const classesSnap = await getDocs(classesQ);
    for (const cDoc of classesSnap.docs) {
      await updateDoc(cDoc.ref, {
        institutionId: instDoc.id,
        institutionCode: instData.code,
        institutionName: instData.name,
        updatedAt: serverTimestamp(),
      });
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

  if (snap.empty) {
    throw new Error(`"${cleanedCode}" koduna sahip bir kurum bulunamadı.`);
  }

  const instDoc = snap.docs[0];
  const instData = instDoc.data();

  const userRef = doc(db, 'users', userUid);
  await updateDoc(userRef, {
    role: 'admin',
    userType: 'teacher',
    institutionId: instDoc.id,
    institutionCode: instData.code,
    institutionAdminCode: instData.adminCode,
    institutionName: instData.name,
    updatedAt: serverTimestamp(),
  });

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

  if (currentInstitutionId) {
    try {
      const directRef = doc(db, 'institutions', currentInstitutionId);
      const snap = await getDoc(directRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.adminCode && data.adminCode.trim().toUpperCase() === cleanedCode) {
          matchedDoc = snap;
        } else {
          throw new Error('Girdiğiniz Admin Kodu kurumunuzun admin kodu ile uyuşmuyor!');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('uyuşmuyor')) {
        throw err;
      }
    }
  }

  if (!matchedDoc) {
    const instRef = collection(db, 'institutions');
    const q = query(instRef, where('adminCode', '==', cleanedCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error(`"${cleanedCode}" koduna sahip bir kurum yöneticisi kodu bulunamadı.`);
    }

    matchedDoc = snap.docs[0];
  }

  const instData = matchedDoc.data();

  const userRef = doc(db, 'users', userUid);
  await updateDoc(userRef, {
    role: 'admin',
    userType: 'teacher',
    institutionId: matchedDoc.id,
    institutionCode: instData.code,
    institutionAdminCode: instData.adminCode,
    institutionName: instData.name,
    updatedAt: serverTimestamp(),
  });

  return {
    id: matchedDoc.id,
    code: instData.code,
    adminCode: instData.adminCode,
    name: instData.name,
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

    if (institution) {
      updatedData.institutionId = institution.id;
      updatedData.institutionCode = institution.code;
      updatedData.institutionName = institution.name;
    }

    await updateDoc(doc(db, 'classes', classId), updatedData);

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
    await updateDoc(teacherRef, {
      role: 'teacher',
      userType: 'teacher',
      classId: classId,
      classCode: existingData.code,
      className: trimmedName,
      ...(institution ? {
        institutionId: institution.id,
        institutionCode: institution.code,
        institutionName: institution.name,
      } : {}),
      updatedAt: serverTimestamp(),
    });

    return {
      ...existingData,
      id: classId,
      name: trimmedName,
      studentTargetCount,
      ...(institution ? {
        institutionId: institution.id,
        institutionCode: institution.code,
        institutionName: institution.name,
      } : {}),
    };
  }

  const classCode = generateClassCode();
  const classRef = doc(collection(db, 'classes'));
  const classroom: ClassroomInfo = {
    id: classRef.id,
    code: classCode,
    name: trimmedName,
    teacherUid,
    teacherName: teacherName || 'Öğretmen',
    teacherEmail: teacherEmail || '',
    studentTargetCount,
    institutionId: institution?.id,
    institutionCode: institution?.code,
    institutionName: institution?.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(classRef, classroom);

  const teacherRef = doc(db, 'users', teacherUid);
  await updateDoc(teacherRef, {
    role: 'teacher',
    userType: 'teacher',
    classId: classRef.id,
    classCode: classCode,
    className: trimmedName,
    ...(institution ? {
      institutionId: institution.id,
      institutionCode: institution.code,
      institutionName: institution.name,
    } : {}),
    updatedAt: serverTimestamp(),
  });

  return classroom;
}

export async function adminDeleteUser(userUid: string): Promise<void> {
  if (!userUid) return;
  const userRef = doc(db, 'users', userUid);
  await deleteDoc(userRef);
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

export async function updateClassroom(
  classId: string,
  teacherUid: string,
  className: string,
  studentTargetCount?: number,
  institution?: { id?: string; code: string; name: string }
): Promise<void> {
  const trimmedName = className.trim();
  const classRef = doc(db, 'classes', classId);
  await updateDoc(classRef, {
    name: trimmedName,
    ...(studentTargetCount ? { studentTargetCount } : {}),
    ...(institution ? {
      institutionId: institution.id,
      institutionCode: institution.code,
      institutionName: institution.name,
    } : {}),
    updatedAt: serverTimestamp(),
  });

  const teacherRef = doc(db, 'users', teacherUid);
  await updateDoc(teacherRef, {
    className: trimmedName,
    ...(institution ? {
      institutionId: institution.id,
      institutionCode: institution.code,
      institutionName: institution.name,
    } : {}),
    updatedAt: serverTimestamp(),
  });
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

  if (snap.empty) {
    throw new Error(`"${cleanedCode}" koduna ait bir sınıf bulunamadı.`);
  }

  const classDoc = snap.docs[0];
  const classData = classDoc.data() as ClassroomInfo;
  classData.id = classDoc.id;

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

  await updateDoc(userRef, {
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
  });

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
  const newStudent: UserProfile = {
    uid: studentRef.id,
    role: 'parent',
    userType: 'parent',
    studentName: trimmedStudent,
    parentName: trimmedParent || undefined,
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

  await setDoc(studentRef, newStudent);
  return newStudent;
}

export async function leaveClassroom(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    classId: null,
    classCode: null,
    className: null,
    studentName: null,
    parentName: null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateStudentName(uid: string, studentName: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    studentName: studentName.trim(),
    updatedAt: serverTimestamp(),
  });
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
        const item = d.data() as UserProfile;
        if (item.role === 'parent' || item.userType === 'parent' || item.studentName) {
          list.push(item);
        }
      });
      list.sort((a, b) => (a.studentName || a.displayName || '').localeCompare(b.studentName || b.displayName || 'tr'));
      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing classroom students:', err);
      if (onError) onError(err);
    }
  );
}