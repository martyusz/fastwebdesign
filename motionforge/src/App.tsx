import { LeftPanel } from './ui/LeftPanel';
import { RightPanel } from './ui/RightPanel';
import { Timeline } from './ui/Timeline';
import { TopBar } from './ui/TopBar';
import { Viewport } from './ui/Viewport';

function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0c] text-zinc-100">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <LeftPanel />
        <Viewport />
        <RightPanel />
      </div>
      <Timeline />
    </div>
  );
}

export default App;
