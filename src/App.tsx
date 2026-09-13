/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  subscribeUserProfile,
  subscribeAllUsers,
  subscribeClassroom,
  subscribeClassroomStudents,
  updateStageProgress,
  syncUserProfile,
  signOutUser,
  DEFAULT_ADMIN_EMAIL,
  isAdminEmail,
} from './lib/firebase';
import { UserProfile, ClassroomInfo } from './types';
import { getCurrentWeekInfo } from './lib/weekUtils';
import { Header } from './components/Header';
import { ParentHeroBanner } from './components/ParentHeroBanner';
import { ParentHomeView } from './components/ParentHomeView';
import { TeacherHomeView } from './components/TeacherHomeView';
import { ParentStagesCompact } from './components/ParentStagesCompact';
import { ParentBadgesView } from './components/ParentBadgesView';
import { ParentClassroomView } from './components/ParentClassroomView';
import { BottomDock, ParentTabType } from './components/BottomDock';
import { AuthScreen } from './components/AuthScreen';
import { ClassroomSetupModal } from './components/ClassroomSetupModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
  const [authLoading, setAuthLoading] = useState(true);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [parentTab, setParentTab] = useState<ParentTabType>('home');
  const [showClassSetup, setShowClassSetup] = useState(false);

  const weekInfo = getCurrentWeekInfo();

  const handleDemoLogin = (role: 'teacher' | 'parent' | 'admin') => {
    const isAdminRole = role === 'admin';
    const isTeacherRole = role === 'teacher' || isAdminRole;
    const profile: UserProfile = {
      uid: isAdminRole ? 'admin_demo_super' : isTeacherRole ? 'teacher_demo_olcayto' : 'parent_demo_user',
      displayName: isAdminRole
        ? 'Olcayto (Süper Yönetici / Admin)'
        : isTeacherRole
        ? 'Olcayto (Öğretmen)'
        : 'Fatma Yılmaz',
      email: isTeacherRole ? 'olcaytoh@gmail.com' : 'veli.fatma@example.com',
      role: isAdminRole ? 'admin' : isTeacherRole ? 'teacher' : 'parent',
      userType: 'teacher',
      studentName: isTeacherRole ? undefined : 'Ali Yılmaz',
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
    if (!isTeacherRole) {
      profile.userType = 'parent';
    }
    setDemoProfile(profile);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demoUserProfile', JSON.stringify(profile));
    }
    setParentTab('home');
  };

  const handleSignOut = async () => {
    setDemoProfile(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('demoUserProfile');
    }
    await signOutUser();
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

          // If user doesn't have classId and hasn't chosen role yet, prompt setup
          if (!profile.classId && !profile.className) {
            setShowClassSetup(true);
          }
        } catch (err) {
          console.error('Error syncing user profile on login:', err);
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
    const unsubscribe = subscribeUserProfile(authUser.uid, (profile) => {
      if (profile) {
        setUserProfile(profile);
      }
    });
    return () => unsubscribe();
  }, [authUser]);

  const effectiveProfile = authUser ? userProfile : demoProfile;

  // Listen to classroom data if user belongs to a class
  useEffect(() => {
    if (!effectiveProfile?.classId) {
      setClassroom(null);
      return;
    }
    if (authUser) {
      const unsubscribeClass = subscribeClassroom(effectiveProfile.classId, (classData) => {
        setClassroom(classData);
      });
      return () => unsubscribeClass();
    } else if (demoProfile) {
      setClassroom({
        id: 'demo-class-5a',
        name: '5-A Sınıfı',
        code: 'SINIF-5A',
        teacherId: 'teacher_demo_olcayto',
        teacherName: 'Olcayto Öğretmen',
        teacherEmail: 'olcaytoh@gmail.com',
        createdAt: null,
      });
    }
  }, [effectiveProfile?.classId, authUser, demoProfile]);

  const isTeacher =
    effectiveProfile?.role === 'admin' ||
    effectiveProfile?.role === 'teacher' ||
    effectiveProfile?.userType === 'teacher' ||
    isAdminEmail(authUser?.email || demoProfile?.email);

  // Listen to students/users list:
  useEffect(() => {
    if (authUser) {
      if (isTeacher && userProfile?.classId) {
        const unsubscribeStudents = subscribeClassroomStudents(userProfile.classId, (students) => {
          setAllUsers(students);
        });
        return () => unsubscribeStudents();
      } else {
        const unsubscribeAll = subscribeAllUsers((users) => {
          setAllUsers(users);
        });
        return () => unsubscribeAll();
      }
    } else if (demoProfile) {
      setAllUsers([
        {
          uid: 'student_1',
          displayName: 'Ali Yılmaz',
          studentName: 'Ali Yılmaz',
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
          email: 'veli.can@example.com',
          role: 'parent',
          userType: 'parent',
          classId: 'demo-class-5a',
          className: '5-A Sınıfı',
          currentWeekStage: 12,
          currentWeekMinutes: 360,
          currentWeekId: weekInfo.weekId,
        },
      ]);
    }
  }, [authUser, isTeacher, userProfile?.classId, demoProfile]);

  // Handle stage change (0 to 14)
  const handleUpdateStage = async (newStage: number) => {
    if (isUpdatingStage) return;
    try {
      setIsUpdatingStage(true);
      if (authUser) {
        await updateStageProgress(authUser.uid, newStage);
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

  // Loading spinner
  if (authLoading && !demoProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 border border-indigo-200">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Uygulama yükleniyor...
        </p>
      </div>
    );
  }

  // If not logged in, show AuthScreen
  if (!authUser && !demoProfile) {
    return <AuthScreen onDemoLogin={handleDemoLogin} />;
  }

  const currentStage = effectiveProfile?.currentWeekStage ?? 0;

  // Calculate class average minutes for teacher
  const studentList = allUsers.filter(
    (u) => u.role !== 'admin' && (u.userType !== 'teacher' || u.uid !== (authUser?.uid || demoProfile?.uid))
  );
  const totalClassMinutes = studentList.reduce(
    (sum, s) => sum + (s.currentWeekMinutes ?? (s.currentWeekStage || 0) * 30),
    0
  );
  const classAverageMinutes = studentList.length > 0 ? Math.round(totalClassMinutes / studentList.length) : 0;

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-100 select-none">
      {/* 1. Slim Top Navigation Header */}
      <Header
        currentUser={effectiveProfile}
        activeTab="tracker"
        setActiveTab={() => {}}
        isAdmin={isTeacher}
        memberCount={allUsers.length}
        currentWeekLabel={weekInfo.weekLabel}
        onOpenClassSetup={() => setShowClassSetup(true)}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Body: Smooth scrollable container with modern scrollbar */}
      <main className="flex-1 min-h-0 overflow-y-auto px-2.5 sm:px-4 py-2 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto w-full custom-scrollbar flex flex-col touch-pan-y">
        {isTeacher ? (
          /* TEACHER VIEW */
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 pb-8">
            {parentTab === 'home' && (
              <TeacherHomeView
                users={allUsers}
                currentUserId={effectiveProfile?.uid || 'teacher_id'}
                classroom={classroom}
                teacherProfile={effectiveProfile}
                onOpenClassSetup={() => setShowClassSetup(true)}
                userEmail={authUser?.email || effectiveProfile?.email || undefined}
              />
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
                userEmail={authUser?.email || effectiveProfile?.email || undefined}
                students={allUsers}
              />
            )}

            {parentTab === 'classroom' && (
              <ParentClassroomView
                userProfile={effectiveProfile}
                classroom={classroom}
                onOpenClassSetup={() => setShowClassSetup(true)}
                isTeacher={true}
                onSignOut={handleSignOut}
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
                  onSignOut={handleSignOut}
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
          isTeacher={isTeacher}
        />
      </footer>

      {/* Classroom Setup & Role Selection Modal */}
      {showClassSetup && effectiveProfile && (
        <ClassroomSetupModal
          currentUser={effectiveProfile}
          onCompleted={() => setShowClassSetup(false)}
          onCancel={() => setShowClassSetup(false)}
          canCancel={Boolean(effectiveProfile.classId || effectiveProfile.role)}
        />
      )}
    </div>
  );
}
