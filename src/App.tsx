/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  subscribeUserProfile,
  subscribeAllUsers,
  subscribeClassroom,
  subscribeClassroomStudents,
  subscribeInstitutionClassrooms,
  updateStageProgress,
  syncUserProfile,
  signOutUser,
  forgetAndClearAllDeviceData,
  adminDeleteClassroom,
  adminDeleteUser,
  setUserRole,
  updateUserProfile,
  verifyAdminCodeAndUpgrade,
  getActiveAppProfile,
  setActiveAppProfile,
  clearActiveAppProfile,
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
import { Loader2, GraduationCap, School, ChevronRight, X } from 'lucide-react';
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
  const [showClassSetup, setShowClassSetup] = useState(false);
  const [showParentGuide, setShowParentGuide] = useState(false);
  const [showTeacherClassPicker, setShowTeacherClassPicker] = useState(false);
  const [showAdminCodePrompt, setShowAdminCodePrompt] = useState(false);

  const weekInfo = getCurrentWeekInfo();

  // Listen to custom local profile changes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setActiveLocalProfile(e.detail || null);
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
        displayName: 'Olcayto (Kurum Yöneticisi)',
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
      setShowParentGuide(true);
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

      if (authUser) {
        await adminDeleteClassroom(classId, teacherUid);
      }
    } catch (err) {
      console.error('Failed to delete classroom:', err);
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
        try {
          const profile = await syncUserProfile(user);
          setUserProfile(profile);

          // Default tab is always 'home'
          setParentTab('home');

          // Veli mail girişi yapınca, uygulamanın amacını anlatan bilgilendirme popup'ı göster
          if (profile.role === 'parent' || profile.userType === 'parent') {
            setShowParentGuide(true);
          }

          // If user doesn't have classId and hasn't chosen role yet, prompt setup
          if (!profile.classId && !profile.className && profile.role !== 'parent') {
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
    const unsubscribe = subscribeUserProfile(
      activeLocalProfile.uid,
      (profile) => {
        if (profile) {
          setActiveLocalProfile(profile);
          setActiveAppProfile(profile, true);
        }
      },
      (err: any) => {
        if (err?.code !== 'permission-denied') {
          console.error('Active profile subscription error:', err);
        }
      }
    );
    return () => unsubscribe();
  }, [activeLocalProfile?.uid, authUser]);

  const effectiveProfile = authUser ? userProfile : (activeLocalProfile || demoProfile);
  const isSuperAdmin = effectiveProfile?.role === 'admin';
  const isTeacher = effectiveProfile?.role === 'teacher';
  const isStaffOrAdmin = isSuperAdmin || isTeacher;

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
      if (isTeacher && effectiveProfile?.classId) {
        const unsubscribeStudents = subscribeClassroomStudents(
          effectiveProfile.classId,
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
  }, [authUser, isTeacher, userProfile?.classId, demoProfile, classroom?.id]);

  // Admin: Listen to all classrooms belonging to this admin's institution
  useEffect(() => {
    if (!isSuperAdmin) {
      setInstitutionClassrooms([]);
      return;
    }
    if ((authUser || activeLocalProfile) && effectiveProfile?.institutionId) {
      const unsubscribeClassrooms = subscribeInstitutionClassrooms(
        effectiveProfile.institutionId,
        (list) => setInstitutionClassrooms(list)
      );
      return () => unsubscribeClassrooms();
    }
    if (demoProfile) {
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
  }, [authUser, activeLocalProfile, demoProfile, isSuperAdmin, effectiveProfile?.institutionId]);

  // Admin: Listen to each institution classroom's student roster
  useEffect(() => {
    if (!isSuperAdmin) {
      setClassStudentsMap({});
      return;
    }
    if ((authUser || activeLocalProfile) && institutionClassrooms.length > 0) {
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
  }, [authUser, demoProfile, isSuperAdmin, institutionClassrooms]);

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
    if (classroom?.id || effectiveProfile?.classId) {
      const targetClassId = classroom?.id || effectiveProfile?.classId;
      const targetClassName = (classroom?.name || effectiveProfile?.className || '').trim().toLowerCase();
      const targetClassCode = (classroom?.code || effectiveProfile?.classCode || '').trim().toUpperCase();

      return allUsers.filter((u) => {
        if (targetClassId && u.classId === targetClassId) return true;
        if (targetClassCode && u.classCode && u.classCode.toUpperCase() === targetClassCode) return true;
        if (targetClassName && u.className && u.className.trim().toLowerCase() === targetClassName) return true;
        return false;
      });
    }

    return allUsers;
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

  // Handle stage change (0 to 14)
  // Demo/inceleme modunda (gerçek Firebase Auth oturumu olmadan) yapılan
  // "kurum oluştur / sınıf oluştur / sınıfa katıl" gibi işlemleri yerel
  // demoProfile üzerinde günceller (Firestore'a yazmaya çalışmaz).
  const handleDemoProfileUpdate = (updates: Partial<UserProfile>) => {
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
      if (authUser) {
        await updateStageProgress(authUser.uid, newStage);
      } else if (activeLocalProfile) {
        await updateStageProgress(activeLocalProfile.uid, newStage);
        const clampedStage = Math.max(0, Math.min(14, newStage));
        const updated: UserProfile = {
          ...activeLocalProfile,
          currentWeekStage: clampedStage,
          currentWeekMinutes: clampedStage * 30,
        };
        setActiveLocalProfile(updated);
        setActiveAppProfile(updated, true);
      } else if (demoProfile) {
        const clampedStage = Math.max(0, Math.min(14, newStage));
        const updated: UserProfile = {
          ...demoProfile,
          currentWeekStage: clampedStage,
          currentWeekMinutes: clampedStage * 30,
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
        onLoginSuccess={(profile) => {
          setActiveLocalProfile(profile);
          if (profile?.role === 'parent' || profile?.userType === 'parent') {
            setShowParentGuide(true);
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
    <div className="h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-100 select-none">
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
                  onDeleteUser={handleAdminDeleteUser}
                  onProfileUpdated={handleProfileUpdated}
                  onSwitchToTeacherMode={handleSwitchToTeacherMode}
                  isDemo={isCurrentDemo}
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
                />
              )
            )}

            {parentTab === 'stages' && (
              <ParentStagesCompact
                currentStage={currentStage}
                onUpdateStage={handleUpdateStage}
                isUpdating={isUpdatingStage}
                isTeacher={true}
                classAverageMinutes={classAverageMinutes}
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
          <div className={`flex flex-col ${parentTab === 'home' ? 'h-full justify-between gap-1 pb-0 flex-1 min-h-0' : 'gap-2.5 sm:gap-3 pb-8'}`}>
            {/* Top Hero Banner (Always fully visible with large yesil.png & progress bar) */}
            <div className="flex-shrink-0">
              <ParentHeroBanner
                currentStage={currentStage}
                studentName={effectiveProfile?.studentName || effectiveProfile?.displayName}
              />
            </div>

            {/* Center Dynamic Tab Content (Switched by bottom dock) */}
            <div className={`w-full ${parentTab === 'home' ? 'flex-1 min-h-0 flex flex-col justify-between' : ''}`}>
              {parentTab === 'home' && (
                <ParentHomeView
                  currentStage={currentStage}
                  onUpdateStage={handleUpdateStage}
                  isUpdating={isUpdatingStage}
                  onNavigateToStages={() => setParentTab('stages')}
                  onOpenParentGuide={() => setShowParentGuide(true)}
                />
              )}

              {parentTab === 'stages' && (
                <ParentStagesCompact
                  currentStage={currentStage}
                  onUpdateStage={handleUpdateStage}
                  isUpdating={isUpdatingStage}
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
          onSelectTab={(tab) => setParentTab(tab)}
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
        onClose={() => setShowParentGuide(false)}
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
              {institutionClassrooms.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2.5">
                  <School className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Kurumunuza bağlı henüz kayıtlı bir sınıf bulunmuyor.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Öğretmenleriniz kurum kodunuzla katılarak sınıf ekleyebilir veya hemen örnek bir sınıfla öğretmen modunu deneyebilirsiniz.
                  </p>
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 mt-1"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Örnek Sınıfla Öğretmen Moduna Geç</span>
                  </button>
                </div>
              ) : (
                institutionClassrooms.map((cls) => {
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
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Öğretmen: <strong className="text-slate-700 font-semibold">{cls.teacherName || 'Bilinmiyor'}</strong></span>
                            {cls.code && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200">
                                {cls.code}
                              </span>
                            )}
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
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowTeacherClassPicker(false)}
                className="btn-3d-white py-2 px-4 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
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
