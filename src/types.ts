/**
 * SimpleMind data type definitions
 */

export type MindMapLayout =
    | 'free-form'
    | 'horizontal'
    | 'vertical'
    | 'list'
    | 'top-down'
    | 'linear-down'
    | 'radial'
    | 'matrix';

export interface Topic {
    id: string;
    text: string;
    note?: string;
    children?: Topic[];
    position?: {
        x: number;
        y: number;
    };
    // New attributes
    layout?: MindMapLayout;
    date?: string;      // Format: DD-MM-YYYY
    checkbox?: boolean;
    link?: string;      // URL
    style?: {
        color?: string;
        shape?: string;
    };
}

export interface MindMapMeta {
    guid: string;
    title: string;
    style?: string;
    autoNumbering?: boolean;
}

export interface MindMap {
    meta: MindMapMeta;
    rootTopic: Topic;
}

export interface SimpleMindDocument {
    version: string;
    generator: string;
    mindmaps: MindMap[];
}
