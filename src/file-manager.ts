/**
 * File manager for SimpleMind files in iCloud Drive
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { parseSimpleMindFile, generateSimpleMindXML } from './xml-parser.js';
import { SimpleMindDocument, MindMap, Topic, MindMapLayout } from './types.js';

// Get iCloud path from environment or use default
const ICLOUD_PATH = process.env.SIMPLEMIND_ICLOUD_PATH ||
    path.join(process.env.HOME || '', 'Library/Mobile Documents/iCloud~eu~simplemind/Documents');

/**
 * List all SimpleMind files in iCloud Drive
 */
export async function listMindMaps(): Promise<string[]> {
    try {
        const files = await fs.readdir(ICLOUD_PATH);
        return files
            .filter(f => f.endsWith('.smmx'))
            .map(f => f.normalize('NFC'));
    } catch (error) {
        console.error('Error listing mind maps:', error);
        return [];
    }
}

/**
 * Read a SimpleMind file (.smmx is a ZIP archive)
 */
export async function readMindMap(filename: string): Promise<SimpleMindDocument | null> {
    try {
        // Normalize to NFC for consistency, though macOS filesystem handles NFD.
        // If the file on disk is NFD, accessing it with NFC string works on macOS.
        const normalizedFilename = filename.normalize('NFC');
        const filePath = path.join(ICLOUD_PATH, normalizedFilename);

        // Check if file exists first to give better error
        try {
            await fs.access(filePath);
        } catch {
            // Try NFD if NFC fails (just in case)
            const nfdFilename = filename.normalize('NFD');
            const nfdPath = path.join(ICLOUD_PATH, nfdFilename);
            try {
                await fs.access(nfdPath);
                // If NFD exists, use it
                const zip = new AdmZip(nfdPath);
                const xmlEntry = zip.getEntry('document/mindmap.xml');
                if (!xmlEntry) throw new Error('mindmap.xml not found in archive');
                const content = xmlEntry.getData().toString('utf-8');
                return parseSimpleMindFile(content);
            } catch {
                throw new Error(`File not found: ${filename}`);
            }
        }

        const zip = new AdmZip(filePath);
        const xmlEntry = zip.getEntry('document/mindmap.xml');

        if (!xmlEntry) {
            throw new Error('mindmap.xml not found in archive');
        }

        const content = xmlEntry.getData().toString('utf-8');
        return parseSimpleMindFile(content);
    } catch (error) {
        console.error(`Error reading mind map ${filename}:`, error);
        return null;
    }
}

/**
 * Write a SimpleMind file (.smmx is a ZIP archive)
 */
export async function writeMindMap(filename: string, doc: SimpleMindDocument): Promise<boolean> {
    try {
        const filePath = path.join(ICLOUD_PATH, filename);
        const xmlContent = generateSimpleMindXML(doc);

        const zip = new AdmZip();
        zip.addFile('document/mindmap.xml', Buffer.from(xmlContent, 'utf-8'));
        zip.writeZip(filePath);

        return true;
    } catch (error) {
        console.error(`Error writing mind map ${filename}:`, error);
        return false;
    }
}

/**
 * Create a new mind map
 */
export async function createMindMap(title: string, layout: MindMapLayout = 'horizontal'): Promise<string> {
    const filename = `${sanitizeFilename(title)}.smmx`;

    const doc: SimpleMindDocument = {
        version: '33',
        generator: 'SimpleMind MCP Server',
        mindmaps: [
            {
                meta: {
                    guid: generateGuid(),
                    title,
                },
                rootTopic: {
                    id: generateGuid(),
                    text: title,
                    layout,
                },
            },
        ],
    };

    await writeMindMap(filename, doc);
    return filename;
}

/**
 * Find a topic by ID in the topic tree
 */
export function findTopicById(topic: Topic, id: string): Topic | null {
    if (topic.id === id) {
        return topic;
    }

    if (topic.children) {
        for (const child of topic.children) {
            const found = findTopicById(child, id);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Add a topic to a parent (or as root child if no parent specified)
 */
export function addTopicToParent(
    rootTopic: Topic,
    text: string,
    parentId?: string,
    note?: string,
    layout?: MindMapLayout,
    date?: string,
    checkbox?: boolean,
    link?: string
): Topic {
    const newTopic: Topic = {
        id: generateGuid(),
        text,
        ...(note && { note }),
        ...(layout && { layout }),
        ...(date && { date }),
        ...(checkbox !== undefined && { checkbox }),
        ...(link && { link }),
    };

    if (!parentId) {
        // Add as child of root
        if (!rootTopic.children) {
            rootTopic.children = [];
        }
        rootTopic.children.push(newTopic);
    } else {
        const parent = findTopicById(rootTopic, parentId);
        if (parent) {
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(newTopic);
        } else {
            throw new Error(`Parent topic with ID ${parentId} not found`);
        }
    }

    return newTopic;
}

/**
 * Update a topic's text or note
 */
export function updateTopic(
    rootTopic: Topic,
    topicId: string,
    text?: string,
    note?: string,
    layout?: MindMapLayout,
    date?: string,
    checkbox?: boolean,
    link?: string
): boolean {
    const topic = findTopicById(rootTopic, topicId);
    if (!topic) {
        return false;
    }

    if (text !== undefined) topic.text = text;
    if (note !== undefined) topic.note = note;
    if (layout !== undefined) topic.layout = layout;
    if (date !== undefined) topic.date = date;
    if (checkbox !== undefined) topic.checkbox = checkbox;
    if (link !== undefined) topic.link = link;

    return true;
}

/**
 * Delete a topic by ID
 */
export function deleteTopic(rootTopic: Topic, topicId: string): boolean {
    if (rootTopic.id === topicId) {
        throw new Error('Cannot delete root topic');
    }

    function deleteFromChildren(parent: Topic): boolean {
        if (!parent.children) return false;

        const index = parent.children.findIndex(c => c.id === topicId);
        if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
        }

        for (const child of parent.children) {
            if (deleteFromChildren(child)) {
                return true;
            }
        }

        return false;
    }

    return deleteFromChildren(rootTopic);
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name: string): string {
    return name
        .replace(/[^a-z0-9가-힣\s-]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
}

/**
 * Generate a simple GUID
 */
function generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
