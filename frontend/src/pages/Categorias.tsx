import { useEffect, useState } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api';
import type { CategoryItem } from '../api';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';

export default function Categorias() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'INGRESO' | 'GASTO'>('GASTO');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const load = () => {
    setLoading(true);
    getCategories().then(setCategories).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const ingresoCats = categories.filter((c) => c.type === 'INGRESO');
  const gastoCats = categories.filter((c) => c.type === 'GASTO');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCategory({ name: newName, type: newType });
    toast.success('Categoria creada');
    setNewName('');
    load();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await updateCategory(id, { name: editName });
    toast.success('Categoria actualizada');
    setEditId(null);
    load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Eliminar la categoria "${name}"?`)) return;
    await deleteCategory(id);
    toast.success('Categoria eliminada');
    load();
  };

  const renderTable = (items: CategoryItem[]) => (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th style={{ width: 100 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((cat) => (
            <tr key={cat.id}>
              {editId === cat.id ? (
                <>
                  <td>
                    <input
                      className="edit-input"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                      autoFocus
                    />
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon save" onClick={() => handleUpdate(cat.id)}>
                        <Check size={15} />
                      </button>
                      <button className="btn-icon cancel" onClick={() => setEditId(null)}>
                        <X size={15} />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td><strong>{cat.name}</strong></td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon edit" onClick={() => { setEditId(cat.id); setEditName(cat.name); }}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(cat.id, cat.name)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={2} className="empty">Sin categorias</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <p className="loading">Cargando...</p>;

  return (
    <div className="page">
      <h2>Categorias</h2>

      <form className="category-create-bar" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Nueva categoria..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <select value={newType} onChange={(e) => setNewType(e.target.value as 'INGRESO' | 'GASTO')}>
          <option value="INGRESO">Ingreso</option>
          <option value="GASTO">Gasto</option>
        </select>
        <button type="submit">
          <Plus size={16} /> Crear
        </button>
      </form>

      <div className="categories-split">
        <div>
          <h3 className="cat-section-title ingreso">Ingresos ({ingresoCats.length})</h3>
          {renderTable(ingresoCats)}
        </div>
        <div>
          <h3 className="cat-section-title gasto">Gastos ({gastoCats.length})</h3>
          {renderTable(gastoCats)}
        </div>
      </div>
    </div>
  );
}
