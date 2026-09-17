import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
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

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Yönetici olmak için kurumun Admin Kodunun (ADM-XXXX) girilmesi zorunludur.
export const ADMIN_EMAILS: string[] = [];
export const DEFAULT_ADMIN_EMAIL = '';

export function isAdminEmail(_email?: string | null): boolean {
  return false;
}

/**
 * Sign in with Google Account (always prompts account selection)
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      let result: any = null;

      try {
        result = await FirebaseAuthentication.signInWithGoogle();
      } catch (credErr: any) {
        console.warn('Native GoogleSignIn failed, attempting web popup fallback:', credErr);
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const webRes = await signInWithPopup(auth, provider);
          await syncUserProfile(webRes.user);
          return webRes.user;
        } catch (webErr: any) {
          console.error('Web popup fallback also failed:', webErr);
          throw credErr;
        }
      }

      if (result) {
        let idToken = result.credential?.idToken;
        if (!idToken) {
          try {
            const tokenRes = await FirebaseAuthentication.getIdToken({ forceRefresh: false });
            idToken = tokenRes?.token;
          } catch (tErr) {
            console.warn('getIdToken fallback failed:', tErr);
          }
        }
        if (!idToken && result.user) {
          try {
            const tokenRes2 = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
            idToken = tokenRes2?.token;
          } catch (tErr2) {
            console.warn('getIdToken force refresh failed:', tErr2);
          }
        }
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          const userCredential = await signInWithCredential(auth, credential);
          await syncUserProfile(userCredential.user);
          return userCredential.user;
        }
        if (result.user) {
          const fallbackUser = await signInAsGuest(result.user.displayName || result.user.email || 'Google Kullanıcısı');
          return fallbackUser;
        }
        throw new Error('Google oturum açma başarılı ancak kimlik belirteci (idToken) alınamadı.');
      }
      return null;
    }

    // Web platform
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const result = await signInWithPopup(auth, provider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('canceled') ||
      error?.message?.includes('cancelled')
    ) {
      console.info('Google Sign-in was dismissed or closed by user.');
      return null;
    }
    console.error('Google Sign-in error:', error);
    throw error;
  }
}

/**
 * Quick demo/test sign in
 */
export async function signInAsGuest(customName?: string): Promise<User> {
  const result = await signInAnonymously(auth);
  if (customName && customName.trim()) {
    await updateProfile(result.user, {
      displayName: customName.trim(),
    });
  }
  await syncUserProfile(result.user, customName);
  return result.user;
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut().catch(() => {});
  }
  await signOut(auth);
}

/**
 * Completely forgets account credentials from this device
 */
export async function forgetAndClearAllDeviceData(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch (e) {
    console.warn('Storage clear error:', e);
  }

  try {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut().catch(() => {});
    }
  } catch (e) {
    console.warn('Capacitor signOut error:', e);
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

      if (window.indexedDB.databases) {
        const allDbs = await window.indexedDB.databases();
        for (const dbInfo of allDbs) {
          if (dbInfo.name && (dbInfo.name.includes('firebase') || dbInfo.name.includes('firestore'))) {
            try {
              window.indexedDB.deleteDatabase(dbInfo.name);
            } catch {}
          }
        }
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
 * Ensure user document exists in Firestore and sync role
 */
export async function syncUserProfile(
  user: User,
  customName?: string,
  roleOverride?: UserRole
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
      email: user.email || data.email || 'misafir@ekran.takip',
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
      email: user.email || 'misafir@ekran.takip',
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

/**
 * Listen to a user's profile and current progress
 */
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

/**
 * Update the user's weekly stage count (0-14)
 */
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

/**
 * Reset week progress back to 0
 */
export async function resetCurrentWeekProgress(uid: string): Promise<void> {
  await updateStageProgress(uid, 0, 'Hafta sıfırlandı');
}

/**
 * Subscribe to all week records for a user
 */
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

/**
 * Admin: Subscribe to all users in real-time
 */
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

/**
 * Admin: Toggle user role
 */
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
    throw new Error(`"${cleanedCode}" koduna sahip bir kurum bulunamadı. Lütfen yöneticinizden aldığınız kodu kontrol edin.`);
  }

  const instDoc = snap.docs[0];
  const instData = instDoc.data();

  const userRef = doc(db, 'users', userUid);
  await updateDoc(userRef, {
    institutionId: instDoc.id,
    institutionCode: instData.code,
    institutionName: instData.name,
    updatedAt: serverTimestamp(),
  });

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
    throw new Error(`"${cleanedCode}" koduna sahip bir kurum bulunamadı. Lütfen diğer yöneticinizden aldığınız Admin Kodunu kontrol edin.`);
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
          throw new Error('Girdiğiniz Admin Kodu kurumunuzun admin kodu ile uyuşmuyor! Lütfen doğru Admin Kodunu giriniz.');
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
      throw new Error(`"${cleanedCode}" koduna sahip bir kurum yöneticisi kodu bulunamadı. Lütfen geçerli Admin Kodunu kontrol ediniz.`);
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
    throw new Error(`"${cleanedCode}" koduna ait bir sınıf bulunamadı. Lütfen öğretmeninizin verdiği kodu kontrol edin.`);
  }

  const classDoc = snap.docs[0];
  const classData = classDoc.data() as ClassroomInfo;
  classData.id = classDoc.id;

  if (classData.teacherUid === userUid) {
    throw new Error(
      'Siz bu sınıfın öğretmenisiniz! Kendi sınıfınıza veli olarak katılamazsınız.'
    );
  }

  const userRef = doc(db, 'users', userUid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.role === 'teacher' || userData.userType === 'teacher' || userData.role === 'admin') {
      throw new Error(
        'Öğretmen veya Yönetici yetkisine sahip bir hesapla veli olarak sınıfa katılamazsınız!'
      );
    }
  }

  await updateDoc(userRef, {
    role: 'parent',
    userType: 'parent',
    classId: classDoc.id,
    classCode: classData.code,
    className: classData.name,
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