
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimeCharacter, SeriesGroup, Category, GeneratedImage } from './types';
import CharacterPicker from './components/CharacterPicker';
import { generateAnimeArt } from './services/gemini';
import { CHARACTER_LIST } from './constants';

const App: React.FC = () => {
  const [characterGroups, setCharacterGroups] = useState<SeriesGroup[]>(CHARACTER_LIST);
  const [selectedChars, setSelectedChars] = useState<AnimeCharacter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [queue, setQueue] = useState<GeneratedImage[]>([]);
  const [selectedJob, setSelectedJob] = useState<GeneratedImage | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Settings
  const [excludeProportions, setExcludeProportions] = useState(false);
  const [batchCount, setBatchCount] = useState(1);
  
  // New character form state
  const [newName, setNewName] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('Anime');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_CHARS = 5;

  // Keyboard Navigation Logic
  const completedImages = queue.filter(q => q.status === 'completed');
  const currentIndex = selectedJob ? completedImages.findIndex(img => img.id === selectedJob.id) : -1;

  const navigateImages = useCallback((direction: 'next' | 'prev') => {
    if (direction === 'next' && currentIndex < completedImages.length - 1) {
      setSelectedJob(completedImages[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      setSelectedJob(completedImages[currentIndex - 1]);
    }
  }, [currentIndex, completedImages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedJob) return;
      if (e.key === 'ArrowRight') navigateImages('next');
      if (e.key === 'ArrowLeft') navigateImages('prev');
      if (e.key === 'Escape') setSelectedJob(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedJob, navigateImages]);

  const handleCopy = (text: string, id: string = 'preview') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = (char: AnimeCharacter) => {
    setSelectedChars(prev => {
      const exists = prev.find(p => p.name === char.name && p.series === char.series);
      if (exists) {
        return prev.filter(p => p.name !== char.name || p.series !== char.series);
      }
      if (prev.length >= MAX_CHARS) return prev;
      return [...prev, char];
    });
  };

  const generatePromptText = () => {
    const count = selectedChars.length;
    const names = selectedChars.map(c => `${c.name} from ${c.series}`).join(' + ');
    const hasTvShow = selectedChars.some(c => c.category === 'TV Shows');
    const styleFilter = hasTvShow 
      ? "pop the colors on the image tv realistic style, 8k cinema IMPORTANT not animated not cartoony styles allowed"
      : "all image animated style";

    const subject = count > 1 ? "them" : "her";
    const interactionText = count > 1 ? `I want all ${count} characters interacting` : `I want the character`;
    const combiningText = count > 1 ? `combining ${count} characters into 1` : `combining character features`;

    const proportionText = excludeProportions ? "" : `give ${subject} 50 dd cups, wide hips y un cte no demasiado exagerado and tattos (big glutes:1.2), (thick thighs:1.25) (saggie boobs:1.3)`;

    return `IMPORTANT Keeping pose, keep the model actions and SUPER IMPORTANT KEEP THE MODELoutfit, ${proportionText} change the character to ${names} keep the outfit EXACTLY like the models, ${styleFilter}. What I dont want is you ${combiningText} ${interactionText} while keeping the original pose make it vertical`;
  };

  const handlePreviewPrompt = () => {
    if (selectedChars.length === 0) {
      setError("Please select at least 1 character first.");
      return;
    }
    setPreviewPrompt(generatePromptText());
    setError(null);
  };

  const handleGenerate = async () => {
    if (selectedChars.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setPreviewPrompt(null);

    const prompt = generatePromptText();
    const batchIds = Array.from({ length: batchCount }, () => Math.random().toString(36).substr(2, 9));

    setQueue(prev => [
      ...batchIds.map(id => ({
        id, url: null, prompt, status: 'queued' as const, timestamp: Date.now()
      })),
      ...prev
    ]);

    const generationPromises = batchIds.map(async (id) => {
      try {
        const result = await generateAnimeArt(prompt, referenceImages);
        setQueue(prev => prev.map(item => item.id === id ? { ...item, url: result, status: 'completed' } : item));
      } catch (err: any) {
        setQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'error', errorMessage: err.message || "Failed" } : item));
      }
    });

    await Promise.allSettled(generationPromises);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6 md:py-10">
      <header className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold starry-title mb-3">Trio Creator Pro</h1>
        <p className="text-blue-200/80 max-w-2xl mx-auto text-base md:text-lg">Mix 1 to {MAX_CHARS} characters from Anime, Animated series, and TV Shows.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        <div className="lg:col-span-4 flex flex-col h-auto lg:h-[calc(100vh-220px)] min-h-[500px]">
          <div className="glass-panel rounded-2xl p-4 md:p-6 flex flex-col h-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">Selection</h2>
              <button onClick={() => setShowAddForm(!showAddForm)} className="text-[10px] uppercase font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-1 rounded hover:bg-yellow-400/20">+ Custom</button>
            </div>
            
            <div className="flex-grow overflow-hidden flex flex-col min-h-0">
              <CharacterPicker groups={characterGroups} selected={selectedChars} onToggle={handleToggle} maxChars={MAX_CHARS} />
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="exclude" 
                  checked={excludeProportions} 
                  onChange={(e) => setExcludeProportions(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-slate-800 text-yellow-400"
                />
                <label htmlFor="exclude" className="text-xs font-bold text-slate-300 cursor-pointer">Exclude Body Proportions</label>
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Count</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button 
                      key={n} 
                      onClick={() => setBatchCount(n)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${batchCount === n ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePreviewPrompt} className="py-3 rounded-xl font-bold text-xs bg-slate-800 text-yellow-400 border border-yellow-400/30 hover:bg-slate-700 transition-colors">Preview</button>
                <button onClick={handleGenerate} disabled={selectedChars.length === 0 || isGenerating} className="py-3 rounded-xl font-bold text-xs bg-yellow-400 text-slate-900 disabled:opacity-50 hover:bg-yellow-300 transition-colors">
                  {isGenerating ? 'Generating...' : `Generate ${batchCount > 1 ? batchCount : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col h-auto lg:h-[calc(100vh-220px)] min-h-[500px]">
          <div className="glass-panel rounded-2xl p-4 md:p-6 h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              {queue.length === 0 && !previewPrompt && (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="font-serif italic text-lg text-blue-200">Awaiting selection...</p>
                </div>
              )}
              
              {previewPrompt && (
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-yellow-400/20 animate-in fade-in slide-in-from-bottom-4 relative group">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Prompt Preview</h3>
                    <button 
                      onClick={() => handleCopy(previewPrompt, 'preview')}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-1 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20 transition-all"
                    >
                      {copiedId === 'preview' ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          Copy Prompt
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-slate-300 font-mono text-sm leading-relaxed">{previewPrompt}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
                {queue.map((job) => (
                  <div 
                    key={job.id} 
                    onClick={() => job.status === 'completed' && setSelectedJob(job)}
                    className={`relative aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden border border-white/5 transition-all group ${job.status === 'completed' ? 'cursor-pointer hover:border-yellow-400/50' : ''}`}
                  >
                    {job.status === 'queued' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80">
                        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Generating</span>
                      </div>
                    )}
                    {job.url && (
                      <>
                        <img src={job.url} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end">
                           <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-tighter">View Details</span>
                        </div>
                      </>
                    )}
                    {job.status === 'error' && (
                      <div className="p-4 text-center h-full flex flex-col items-center justify-center">
                        <span className="text-red-400 text-xs font-bold">Error</span>
                        <p className="text-[10px] text-slate-500 mt-1">{job.errorMessage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-10 animate-in fade-in duration-200">
          <button onClick={() => setSelectedJob(null)} className="absolute top-6 right-6 text-white hover:text-yellow-400 transition-colors z-[210]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Nav Controls */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
            <button 
              disabled={currentIndex <= 0}
              onClick={(e) => { e.stopPropagation(); navigateImages('prev'); }}
              className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center pointer-events-auto transition-all ${currentIndex > 0 ? 'hover:bg-yellow-400 hover:text-slate-900 text-white' : 'opacity-20 cursor-not-allowed text-gray-500'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
              disabled={currentIndex >= completedImages.length - 1}
              onClick={(e) => { e.stopPropagation(); navigateImages('next'); }}
              className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center pointer-events-auto transition-all ${currentIndex < completedImages.length - 1 ? 'hover:bg-yellow-400 hover:text-slate-900 text-white' : 'opacity-20 cursor-not-allowed text-gray-500'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="max-w-4xl w-full h-full flex flex-col md:flex-row bg-slate-950 rounded-3xl overflow-hidden border border-white/10">
            <div className="flex-[2] bg-black flex items-center justify-center relative group">
              <img src={selectedJob.url!} className="max-h-full max-w-full object-contain" alt="" />
            </div>
            <div className="flex-1 p-8 flex flex-col bg-slate-900 relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-xs">Prompt Used</h3>
                <button 
                  onClick={() => handleCopy(selectedJob.prompt, selectedJob.id)}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-yellow-400 transition-colors"
                >
                  {copiedId === selectedJob.id ? 'Copied!' : 'Copy Prompt'}
                </button>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow overflow-y-auto custom-scrollbar pr-2">{selectedJob.prompt}</p>
              <a href={selectedJob.url!} download="nano-anime.png" className="w-full bg-yellow-400 text-slate-900 font-bold py-4 rounded-xl text-center hover:bg-yellow-300 transition-all">Download HD</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
