import { useEffect } from 'react';
import { MainLayout, LeftPanel, CenterPanel, RightPanel } from './components/layout';
import { TimeScaleControl } from './components/graphs';
import { useSimulation } from './hooks';
import './App.css';

function App() {
  // Initialize simulation
  const { isRunning } = useSimulation();

  // Log when simulation state changes
  useEffect(() => {
    console.log('Simulation running:', isRunning);
  }, [isRunning]);

  return (
    <MainLayout
      leftPanel={<LeftPanel />}
      centerPanel={<CenterPanel />}
      rightPanel={<RightPanel />}
      bottomControls={<TimeScaleControl />}
    />
  );
}

export default App;
