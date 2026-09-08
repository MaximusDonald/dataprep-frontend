import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Trash2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import client from '../api/client';
import { useSessionStore } from '../store/sessionStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { setDatasetId } = useSessionStore();

  const fetchDatasets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.get('/api/datasets/');
      setDatasets(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de charger les datasets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce dataset ? Cette action est irréversible.")) return;
    try {
      await client.delete(`/api/datasets/${id}`);
      fetchDatasets();
    } catch (err) {
      alert(err.response?.data?.detail || "Erreur lors de la suppression.");
    }
  };

  const handleSelect = (id) => {
    setDatasetId(id);
    navigate('/eda');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Chargement de vos datasets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
        <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Aucun dataset trouvé</h2>
        <p className="text-muted-foreground mb-6">Vous n'avez pas encore importé de données dans cette session.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
        >
          Importer un fichier
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <Archive className="w-8 h-8 text-primary" />
            Mes Datasets
          </h1>
          <p className="text-muted-foreground">Retrouvez l'historique de vos jeux de données importés.</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/20 transition"
        >
          Nouvel import
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Nom du fichier</th>
              <th className="p-4 font-medium">Lignes / Cols</th>
              <th className="p-4 font-medium">Cible & Tâche</th>
              <th className="p-4 font-medium">Date d'import</th>
              <th className="p-4 font-medium">État</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {datasets.map((d) => (
              <tr 
                key={d.id} 
                onClick={() => handleSelect(d.id)}
                className="hover:bg-primary/5 transition-colors cursor-pointer group"
              >
                <td className="p-4">
                  <span className="font-semibold text-foreground">{d.name}</span>
                  <div className="text-xs text-muted-foreground mt-1">{(d.file_size / 1024).toFixed(1)} KB</div>
                </td>
                <td className="p-4">
                  <span className="bg-muted px-2 py-1 rounded text-xs font-mono">
                    {d.row_count?.toLocaleString() || '?'} x {d.col_count}
                  </span>
                </td>
                <td className="p-4">
                  {d.target_column ? (
                    <div>
                      <span className="font-medium">{d.target_column}</span>
                      <span className="text-xs text-muted-foreground block capitalize">{d.task_type || 'Non spécifié'}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Aucune cible</span>
                  )}
                </td>
                <td className="p-4 text-muted-foreground">
                  {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: fr })}
                </td>
                <td className="p-4">
                  {d.is_transformed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      Modifié
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      Original
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(d.id, e)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition"
                      title="Supprimer le dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition flex items-center gap-1"
                      title="Reprendre l'analyse"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
