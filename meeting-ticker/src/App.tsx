import { useState, useEffect } from 'react';

function App() {
    const [participants, setParticipants] = useState<number>(5);
    const [avgRate, setAvgRate] = useState<number>(100); // Hourly rate
    const [currency, setCurrency] = useState<string>('$');
    const [seconds, setSeconds] = useState<number>(0);
    const [isRunning, setIsRunning] = useState<boolean>(false);

    useEffect(() => {
        let interval: any = null;
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } else if (!isRunning && seconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRunning, seconds]);

    const toggleTimer = () => setIsRunning(!isRunning);
    const resetTimer = () => {
        setIsRunning(false);
        setSeconds(0);
    };

    const costPerSecond = (participants * avgRate) / 3600;
    const currentCost = costPerSecond * seconds;

    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 font-sans flex flex-col items-center justify-center">
            <header className="absolute top-0 left-0 w-full p-4 flex justify-between items-center max-w-4xl mx-auto right-0">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">Meeting Ticker</h1>
                <a href="/tools/" className="text-slate-500 hover:text-slate-800">Back to Portal</a>
            </header>

            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100">

                {/* Cost Display */}
                <div className="text-center mb-10">
                    <p className="text-slate-500 font-medium uppercase tracking-widest text-xs mb-2">Current Meeting Cost</p>
                    <div className="text-6xl font-black text-slate-900 tracking-tighter">
                        {currency}{currentCost.toFixed(2)}
                    </div>
                    <div className={`text-xl font-mono mt-2 font-medium ${isRunning ? 'text-green-500' : 'text-slate-400'}`}>
                        {formatTime(seconds)}
                    </div>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Participants</label>
                        <input
                            type="number"
                            value={participants}
                            onChange={(e) => setParticipants(Number(e.target.value))}
                            className="w-full bg-slate-100 border-none rounded-lg p-3 font-bold text-slate-700 focus:ring-2 focus:ring-red-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Avg Rate/Hr</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400 font-bold">{currency}</span>
                            <input
                                type="number"
                                value={avgRate}
                                onChange={(e) => setAvgRate(Number(e.target.value))}
                                className="w-full bg-slate-100 border-none rounded-lg p-3 pl-8 font-bold text-slate-700 focus:ring-2 focus:ring-red-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex space-x-4">
                    <button
                        onClick={toggleTimer}
                        className={`flex-1 py-4 rounded-xl font-bold text-lg text-white shadow-lg transform transition active:scale-95 ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        {isRunning ? 'Pause' : 'Start Meeting'}
                    </button>
                    <button
                        onClick={resetTimer}
                        className="px-6 py-4 bg-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-300 transition"
                    >
                        Reset
                    </button>
                </div>

                <div className="mt-8 text-center text-xs text-slate-400">
                    Burning money at: <span className="font-bold text-slate-600">{currency}{costPerSecond.toFixed(2)}</span> / second
                </div>

            </div>
        </div>
    );
}

export default App;
