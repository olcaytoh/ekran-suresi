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
import { Loader2 } from 'lucide-react';

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
      profile = {
        uid: 'admin_demo_super',
        displayName: 'Olcayto (Kurum Yöneticisi)',
        email: 'olcaytoh@gmail.com',
        role: 'admin',
        userType: 'teacher',
        institutionId: 'demo-institution-1',
        institutionCode: 'KRM-1071',
        institutionAdminCode: 'ADM-2090',
        institutionName: 'Cumhuriyet İlkokulu',
        currentWeekId: weekInfo.weekId,
        currentWeekStage: 4,
        currentWeekMinutes: 120,
      };
    } else if (role === 'teacher') {
      profile = {
        uid: 'teacher_demo_olcayto',
        displayName: 'Olcayto Öğretmen',
        email: 'olcaytoh@gmail.com',
        role: 'teacher',
        userType: 'teacher',
        institutionId: 'demo-institution-1',
        institutionCode: 'KRM-1071',
        // Teachers do not receive institutionAdminCode
        institutionName: 'Cumhuriyet İlkokulu',
        classId: 'demo-class-5a',
        className: '5-A Sınıfı (Örnek)',
        classCode: 'SINIF-5A',
        currentWeekId: weekInfo.weekId,
        currentWeekStage: 4,
        currentWeekMinutes: 120,
      };
    } else {
      profile = {
        uid: 'parent_demo_user',
        displayName: 'Fatma Yılmaz',
        email: 'veli.fatma@example.com',
        role: 'parent',
        userType: 'parent',
        studentName: 'Ali Yılmaz',
        institutionId: 'demo-institution-1',
        institutionCode: 'KRM-1071',
        institutionName: 'Cumhuriyet İlkokulu',
        classId: 'demo-class-5a',
        className: '5-A Sınıfı (Örnek)',
        classCode: 'SINIF-5A',
        currentWeekId: weekInfo.weekId,
        currentWeekStage: 4,
        currentWeekMinutes: 120,
      };
      setShowParentGuide(true);
    }
    setDemoProfile(profile);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demoUserProfile', JSON.stringify(profile));
    }
    setParentTab('home');
  };

  const handleSwitchRole = async (newRole: 'admin' | 'teacher') => {
    // Admin moduna geçmek için geçerli bir kurum admin kodu girilmiş olmalıdır
    if (newRole === 'admin' && !effectiveProfile?.institutionAdminCode && !isSuperAdmin) {
      console.warn('Admin moduna geçmek için kurum admin kodu gereklidir.');
      return;
    }
    if (authUser) {
      try {
        await setUserRole(authUser.uid, newRole);
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                role: newRole,
                userType: 'teacher',
                institutionAdminCode: newRole === 'admin' ? prev.institutionAdminCode : undefined,
              }
            : null
        );
      } catch (err) {
        console.error('Failed to switch role:', err);
      }
    } else if (demoProfile) {
      handleDemoLogin(newRole);
    }
  };

  const handleUpgradeToAdminWithCode = async (adminCode: string) => {
    const cleaned = adminCode.trim().toUpperCase();
    if (authUser) {
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
    } else if (demoProfile) {
      if (!cleaned.startsWith('ADM-')) {
        throw new Error('Geçersiz admin kodu! Kod "ADM-" ile başlamalıdır (Örn: ADM-2090).');
      }
      handleDemoLogin('admin');
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
        setClassroom({
          id: 'demo-class-5a',
          name: '5-A Sınıfı',
          code: 'SINIF-5A',
          teacherId: 'teacher_demo_olcayto',
          teacherName: 'Olcayto Öğretmen',
          teacherEmail: 'olcaytoh@gmail.com',
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
      setAllUsers([
        {
          uid: 'student_1',
          displayName: 'Ali Yılmaz',
          studentName: 'Ali Yılmaz',
          parentName: 'Mehmet Yılmaz',
          email: 'veli.ali@example.com',
          role: 'parent',
          userType: 'parent',
          classId: 'demo-class-5a',
          className: '5-A Sınıfı',
          currentWeekStage: 4,
          currentWeekMinutes: 120,
          currentWeekId: weekInfo.weekId,
        },
        {
          uid: 'student_2',
          displayName: 'Zeynep Kaya',
          studentName: 'Zeynep Kaya',
          parentName: 'Ayşe Kaya',
          email: 'veli.zeynep@example.com',
          role: 'parent',
          userType: 'parent',
          classId: 'demo-class-5a',
          className: '5-A Sınıfı',
          currentWeekStage: 8,
          currentWeekMinutes: 240,
          currentWeekId: weekInfo.weekId,
        },
        {
          uid: 'student_3',
          displayName: 'Can Demir',
          studentName: 'Can Demir',
          parentName: 'Fatma Demir',
          email: 'veli.can@example.com',
          role: 'parent',
          userType: 'parent',
          classId: 'demo-class-5a',
          className: '5-A Sınıfı',
          currentWeekStage: 12,
          currentWeekMinutes: 360,
          currentWeekId: weekInfo.weekId,
        },
        {
          uid: 'demo_teacher_1',
          displayName: 'Olcayto Öğretmen',
          email: 'olcaytoh@gmail.com',
          role: 'teacher',
          userType: 'teacher',
          classId: 'demo-class-5a',
          className: '5-A Sınıfı',
          currentWeekStage: 0,
          currentWeekMinutes: 0,
          currentWeekId: weekInfo.weekId,
        },
        {
          uid: 'mistaken_user_1',
          displayName: 'Hatalı Üye (Yanlış Mail)',
          studentName: 'Yanlış Öğrenci',
          parentName: 'Hatalı Veli',
          email: 'yanlislikla.acilan@ornekmail.com',
          role: 'parent',
          userType: 'parent',
          currentWeekStage: 2,
          currentWeekMinutes: 60,
          currentWeekId: weekInfo.weekId,
        },
      ]);
    }
  }, [authUser, isTeacher, userProfile?.classId, demoProfile]);

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
      // Demo modu: 1 Hesap 1 Sınıf kuralına uygun olarak yalnızca 1 sınıf gösterilir
      const demoClassName = demoProfile.className || '5-A Sınıfı';
      const demoClassCode = demoProfile.classCode || 'SINIF-5A';
      const singleClassId = demoProfile.classId || 'demo-class-5a';

      setInstitutionClassrooms([
        {
          id: singleClassId,
          code: demoClassCode,
          name: demoClassName,
          teacherUid: demoProfile.uid || 'teacher_demo_olcayto',
          teacherName: demoProfile.displayName || 'Olcayto Öğretmen',
          teacherEmail: demoProfile.email || 'olcaytoh@gmail.com',
          institutionId: demoProfile.institutionId || 'demo-institution-1',
          institutionCode: demoProfile.institutionCode || 'KRM-1071',
          institutionName: demoProfile.institutionName || 'Cumhuriyet İlkokulu',
          studentTargetCount: 25,
        },
      ]);
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
      const singleClassId = demoProfile.classId || 'demo-class-5a';
      setClassStudentsMap({
        [singleClassId]: [
          {
            uid: 'student_1',
            displayName: 'Ali Yılmaz',
            studentName: 'Ali Yılmaz',
            parentName: 'Fatma Yılmaz',
            email: 'veli.ali@example.com',
            role: 'parent',
            userType: 'parent',
            classId: singleClassId,
            className: demoProfile.className || '5-A Sınıfı',
            currentWeekStage: 4,
            currentWeekMinutes: 120,
            currentWeekId: weekInfo.weekId,
          },
          {
            uid: 'student_2',
            displayName: 'Zeynep Kaya',
            studentName: 'Zeynep Kaya',
            parentName: 'Mehmet Kaya',
            email: 'veli.zeynep@example.com',
            role: 'parent',
            userType: 'parent',
            classId: singleClassId,
            className: demoProfile.className || '5-A Sınıfı',
            currentWeekStage: 8,
            currentWeekMinutes: 240,
            currentWeekId: weekInfo.weekId,
          },
          {
            uid: 'student_3',
            displayName: 'Can Demir',
            studentName: 'Can Demir',
            parentName: 'Selin Demir',
            email: 'veli.can@example.com',
            role: 'parent',
            userType: 'parent',
            classId: singleClassId,
            className: demoProfile.className || '5-A Sınıfı',
            currentWeekStage: 12,
            currentWeekMinutes: 360,
            currentWeekId: weekInfo.weekId,
          },
        ],
      });
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
                  userEmail={authUser?.email || effectiveProfile?.email || undefined}
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
      <footer className="flex-shrink-0 z-50">
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
    </div>
  );
}
