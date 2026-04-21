import React, { useState, useEffect, useRef } from 'react';
import { Settings, Users, Plus, X, Play, RefreshCw, Eye, ShieldAlert, ArrowUpFromLine, CheckCircle2, Trophy, MessageSquare, UserCheck, Skull, Frown, ThumbsUp } from 'lucide-react';
import { CATEGORIES } from './data';
import { loadState, saveState, resetUsedWords, resetScores } from './store';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'setup' | 'config' | 'pass_play' | 'game' | 'voting_pass' | 'voting' | 'result';

type RoleType = 'inocente' | 'impostor' | 'infiltrado' | 'cumplice';
interface PlayerSession {
  role: RoleType;
  word?: string;
  info?: string;
}

const HELP_QUESTIONS = [
  "Você levaria isso para um encontro romântico?",
  "Isso faria a sua avó desmaiar?",
  "Você daria isso de presente para o seu pior inimigo?",
  "Isso caberia na sua geladeira?",
  "Um alienígena acharia isso útil?",
  "Seria um bom nome para um animal de estimação?",
  "Você compraria isso no mercado clandestino?",
  "Isso sobrevive a uma máquina de lavar?",
  "Você usaria isso para se defender de um zumbi?",
  "Isso deixaria o seu quarto mais bonito?",
  "Dá pra carregar isso no bolso?",
  "Tem cheiro bom?"
];

export default function App() {
  const [step, setStep] = useState<Step>('setup');
  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [usedWords, setUsedWords] = useState<Record<string, string[]>>({});
  
  const [impostorCount, setImpostorCount] = useState(1);
  const [roundsCount, setRoundsCount] = useState(3);
  const [enableInfiltrado, setEnableInfiltrado] = useState(false);
  const [enableCumplice, setEnableCumplice] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Game active state
  const [gameWord, setGameWord] = useState('');
  const [gameCategory, setGameCategory] = useState('');
  const [gameImpostors, setGameImpostors] = useState<string[]>([]);
  const [playerRoles, setPlayerRoles] = useState<Record<string, PlayerSession>>({});
  const [startingPlayer, setStartingPlayer] = useState('');
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});

  // Load state on mount
  useEffect(() => {
    const state = loadState();
    setPlayers(state.players);
    setUsedWords(state.usedWords);
    setScores(state.scores);
  }, []);

  // Save state on changes
  useEffect(() => {
    if (players.length > 0) {
      saveState({ players, usedWords, scores });
    }
  }, [players, usedWords, scores]);

  const startGame = () => {
    if (selectedCategories.length === 0) return alert('Selecione pelo menos uma categoria!');
    if (players.length < 3) return alert('É necessário pelo menos 3 jogadores!');
    if (impostorCount >= players.length) return alert('O número de impostores deve ser menor que o de jogadores!');

    const randCat = selectedCategories[Math.floor(Math.random() * selectedCategories.length)];
    const wordsInCategory = CATEGORIES[randCat];
    
    // Manage used words
    let usedInCat = usedWords[randCat] || [];
    let availableWords = wordsInCategory.filter(w => !usedInCat.includes(w));
    
    // Reset if all used
    if (availableWords.length <= 1) {
      usedInCat = [];
      availableWords = wordsInCategory;
    }

    // Pick word
    const randWordIndex = Math.floor(Math.random() * availableWords.length);
    const theWord = availableWords[randWordIndex];
    availableWords.splice(randWordIndex, 1);
    const alternateWord = availableWords.length > 0 ? availableWords[Math.floor(Math.random() * availableWords.length)] : theWord;

    const newUsedWords = { ...usedWords, [randCat]: [...usedInCat, theWord] };
    setUsedWords(newUsedWords);

    // Pick roles
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const impostors = shuffledPlayers.slice(0, impostorCount);
    const remaining = shuffledPlayers.slice(impostorCount);
    
    let roles: Record<string, PlayerSession> = {};
    
    impostors.forEach(p => {
      roles[p] = { role: 'impostor' };
    });

    if (players.length >= 4) {
      // Pick Cumplice
      if (enableCumplice && remaining.length > 0) {
        let p = remaining.pop()!;
        roles[p] = { role: 'cumplice', word: alternateWord };
      }
      // Pick Infiltrado
      if (enableInfiltrado && remaining.length > 0) {
        let p = remaining.pop()!;
        roles[p] = { role: 'infiltrado', info: impostors.join(', ') };
      }
    }

    remaining.forEach(p => {
      roles[p] = { role: 'inocente', word: theWord };
    });

    const firstPlayer = players[Math.floor(Math.random() * players.length)];

    setGameCategory(randCat);
    setGameWord(theWord);
    setGameImpostors(impostors);
    setPlayerRoles(roles);
    setStartingPlayer(firstPlayer);
    setCurrentPlayerIndex(0);
    setVotes({});
    setStep('pass_play');
  };

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza que deseja apagar o histórico de palavras sorteadas?')) {
      resetUsedWords();
      setUsedWords({});
      alert('Histórico resetado!');
    }
  };

  const handleClearScores = () => {
    if (window.confirm('Zerar a pontuação de todos os jogadores?')) {
      resetScores();
      setScores({});
      alert('Placar zerado!');
    }
  };

  const recordVote = (votedPlayer: string) => {
    const voter = players[currentPlayerIndex];
    const newVotes = { ...votes, [voter]: votedPlayer };
    setVotes(newVotes);
    
    if (currentPlayerIndex + 1 < players.length) {
      setCurrentPlayerIndex(prev => prev + 1);
      setStep('voting_pass');
    } else {
      calculateResults(newVotes);
      setStep('result');
    }
  };

  const calculateResults = (finalVotes: Record<string, string>) => {
    let voteCounts: Record<string, number> = {};
    Object.values(finalVotes).forEach(v => {
      const vStr = v as string;
      voteCounts[vStr] = (voteCounts[vStr] || 0) + 1;
    });

    let maxVotes = 0;
    let mostVoted: string[] = [];
    Object.entries(voteCounts).forEach(([p, q]) => {
      if (q > maxVotes) {
        maxVotes = q;
        mostVoted = [p];
      } else if (q === maxVotes) {
        mostVoted.push(p);
      }
    });

    let newScores = { ...scores };
    Object.keys(newScores).forEach(p => { if (newScores[p] === undefined) newScores[p] = 0; });
    players.forEach(p => { if (newScores[p] === undefined) newScores[p] = 0; });

    let impostorCaught = false;
    mostVoted.forEach(v => {
      if (playerRoles[v]?.role === 'impostor') {
        impostorCaught = true;
      }
    });

    if (impostorCaught) {
      // Inocentes Win
      players.forEach(p => {
        if (playerRoles[p].role === 'inocente') {
          newScores[p] += 1;
          if (playerRoles[finalVotes[p]]?.role === 'impostor') {
            newScores[p] += 1; // Bonus for voting right
          }
        }
      });
    } else {
      // Impostors Win
      players.forEach(p => {
        const r = playerRoles[p].role;
        if (r === 'impostor' || r === 'infiltrado' || r === 'cumplice') {
          newScores[p] += 3;
        }
      });
    }
    
    setScores(newScores);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans overflow-hidden flex flex-col items-center">
      
      <header className="w-full max-w-md flex justify-between items-center p-6 pb-2">
        <h1 className="text-3xl font-display tracking-tight uppercase text-[#6366F1]">Impostor</h1>
        {(step === 'setup' || step === 'config') && (
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
            
            <button onClick={handleClearHistory} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-4 rounded-2xl font-semibold mb-4">
              <RefreshCw className="w-5 h-5" /> Resetar Histórico de Palavras
            </button>
            
            <button onClick={handleClearScores} className="w-full flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-500 py-4 rounded-2xl font-semibold">
              <Trophy className="w-5 h-5" /> Zerar Placar de Pontos
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
              scores={scores}
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
              roundsCount={roundsCount}
              setRoundsCount={setRoundsCount}
              enableInfiltrado={enableInfiltrado}
              setEnableInfiltrado={setEnableInfiltrado}
              enableCumplice={enableCumplice}
              setEnableCumplice={setEnableCumplice}
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
              session={playerRoles[players[currentPlayerIndex]]}
              category={gameCategory}
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
              startingPlayer={startingPlayer}
              roundsCount={roundsCount}
              onReveal={() => {
                setCurrentPlayerIndex(0);
                setStep('voting_pass');
              }}
            />
          )}

          {step === 'voting_pass' && (
            <VotingPassScreen
              key="voting_pass"
              currentPlayer={players[currentPlayerIndex]}
              onNext={() => setStep('voting')}
            />
          )}

          {step === 'voting' && (
            <VotingScreen 
              key="voting"
              currentPlayer={players[currentPlayerIndex]}
              allPlayers={players}
              onVote={recordVote}
            />
          )}

          {step === 'result' && (
            <ResultScreen 
              key="result"
              players={players}
              roles={playerRoles}
              votes={votes}
              secretWord={gameWord}
              scores={scores}
              onRestart={() => setStep('config')}
              onHome={() => setStep('setup')}
            />
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

// ---------------- SCREENS ---------------- //

function SetupScreen({ players, setPlayers, scores, onNext }: any) {
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

  const sortedPlayers = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

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
          className="flex-1 bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3 outline-none focus:border-[#6366F1]/50 transition-colors uppercase"
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
          <div className="space-y-3">
            {sortedPlayers.map((p: string, i: number) => (
              <div key={i} className="flex justify-between items-center bg-[#1E293B] p-4 rounded-2xl border border-[#334155] group relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{p}</span>
                  {(scores[p] || 0) > 0 && (
                    <span className="bg-[#6366F1]/20 text-[#6366F1] px-2 py-1 rounded-md text-xs font-bold leading-none">
                      {scores[p]} pts
                    </span>
                  )}
                </div>
                <button onClick={() => handleRemove(p)} className="text-red-400 p-2"><X className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
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

function ConfigScreen({ playerCount, impostorCount, setImpostorCount, roundsCount, setRoundsCount, enableInfiltrado, setEnableInfiltrado, enableCumplice, setEnableCumplice, selectedCategories, setSelectedCategories, onBack, onStart }: any) {
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
      
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2 font-semibold">Qtd. Impostores</h3>
          <div className="flex items-center justify-between bg-[#1E293B] p-2 rounded-2xl border border-[#334155]">
            <button className="w-10 h-10 bg-[#F8FAFC]/5 rounded-xl active:bg-[#F8FAFC]/10" onClick={() => setImpostorCount(Math.max(1, impostorCount - 1))}>-</button>
            <div className="font-bold font-display text-xl">{impostorCount}</div>
            <button className="w-10 h-10 bg-[#F8FAFC]/5 rounded-xl active:bg-[#F8FAFC]/10" onClick={() => setImpostorCount(Math.min(playerCount - 1, impostorCount + 1))}>+</button>
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2 font-semibold">Rodadas</h3>
          <div className="flex items-center justify-between bg-[#1E293B] p-2 rounded-2xl border border-[#334155]">
            <button className="w-10 h-10 bg-[#F8FAFC]/5 rounded-xl active:bg-[#F8FAFC]/10" onClick={() => setRoundsCount(Math.max(1, roundsCount - 1))}>-</button>
            <div className="font-bold font-display text-xl">{roundsCount}</div>
            <button className="w-10 h-10 bg-[#F8FAFC]/5 rounded-xl active:bg-[#F8FAFC]/10" onClick={() => setRoundsCount(Math.min(10, roundsCount + 1))}>+</button>
          </div>
        </div>
      </div>
      
      {playerCount >= 4 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2 font-semibold">Papéis Especiais</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setEnableInfiltrado(!enableInfiltrado)}
              className={`p-3 rounded-2xl border transition-colors flex flex-col items-start ${enableInfiltrado ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'}`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1"><UserCheck className="w-4 h-4"/> O Infiltrado</div>
              <div className="text-left text-xs opacity-70 leading-tight">Sabe quem é o impostor e o protege.</div>
            </button>
            <button 
              onClick={() => setEnableCumplice(!enableCumplice)}
              className={`p-3 rounded-2xl border transition-colors flex flex-col items-start ${enableCumplice ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'}`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1"><Eye className="w-4 h-4"/> O Cúmplice</div>
              <div className="text-left text-xs opacity-70 leading-tight">Ganha palavra parecida p/ confundir.</div>
            </button>
          </div>
        </div>
      )}

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

function PassAndPlayScreen({ currentPlayer, session, category, onNext, total, current }: any) {
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(false);

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

      <div className="relative w-full h-[320px] mb-8 bg-[#1E293B] rounded-3xl border border-[#334155] overflow-hidden flex items-center justify-center select-none touch-none">
        
        {/* Hidden content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0">
          
          {session.role === 'impostor' && (
            <div>
              <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <div className="text-red-500 font-bold uppercase tracking-widest text-sm mb-2">Sua identidade</div>
              <h3 className="text-3xl font-display text-[#F8FAFC]">Impostor</h3>
              <p className="text-[#94A3B8] text-sm mt-4">Tente se misturar e não ser pego.</p>
            </div>
          )}

          {session.role === 'inocente' && (
            <div>
              <Eye className="w-12 h-12 text-[#6366F1] mx-auto mb-4 opacity-50" />
              <div className="text-[#94A3B8] font-bold uppercase tracking-widest text-xs mb-1">Categoria: {category}</div>
              <h3 className="text-3xl font-display text-[#F8FAFC]">{session.word}</h3>
              <p className="text-[#94A3B8] text-sm mt-4">Descubra os impostores.</p>
            </div>
          )}

          {session.role === 'infiltrado' && (
            <div>
              <UserCheck className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <div className="text-purple-400 font-bold uppercase tracking-widest text-sm mb-2">O Infiltrado</div>
              <p className="text-[#F8FAFC] text-sm mt-2">Você faz parte do time do mal!</p>
              <h3 className="text-xl font-display text-red-400 mt-4 leading-tight">Ajude: <br/>{session.info}</h3>
            </div>
          )}

          {session.role === 'cumplice' && (
            <div>
              <Eye className="w-12 h-12 text-yellow-500 mx-auto mb-4 opacity-50" />
              <div className="text-yellow-500 font-bold uppercase tracking-widest text-sm mb-2">O Cúmplice</div>
              <h3 className="text-3xl font-display text-[#F8FAFC]">{session.word}</h3>
              <p className="text-[#94A3B8] text-xs mt-3">Essa palavra é PARECIDA com a original. Enrole a todos para proteger o time do mal!</p>
            </div>
          )}

        </div>

        {/* Cover card */}
        <motion.div 
          drag="y"
          dragConstraints={{ top: -220, bottom: 0 }}
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
          animate={{ y: revealed ? -270 : 0 }}
          className="absolute inset-0 z-10 bg-gradient-to-br from-[#6366F1] to-[#4338CA] flex flex-col items-center justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-[#334155] cursor-grab active:cursor-grabbing rounded-3xl"
        >
          <div className="w-16 h-2 bg-[#F8FAFC]/20 rounded-full mb-8"></div>
          <ArrowUpFromLine className="w-8 h-8 text-[#94A3B8] animate-bounce mb-4" />
          <p className="font-semibold text-[#94A3B8] uppercase tracking-widest text-sm text-center px-4">Arraste e segure a tela para cima <br/> para revelar</p>
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
              <CheckCircle2 className="w-6 h-6" /> Esconder e passar o celular
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}

function GameScreen({ startingPlayer, roundsCount, onReveal }: any) {
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [helperQuestion, setHelperQuestion] = useState('');

  useEffect(() => {
    let t: any;
    if (isRunning && timeLeft > 0) {
      t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(t);
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const pullQuestion = () => {
    const randomQ = HELP_QUESTIONS[Math.floor(Math.random() * HELP_QUESTIONS.length)];
    setHelperQuestion(randomQ);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 items-center justify-center mt-4 pb-20">
      <div className="text-center mb-6 w-full">
        <div className="inline-flex flex-col items-center justify-center bg-[#1E293B] border border-[#334155] rounded-3xl p-6 w-full mb-4 relative overflow-hidden shadow-lg">
          <span className="text-xs font-mono uppercase tracking-widest text-[#94A3B8] mb-2">Quem começa perguntando</span>
          <span className="text-4xl font-display text-[#F8FAFC] uppercase">{startingPlayer}</span>
        </div>
        
        <div className="flex justify-center items-center gap-2 text-[#94A3B8] bg-[#F8FAFC]/5 py-2 px-4 rounded-full mx-auto w-fit mb-6 font-medium text-sm">
          <RefreshCw className="w-4 h-4 text-[#6366F1]"/>
          {roundsCount} rodadas marcadas
        </div>
        
        <div className="text-6xl font-mono mb-2 tabular-nums tracking-tighter cursor-pointer" onClick={() => setIsRunning(!isRunning)}>
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>
        <button className="text-xs uppercase tracking-widest text-[#94A3B8] font-bold py-2 px-6 rounded-full border border-[#334155] active:bg-[#F8FAFC]/10" onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? 'Pausar Relógio' : 'Rodar Relógio'}
        </button>
      </div>

      <div className="w-full bg-[#6366F1]/10 border border-[#6366F1]/30 p-5 rounded-2xl mb-8 min-h-[120px] flex flex-col justify-center items-center">
        {helperQuestion ? (
          <p className="text-lg font-medium text-center text-[#F8FAFC] leading-snug italic">"{helperQuestion}"</p>
        ) : (
          <p className="text-sm text-[#94A3B8] text-center"><MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-50"/> Sem ideia do que perguntar?</p>
        )}
        <button onClick={pullQuestion} className="mt-4 text-[#6366F1] font-bold text-sm uppercase tracking-widest active:opacity-50">Gerar Pergunta Bizarra</button>
      </div>

      <div className="absolute bottom-8 left-6 right-6">
        <button 
          onClick={onReveal}
          className="w-full py-4 rounded-2xl bg-[#EF4444] text-[#F8FAFC] font-bold text-lg flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-95 transition-transform"
        >
          Iniciar o Tribunal (Votação)
        </button>
      </div>
    </motion.div>
  );
}

function VotingPassScreen({ currentPlayer, onNext }: any) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col flex-1 items-center justify-center mt-4 text-center">
      <MessageSquare className="w-16 h-16 text-[#6366F1] mb-6" />
      <h2 className="text-xl font-bold uppercase tracking-widest text-[#94A3B8] mb-2">Vez de votar:</h2>
      <h3 className="text-5xl font-display text-[#F8FAFC] mb-8 uppercase">{currentPlayer}</h3>
      <p className="text-[#94A3B8] mb-12">Pegue o celular para fazer o seu voto secreto.</p>
      
      <div className="absolute bottom-8 left-6 right-6">
        <button 
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-[#6366F1] text-[#F8FAFC] font-bold text-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          Sou Eu, Quero Votar
        </button>
      </div>
    </motion.div>
  );
}

function VotingScreen({ currentPlayer, allPlayers, onVote }: any) {
  const others = allPlayers.filter((p: string) => p !== currentPlayer);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 mt-4">
      <div className="text-center mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#94A3B8] mb-1">{currentPlayer}, vote abaixo:</h2>
        <h3 className="text-2xl font-display text-[#F8FAFC]">Quem é o Impostor?</h3>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 space-y-3">
        {others.map((p: string) => (
          <button 
            key={p}
            onClick={() => {
              if(window.confirm(`Confirmar voto em ${p}?`)) onVote(p);
            }}
            className="w-full bg-[#1E293B] border border-[#334155] p-5 rounded-2xl text-left flex justify-between items-center active:bg-[#6366F1]/20 active:border-[#6366F1] transition-colors group"
          >
            <span className="font-bold text-xl uppercase">{p}</span>
            <Skull className="w-6 h-6 text-[#94A3B8] group-active:text-[#6366F1]" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ResultScreen({ players, roles, votes, secretWord, scores, onRestart, onHome }: any) {
  
  // Count
  let counts: Record<string, number> = {};
  Object.values(votes).forEach(v => counts[v as string] = (counts[v as string] || 0) + 1);
  
  let maxV = 0;
  let maxVotingPlayers: string[] = [];
  Object.entries(counts).forEach(([p, q]) => {
    if (q > maxV) { maxV = q; maxVotingPlayers = [p]; }
    else if (q === maxV) maxVotingPlayers.push(p);
  });

  const impostorsList = players.filter((p: string) => roles[p].role === 'impostor');
  const impostorCaught = maxVotingPlayers.some(p => roles[p]?.role === 'impostor');

  const impostorsWon = !impostorCaught;

  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col flex-1 mt-4 relative">
      <div className="text-center mb-8">
        <div className="inline-flex w-20 h-20 rounded-full items-center justify-center mb-4 border-2 border-current shadow-lg"
             style={{ color: impostorCaught ? '#10B981' : '#EF4444', backgroundColor: impostorCaught ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
          {impostorCaught ? <ThumbsUp className="w-10 h-10" /> : <Frown className="w-10 h-10" />}
        </div>
        
        <h2 className="text-3xl font-display uppercase tracking-tight text-[#F8FAFC] mb-2">
          {impostorCaught ? 'O Impostor Rodou!' : 'O Mal Venceu!'}
        </h2>
        <p className="text-[#94A3B8] text-sm">
          A maioria votou em <b>{maxVotingPlayers.join(' e ')}</b>. E o(s) Impostor(es) era(m) <b>{impostorsList.join(' e ')}</b>!
        </p>

        {impostorsWon && (
          <div className="mt-4 p-3 bg-red-500/20 text-red-300 rounded-xl font-bold uppercase tracking-widest text-xs border border-red-500/30">
            Castigo para os inocentes: Bebam um copo d'água (ou algo pior!) e imitem um pato.
          </div>
        )}
      </div>
      
      <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-6 mb-6">
        <h3 className="text-xs uppercase tracking-widest text-[#94A3B8] font-semibold mb-2 text-center">A Palavra era</h3>
        <p className="text-2xl font-bold uppercase text-center text-[#6366F1]">{secretWord}</p>
      </div>

      <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-6 mb-8 text-sm">
        <h3 className="text-xs uppercase tracking-widest text-[#94A3B8] font-semibold mb-4 text-center">Resumo da Votação</h3>
        <div className="space-y-2">
          {players.map((p: string) => (
            <div key={p} className="flex justify-between items-center bg-[#0F172A] p-2 rounded-lg border border-[#334155]/50">
              <span className="font-medium">{p}</span>
              <span className="text-[#94A3B8] flex items-center gap-2">
                votou em <span className="font-bold text-[#F8FAFC]">{votes[p]}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <h3 className="text-sm uppercase tracking-widest text-[#94A3B8] mb-4 font-semibold text-center">Ranking Geral</h3>
        <div className="space-y-3">
          {[...players].sort((a, b) => scores[b] - scores[a]).map((p: string, i: number) => (
            <div key={p} className="flex items-center bg-[#1E293B] p-4 rounded-2xl border border-[#334155] relative overflow-hidden">
              <div className="w-8 flex-shrink-0 font-bold text-[#94A3B8]">#{i+1}</div>
              <div className="flex-1 font-bold truncate pr-3">{p}</div>
              <div className="flex flex-col items-end shrink-0 text-right">
                <span className="text-[#6366F1] font-bold text-xl">{scores[p]}</span>
                <span className="text-xs uppercase tracking-widest opacity-50">{roles[p]?.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-6 right-6 flex flex-col gap-3">
        <button 
          onClick={onRestart}
          className="w-full py-4 rounded-2xl bg-[#6366F1] text-[#F8FAFC] font-bold text-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          Próxima Partida (Mesma Sala)
        </button>
        <button 
          onClick={onHome}
          className="w-full py-3 rounded-2xl border border-[#334155] text-[#94A3B8] font-bold flex items-center justify-center active:bg-[#F8FAFC]/5 transition-transform"
        >
          Menu Inicial / Editar Jogadores
        </button>
      </div>
    </motion.div>
  );
}
