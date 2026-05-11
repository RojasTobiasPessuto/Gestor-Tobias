import { useEffect, useState } from 'react';
import { getCategories } from '../api';
import type { CategoryItem } from '../api';
import { X } from 'lucide-react';

interface Props {
  selected: string[];
  onChange: (cats: string[]) => void;
  type: 'INGRESO' | 'GASTO';
  label?: string;
}

export default function CategoryMultiSelect({ selected, onChange, type, label }: Props) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getCategories().then(setCategories); }, []);

  const filtered = categories.filter((c) => c.type === type);
  const available = filtered.filter(
    (c) => !selected.includes(c.name) && c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name]);
  };

  return (
    <div className="multi-cat-field">
      <span className="multi-cat-label">{label ?? 'Categorias'}</span>
      {selected.length > 0 && (
        <div className="cat-chips">
          {selected.map((c) => (
            <span key={c} className="cat-chip selected">
              {c}
              <button type="button" onClick={() => toggle(c)}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className="cat-search-input"
        placeholder="Buscar categoria..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && available.length > 0) {
            e.preventDefault();
            toggle(available[0].name);
            setSearch('');
          }
        }}
      />
      <div className="cat-options">
        {available.length === 0 ? (
          <span className="cat-empty">Sin coincidencias</span>
        ) : (
          available.map((c) => (
            <button
              key={c.id}
              type="button"
              className="cat-option"
              onClick={() => { toggle(c.name); setSearch(''); }}
            >
              + {c.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
