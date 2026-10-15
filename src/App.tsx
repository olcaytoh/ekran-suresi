/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  subscribeUserProfile,
  subscribeAllUsers,
  subscribeClassroom,
  subscribeClassroomStudents,
  subscribeInstitutionClassrooms,
  updateStageProgress,
  updateUnusedDaysProgress,
  syncUserProfile,
  signOutUser,
  forgetAndClearAllDeviceData,
  adminDeleteClassroom,
  adminUpdateClassroom,
  adminDeleteUser,
  setUserRole,
  updateUserProfile,
  verifyAdminCodeAndUpgrade,
  getActiveAppProfile,
  setActiveAppProfile,
  clearActiveAppProfile,
  purgeBlockedEmailsFromFirestore,
  isBlockedEmail,
  normalizeUserForCurrentWeek,
} from './lib/firebase';
import { UserProfile, ClassroomInfo } from './types';
import { getCurrentWeekInfo } from './lib/weekUtils';
import { Header } from './components/Header';
import { ParentHeroBanner } from './components/ParentHeroBanner';
import { ParentHomeView } from './components/ParentHomeView';
import { TeacherHomeView } from './components/TeacherHomeView';
import { AdminInstitutionView } from './components/AdminInstitutionView';
import { ParentStagesCompact } from './components/ParentStagesCompact';
import { ParentBadgesView } from './components/ParentBadgesView';
import { ParentClassroomView } from './components/ParentClassroomView';
import { BottomDock, ParentTabType } from './components/BottomDock';
import { AuthScreen } from './components/AuthScreen';
import { ClassroomSetupModal } from './components/ClassroomSetupModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { ParentGuideModal } from './components/ParentGuideModal';
import { AdminCodePromptModal } from './components/AdminCodePromptModal';
import { Loader2, GraduationCap, School, ChevronRight, X, Plus } from 'lucide-react';
import { DEMO_3_CLASSES, DEMO_INSTITUTION } from './lib/demoData';

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeLocalProfile, setActiveLocalProfile] = useState<UserProfile | null>(() => {
    return getActiveAppProfile();
  });
  const [demoProfile, setDemoProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('demoUserProfile');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [institutionClassrooms, setInstitutionClassrooms] = useState<ClassroomInfo[]>([]);
  const [classStudentsMap, setClassStudentsMap] = useState<Record<string, UserProfile[]>>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [parentTab, setParentTab] = useState<ParentTabType>('home');
  const [tabHistory, setTabHistory] = useState<ParentTabType[]>([]);
  const [adminSelectedClassId, setAdminSelectedClassId] = useState<string | null>(null);
  const [adminSection, setAdminSection] = useState<'classrooms' | 'registered_emails'>('classrooms');
  const [showClassSetup, setShowClassSetup] = useState(false);
  const [showParentGuide, setShowParentGuide] = useState(false);
  const [showTeacherClassPicker, setShowTeacherClassPicker] = useState(false);
  const [showAdminCodePrompt, setShowAdminCodePrompt] = useState(false);
  const [impersonatedParent, setImpersonatedParent] = useState<UserProfile | null>(null);
  const [weekInfo, setWeekInfo] = useState(() => getCurrentWeekInfo());

  // Her Pazartesi sabah 09:00'da otomatik haftalık sıfırlama kontrolü (uygulama açıkken bile anında yeni haftaya geçer ve istatistikleri korur)
  useEffect(() => {
    const checkMonday9amReset = () => {
      const latestWeek = getCurrentWeekInfo();
      setWeekInfo((prev) => {
        if (prev.weekId !== latestWeek.weekId) {
          setUserProfile((u) => (u ? normalizeUserForCurrentWeek(u, latestWeek.weekId) : null));
          setActiveLocalProfile((u) => {
            if (!u) return null;
            const normalized = normalizeUserForCurrentWeek(u, latestWeek.weekId);
            setActiveAppProfile(normalized, true);
            return normalized;
          });
          setDemoProfile((u) => (u ? normalizeUserForCurrentWeek(u, latestWeek.weekId) : null));
          setAllUsers((list) => list.map((st) => normalizeUserForCurrentWeek(st, latestWeek.weekId)));
          setClassStudentsMap((prevMap) => {
            const nextMap: Record<string, UserProfile[]> = {};
            Object.keys(prevMap).forEach((k) => {
              nextMap[k] = (prevMap[k] || []).map((st) =>
                normalizeUserForCurrentWeek(st, latestWeek.weekId)
              );
            });
            return nextMap;
          });
          return latestWeek;
        }
        return prev;
      });
    };

    checkMonday9amReset();
    const timer = setInterval(checkMonday9amReset, 30000);
    return () => clearInterval(timer);
  }, []);

  // Purge any deleted/blocked test emails from Firestore on startup
  useEffect(() => {
    purgeBlockedEmailsFromFirestore();
  }, []);

  // Listen to custom local profile changes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      const nextProfile = e.detail || null;
      setActiveLocalProfile(nextProfile);
      if (nextProfile) {
        setUserProfile(nextProfile);
        setDemoProfile(null);
        setAllUsers([]);
        setClassroom(null);
        setInstitutionClassrooms([]);
        setClassStudentsMap({});
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('demoUserProfile');
        }
      } else {
        setUserProfile(null);
        setDemoProfile(null);
        setAuthUser(null);
        setAllUsers([]);
        setClassroom(null);
        setInstitutionClassrooms([]);
        setClassStudentsMap({});
      }
    };
    window.addEventListener('app_auth_change', handleAuthChange);
    return () => window.removeEventListener('app_auth_change', handleAuthChange);
  }, []);

  const handleDemoLogin = (role: 'teacher' | 'parent' | 'admin') => {
    let profile: UserProfile;
    if (role === 'admin') {
      setClassroom(null);
      profile = {
        uid: 'admin_demo_super',
        displayName: 'Olcayto Yılmaz',
        email: 'olcaytoh@gmail.com',
        role: 'admin',
        userType: 'teacher',
        institutionId: DEMO_INSTITUTION.id,
        institutionCode: DEMO_INSTITUTION.code,
        institutionAdminCode: DEMO_INSTITUTION.adminCode,
        institutionName: DEMO_INSTITUTION.name,
        currentWeekId: weekInfo.weekId,
        currentWeekStage: 4,
        currentWeekMinutes: 120,
      };
    } else if (role === 'teacher') {
      const defaultClass = DEMO_3_CLASSES[0];
      setClassroom({
        id: defaultClass.id,
        name: defaultClass.name,
        code: defaultClass.code,
        teacherId: defaultClass.teacherUid,
        teacherName: defaultClass.teacherName,
        teacherEmail: defaultClass.teacherEmail,
        institutionId: defaultClass.institutionId,
        institutionCode: defaultClass.institutionCode,
        institutionName: defaultClass.institutionName,
        createdAt: null,
      });
      profile = {
        uid: defaultClass.teacherUid,
        displayName: defaultClass.teacherName,
        email: defaultClass.teacherEmail,
        role: 'teacher',
        userType: 'teacher',
        institutionId: DEMO_INSTITUTION.id,
        institutionCode: DEMO_INSTITUTION.code,
        // Teachers do not receive institutionAdminCode
        institutionName: DEMO_INSTITUTION.name,
        classId: defaultClass.id,
        className: defaultClass.name,
        classCode: defaultClass.code,
        currentWeekId: weekInfo.weekId,
        currentWeekStage: 4,
        currentWeekMinutes: 120,
      };
    } else {
      const defaultClass = DEMO_3_CLASSES[0];
      const defaultStd = defaultClass.students[0];
      setClassroom({
        id: defaultClass.id,
        name: defaultClass.name,
        code: defaultClass.code,
        teacherId: defaultClass.teacherUid,
        teacherName: defaultClass.teacherName,
        teacherEmail: defaultClass.teacherEmail,
        institutionId: defaultClass.institutionId,
        institutionCode: defaultClass.institutionCode,
        institutionName: defaultClass.institutionName,
        createdAt: null,
      });
      profile = {
        uid: defaultStd.id,
        displayName: `${defaultStd.studentName} (${defaultStd.parentName})`,
        email: `${defaultStd.id}@akcakocailkokulu.k12.tr`,
        role: 'parent',
        userType: 'parent',
        studentName: defaultStd.studentName,
        parentName: defaultStd.parentName,
        institutionId: DEMO_INSTITUTION.id,
        institutionCode: DEMO_INSTITUTION.code,
        institutionName: DEMO_INSTITUTION.name,
        classId: defaultClass.id,
        className: defaultClass.name,
        classCode: defaultClass.code,
        currentWeekId: weekInfo.weekId,
        currentWeekStage: defaultStd.stage,
        currentWeekMinutes: defaultStd.minutes,
      };
    }
    setDemoProfile(profile);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demoUserProfile', JSON.stringify(profile));
    }
    setParentTab('home');
  };

  const handleSelectTeacherClass = async (selectedClass: ClassroomInfo) => {
    setClassroom(selectedClass);
    setShowTeacherClassPicker(false);
    setParentTab('home');

    // Make cached students visible immediately if present in classStudentsMap
    const cachedStudents = classStudentsMap[selectedClass.id];
    if (cachedStudents && cachedStudents.length > 0) {
      setAllUsers(cachedStudents);
    }

    if (authUser) {
      try {
        await setUserRole(authUser.uid, 'teacher', {
          classId: selectedClass.id,
          className: selectedClass.name,
          classCode: selectedClass.code,
          preserveAdminCode: true,
        });
        await updateUserProfile(authUser.uid, {
          role: 'teacher',
          userType: 'teacher',
          classId: selectedClass.id,
          className: selectedClass.name,
          classCode: selectedClass.code,
        });
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                role: 'teacher',
                userType: 'teacher',
                classId: selectedClass.id,
                className: selectedClass.name,
                classCode: selectedClass.code,
              }
            : null
        );
      } catch (err) {
        console.error('Failed to switch to teacher mode with class:', err);
      }
    } else if (activeLocalProfile) {
      const updated: UserProfile = {
        ...activeLocalProfile,
        role: 'teacher',
        userType: 'teacher',
        classId: selectedClass.id,
        className: selectedClass.name,
        classCode: selectedClass.code,
      };
      setActiveLocalProfile(updated);
      setActiveAppProfile(updated, true);
    } else if (demoProfile) {
      const updated: UserProfile = {
        ...demoProfile,
        role: 'teacher',
        userType: 'teacher',
        classId: selectedClass.id,
        className: selectedClass.name,
        classCode: selectedClass.code,
      };
      setDemoProfile(updated);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('demoUserProfile', JSON.stringify(updated));
      }
    }
  };

  const handleSwitchToTeacherMode = (targetClass?: ClassroomInfo) => {
    if (targetClass) {
      handleSelectTeacherClass(targetClass);
    } else {
      setShowTeacherClassPicker(true);
    }
  };

  const handleSwitchRole = async (newRole: 'admin' | 'teacher') => {
    // Admin öğretmen moduna geçmek istediğinde ekli sınıflardan seçim yaptır
    if (newRole === 'teacher' && isSuperAdmin) {
      setShowTeacherClassPicker(true);
      return;
    }

    // ÖĞRETMEN VEYA VELİ MODUNDAN ADMİN MODUNA GEÇİŞ:
    // KESİNLİKLE ADMİN KODU DOĞRULANMADAN GEÇİLEMEZ!
    if (newRole === 'admin') {
      if (effectiveProfile?.institutionAdminCode) {
        try {
          await handleUpgradeToAdminWithCode(effectiveProfile.institutionAdminCode);
          return;
        } catch (e) {
          console.warn('Could not auto-restore admin mode with saved code:', e);
          setShowAdminCodePrompt(true);
          return;
        }
      }
      setShowAdminCodePrompt(true);
      return;
    }

    if (authUser) {
      try {
        await setUserRole(authUser.uid, newRole, { preserveAdminCode: true });
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                role: newRole,
                userType: 'teacher',
              }
            : null
        );
      } catch (err) {
        console.error('Failed to switch role:', err);
      }
    } else if (activeLocalProfile) {
      const updated: UserProfile = {
        ...activeLocalProfile,
        role: newRole,
      };
      setActiveLocalProfile(updated);
      setActiveAppProfile(updated, true);
    } else if (demoProfile) {
      setShowTeacherClassPicker(true);
    }
  };

  const handleUpgradeToAdminWithCode = async (adminCode: string) => {
    const cleaned = adminCode.trim().toUpperCase();
    if (!cleaned) {
      throw new Error('Lütfen geçerli bir Admin Kodu giriniz.');
    }

    if (authUser) {
      // Doğrudan doğrula - hata fırlatırsa fırlatsın, KESİNLİKLE sessizce admin yapılmasın!
      const instData = await verifyAdminCodeAndUpgrade(
        authUser.uid,
        cleaned,
        effectiveProfile?.institutionId
      );
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              role: 'admin',
              userType: 'teacher',
              institutionId: instData.id,
              institutionCode: instData.code,
              institutionAdminCode: instData.adminCode,
              institutionName: instData.name,
            }
          : null
      );
      setClassroom(null);
      setParentTab('home');
    } else if (activeLocalProfile) {
      if (
        activeLocalProfile.institutionAdminCode &&
        activeLocalProfile.institutionAdminCode.trim().toUpperCase() !== cleaned
      ) {
        throw new Error('Girdiğiniz Admin Kodu kayıtlı kurum admin kodunuzla eşleşmiyor!');
      }
      const updated: UserProfile = {
        ...activeLocalProfile,
        role: 'admin',
        userType: 'teacher',
        institutionAdminCode: cleaned,
      };
      setActiveLocalProfile(updated);
      setActiveAppProfile(updated, true);
      setClassroom(null);
      setParentTab('home');
    } else if (demoProfile) {
      const expectedDemo = (demoProfile.institutionAdminCode || 'ADM-2090').trim().toUpperCase();
      if (cleaned !== expectedDemo && cleaned !== 'ADM-2090') {
        throw new Error(`Geçersiz Admin Kodu! Bu demo için geçerli Admin Kodu: ${expectedDemo}`);
      }
      handleDemoLogin('admin');
      setClassroom(null);
      setParentTab('home');
    } else {
      throw new Error('Aktif bir kullanıcı oturumu bulunamadı.');
    }
  };

  const handleSignOut = async () => {
    setImpersonatedParent(null);
    setDemoProfile(null);
    setActiveLocalProfile(null);
    clearActiveAppProfile();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('demoUserProfile');
    }
    await signOutUser();
  };

  const handleForgetAccount = async () => {
    try {
      setImpersonatedParent(null);
      setDemoProfile(null);
      setUserProfile(null);
      setActiveLocalProfile(null);
      setAuthUser(null);
      setAllUsers([]);
      setClassroom(null);
      setInstitutionClassrooms([]);
      setClassStudentsMap({});
      setParentTab('home');
      clearActiveAppProfile();
      await forgetAndClearAllDeviceData();
    } catch (err) {
      console.error('Failed to forget account:', err);
      setDemoProfile(null);
      setUserProfile(null);
      setActiveLocalProfile(null);
      setAuthUser(null);
      setParentTab('home');
      clearActiveAppProfile();
      await forgetAndClearAllDeviceData().catch(() => {});
    }
  };

  const handleAdminDeleteClassroom = async (classId: string, teacherUid?: string) => {
    try {
      setInstitutionClassrooms((prev) => prev.filter((c) => c.id !== classId));
      setClassStudentsMap((prev) => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });

      if (authUser || activeLocalProfile) {
        await adminDeleteClassroom(classId, teacherUid);
      }
    } catch (err) {
      console.error('Failed to delete classroom:', err);
    }
  };

  const handleAdminUpdateClassroom = async (
    classId: string,
    newClassName: string,
    teacherUid?: string,
    newTeacherName?: string,
    studentTargetCount?: number
  ) => {
    try {
      const cleanName = newClassName.trim();
      const cleanTeacher = newTeacherName?.trim();
      const validTargetCount =
        typeof studentTargetCount === 'number' && !isNaN(studentTargetCount) && studentTargetCount > 0
          ? Math.round(studentTargetCount)
          : undefined;

      setInstitutionClassrooms((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                name: cleanName,
                ...(cleanTeacher ? { teacherName: cleanTeacher } : {}),
                ...(validTargetCount !== undefined ? { studentTargetCount: validTargetCount } : {}),
              }
            : c
        )
      );

      if (classroom?.id === classId) {
        setClassroom((prev) =>
          prev
            ? {
                ...prev,
                name: cleanName,
                ...(cleanTeacher ? { teacherName: cleanTeacher } : {}),
                ...(validTargetCount !== undefined ? { studentTargetCount: validTargetCount } : {}),
              }
            : prev
        );
      }

      setClassStudentsMap((prev) => {
        const existing = prev[classId];
        if (!existing) return prev;
        return {
          ...prev,
          [classId]: existing.map((u) => ({ ...u, className: cleanName })),
        };
      });

      setAllUsers((prev) =>
        prev.map((u) => {
          if (u.classId === classId) {
            return { ...u, className: cleanName };
          }
          if (teacherUid && u.uid === teacherUid) {
            return {
              ...u,
              className: cleanName,
              ...(cleanTeacher ? { displayName: cleanTeacher } : {}),
            };
          }
          return u;
        })
      );

      if (authUser || activeLocalProfile) {
        await adminUpdateClassroom(classId, cleanName, teacherUid, cleanTeacher, validTargetCount);
      }
    } catch (err) {
      console.error('Failed to update classroom:', err);
      throw err;
    }
  };

  const handleAdminDeleteUser = async (userUid: string, classId?: string) => {
    try {
      setAllUsers((prev) => prev.filter((u) => u.uid !== userUid));
      if (classId) {
        setClassStudentsMap((prev) => ({
          ...prev,
          [classId]: (prev[classId] || []).filter((u) => u.uid !== userUid),
        }));
      } else {
        setClassStudentsMap((prev) => {
          const next: Record<string, UserProfile[]> = {};
          Object.keys(prev).forEach((k) => {
            next[k] = prev[k].filter((u) => u.uid !== userUid);
          });
          return next;
        });
      }

      if (authUser || activeLocalProfile) {
        await adminDeleteUser(userUid);
      }
    } catch (err) {
      console.error('Failed to delete user account:', err);
    }
  };

  const handleUpdateStudentUser = async (userUid: string, updates: Partial<UserProfile>) => {
    try {
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === userUid ? { ...u, ...updates } : u))
      );

      setClassStudentsMap((prev) => {
        const next: Record<string, UserProfile[]> = {};
        Object.keys(prev).forEach((k) => {
          next[k] = (prev[k] || []).map((u) => (u.uid === userUid ? { ...u, ...updates } : u));
        });
        return next;
      });

      if (authUser || activeLocalProfile) {
        await updateUserProfile(userUid, updates);
      }
    } catch (err) {
      console.error('Failed to update student user:', err);
      throw err;
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        if (isBlockedEmail(user.email)) {
          await signOutUser().catch(() => {});
          setAuthUser(null);
          setUserProfile(null);
          setAuthLoading(false);
          return;
        }
        try {
          const profile = await syncUserProfile(user);
          if (isBlockedEmail(profile?.email)) {
            await signOutUser().catch(() => {});
            setAuthUser(null);
            setUserProfile(null);
            setAuthLoading(false);
            return;
          }
          setUserProfile(profile);

          // Default tab is always 'home'
          setParentTab('home');

          // If user doesn't have classId/className and hasn't connected to an institution yet, prompt setup
          if (
            !profile.classId &&
            !profile.className &&
            !profile.institutionId &&
            !profile.institutionCode &&
            profile.role !== 'parent'
          ) {
            setShowClassSetup(true);
          }
        } catch (err: any) {
          console.warn('Error syncing user profile on login:', err);
          // If a stale token from previous project causes permission-denied, clear auth session
          if (
            err?.code === 'permission-denied' ||
            err?.message?.includes('insufficient permissions') ||
            err?.message?.includes('Missing or insufficient permissions')
          ) {
            console.warn('Stale auth session detected from previous project. Clearing session...');
            await signOutUser().catch(() => {});
            setAuthUser(null);
            setUserProfile(null);
          }
        }
      } else {
        setUserProfile(null);
        if (!demoProfile) {
          setAllUsers([]);
          setClassroom(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, [demoProfile]);

  // Listen to current user profile updates
  useEffect(() => {
    if (!authUser) return;
    const unsubscribe = subscribeUserProfile(
      authUser.uid,
      (profile) => {
        if (profile) {
          setUserProfile(profile);
        }
      },
      (err: any) => {
        if (err?.code !== 'permission-denied') {
          console.error('User profile subscription error:', err);
        }
      }
    );
    return () => unsubscribe();
  }, [authUser]);

  // Listen to active local profile updates from Firestore
  useEffect(() => {
    if (!activeLocalProfile?.uid || authUser) return;
    let isCancelled = false;
    const unsubscribe = subscribeUserProfile(
      activeLocalProfile.uid,
      (profile) => {
        if (isCancelled || !profile) return;
        const currentStored = getActiveAppProfile();
        if (!currentStored || currentStored.uid !== profile.uid) return;
        setActiveLocalProfile(profile);
        const shouldRemember =
          typeof window !== 'undefined' && localStorage.getItem('rememberMe') !== 'false';
        setActiveAppProfile(profile, shouldRemember);
      },
      (err: any) => {
        if (
          err?.code !== 'permission-denied' &&
          err?.code !== 'resource-exhausted' &&
          !err?.message?.includes('Quota limit exceeded')
        ) {
          console.error('Active profile subscription error:', err);
        }
      }
    );
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [activeLocalProfile?.uid, authUser]);

  const baseProfile = authUser ? userProfile : (activeLocalProfile || demoProfile);

  // Öğretmen bir öğrencinin veli hesabını görüntülüyorsa, o öğrencinin allUsers içindeki güncel verisini senkron tut
  const activeImpersonatedParent = useMemo(() => {
    if (!impersonatedParent) return null;
    const liveMatch = allUsers.find((u) => u.uid === impersonatedParent.uid);
    return liveMatch
      ? {
          ...impersonatedParent,
          ...liveMatch,
          role: 'parent' as const,
          userType: 'parent' as const,
        }
      : impersonatedParent;
  }, [impersonatedParent, allUsers]);

  const effectiveProfile = activeImpersonatedParent || baseProfile;
  const isSuperAdmin = !activeImpersonatedParent && effectiveProfile?.role === 'admin';
  const isTeacher = !activeImpersonatedParent && effectiveProfile?.role === 'teacher';
  const isStaffOrAdmin = isSuperAdmin || isTeacher;

  const handleSelectStudentAsParent = (student: UserProfile) => {
    setImpersonatedParent({
      ...student,
      role: 'parent',
      userType: 'parent',
    });
    setParentTab('home');
  };

  const handleExitParentImpersonation = () => {
    setImpersonatedParent(null);
    setParentTab('home');
    setTabHistory([]);
  };

  const handleSelectTab = (nextTab: ParentTabType) => {
    if (nextTab === parentTab) return;
    setTabHistory((prev) => [...prev.slice(-8), parentTab]);
    setParentTab(nextTab);
  };

  const canGoBack = Boolean(
    showAdminCodePrompt ||
      showTeacherClassPicker ||
      showParentGuide ||
      showClassSetup ||
      parentTab !== 'home' ||
      impersonatedParent ||
      (isSuperAdmin && adminSelectedClassId !== null) ||
      (isSuperAdmin && adminSection === 'registered_emails') ||
      (isTeacher && effectiveProfile?.institutionAdminCode)
  );

  const handleGoBack = () => {
    if (showAdminCodePrompt) {
      setShowAdminCodePrompt(false);
      return true;
    }
    if (showTeacherClassPicker) {
      setShowTeacherClassPicker(false);
      return true;
    }
    if (showParentGuide) {
      setShowParentGuide(false);
      return true;
    }
    if (showClassSetup) {
      setShowClassSetup(false);
      return true;
    }
    if (parentTab !== 'home') {
      if (tabHistory.length > 0) {
        const prevTab = tabHistory[tabHistory.length - 1];
        setTabHistory((prev) => prev.slice(0, -1));
        setParentTab(prevTab);
      } else {
        setParentTab('home');
      }
      return true;
    }
    if (impersonatedParent) {
      handleExitParentImpersonation();
      return true;
    }
    if (isSuperAdmin && adminSelectedClassId !== null) {
      setAdminSelectedClassId(null);
      return true;
    }
    if (isSuperAdmin && adminSection === 'registered_emails') {
      setAdminSection('classrooms');
      return true;
    }
    if (isTeacher && effectiveProfile?.institutionAdminCode) {
      handleSwitchRole('admin');
      return true;
    }
    return false;
  };

  const handleGoBackRef = useRef(handleGoBack);
  handleGoBackRef.current = handleGoBack;

  // Telefon / tarayıcı donanımsal "Geri" tuşu (popstate) ile bir önceki ekrana dönme desteği
  useEffect(() => {
    if (typeof window === 'undefined' || !effectiveProfile) return;
    if (canGoBack && !window.history.state?.appBackGuard) {
      window.history.pushState({ appBackGuard: true }, '');
    }
  }, [
    canGoBack,
    effectiveProfile,
    parentTab,
    showClassSetup,
    showParentGuide,
    showTeacherClassPicker,
    showAdminCodePrompt,
    impersonatedParent,
    adminSelectedClassId,
    adminSection,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const handled = handleGoBackRef.current();
      if (handled) {
        // Eğer geri gittikten sonra hala geri gidilebilecek bir ekran varsa history guard'ı koru
        setTimeout(() => {
          if (!window.history.state?.appBackGuard) {
            window.history.pushState({ appBackGuard: true }, '');
          }
        }, 0);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Listen to classroom data if user belongs to a class
  useEffect(() => {
    if (!effectiveProfile?.classId) {
      setClassroom(null);
      return;
    }
    if (authUser || activeLocalProfile) {
      const unsubscribeClass = subscribeClassroom(effectiveProfile.classId, (classData) => {
        setClassroom(classData);
      });
      return () => unsubscribeClass();
    } else if (demoProfile) {
      if (demoProfile.role === 'teacher' || demoProfile.role === 'parent') {
        const found =
          DEMO_3_CLASSES.find((c) => c.id === demoProfile.classId) || DEMO_3_CLASSES[0];
        setClassroom({
          id: found.id,
          name: found.name,
          code: found.code,
          teacherId: found.teacherUid,
          teacherName: found.teacherName,
          teacherEmail: found.teacherEmail,
          institutionId: found.institutionId,
          institutionCode: found.institutionCode,
          institutionName: found.institutionName,
          createdAt: null,
        });
      } else {
        setClassroom(null);
      }
    }
  }, [effectiveProfile?.classId, effectiveProfile?.role, authUser, activeLocalProfile, demoProfile]);

  // Listen to students/users list:
  useEffect(() => {
    if (authUser || activeLocalProfile) {
      if (isTeacher) {
        const targetClassId = effectiveProfile?.classId || classroom?.id;
        if (targetClassId) {
          const unsubscribeStudents = subscribeClassroomStudents(
            targetClassId,
            (students) => {
              setAllUsers(students);
            },
            (err: any) => {
              if (err?.code !== 'permission-denied') {
                console.error('Error subscribing classroom students:', err);
              }
            }
          );
          return () => unsubscribeStudents();
        } else {
          // Yeni öğretmen hesabında henüz sınıf oluşturulmamışsa kesinlikle başka kullanıcıları getirme!
          setAllUsers([]);
          return;
        }
      } else if (isSuperAdmin) {
        if (effectiveProfile?.institutionId) {
          const unsubscribeAll = subscribeAllUsers(
            (users) => {
              setAllUsers(users);
            },
            (err: any) => {
              if (err?.code !== 'permission-denied') {
                console.error('Error subscribing all users:', err);
              }
            }
          );
          return () => unsubscribeAll();
        } else {
          // Yeni yönetici hesabında henüz kurum oluşturulmamışsa başka hesapları getirme!
          setAllUsers([]);
          return;
        }
      } else {
        // Veli hesabı: başka hesapları listelemeye gerek yok
        setAllUsers([]);
        return;
      }
    } else if (demoProfile) {
      if (demoProfile.role === 'admin') {
        setAllUsers(
          DEMO_3_CLASSES.flatMap((cls) =>
            cls.students.map((std) => ({
              uid: std.id,
              displayName: `${std.studentName} (${std.parentName})`,
              studentName: std.studentName,
              parentName: std.parentName,
              email: `${std.id}@akcakocailkokulu.k12.tr`,
              role: 'parent' as const,
              userType: 'parent' as const,
              classId: cls.id,
              className: cls.name,
              classCode: cls.code,
              institutionId: DEMO_INSTITUTION.id,
              institutionCode: DEMO_INSTITUTION.code,
              institutionName: DEMO_INSTITUTION.name,
              currentWeekStage: std.stage,
              currentWeekMinutes: std.minutes,
              currentWeekId: weekInfo.weekId,
            }))
          )
        );
      } else {
        // Find the active classroom from DEMO_3_CLASSES, default to 1-A Sınıfı
        const activeClass =
          DEMO_3_CLASSES.find((c) => c.id === (classroom?.id || demoProfile.classId)) ||
          DEMO_3_CLASSES[0];

        setAllUsers(
          activeClass.students.map((std) => ({
            uid: std.id,
            displayName: `${std.studentName} (${std.parentName})`,
            studentName: std.studentName,
            parentName: std.parentName,
            email: `${std.id}@akcakocailkokulu.k12.tr`,
            role: 'parent' as const,
            userType: 'parent' as const,
            classId: activeClass.id,
            className: activeClass.name,
            classCode: activeClass.code,
            institutionId: DEMO_INSTITUTION.id,
            institutionCode: DEMO_INSTITUTION.code,
            institutionName: DEMO_INSTITUTION.name,
            currentWeekStage: std.stage,
            currentWeekMinutes: std.minutes,
            currentWeekId: weekInfo.weekId,
          }))
        );
      }
    }
  }, [
    authUser,
    activeLocalProfile,
    isTeacher,
    isSuperAdmin,
    effectiveProfile?.classId,
    effectiveProfile?.institutionId,
    demoProfile,
    classroom?.id,
  ]);

  // Listen to all classrooms belonging to the user's institution (for admin & teacher)
  useEffect(() => {
    const hasInstAccess =
      isSuperAdmin ||
      isTeacher ||
      Boolean(effectiveProfile?.institutionAdminCode) ||
      Boolean(effectiveProfile?.institutionId) ||
      Boolean(effectiveProfile?.institutionCode);

    if (!hasInstAccess) {
      setInstitutionClassrooms([]);
      return;
    }

    if (authUser || activeLocalProfile) {
      const targetInstId =
        effectiveProfile?.institutionId ||
        effectiveProfile?.institutionCode ||
        classroom?.institutionId ||
        classroom?.institutionCode;

      const targetInstCode =
        effectiveProfile?.institutionCode ||
        classroom?.institutionCode ||
        (targetInstId && targetInstId.startsWith('KRM') ? targetInstId : undefined);

      if (targetInstId) {
        const unsubscribeClassrooms = subscribeInstitutionClassrooms(
          targetInstId,
          (list) => setInstitutionClassrooms(list),
          (err) => console.warn('Subscribe classrooms error:', err),
          targetInstCode
        );
        return () => unsubscribeClassrooms();
      } else {
        setInstitutionClassrooms([]);
      }
    } else if (demoProfile) {
      // Demo modu: 3 sınıfın tümü listelenir
      setInstitutionClassrooms(
        DEMO_3_CLASSES.map((cls) => ({
          id: cls.id,
          code: cls.code,
          name: cls.name,
          teacherUid: cls.teacherUid,
          teacherName: cls.teacherName,
          teacherEmail: cls.teacherEmail,
          institutionId: cls.institutionId,
          institutionCode: cls.institutionCode,
          institutionName: cls.institutionName,
          studentTargetCount: cls.studentTargetCount || 10,
        }))
      );
    }
  }, [
    authUser,
    activeLocalProfile,
    demoProfile,
    isSuperAdmin,
    isTeacher,
    effectiveProfile?.institutionId,
    effectiveProfile?.institutionCode,
    effectiveProfile?.institutionAdminCode,
    classroom?.institutionId,
    classroom?.institutionCode,
  ]);

  // Listen to each institution classroom's student roster
  useEffect(() => {
    const hasInstAccess =
      isSuperAdmin ||
      isTeacher ||
      Boolean(effectiveProfile?.institutionAdminCode) ||
      Boolean(effectiveProfile?.institutionId) ||
      Boolean(effectiveProfile?.institutionCode);

    if (!hasInstAccess) {
      setClassStudentsMap({});
      return;
    }

    if (isSuperAdmin) {
      // Superadmin already subscribes to allUsers, so derive classStudentsMap from allUsers to avoid duplicate reads!
      const map: Record<string, UserProfile[]> = {};
      allUsers.forEach((u) => {
        if (u.classId) {
          if (!map[u.classId]) map[u.classId] = [];
          map[u.classId].push(u);
        }
      });
      setClassStudentsMap(map);
      return;
    }

    if ((authUser || activeLocalProfile) && institutionClassrooms.length > 0 && isTeacher) {
      const unsubs = institutionClassrooms.map((c) =>
        subscribeClassroomStudents(c.id, (students) => {
          setClassStudentsMap((prev) => ({ ...prev, [c.id]: students }));
        })
      );
      return () => unsubs.forEach((u) => u());
    }
    if (demoProfile) {
      const map: Record<string, UserProfile[]> = {};
      DEMO_3_CLASSES.forEach((cls) => {
        map[cls.id] = cls.students.map((std) => ({
          uid: std.id,
          displayName: `${std.studentName} (${std.parentName})`,
          studentName: std.studentName,
          parentName: std.parentName,
          email: `${std.id}@akcakocailkokulu.k12.tr`,
          role: 'parent' as const,
          userType: 'parent' as const,
          classId: cls.id,
          className: cls.name,
          classCode: cls.code,
          institutionId: cls.institutionId,
          institutionCode: cls.institutionCode,
          institutionName: cls.institutionName,
          currentWeekStage: std.stage,
          currentWeekMinutes: std.minutes,
          currentWeekId: weekInfo.weekId,
        }));
      });
      setClassStudentsMap(map);
    }
  }, [
    authUser,
    activeLocalProfile,
    demoProfile,
    isSuperAdmin,
    isTeacher,
    effectiveProfile?.institutionAdminCode,
    effectiveProfile?.institutionId,
    effectiveProfile?.institutionCode,
    institutionClassrooms,
    allUsers,
  ]);

  // Admin için kuruma ait sınıfların öğrencileri, öğretmen/veli için kendi sınıf/öğrenci listesi
  // (React Rules of Hooks uyarınca tüm hook'lar erken return'lerden önce çağrılmalıdır)
  const effectiveStudents = useMemo(() => {
    if (isSuperAdmin) {
      const list: UserProfile[] = [];
      const seenUids = new Set<string>();

      // 1. Kuruma ait sınıfların haritasındaki öğrenciler
      institutionClassrooms.forEach((c) => {
        const classStudents = classStudentsMap[c.id] || [];
        classStudents.forEach((st) => {
          if (!seenUids.has(st.uid)) {
            seenUids.add(st.uid);
            list.push({
              ...st,
              className: st.className || c.name,
              classId: st.classId || c.id,
            });
          }
        });
      });

      // 2. allUsers içinde bu sınıfların ID'si veya adı ile eşleşenler
      const instClassIds = new Set(institutionClassrooms.map((c) => c.id));
      const instClassNames = new Set(
        institutionClassrooms.map((c) => (c.name || '').trim().toLowerCase())
      );
      const instClassCodes = new Set(
        institutionClassrooms.map((c) => (c.code || '').trim().toUpperCase())
      );

      allUsers.forEach((st) => {
        if (
          !seenUids.has(st.uid) &&
          ((st.classId && instClassIds.has(st.classId)) ||
            (st.classCode && instClassCodes.has(st.classCode.toUpperCase())) ||
            (st.className && instClassNames.has(st.className.trim().toLowerCase())))
        ) {
          seenUids.add(st.uid);
          list.push(st);
        }
      });

      // Kurum sınıflarındaki öğrenciler varsa döndür
      if (list.length > 0) return list;

      // Eğer kurumda kayıtlı sınıflar varsa ama henüz öğrenci bulunamadıysa BOŞ döndür
      // (Eski veya başka sınıfların öğrencileri asla sızdırılmamalıdır!)
      if (institutionClassrooms.length > 0) {
        return [];
      }

      // Kurum ID'si eşleşenler (eğer sınıf yoksa)
      if (effectiveProfile?.institutionId) {
        const instFiltered = allUsers.filter(
          (u) => u.institutionId === effectiveProfile.institutionId
        );
        return instFiltered;
      }

      return [];
    }

    // Öğretmen için: Sadece öğretmenin kendi sınıfındaki öğrenciler!
    if (classroom?.id || effectiveProfile?.classId || classroom?.code || effectiveProfile?.classCode) {
      const targetClassId = classroom?.id || effectiveProfile?.classId;
      const targetClassName = (classroom?.name || effectiveProfile?.className || '').trim().toLowerCase();
      const targetClassCode = (classroom?.code || effectiveProfile?.classCode || '').trim().toUpperCase();

      return allUsers.filter((u) => {
        if (u.role === 'admin' || u.role === 'teacher' || u.userType === 'teacher' || u.uid === effectiveProfile?.uid) {
          return false;
        }
        if (targetClassId && u.classId === targetClassId) return true;
        if (targetClassCode && u.classCode && u.classCode.toUpperCase() === targetClassCode) return true;
        if (targetClassName && u.className && u.className.trim().toLowerCase() === targetClassName) return true;
        return false;
      });
    }

    // Henüz sınıf oluşturulmamışsa kesinlikle boş dizi döndür (başka hesaplar görünmesin)
    return [];
  }, [
    isSuperAdmin,
    institutionClassrooms,
    classStudentsMap,
    allUsers,
    effectiveProfile?.institutionId,
    effectiveProfile?.classId,
    effectiveProfile?.className,
    effectiveProfile?.classCode,
    classroom,
  ]);

  // Sınıf seçimi için kurum ve öğretmen sınıflarının birleşik listesi
  const availableClassrooms = useMemo(() => {
    const map = new Map<string, ClassroomInfo>();
    institutionClassrooms.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    if (classroom?.id && !map.has(classroom.id)) {
      map.set(classroom.id, classroom);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'tr')
    );
  }, [institutionClassrooms, classroom]);


  // Handle stage change (0 to 14)
  // Demo/inceleme modunda (gerçek Firebase Auth oturumu olmadan) yapılan
  // "kurum oluştur / sınıf oluştur / sınıfa katıl" gibi işlemleri yerel
  // demoProfile üzerinde günceller (Firestore'a yazmaya çalışmaz).
  const handleDemoProfileUpdate = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    if (activeLocalProfile) {
      setActiveLocalProfile((prev) => {
        if (!prev) return prev;
        const updated: UserProfile = { ...prev, ...updates };
        setActiveAppProfile(updated, true);
        return updated;
      });
    }
    setDemoProfile((prev) => {
      if (!prev) return prev;
      const updated: UserProfile = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('demoUserProfile', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleUpdateStage = async (newStage: number) => {
    if (isUpdatingStage) return;
    try {
      setIsUpdatingStage(true);
      const clampedStage = Math.max(0, Math.min(14, newStage));
      const nowObj = new Date();
      const dd = String(nowObj.getDate()).padStart(2, '0');
      const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
      const yy = String(nowObj.getFullYear()).slice(-2);
      const shortDateStr = `${dd}.${mm}.${yy}`;

      const buildUpdatedDates = (existing?: Record<number, string>) => {
        const nextDates: Record<number, string> = {};
        for (let s = 1; s <= clampedStage; s++) {
          nextDates[s] = existing?.[s] || shortDateStr;
        }
        return nextDates;
      };

      if (activeImpersonatedParent) {
        const nextDates = buildUpdatedDates(activeImpersonatedParent.currentWeekStageDates);
        const updatedParent: UserProfile = {
          ...activeImpersonatedParent,
          currentWeekStage: clampedStage,
          currentWeekMinutes: clampedStage * 30,
          currentWeekStageDates: nextDates,
        };
        setImpersonatedParent(updatedParent);
        setAllUsers((prev) =>
          prev.map((u) => (u.uid === activeImpersonatedParent.uid ? updatedParent : u))
        );
        if (authUser || activeLocalProfile) {
          await updateStageProgress(activeImpersonatedParent.uid, newStage);
        }
      } else if (authUser) {
        const nextDates = buildUpdatedDates(userProfile?.currentWeekStageDates);
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                currentWeekStage: clampedStage,
                currentWeekMinutes: clampedStage * 30,
                currentWeekStageDates: nextDates,
              }
            : prev
        );
        await updateStageProgress(authUser.uid, newStage);
      } else if (activeLocalProfile) {
        const nextDates = buildUpdatedDates(activeLocalProfile.currentWeekStageDates);
        await updateStageProgress(activeLocalProfile.uid, newStage);
        const updated: UserProfile = {
          ...activeLocalProfile,
          currentWeekStage: clampedStage,
          currentWeekMinutes: clampedStage * 30,
          currentWeekStageDates: nextDates,
        };
        setActiveLocalProfile(updated);
        setActiveAppProfile(updated, true);
      } else if (demoProfile) {
        const nextDates = buildUpdatedDates(demoProfile.currentWeekStageDates);
        const updated: UserProfile = {
          ...demoProfile,
          currentWeekStage: clampedStage,
          currentWeekMinutes: clampedStage * 30,
          currentWeekStageDates: nextDates,
        };
        setDemoProfile(updated);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('demoUserProfile', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleUpdateUnusedDays = async (newUnusedDays: number) => {
    if (isUpdatingStage) return;
    try {
      setIsUpdatingStage(true);
      const clampedUnused = Math.max(0, Math.min(7, newUnusedDays));
      if (activeImpersonatedParent) {
        const updatedParent: UserProfile = {
          ...activeImpersonatedParent,
          currentWeekUnusedDays: clampedUnused,
        };
        setImpersonatedParent(updatedParent);
        setAllUsers((prev) =>
          prev.map((u) => (u.uid === activeImpersonatedParent.uid ? updatedParent : u))
        );
        if (authUser || activeLocalProfile) {
          await updateUnusedDaysProgress(activeImpersonatedParent.uid, clampedUnused);
        }
      } else if (authUser) {
        await updateUnusedDaysProgress(authUser.uid, clampedUnused);
        setUserProfile((prev) =>
          prev ? { ...prev, currentWeekUnusedDays: clampedUnused } : prev
        );
      } else if (activeLocalProfile) {
        await updateUnusedDaysProgress(activeLocalProfile.uid, clampedUnused);
        const updated: UserProfile = {
          ...activeLocalProfile,
          currentWeekUnusedDays: clampedUnused,
        };
        setActiveLocalProfile(updated);
        setActiveAppProfile(updated, true);
      } else if (demoProfile) {
        const updated: UserProfile = {
          ...demoProfile,
          currentWeekUnusedDays: clampedUnused,
        };
        setDemoProfile(updated);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('demoUserProfile', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Failed to update unused days:', err);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  // Loading screen with app icon
  if (authLoading && !demoProfile && !activeLocalProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <img
          src="/icon-512.png"
          alt="Haftalık Ekran Süresi"
          className="w-24 h-24 object-contain mb-4 drop-shadow-sm animate-pulse"
        />
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-700">
            Uygulama yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, show AuthScreen
  if (!effectiveProfile) {
    return (
      <AuthScreen
        onDemoLogin={handleDemoLogin}
        onLoginSuccess={(profile, isNewRegistration) => {
          setDemoProfile(null);
          setAllUsers([]);
          setClassroom(null);
          setInstitutionClassrooms([]);
          setClassStudentsMap({});
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('demoUserProfile');
          }
          setActiveLocalProfile(profile);
          setParentTab('home');

          if (
            isNewRegistration &&
            profile &&
            !profile.classId &&
            !profile.className &&
            profile.role !== 'parent' &&
            profile.userType !== 'parent'
          ) {
            setShowClassSetup(true);
          }

          // Veli bilgilendirme rehberi sadece üye olduktan sonra ilk açılışta 1 kere gösterilsin, her girişte değil
          if (
            isNewRegistration &&
            (profile?.role === 'parent' || profile?.userType === 'parent')
          ) {
            const userKey = profile?.uid || profile?.email || 'default';
            const storageKey = `parent_guide_seen_${userKey}`;
            const alreadySeen = typeof window !== 'undefined' && localStorage.getItem(storageKey);
            if (!alreadySeen) {
              localStorage.setItem(storageKey, 'true');
              setShowParentGuide(true);
            }
          }
        }}
      />
    );
  }

  const currentStage = effectiveProfile?.currentWeekStage ?? 0;

  // Calculate class average minutes for teacher / admin
  const studentList = effectiveStudents.filter(
    (u) => u.role !== 'admin' && (u.userType !== 'teacher' || u.uid !== effectiveProfile?.uid)
  );
  const totalClassMinutes = studentList.reduce(
    (sum, s) => sum + (s.currentWeekMinutes ?? (s.currentWeekStage || 0) * 30),
    0
  );
  const classAverageMinutes = studentList.length > 0 ? Math.round(totalClassMinutes / studentList.length) : 0;

  const handleProfileUpdated = (updates: Partial<UserProfile>) => {
    if (activeLocalProfile) {
      const updated = { ...activeLocalProfile, ...updates };
      setActiveLocalProfile(updated);
      setActiveAppProfile(updated, true);
    }
    if (demoProfile) {
      setDemoProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }
    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const isCurrentDemo = !authUser && !activeLocalProfile && !!demoProfile;

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none"
      style={{
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: '#1a0b2e',
        backgroundImage:
          'radial-gradient(1.5px 1.5px at 8% 18%, rgba(255,255,255,0.95), transparent), ' +
          'radial-gradient(1px 1px at 22% 62%, rgba(255,255,255,0.8), transparent), ' +
          'radial-gradient(2px 2px at 38% 12%, rgba(255,255,255,1), transparent), ' +
          'radial-gradient(1px 1px at 52% 78%, rgba(255,255,255,0.7), transparent), ' +
          'radial-gradient(1.5px 1.5px at 68% 32%, rgba(255,255,255,0.9), transparent), ' +
          'radial-gradient(1px 1px at 82% 58%, rgba(255,255,255,0.8), transparent), ' +
          'radial-gradient(2px 2px at 93% 14%, rgba(255,255,255,1), transparent), ' +
          'radial-gradient(1px 1px at 14% 84%, rgba(255,255,255,0.65), transparent), ' +
          'radial-gradient(1.5px 1.5px at 58% 52%, rgba(255,255,255,0.9), transparent), ' +
          'radial-gradient(1px 1px at 78% 88%, rgba(255,255,255,0.7), transparent), ' +
          'radial-gradient(1.5px 1.5px at 30% 42%, rgba(255,255,255,0.9), transparent), ' +
          'radial-gradient(1px 1px at 4% 52%, rgba(255,255,255,0.7), transparent), ' +
          'radial-gradient(1.5px 1.5px at 46% 92%, rgba(255,255,255,0.85), transparent), ' +
          'radial-gradient(1px 1px at 90% 76%, rgba(255,255,255,0.75), transparent), ' +
          'radial-gradient(2px 2px at 65% 8%, rgba(255,255,255,0.95), transparent), ' +
          'radial-gradient(140% 110% at 12% 8%, rgba(217,70,239,0.60) 0%, transparent 55%), ' +
          'radial-gradient(140% 110% at 88% 12%, rgba(56,189,248,0.55) 0%, transparent 55%), ' +
          'radial-gradient(150% 130% at 50% 105%, rgba(147,51,234,0.70) 0%, transparent 60%), ' +
          'radial-gradient(110% 90% at 92% 88%, rgba(236,72,153,0.50) 0%, transparent 55%), ' +
          'radial-gradient(90% 70% at 5% 90%, rgba(99,102,241,0.45) 0%, transparent 55%), ' +
          'linear-gradient(160deg, #1e0a3c 0%, #3b0764 28%, #581c87 52%, #86198f 74%, #be185d 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Profesyonel font: Inter (Google Fonts) + body/html arka plan düzeltmesi (mobil viewport beyaz boşluk fix'i) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        html, body {
          background-color: #1a0b2e;
          margin: 0;
          padding: 0;
        }
      `}</style>

      {/* 1. Slim Top Navigation Header */}
      <Header
        currentUser={effectiveProfile}
        activeTab="tracker"
        setActiveTab={() => {}}
        isAdmin={isStaffOrAdmin}
        memberCount={effectiveStudents.length}
        currentWeekLabel={weekInfo.weekLabel}
        onOpenClassSetup={() => setShowClassSetup(true)}
        onSignOut={handleSignOut}
        onSwitchRole={handleSwitchRole}
        onSelectClass={() => setShowTeacherClassPicker(true)}
        onOpenParentGuide={() => setShowParentGuide(true)}
        isImpersonatingParent={Boolean(activeImpersonatedParent)}
        onExitParentImpersonation={handleExitParentImpersonation}
        canGoBack={canGoBack}
        onGoBack={handleGoBack}
      />

      {/* 2. Main Body: Smooth scrollable container with modern scrollbar */}
      <main className="flex-1 min-h-0 overflow-y-auto px-2.5 sm:px-4 py-2 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto w-full custom-scrollbar flex flex-col touch-pan-y">
        {isStaffOrAdmin ? (
          /* TEACHER OR ADMIN VIEW */
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 pb-8">
            {parentTab === 'home' && (
              isSuperAdmin ? (
                <AdminInstitutionView
                  currentUser={effectiveProfile}
                  institutionName={effectiveProfile?.institutionName}
                  institutionCode={effectiveProfile?.institutionCode}
                  institutionAdminCode={effectiveProfile?.institutionAdminCode}
                  classrooms={institutionClassrooms}
                  studentsByClass={classStudentsMap}
                  allUsers={allUsers}
                  onOpenClassSetup={() => setShowClassSetup(true)}
                  onDeleteClassroom={handleAdminDeleteClassroom}
                  onUpdateClassroom={handleAdminUpdateClassroom}
                  onDeleteUser={handleAdminDeleteUser}
                  onUpdateUser={handleUpdateStudentUser}
                  onProfileUpdated={handleProfileUpdated}
                  onSwitchToTeacherMode={handleSwitchToTeacherMode}
                  isDemo={isCurrentDemo}
                  selectedClassId={adminSelectedClassId}
                  onSelectClassId={setAdminSelectedClassId}
                  adminSection={adminSection}
                  onChangeAdminSection={setAdminSection}
                />
              ) : (
                <TeacherHomeView
                  users={allUsers}
                  currentUserId={effectiveProfile?.uid || 'teacher_id'}
                  classroom={classroom}
                  teacherProfile={effectiveProfile}
                  onOpenClassSetup={() => setShowClassSetup(true)}
                  userEmail={authUser?.email || effectiveProfile?.email || undefined}
                  onDeleteUser={handleAdminDeleteUser}
                  onUpdateUser={handleUpdateStudentUser}
                  onSwitchRole={handleSwitchRole}
                  onUpgradeToAdminWithCode={handleUpgradeToAdminWithCode}
                  onSelectStudentAsParent={handleSelectStudentAsParent}
                />
              )
            )}

            {parentTab === 'stages' && (
              <ParentStagesCompact
                currentStage={currentStage}
                onUpdateStage={handleUpdateStage}
                stageDates={effectiveProfile?.currentWeekStageDates}
                isUpdating={isUpdatingStage}
                isTeacher={true}
                classAverageMinutes={classAverageMinutes}
                students={studentList}
              />
            )}

            {parentTab === 'badges' && (
              <ParentBadgesView
                currentStage={currentStage}
                studentName={effectiveProfile?.studentName || effectiveProfile?.displayName}
                userId={effectiveProfile?.uid}
                isTeacher={true}
                isSuperAdmin={isSuperAdmin}
                userEmail={authUser?.email || effectiveProfile?.email || undefined}
                students={effectiveStudents}
                classrooms={isSuperAdmin ? institutionClassrooms : classroom ? [classroom] : []}
                defaultClassName={
                  isSuperAdmin
                    ? institutionClassrooms[0]?.name || effectiveProfile?.institutionName || 'Kurum Sınıfları'
                    : classroom?.name || effectiveProfile?.className || 'Sınıfım'
                }
              />
            )}

            {parentTab === 'classroom' && (
              <ParentClassroomView
                userProfile={effectiveProfile}
                classroom={classroom}
                onOpenClassSetup={() => setShowClassSetup(true)}
                isTeacher={isTeacher}
                isSuperAdmin={isSuperAdmin}
                isDemo={isCurrentDemo}
                onProfileUpdated={handleProfileUpdated}
                onSignOut={handleSignOut}
                onForgetAccount={handleForgetAccount}
                onSwitchRole={handleSwitchRole}
                onUpgradeToAdminWithCode={handleUpgradeToAdminWithCode}
              />
            )}
          </div>
        ) : (
          /* PARENT / VELİ VIEW (Responsive scrolling with rich 3D aesthetic) */
          <div className={`flex flex-col ${parentTab === 'home' ? 'h-full justify-between pb-0 flex-1 min-h-0' : 'gap-2.5 sm:gap-3 pb-8'}`}>
            {/* Top Hero Banner (yalnızca veli ana sayfasında görünür) */}
            {parentTab === 'home' && (
              <div className="flex-shrink-0 mb-1.5 sm:mb-2">
                <ParentHeroBanner
                  currentStage={currentStage}
                  studentName={effectiveProfile?.studentName || effectiveProfile?.displayName}
                  unusedDays={effectiveProfile?.currentWeekUnusedDays ?? 0}
                  onUpdateUnusedDays={handleUpdateUnusedDays}
                  isUpdating={isUpdatingStage}
                />
              </div>
            )}

            {/* Center Dynamic Tab Content (Switched by bottom dock) */}
            <div className={`w-full ${parentTab === 'home' ? 'flex-1 min-h-0 flex flex-col justify-between' : ''}`}>
              {parentTab === 'home' && (
                <ParentHomeView
                  currentStage={currentStage}
                  onUpdateStage={handleUpdateStage}
                  unusedDays={effectiveProfile?.currentWeekUnusedDays ?? 0}
                  onUpdateUnusedDays={handleUpdateUnusedDays}
                  isUpdating={isUpdatingStage}
                  onNavigateToStages={() => handleSelectTab('stages')}
                  onNavigateToClassroom={() => handleSelectTab('classroom')}
                  isClassConnected={Boolean(effectiveProfile?.classId || classroom?.id)}
                  onOpenParentGuide={() => setShowParentGuide(true)}
                  studentName={effectiveProfile?.studentName || effectiveProfile?.displayName || undefined}
                  userId={effectiveProfile?.uid}
                />
              )}

              {parentTab === 'stages' && (
                <ParentStagesCompact
                  currentStage={currentStage}
                  onUpdateStage={handleUpdateStage}
                  stageDates={effectiveProfile?.currentWeekStageDates}
                  unusedDays={effectiveProfile?.currentWeekUnusedDays ?? 0}
                  onUpdateUnusedDays={handleUpdateUnusedDays}
                  isUpdating={isUpdatingStage}
                  studentName={effectiveProfile?.studentName || effectiveProfile?.displayName || undefined}
                  userId={effectiveProfile?.uid}
                />
              )}

              {parentTab === 'badges' && (
                <ParentBadgesView
                  currentStage={currentStage}
                  studentName={effectiveProfile?.studentName || effectiveProfile?.displayName}
                  userId={effectiveProfile?.uid}
                  isTeacher={false}
                  isSuperAdmin={false}
                  userEmail={authUser?.email || effectiveProfile?.email || undefined}
                  students={effectiveStudents}
                  classrooms={classroom ? [classroom] : []}
                  defaultClassName={classroom?.name || effectiveProfile?.className || 'Sınıfım'}
                />
              )}

              {parentTab === 'classroom' && (
                <ParentClassroomView
                  userProfile={effectiveProfile}
                  classroom={classroom}
                  onOpenClassSetup={() => setShowClassSetup(true)}
                  isTeacher={false}
                  isSuperAdmin={false}
                  isDemo={isCurrentDemo}
                  onProfileUpdated={handleProfileUpdated}
                  onSignOut={handleSignOut}
                  onForgetAccount={handleForgetAccount}
                  onSwitchRole={handleSwitchRole}
                  onUpgradeToAdminWithCode={handleUpgradeToAdminWithCode}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom 3D Dock Navigation (4 tabs only, teacher button deleted) */}
      <footer className="flex-shrink-0 z-30">
        <BottomDock
          activeTab={parentTab}
          onSelectTab={handleSelectTab}
          isTeacher={isStaffOrAdmin}
        />
      </footer>

      {/* Classroom Setup & Role Selection Modal */}
      {showClassSetup && effectiveProfile && (
        isSuperAdmin ? (
          <AdminSettingsModal
            currentUser={effectiveProfile}
            onCompleted={() => setShowClassSetup(false)}
            onCancel={() => setShowClassSetup(false)}
            isDemo={!authUser && !activeLocalProfile && !!demoProfile}
            onDemoProfileUpdate={handleDemoProfileUpdate}
          />
        ) : (
          <ClassroomSetupModal
            currentUser={effectiveProfile}
            onCompleted={() => setShowClassSetup(false)}
            onCancel={() => setShowClassSetup(false)}
            canCancel={Boolean(effectiveProfile.classId || effectiveProfile.role)}
            isDemo={!authUser && !activeLocalProfile && !!demoProfile}
            onDemoProfileUpdate={handleDemoProfileUpdate}
            onAddStudent={(newStudent) => {
              setAllUsers((prev) => [newStudent, ...prev.filter((u) => u.uid !== newStudent.uid)]);
            }}
          />
        )
      )}

      {/* Veli Bilgilendirme Modal (Uygulamanın nasıl ve ne amaçla kullanıldığını anlatan rehber popup) */}
      <ParentGuideModal
        isOpen={showParentGuide}
        onClose={() => {
          const userKey = effectiveProfile?.uid || effectiveProfile?.email;
          if (userKey && typeof window !== 'undefined') {
            localStorage.setItem(`parent_guide_seen_${userKey}`, 'true');
          }
          setShowParentGuide(false);
        }}
        studentName={effectiveProfile?.studentName || effectiveProfile?.displayName}
      />

      {/* Kurum Yönetici (Admin) Moduna Dönüşte Admin Kodu Doğrulama Modalı */}
      <AdminCodePromptModal
        isOpen={showAdminCodePrompt}
        onClose={() => setShowAdminCodePrompt(false)}
        onVerify={handleUpgradeToAdminWithCode}
        currentAdminCode={effectiveProfile?.institutionAdminCode}
      />

      {/* MODAL: ÖĞRETMEN MODU İÇİN SINIF SEÇİMİ */}
      {showTeacherClassPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200 flex-shrink-0">
                  <GraduationCap className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    Öğretmen Modu: Sınıf Seçimi
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Öğretmen hesabıyla görmek istediğiniz sınıfı seçin:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherClassPicker(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
              {availableClassrooms.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2.5">
                  <School className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Kurumunuza bağlı henüz kayıtlı bir sınıf bulunmuyor.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Hemen kurumunuza yeni bir sınıf oluşturabilir veya örnek bir sınıfla öğretmen modunu deneyebilirsiniz.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTeacherClassPicker(false);
                        setShowClassSetup(true);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Yeni Sınıf Oluştur</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sampleClass: ClassroomInfo = {
                          id: 'demo-class-' + Date.now(),
                          code: 'SINIF-ORNEK',
                          name: 'Örnek Sınıf',
                          teacherUid: effectiveProfile?.uid || 'teacher-sample',
                          teacherName: effectiveProfile?.displayName || 'Örnek Öğretmen',
                          teacherEmail: effectiveProfile?.email || 'ogretmen@okul.com',
                          institutionId: effectiveProfile?.institutionId || 'inst-1',
                          studentTargetCount: 25,
                        };
                        setInstitutionClassrooms((prev) => [sampleClass, ...prev]);
                        handleSelectTeacherClass(sampleClass);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-slate-300"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Örnek Sınıfla Dene</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {availableClassrooms.map((cls) => {
                    const classStudents = classStudentsMap[cls.id] || [];
                    const isCurrent = classroom?.id === cls.id;

                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleSelectTeacherClass(cls)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.98] ${
                          isCurrent
                            ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-200'
                            : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-indigo-200 shadow-2xs hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-colors ${
                              isCurrent
                                ? 'bg-indigo-600 text-white border-indigo-700'
                                : 'bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white'
                            }`}
                          >
                            <School className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-900 truncate">
                                {cls.name}
                              </span>
                              {cls.code && (
                                <span className="font-mono text-[10px] bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-black">
                                  {cls.code}
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>
                                Sn.{' '}
                                <strong className="text-slate-700 font-semibold">
                                  {(cls.teacherName || 'Bilinmiyor')
                                    .replace(/^Öğretmen:?\s*/i, '')
                                    .replace(/\s*\(Öğretmen\)\s*/gi, '')
                                    .replace(/\s*Öğretmen\s*$/i, '')
                                    .trim() || 'Bilinmiyor'}
                                </strong>
                              </span>
                              <span className="text-indigo-600 font-bold">
                                {classStudents.length} öğrenci
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            <span>Seç</span>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherClassPicker(false);
                      setShowClassSetup(true);
                    }}
                    className="w-full p-2.5 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Kuruma Yeni Sınıf Ekle</span>
                  </button>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowTeacherClassPicker(false);
                  setShowClassSetup(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Sınıf Ekle</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTeacherClassPicker(false)}
                className="btn-3d-white py-1.5 px-4 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}