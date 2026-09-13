import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  User,
} from 'firebase/auth';
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

// Admin email configured by default
export const DEFAULT_ADMIN_EMAIL = 'olcaytoh@gmail.com';

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
}

/**
 * Sign in with Google Account
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Google Sign-in was dismissed or closed by user.');
      return null;
    }
    console.error('Google Sign-in error:', error);
    // If popup is blocked in iframe, rethrow so UI can offer fallback or explanation
    throw error;
  }
}

/**
 * Quick demo/test sign in (useful for testing or when iframe restricts popups)
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
  await signOut(auth);
}

/**
 * Ensure user document exists in Firestore and sync role
 */
export async function syncUserProfile(
  user: User,
  customName?: string,
  roleOverride?: 'teacher' | 'parent'
): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const { weekId } = getCurrentWeekInfo();

  const isDefaultAdmin = user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

  let pendingRole: 'teacher' | 'parent' | null = roleOverride || null;
  if (!pendingRole && typeof window !== 'undefined') {
    const stored = localStorage.getItem('pendingUserRole');
    if (stored === 'teacher' || stored === 'parent') {
      pendingRole = stored;
    }
  }

  let userProfile: UserProfile;

  if (snap.exists()) {
    const data = snap.data() as Partial<UserProfile>;

    let role: UserRole;
    let userType: 'teacher' | 'parent';

    if (isDefaultAdmin) {
      role = 'admin';
      userType = 'teacher';
    } else if (pendingRole) {
      role = pendingRole === 'teacher' ? 'teacher' : 'parent';
      userType = pendingRole;
    } else {
      role = data.role || (data.userType === 'teacher' ? 'teacher' : 'parent');
      userType = data.userType || (role === 'admin' || role === 'teacher' ? 'teacher' : 'parent');
    }

    userProfile = {
      uid: user.uid,
      email: user.email || data.email || 'misafir@ekran.takip',
      displayName: data.displayName || user.displayName || customName || (userType === 'teacher' ? 'Öğretmen' : 'Veli'),
      photoURL: user.photoURL || data.photoURL || undefined,
      role: role,
      userType: userType,
      studentName: data.studentName,
      parentName: data.parentName,
      classId: data.classId,
      classCode: data.classCode,
      className: data.className,
      currentWeekId: data.currentWeekId || weekId,
      currentWeekMinutes: data.currentWeekMinutes ?? 0,
      currentWeekStage: data.currentWeekStage ?? 0,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, {
      displayName: userProfile.displayName,
      email: userProfile.email,
      role: userProfile.role,
      userType: userProfile.userType,
      updatedAt: serverTimestamp(),
      ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    });
  } else {
    const role: UserRole = isDefaultAdmin
      ? 'admin'
      : pendingRole === 'teacher'
      ? 'teacher'
      : 'parent';
    const userType: 'teacher' | 'parent' = isDefaultAdmin
      ? 'teacher'
      : pendingRole === 'teacher'
      ? 'teacher'
      : 'parent';

    userProfile = {
      uid: user.uid,
      email: user.email || 'misafir@ekran.takip',
      displayName: user.displayName || customName || (userType === 'teacher' ? 'Öğretmen' : 'Veli'),
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

  // Update user main document
  await updateDoc(userRef, {
    currentWeekStage: clampedStage,
    currentWeekMinutes: totalMinutes,
    currentWeekId: weekId,
    updatedAt: serverTimestamp(),
  });

  // Get current week subdocument to append stage history if exists
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

  // Keep max 50 log items
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
      // Fallback without order by if index not ready
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
  await updateDoc(userRef, {
    role,
    userType: role === 'admin' || role === 'teacher' ? 'teacher' : 'parent',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Generate a friendly 6-character classroom code like "KOD4A2" or "EKR892"
 */
function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate institution code like "KRM-8492"
 */
function generateInstitutionCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KRM-${num}`;
}

/**
 * Admin: Create a new institution with a code
 */
export async function createInstitution(
  adminUid: string,
  adminName: string,
  adminEmail: string,
  institutionName: string
): Promise<{ id: string; code: string; name: string }> {
  const code = generateInstitutionCode();
  const instRef = doc(collection(db, 'institutions'));
  const instData = {
    id: instRef.id,
    code,
    name: institutionName.trim(),
    adminUid,
    adminName: adminName || 'Admin',
    adminEmail: adminEmail || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(instRef, instData);

  // Update admin's profile
  const adminRef = doc(db, 'users', adminUid);
  await updateDoc(adminRef, {
    role: 'admin',
    userType: 'teacher',
    institutionId: instRef.id,
    institutionCode: code,
    institutionName: institutionName.trim(),
    updatedAt: serverTimestamp(),
  });

  return { id: instRef.id, code, name: institutionName.trim() };
}

/**
 * Teacher: Join an institution with code
 */
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

  // Update user's profile
  const userRef = doc(db, 'users', userUid);
  await updateDoc(userRef, {
    institutionId: instDoc.id,
    institutionCode: instData.code,
    institutionName: instData.name,
    updatedAt: serverTimestamp(),
  });

  return { id: instDoc.id, code: instData.code, name: instData.name };
}

/**
 * Teacher: Create a new classroom with a 6-character code
 */
export async function createClassroom(
  teacherUid: string,
  teacherName: string,
  teacherEmail: string,
  className: string,
  studentTargetCount = 25,
  institution?: { code: string; name: string }
): Promise<ClassroomInfo> {
  const classCode = generateClassCode();
  const classRef = doc(collection(db, 'classes'));
  const classroom: ClassroomInfo = {
    id: classRef.id,
    code: classCode,
    name: className.trim(),
    teacherUid,
    teacherName: teacherName || 'Öğretmen',
    teacherEmail: teacherEmail || '',
    studentTargetCount,
    institutionCode: institution?.code,
    institutionName: institution?.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(classRef, classroom);

  // Update teacher's profile
  const teacherRef = doc(db, 'users', teacherUid);
  await updateDoc(teacherRef, {
    role: 'teacher',
    userType: 'teacher',
    classId: classRef.id,
    classCode: classCode,
    className: className.trim(),
    ...(institution ? {
      institutionCode: institution.code,
      institutionName: institution.name,
    } : {}),
    updatedAt: serverTimestamp(),
  });

  return classroom;
}

/**
 * Parent: Join a classroom using the 6-character code
 */
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

  // Find class by code
  const classesRef = collection(db, 'classes');
  const q = query(classesRef, where('code', '==', cleanedCode));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(`"${cleanedCode}" koduna ait bir sınıf bulunamadı. Lütfen öğretmeninizin verdiği kodu kontrol edin.`);
  }

  const classDoc = snap.docs[0];
  const classData = classDoc.data() as ClassroomInfo;
  classData.id = classDoc.id;

  // Update parent user profile
  const userRef = doc(db, 'users', userUid);
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

/**
 * Teacher or Parent: Leave / unlink from a classroom
 */
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

/**
 * Parent: Update student name
 */
export async function updateStudentName(uid: string, studentName: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    studentName: studentName.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Subscribe to classroom details
 */
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

/**
 * Subscribe to all students (parents) who joined this classroom
 */
export function subscribeClassroomStudents(
  classId: string,
  onUpdate: (students: UserProfile[]) => void
) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('classId', '==', classId));

  return onSnapshot(
    q,
    (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const item = d.data() as UserProfile;
        // Include if parent / student
        if (item.role === 'parent' || item.userType === 'parent' || item.studentName) {
          list.push(item);
        }
      });
      // Sort by studentName or displayName
      list.sort((a, b) => (a.studentName || a.displayName || '').localeCompare(b.studentName || b.displayName || 'tr'));
      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing classroom students:', err);
    }
  );
}
