
import React, { useState, useMemo } from 'react';
import { AnimeCharacter, SeriesGroup, Category } from '../types';

interface CharacterPickerProps {
  groups: SeriesGroup[];
  selected: AnimeCharacter[];
  onToggle: (char: AnimeCharacter) => void;
  maxChars: number;
}

const CharacterPicker: React.FC<CharacterPickerProps> = ({ groups, selected, onToggle, maxChars }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('Anime');

  const categories: (Category | 'All')[] = ['All', 'Anime', 'Animated', 'TV Shows'];

  const filteredGroups = useMemo(() => {
    let result = groups;
    
    // Filter by Category
    if (activeCategory !== 'All') {
      result = result.filter(g => g.category === activeCategory);
    }

    // Filter by Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.map(group => ({
        ...group,
        characters: group.characters.filter(char => 
          char.toLowerCase().includes(lowerSearch) || 
          group.series.toLowerCase().includes(lowerSearch)
        )
      })).filter(group => group.characters.length > 0);
    }
    
    return result;
  }, [search, groups, activeCategory]);

  const isSelected = (name: string, series: string) => 
    selected.some(s => s.name === name && s.series === series);

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-4 pb-2 no-scrollbar border-b border-white/5">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`
              px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border
              ${activeCategory === cat 
                ? 'bg-yellow-400 text-slate-900 border-yellow-400' 
                : 'bg-slate-800 text-slate-400 border-white/10 hover:border-yellow-400/30'}
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder={`Search in ${activeCategory}...`}
          className="w-full bg-slate-900 border border-yellow-400/30 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all pl-10 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <svg 
          className="absolute left-3 top-3.5 h-4 w-4 text-yellow-400/50" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="flex-grow overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {filteredGroups.map((group) => (
          <div key={group.series} className="space-y-2">
            <div className="flex items-center justify-between border-b border-yellow-400/10 pb-1">
               <h3 className="text-yellow-400 font-bold text-[10px] tracking-widest uppercase opacity-70">
                {group.series}
              </h3>
              <span className="text-[9px] text-slate-500 uppercase font-mono">{group.category}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.characters.map((charName) => {
                const active = isSelected(charName, group.series);
                const disabled = !active && selected.length >= maxChars;
                
                return (
                  <button
                    key={`${group.series}-${charName}`}
                    onClick={() => onToggle({ name: charName, series: group.series, category: group.category })}
                    disabled={disabled}
                    className={`
                      text-left px-3 py-2 rounded-lg text-xs transition-all border
                      ${active 
                        ? 'bg-yellow-400 text-slate-900 border-yellow-400 shadow-lg shadow-yellow-400/20 font-bold' 
                        : 'bg-slate-800/50 text-slate-300 border-white/5 hover:border-yellow-400/40'}
                      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {charName}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 italic text-sm mb-2">No characters found matching your criteria.</p>
            <button 
              onClick={() => { setSearch(''); setActiveCategory('All'); }}
              className="text-xs text-yellow-400 hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterPicker;
