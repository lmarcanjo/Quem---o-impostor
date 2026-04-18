import React, { useState, useEffect, useRef } from 'react';
import { Settings, Users, Plus, X, Play, RefreshCw, Eye, EyeOff, ShieldAlert, ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from './data';
import { loadState, saveState, resetUsedWords } from './store';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'setup' | 'config' | 'pass_play' | 'game' | 'result';

export default function App() {
  const [step, setStep] = useState<Step>('setup');
  const [players, setPlayers] = useState<string[]>([]);
  const [impostorCount, setImpostorCount] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<Record<string, string[]>>({});
  const [showSettings, setShowSettings] = useState(false);

  // Game active state
  const [gameWord, setGameWord] = useState('');
  const [gameImpostors, setGameImpostors] = useState<string[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // Load state on mount
  useEffect(() => {
    const state = loadState();
    setPlayers(state.players);
    setUsedWords(state.usedWords);
  }, []);

  // Save state on changes
  useEffect(() => {
    if (players.length > 0) {
      saveState({ players, usedWords });
    }
  }, [players, usedWords]);

  const startGame = () => {
    // 1. Pick a category from selected
    if (selectedCategories.length === 0) return alert('Selecione pelo menos uma categoria!');
    if (players.length < 3) return alert('É necessário pelo menos 3 jogadores!');
    if (impostorCount >= players.length) return alert('O número de impostores deve ser menor que o de jogadores!');

    const randCat = selectedCategories[Math.floor(Math.random() * selectedCategories.length)];
    const wordsInCategory = CATEGORIES[randCat];
    
    // Manage used words
    let usedInCat = usedWords[randCat] || [];
    let availableWords = wordsInCategory.filter(w => !usedInCat.includes(w));
    
    // Reset if all used
    if (availableWords.length === 0) {
      usedInCat = [];
      availableWords = wordsInCategory;
    }

    // Pick word
    const theWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    const newUsedWords = { ...usedWords, [randCat]: [...usedInCat, theWord] };
    setUsedWords(newUsedWords);

    // Pick impostors
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const impostors = shuffledPlayers.slice(0, impostorCount);

    setGameWord(theWord);
    setGameImpostors(impostors);
    setCurrentPlayerIndex(0);
    setStep('pass_play');
  };

  const handleClearHistory = () => {
    if (confirm('Tem certeza que deseja apagar o histórico de palavras sorteadas?')) {
      resetUsedWords();
      setUsedWords({});
      alert('Histórico resetado!');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans overflow-hidden flex flex-col items-center">
      
      <header className="w-full max-w-md flex justify-between items-center p-6 pb-2">
        <h1 className="text-3xl font-display tracking-tight uppercase text-[#6366F1]">Quem é o Impostor?</h1>
        {step !== 'pass_play' && (
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full bg-[#F8FAFC]/5 hover:bg-[#F8FAFC]/10 active:scale-95 transition-transform">
            <Settings className="w-6 h-6 text-[#94A3B8]" />
          </button>
        )}
      </header>

      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-6 items-center justify-center">
          <div className="w-full max-w-sm bg-[#1E293B] p-6 rounded-3xl border border-[#334155]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Configurações</h2>
              <button onClick={() => setShowSettings(false)} className="p-2"><X className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-[#94A3B8] mb-6">Apague o histórico para voltar a jogar palavras que já saíram.</p>
            <button onClick={handleClearHistory} className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-400 py-4 rounded-2xl font-semibold">
              <RefreshCw className="w-5 h-5" /> Resetar Histórico
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-md flex flex-col relative px-6 pb-8">
        <AnimatePresence mode="wait">
          
          {step === 'setup' && (
            <SetupScreen 
              key="setup" 
              players={players} 
              setPlayers={setPlayers} 
              onNext={() => {
                if(players.length >= 3) setStep('config');
                else alert('Adicione pelo menos 3 jogadores.');
              }} 
            />
          )}

          {step === 'config' && (
            <ConfigScreen 
              key="config"
              playerCount={players.length}
              impostorCount={impostorCount}
              setImpostorCount={setImpostorCount}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              onBack={() => setStep('setup')}
              onStart={startGame}
            />
          )}

          {step === 'pass_play' && (
            <PassAndPlayScreen
              key="pass_play"
              currentPlayer={players[currentPlayerIndex]}
              isImpostor={gameImpostors.includes(players[currentPlayerIndex])}
              secretWord={gameWord}
              onNext={() => {
                if (currentPlayerIndex + 1 < players.length) {
                  setCurrentPlayerIndex(prev => prev + 1);
                } else {
                  setStep('game');
                }
              }}
              total={players.length}
              current={currentPlayerIndex + 1}
            />
          )}

          {step === 'game' && (
            <GameScreen 
              key="game"
              onReveal={() => setStep('result')}
            />
          )}

          {step === 'result' && (
            <ResultScreen 
              key="result"
              impostors={gameImpostors}
              secretWord={gameWord}
              onRestart={() => setStep('config')}
            />
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

// ---------------- SCREENS ---------------- //

function SetupScreen({ players, setPlayers, onNext }: any) {
  const [newName, setNewName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && !players.includes(newName.trim())) {
      setPlayers([...players, newName.trim()]);
      setNewName('');
    }
  };

  const handleRemove = (name: string) => {
    setPlayers(players.filter((p: string) => p !== name));
  };

  return (
    <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col flex-1 mt-4">
      <h2 className="text-xl font-medium mb-6 text-[#F8FAFC] flex items-center gap-2">
        <Users className="w-5 h-5" /> Adicionar Jogadores
      </h2>
      
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newName} 
          onChange={(e) => setNewName(e.target.value)} 
          placeholder="Nome do jogador" 
          className="flex-1 bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3 outline-none focus:border-[#6366F1]/50 transition-colors"
        />
        <button type="submit" className="bg-[#6366F1] text-[#F8FAFC] p-3 rounded-2xl font-bold flex items-center justify-center w-12 shrink-0 active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {players.length === 0 ? (
          <div className="text-center text-[#94A3B8] pt-10 px-4">
            Nenhum jogador adicionado. Precisamos de pelo menos 3 para começar!
          </div>
        ) : (
          <ul className="space-y-3">
            {players.map((p: string, i: number) => (
              <li key={i} className="flex justify-between items-center bg-[#1E293B] p-4 rounded-2xl border border-[#334155]">
                <span className="font-medium text-lg">{p}</span>
                <button onClick={() => handleRemove(p)} className="text-red-400 p-2"><X className="w-5 h-5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="absolute bottom-8 left-6 right-6">
        <button 
          onClick={onNext}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${players.length >= 3 ? 'bg-[#6366F1] text-[#F8FAFC] shadow-[0_4px_20px_rgba(99,102,241,0.4)] active:scale-95' : 'bg-[#F8FAFC]/10 text-[#94A3B8] cursor-not-allowed'}`}
        >
          Próximo <Play className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function ConfigScreen({ playerCount, impostorCount, setImpostorCount, selectedCategories, setSelectedCategories, onBack, onStart }: any) {
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c: string) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col flex-1 mt-4">
      <button onClick={onBack} className="text-[#6366F1] self-start mb-6 font-medium active:opacity-50">← Voltar</button>
      
      <div className="mb-8">
        <h3 className="text-sm uppercase tracking-widest text-[#94A3B8] mb-3 font-semibold">Qtd. de Impostores</h3>
        <div className="flex items-center gap-4 bg-[#1E293B] p-4 rounded-2xl border border-[#334155]">
          <button 
            className="w-12 h-12 bg-[#F8FAFC]/5 rounded-xl flex items-center justify-center active:bg-[#F8FAFC]/10"
            onClick={() => setImpostorCount(Math.max(1, impostorCount - 1))}
          >-</button>
          <div className="flex-1 text-center text-2xl font-bold font-display">{impostorCount}</div>
          <button 
            className="w-12 h-12 bg-[#F8FAFC]/5 rounded-xl flex items-center justify-center active:bg-[#F8FAFC]/10"
            onClick={() => setImpostorCount(Math.min(playerCount - 1, impostorCount + 1))}
          >+</button>
        </div>
        <p className="text-xs text-[#94A3B8] mt-3 text-center">Recomendado: 1 para até 5 jg, 2 a partir de 6.</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <h3 className="text-sm uppercase tracking-widest text-[#94A3B8] mb-3 font-semibold">Categorias</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(CATEGORIES).map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button 
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`p-4 rounded-2xl text-left transition-all border ${isSelected ? 'bg-[#6366F1]/10 border-[#6366F1] text-[#6366F1]' : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'}`}
              >
                <div className="font-semibold">{cat}</div>
                <div className="text-xs mt-1 opacity-60">{CATEGORIES[cat].length} palavras</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="absolute bottom-8 left-6 right-6">
        <button 
          onClick={onStart}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${selectedCategories.length > 0 ? 'bg-[#6366F1] text-[#F8FAFC] shadow-[0_4px_20px_rgba(99,102,241,0.4)] glow-btn active:scale-95' : 'bg-[#F8FAFC]/10 text-[#94A3B8] cursor-not-allowed'}`}
        >
          Iniciar Jogo 
        </button>
      </div>
    </motion.div>
  );
}

function PassAndPlayScreen({ currentPlayer, isImpostor, secretWord, onNext, total, current }: any) {
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when player changes
  useEffect(() => {
    setRevealed(false);
    setSeen(false);
  }, [currentPlayer]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex flex-col flex-1 items-center justify-center mt-4">
      
      <div className="text-center mb-8 w-full">
        <div className="text-xs font-mono text-[#94A3B8] mb-2 uppercase tracking-widest text-center">
          JOGADOR {current} / {total}
        </div>
        <h2 className="text-4xl font-display uppercase tracking-tight break-words px-2">{currentPlayer}</h2>
        <p className="text-[#94A3B8] mt-2 text-sm">Pegue o dispositivo sem que ninguém veja.</p>
      </div>

      <div ref={containerRef} className="relative w-full h-[300px] mb-8 bg-[#1E293B] rounded-3xl border border-[#334155] overflow-hidden flex items-center justify-center select-none touch-none">
        
        {/* The hidden content behind the card */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0">
          {isImpostor ? (
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <div className="text-red-500 font-bold uppercase tracking-widest text-sm mb-2">Sua identidade</div>
              <h3 className="text-3xl font-display text-[#F8FAFC]">Você é o Impostor</h3>
            </div>
          ) : (
            <div className="text-center">
              <Eye className="w-12 h-12 text-[#6366F1] mx-auto mb-4 opacity-50" />
              <div className="text-[#94A3B8] font-bold uppercase tracking-widest text-sm mb-2">Palavra Secreta</div>
              <h3 className="text-3xl font-display text-[#F8FAFC]">{secretWord}</h3>
            </div>
          )}
        </div>

        {/* The draggable cover card */}
        <motion.div 
          drag="y"
          dragConstraints={{ top: -200, bottom: 0 }}
          dragElastic={0.1}
          onDrag={(e, info) => {
            if (info.offset.y < -80 && !revealed) {
              setRevealed(true);
              setSeen(true);
            } else if (info.offset.y > -20 && revealed) {
              setRevealed(false);
            }
          }}
          onDragEnd={(e, info) => {
            setRevealed(false);
          }}
          animate={{ y: revealed ? -250 : 0 }}
          className="absolute inset-0 z-10 bg-gradient-to-br from-[#6366F1] to-[#4338CA] flex flex-col items-center justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-[#334155] cursor-grab active:cursor-grabbing rounded-3xl"
        >
          <div className="w-16 h-2 bg-[#F8FAFC]/20 rounded-full mb-8"></div>
          <ArrowUpFromLine className="w-8 h-8 text-[#94A3B8] animate-bounce mb-4" />
          <p className="font-semibold text-[#94A3B8] uppercase tracking-widest text-sm">Arraste e segure para revelar</p>
        </motion.div>
      </div>

      <div className="h-20 w-full relative">
        <AnimatePresence>
          {seen && !revealed && (
            <motion.button 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onNext}
              className="w-full py-4 rounded-2xl bg-[#F8FAFC] text-black font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <CheckCircle2 className="w-6 h-6" /> Entendido, fechar e passar
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}

function GameScreen({ onReveal }: any) {
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 min
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let t: any;
    if (isRunning && timeLeft > 0) {
      t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(t);
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 items-center justify-center mt-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Investigação!</h2>
        <p className="text-[#94A3B8] mb-8 max-w-[280px]">Façam perguntas uns aos outros sobre a palavra secreta para descobrir quem é o impostor.</p>
        
        <div className="text-6xl font-mono mb-8 tabular-nums tracking-tighter">
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>
        
        <button 
          onClick={() => setIsRunning(!isRunning)}
          className="px-8 py-3 rounded-full border border-[#334155] font-semibold active:bg-[#F8FAFC]/10"
        >
          {isRunning ? 'Pausar' : (timeLeft === 300 ? 'Iniciar Cronômetro' : 'Continuar')}
        </button>
      </div>

      <div className="absolute bottom-8 left-6 right-6">
        <button 
          onClick={onReveal}
          className="w-full py-4 rounded-2xl bg-[#EF4444] text-[#F8FAFC] font-bold text-lg flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-95 transition-transform"
        >
          Finalizar e Revelar
        </button>
      </div>
    </motion.div>
  );
}

function ResultScreen({ impostors, secretWord, onRestart }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col flex-1 items-center justify-center mt-4 text-center">
      <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-12 h-12 text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold uppercase tracking-widest text-[#6366F1] mb-8">Palavra Secreta: {secretWord}</h2>

      <h3 className="text-[#94A3B8] text-sm uppercase tracking-widest font-semibold mb-4">O(s) Impostor(es) era(m):</h3>
      <div className="space-y-3 w-full mb-12">
        {impostors.map((imp: string, i: number) => (
          <div key={i} className="bg-[#1E293B] border border-red-500/30 p-4 rounded-2xl">
            <span className="text-2xl font-display text-[#F8FAFC]">{imp}</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-8 left-6 right-6">
        <button 
          onClick={onRestart}
          className="w-full py-4 rounded-2xl bg-[#6366F1] text-[#F8FAFC] font-bold text-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          Jogar Novamente
        </button>
      </div>
    </motion.div>
  );
}
