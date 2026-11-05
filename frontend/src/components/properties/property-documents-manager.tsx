'use client';

import { useState, useEffect } from 'react';
import { FileText, Upload, X, File, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { propertiesService } from '@/services/properties.service';
import { toast } from 'sonner';

export interface DocumentFile {
  id: string;
  name: string;
  type: 'title_deed' | 'plan' | 'other';
  size: number;
  url?: string;
  file?: File;
  propertyId?: string;
}

interface PropertyDocumentsManagerProps {
  propertyId?: string;
  documents?: DocumentFile[];
  onDocumentsChange?: (documents: DocumentFile[]) => void;
}

const DOCUMENT_TYPES = {
  title_deed: { label: 'Titre foncier', icon: FileText, color: 'text-blue-600' },
  plan: { label: 'Plans', icon: File, color: 'text-green-600' },
  other: { label: 'Autres documents', icon: FileText, color: 'text-gray-600' },
};

export function PropertyDocumentsManager({
  propertyId,
  documents = [],
  onDocumentsChange,
}: PropertyDocumentsManagerProps) {
  // Documents existants (depuis le backend)
  const [existingDocs, setExistingDocs] = useState<DocumentFile[]>(documents);
  // Nouveaux documents ajoutés (pas encore uploadés)
  const [newDocs, setNewDocs] = useState<DocumentFile[]>([]);

  // Mettre à jour les documents existants quand les props changent
  useEffect(() => {
    setExistingDocs(documents);
  }, [documents]);

  // Combiner existants + nouveaux pour l'affichage
  const allDocs = [...existingDocs, ...newDocs];

  const handleFileSelect = (type: keyof typeof DOCUMENT_TYPES, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const addedDocs: DocumentFile[] = Array.from(files).map((file) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      type,
      size: file.size,
      file,
    }));

    const updatedNewDocs = [...newDocs, ...addedDocs];
    setNewDocs(updatedNewDocs);
    // Informer le parent seulement des NOUVEAUX documents
    onDocumentsChange?.(updatedNewDocs);
  };

  const handleRemoveDocument = (id: string) => {
    // Vérifier si c'est un document existant ou nouveau
    const isExisting = existingDocs.some(doc => doc.id === id);
    
    if (isExisting) {
      // Retirer des documents existants
      setExistingDocs(prev => prev.filter(doc => doc.id !== id));
      // Note: la suppression réelle devra être faite par le parent via une callback dédiée
    } else {
      // Retirer des nouveaux documents
      const updatedNewDocs = newDocs.filter((doc) => doc.id !== id);
      setNewDocs(updatedNewDocs);
      onDocumentsChange?.(updatedNewDocs);
    }
  };

  const handleDownloadDocument = async (doc: DocumentFile) => {
    if (!propertyId) {
      toast.error('ID de propriété manquant');
      return;
    }

    try {
      const blob = await propertiesService.downloadDocument(propertyId, doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderUploadSection = (type: keyof typeof DOCUMENT_TYPES) => {
    const config = DOCUMENT_TYPES[type];
    const Icon = config.icon;
    const typeDocs = allDocs.filter((doc) => doc.type === type);

    return (
      <div key={type} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <h4 className="font-medium">{config.label}</h4>
            {typeDocs.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({typeDocs.length})
              </span>
            )}
          </div>
          <label htmlFor={`upload-${type}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`upload-${type}`)?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
            <input
              id={`upload-${type}`}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFileSelect(type, e.target.files)}
            />
          </label>
        </div>

        {/* Liste des fichiers */}
        {typeDocs.length > 0 && (
          <div className="space-y-2">
            {typeDocs.map((doc) => (
              <Card key={doc.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                        title="Télécharger le document"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Zone de drag & drop */}
        {typeDocs.length === 0 && (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Icon className={`h-8 w-8 mx-auto mb-2 ${config.color}`} />
            <p className="text-sm text-muted-foreground mb-2">
              Aucun document ajouté
            </p>
            <label htmlFor={`upload-${type}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`upload-${type}`)?.click()}
              >
                Sélectionner des fichiers
              </Button>
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Ajoutez les documents juridiques et techniques du bien (PDF, images, Word)
      </div>

      {Object.keys(DOCUMENT_TYPES).map((type) =>
        renderUploadSection(type as keyof typeof DOCUMENT_TYPES)
      )}

      {allDocs.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium">
            Total : {allDocs.length} document{allDocs.length > 1 ? 's' : ''}
            {' '}
            ({formatFileSize(allDocs.reduce((sum, doc) => sum + doc.size, 0))})
          </p>
        </div>
      )}
    </div>
  );
}
