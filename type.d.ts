import { ImportGlobFunction } from 'vite/types/importGlob';

interface ImportMeta {
  /**
   * use custom glob default import
   */
  globDefault: ImportGlobFunction
}
