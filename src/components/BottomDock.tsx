import React, { useEffect } from 'react';
import { Users } from 'lucide-react';

export type ParentTabType = 'home' | 'stages' | 'badges' | 'classroom';

interface BottomDockProps {
  activeTab: ParentTabType;
  onSelectTab: (tab: ParentTabType) => void;
  isTeacher?: boolean;
}

interface TabItem {
  id: ParentTabType;
  label: string;
  whiteImg: string;
  darkImg: string;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  onSelectTab,
}) => {
  // Preload button images for instant smooth transitions
  useEffect(() => {
    const imagesToPreload = [
      '/butons/anabeyaz.png',
      '/butons/anakoyu.png',
      '/butons/kademebeyaz.png',
      '/butons/kademekoyu.png',
      '/butons/rozetbeyaz.png',
      '/butons/rozetkoyu.png',
      '/butons/sinifimbeyaz.png',
      '/butons/sinifimkoyu.png',
    ];
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const tabs: TabItem[] = [
    {
      id: 'home',
      label: 'Ana Sayfa',
      whiteImg: '/butons/anabeyaz.png',
      darkImg: '/butons/anakoyu.png',
    },
    {
      id: 'stages',
      label: 'Kademeler',
      whiteImg: '/butons/kademebeyaz.png',
      darkImg: '/butons/kademekoyu.png',
    },
    {
      id: 'badges',
      label: 'Rozetler',
      whiteImg: '/butons/rozetbeyaz.png',
      darkImg: '/butons/rozetkoyu.png',
    },
    {
      id: 'classroom',
      label: 'Sınıfım',
      whiteImg: '/butons/sinifimbeyaz.png',
      darkImg: '/butons/sinifimkoyu.png',
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-2 pb-2 select-none">
      <nav
        aria-label="Ana Menü"
        className="bg-white/95 backdrop-blur-md rounded-[32px] p-1.5 sm:p-2 shadow-[0_6px_20px_rgba(0,0,0,0.14),0_16px_36px_rgba(0,0,0,0.18),0_24px_50px_rgba(15,23,42,0.16)] border border-slate-200/90 flex items-center justify-around gap-1 sm:gap-2"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const imgSrc = isActive ? tab.darkImg : tab.whiteImg;

          return (
            <button
              key={tab.id}
              type="button"
              id={`dock-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex items-center justify-center p-0.5 sm:p-1 transition-all duration-150 cursor-pointer active:scale-95 focus:outline-hidden ${
                isActive ? 'scale-[1.03]' : 'hover:scale-[1.01] opacity-90 hover:opacity-100'
              }`}
              title={tab.label}
              aria-label={tab.label}
              aria-selected={isActive}
            >
              <img
                src={imgSrc}
                alt={tab.label}
                className="w-full h-auto max-h-12 sm:max-h-14 object-contain transition-all select-none pointer-events-none drop-shadow-xs"
                draggable={false}
                referrerPolicy="no-referrer"
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
