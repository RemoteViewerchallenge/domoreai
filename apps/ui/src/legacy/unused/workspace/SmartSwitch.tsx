import { SwappableCard } from '../../features/workspace/SwappableCard.js';

const SmartSwitchPage = () => {
  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden p-4">
      <div className="grid grid-cols-2 gap-4 h-full">
        <SwappableCard id="card-1" />
        <SwappableCard id="card-2" />
      </div>
    </div>
  );
};

export default SmartSwitchPage;
