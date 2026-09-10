import type { Ratio } from "./placements";

export interface FormatkollProject {
  id: string;
  slug: string;
  title: string;
  client_name: string;
  caption: string;
  /** Egen text per placerings-id. Saknad nyckel betyder att kanalen ärver
   *  den delade `caption`. */
  captions: Record<string, string>;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  archived_at: string | null;
}

export interface FormatkollAsset {
  id: string;
  project_id: string;
  ratio: Ratio;
  storage_path: string;
  filename: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
}

export interface FormatkollProjectFull extends FormatkollProject {
  assets: FormatkollAsset[];
}

export interface FormatkollListRow extends FormatkollProject {
  asset_count: number;
}

/** Vad kundvyn behöver. Medvetet mindre än projektraden — inget created_by,
 *  inga id:n, ingen utgångstidpunkt att gissa kring. */
export interface FormatkollPublicView {
  title: string;
  client_name: string;
  caption: string;
  captions: Record<string, string>;
  assets: { ratio: Ratio; url: string; width: number | null; height: number | null }[];
}
