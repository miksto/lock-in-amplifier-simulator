import type { ReactNode } from 'react';
import './MainLayout.css';

interface MainLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  bottomControls?: ReactNode;
}

export function MainLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomControls,
}: MainLayoutProps) {
  return (
    <div className="main-layout">
      <div className="layout-header">
        <h1>Lock-in Amplifier Simulator</h1>
      </div>
      <div className="layout-content">
        <div className="left-panel">{leftPanel}</div>
        <div className="center-panel">{centerPanel}</div>
        <div className="right-panel">{rightPanel}</div>
      </div>
      {bottomControls && (
        <div className="layout-bottom">{bottomControls}</div>
      )}
    </div>
  );
}
