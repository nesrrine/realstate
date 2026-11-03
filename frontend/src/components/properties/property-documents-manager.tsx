'use client';

import { useState } from 'react';
import { FileText, Upload, X, File, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface DocumentFile {
  id: string;
  name: string;
  type: 'title_deed' | 'plan' | 'other';
  size: number;
  url?: string;
  file?: File;
}

interface PropertyDocumentsManagerProps {
  documents?: DocumentFile[];
  onDocumentsChange?: (documents: DocumentFile[]) => void;
}

const DOCUMENT_TYPES = {
  title_deed: { label: 'Titre foncier', icon: FileText, color: 'text-blue-600' },
  plan: { label: 'Plans', icon: File, color: 'text-green-600' },
  other: { label: 'Autres documents', icon: FileText, color: 'text-gray-600' },
};

export function PropertyDocumentsManager({
  documents = [],
  onDocumentsChange,
}: PropertyDocumentsManagerProps) {
  const [localDocuments, setLocalDocuments] = useState<DocumentFile[]>(documents);

  const handleFileSelect = (type: keyof typeof DOCUMENT_TYPES, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDocs: DocumentFile[] = Array.from(files).map((file) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      type,
      size: file.size,
      file,
    }));

    const updated = [...localDocuments, ...newDocs];
    setLocalDocuments(updated);
    onDocumentsChange?.(updated);
  };

  const handleRemoveDocument = (id: string) => {
    const updated = localDocuments.filter((doc) => doc.id !== id);
    setLocalDocuments(updated);
    onDocumentsChange?.(updated);
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
    const typeDocs = localDocuments.filter((doc) => doc.type === type);

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
                        onClick={() => window.open(doc.url, '_blank')}
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

      {localDocuments.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium">
            Total : {localDocuments.length} document{localDocuments.length > 1 ? 's' : ''}
            {' '}
            ({formatFileSize(localDocuments.reduce((sum, doc) => sum + doc.size, 0))})
          </p>
        </div>
      )}
    </div>
  );
}
