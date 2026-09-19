import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Upload,
  Download,
  Trash2,
  FileText,
  FileCode,
  FileArchive,
  FileCheck,
  User as UserIcon,
} from 'lucide-react';
import { Material, DepartmentMemberContext } from '../types';

import { getFileUrl } from '../utils/file';

interface MaterialsViewProps {
  materials: Material[];
  activeDept: DepartmentMemberContext;
  isTutorOrAdmin: boolean;
  onOpenUploadModal: () => void;
  onDeleteMaterial: (id: string) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  materials,
  activeDept,
  isTutorOrAdmin,
  onOpenUploadModal,
  onDeleteMaterial,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMaterials = materials.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.fileName.toLowerCase().includes(q)
    );
  });

  const getFileIcon = (mime: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || mime.includes('pdf')) return <FileText size={24} color="#ef4444" />;
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext || '')) return <FileArchive size={24} color="#f59e0b" />;
    if (['ts', 'js', 'py', 'html', 'css', 'json', 'sql'].includes(ext || ''))
      return <FileCode size={24} color="#10b981" />;
    return <FileCheck size={24} color="#0ea5e9" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="view-pretitle">CURATED CURRICULUM</div>
          <h1 className="view-title">
            {isTutorOrAdmin ? 'Learning Materials & File Sharing' : 'Learning Materials'}
          </h1>
          <p className="view-subtitle">
            {isTutorOrAdmin
              ? `Upload and distribute curriculum study materials, laboratory briefs, and resources for ${activeDept.name}.`
              : `Access verified learning materials, slide decks, and reference guides uploaded by your ${activeDept.name} tutors.`}
          </p>
        </div>

        {isTutorOrAdmin && (
          <button className="btn-primary" onClick={onOpenUploadModal}>
            <Upload size={16} />
            <span>Upload Learning Material</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search materials by title, description, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="materials-count-badge">
          <span>{filteredMaterials.length} Materials Available</span>
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="empty-state-card">
          <BookOpen size={48} className="text-muted" />
          <h3>No learning materials found</h3>
          <p className="text-muted">
            {searchQuery
              ? `No materials match your search "${searchQuery}".`
              : isTutorOrAdmin
              ? 'Click below to share the first learning material for your students.'
              : 'Your department tutors have not uploaded any study materials yet.'}
          </p>
          {isTutorOrAdmin && (
            <button className="btn-primary mt-4" onClick={onOpenUploadModal}>
              <Upload size={16} />
              <span>Upload First Material</span>
            </button>
          )}
        </div>
      ) : (
        <div className="materials-grid">
          {filteredMaterials.map((item) => (
            <div key={item.id} className="material-card">
              <div className="material-card-top">
                <div className="material-file-icon-box">
                  {getFileIcon(item.fileMimeType, item.fileName)}
                </div>
                <div className="material-file-meta-top">
                  <span className="file-size-pill">{formatSize(item.fileSizeBytes)}</span>
                  <span className="file-date-pill">
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="material-card-content">
                <h3 className="material-card-title">{item.title}</h3>
                {item.description && (
                  <p className="material-card-desc">{item.description}</p>
                )}
                <div className="material-original-filename">
                  <span>File: </span>
                  <code>{item.fileName}</code>
                </div>
              </div>

              <div className="material-card-footer">
                <div className="material-uploader-chip">
                  <UserIcon size={12} />
                  <span>
                    {item.uploader?.firstName} {item.uploader?.lastName}
                  </span>
                </div>

                <div className="material-actions">
                  <a
                    href={getFileUrl(item.fileUrl)}
                    download={item.fileName}
                    className="btn-primary btn-sm"
                    title={`Download ${item.fileName}`}
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </a>

                  {isTutorOrAdmin && (
                    <button
                      className="btn-icon-danger"
                      onClick={() => onDeleteMaterial(item.id)}
                      title="Delete Material"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
