export type LayoutKind = 'fullBleedMedia' | 'splitMedia' | 'dataSplit' | 'keywordOnly';

export type MediaType = 'image' | 'video';

export interface MediaSpec {
  type: MediaType;
  query: string;
  filename: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  pick?: 'first' | 'random' | number;
  perPage?: number;
  focal?: 'center' | 'left' | 'right';
}

export type SideContent =
  | { kind: 'bullets'; payload: { items: string[] } }
  | { kind: 'stat'; payload: { value: string; unit?: string; label: string } }
  | { kind: 'chart'; payload: { bars: Array<{ label: string; value: number }>; max?: number } }
  | { kind: 'quote'; payload: { text: string; author?: string } };

export interface ScenePlanParagraph {
  id: string;
  layout: LayoutKind;
  media: MediaSpec;
  eyebrow?: string;
  headline?: string;
  keywords?: string[];
  sideContent?: SideContent;
  accentColor?: string;
}

export interface ScenePlan {
  version?: number;
  projectId?: string;
  paragraphs: ScenePlanParagraph[];
}
