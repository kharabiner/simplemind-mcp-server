/**
 * XML parser for SimpleMind .smmx files
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { SimpleMindDocument, MindMap, Topic } from './types.js';

const parserOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
};

const builderOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
};

/**
 * Parse SimpleMind XML file content to structured data
 */
export function parseSimpleMindFile(xmlContent: string): SimpleMindDocument {
    const parser = new XMLParser(parserOptions);
    const parsed = parser.parse(xmlContent);

    const root = parsed['simplemind-mindmaps'];

    return {
        version: root['@_doc-version'] || '33',
        generator: root['@_generator'] || 'SimpleMind',
        mindmaps: parseMindMaps(root.mindmap),
    };
}

function parseMindMaps(mindmapData: any): MindMap[] {
    const mindmaps = Array.isArray(mindmapData) ? mindmapData : [mindmapData];

    return mindmaps.map((mm) => {
        // Parse flat topic list with parent references
        const topicsList = mm.topics?.topic;
        let rootTopic: Topic;

        if (topicsList) {
            // Convert array to array if single topic
            const topics = Array.isArray(topicsList) ? topicsList : [topicsList];

            // Build topic map
            const topicMap = new Map<string, Topic>();

            // First pass: create all topics
            for (const t of topics) {
                // Handle id=0 correctly (0 is falsy in JS)
                const idVal = t['@_id'];
                const id = String(idVal !== undefined ? idVal : (t['@_guid'] || generateGuid()));

                const topic: Topic = {
                    id: id,
                    text: String(t['@_text'] || t.text || ''),
                };

                if (t.note) {
                    topic.note = t.note;
                }

                // Parse new attributes
                if (t['@_date']) {
                    topic.date = t['@_date'];
                }

                if (String(t['@_checkbox']) === 'true') {
                    topic.checkbox = true;
                }

                if (t.link && t.link['@_urllink']) {
                    topic.link = t.link['@_urllink'];
                }

                if (t.layout && t.layout['@_mode']) {
                    topic.layout = mapXmlToLayout(t.layout['@_mode']);
                }

                topicMap.set(topic.id, topic);
            }

            // Second pass: build hierarchy
            for (const t of topics) {
                const topicId = String(t['@_id']);
                const parentId = t['@_parent'] !== undefined ? String(t['@_parent']) : undefined;

                if (parentId && parentId !== '-1') {
                    const parent = topicMap.get(parentId);
                    const child = topicMap.get(topicId);

                    if (parent && child) {
                        if (!parent.children) {
                            parent.children = [];
                        }
                        parent.children.push(child);
                    }
                }
            }

            // Find root topic (parent === '-1')
            const rootTopicData = topics.find(t => String(t['@_parent']) === '-1');
            if (!rootTopicData) {
                throw new Error('No root topic found in mind map');
            }

            const foundRootTopic = topicMap.get(String(rootTopicData['@_id']));
            if (!foundRootTopic) {
                throw new Error(`Root topic with ID ${rootTopicData['@_id']} not found in topic map`);
            }

            rootTopic = foundRootTopic;
        } else {
            // Fallback to old nested format
            rootTopic = parseTopic(mm.topic);
        }

        return {
            meta: {
                guid: mm.meta?.guid || generateGuid(),
                title: mm.meta?.title || 'Untitled',
                style: mm.meta?.style,
                autoNumbering: mm.meta?.['auto-numbering'] === 'true',
            },
            rootTopic,
        };
    });
}

function parseTopic(topicData: any): Topic {
    if (!topicData) {
        return {
            id: generateGuid(),
            text: 'Central Topic',
        };
    }

    const topic: Topic = {
        id: topicData['@_id'] || generateGuid(),
        text: topicData.text || topicData['#text'] || '',
    };

    if (topicData.note) {
        topic.note = topicData.note;
    }

    if (topicData.topic) {
        const children = Array.isArray(topicData.topic) ? topicData.topic : [topicData.topic];
        topic.children = children.map(parseTopic);
    }

    if (topicData['@_x'] !== undefined && topicData['@_y'] !== undefined) {
        topic.position = {
            x: parseFloat(topicData['@_x']),
            y: parseFloat(topicData['@_y']),
        };
    }

    return topic;
}

/**
 * Generate SimpleMind XML from structured data
 */
export function generateSimpleMindXML(doc: SimpleMindDocument): string {
    const builder = new XMLBuilder(builderOptions);

    const xmlObj = {
        '?xml': {
            '@_version': '1.0',
            '@_encoding': 'UTF-8',
        },
        'simplemind-mindmaps': {
            '@_doc-version': doc.version,
            '@_generator': doc.generator,
            '@_gen-version': '1.0',
            mindmap: doc.mindmaps.map(buildMindMap),
        },
    };

    return builder.build(xmlObj);
}

function buildMindMap(mindmap: MindMap): any {
    // Flatten the topic tree into a list with parent references
    const topics: any[] = [];
    // Helper to flatten topics recursively
    function flattenTopic(topic: Topic, parentId: string | null) {
        const topicObj: any = {
            '@_id': topic.id,
            '@_parent': parentId || '-1',
            '@_guid': generateGuid(),
            '@_text': topic.text,
            '@_textfmt': 'plain',
        };

        if (topic.note) {
            topicObj.note = topic.note;
        }

        // Handle new attributes
        if (topic.date) {
            topicObj['@_date'] = topic.date;
        }

        if (topic.checkbox) {
            topicObj['@_checkbox'] = 'true';
            topicObj['@_progress'] = '0'; // Default progress for unchecked
            topicObj['@_checkbox-mode'] = 'checkbox';
        }

        if (topic.link) {
            topicObj.link = {
                '@_urllink': topic.link
            };
        }

        if (topic.layout) {
            const layoutMode = mapLayoutToXml(topic.layout);
            topicObj.layout = {
                '@_mode': layoutMode,
                '@_direction': 'manual',
                '@_flow': 'default'
            };
        }

        topics.push(topicObj);

        // Process children
        if (topic.children) {
            for (const child of topic.children) {
                flattenTopic(child, topic.id);
            }
        }
    }

    // Start with root topic
    flattenTopic(mindmap.rootTopic, null);

    return {
        meta: {
            guid: mindmap.meta.guid,
            title: mindmap.meta.title,
            ...(mindmap.meta.style && { style: mindmap.meta.style }),
            ...(mindmap.meta.autoNumbering !== undefined && {
                'auto-numbering': mindmap.meta.autoNumbering.toString(),
            }),
        },
        topics: {
            topic: topics,
        },
        relations: {},
        'node-groups': {},
    };
}

function buildTopic(topic: Topic): any {
    const topicObj: any = {
        '@_id': topic.id,
        text: topic.text,
    };

    if (topic.note) {
        topicObj.note = topic.note;
    }

    if (topic.position) {
        topicObj['@_x'] = topic.position.x;
        topicObj['@_y'] = topic.position.y;
    }

    if (topic.children && topic.children.length > 0) {
        topicObj.topic = topic.children.map(buildTopic);
    }

    return topicObj;
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

function mapLayoutToXml(layout: string): string {
    switch (layout) {
        case 'horizontal': return 'strict-horizontal';
        case 'vertical': return 'strict-vertical'; // Assumption, verify if possible
        case 'list': return 'list';
        case 'top-down': return 'top-down';
        case 'linear-down': return 'linear-down'; // Assumption
        case 'radial': return 'radial'; // Assumption
        case 'matrix': return 'matrix'; // Assumption
        default: return 'free-form';
    }
}

function mapXmlToLayout(xmlMode: string): any {
    switch (xmlMode) {
        case 'strict-horizontal': return 'horizontal';
        case 'strict-vertical': return 'vertical';
        case 'list': return 'list';
        case 'top-down': return 'top-down';
        default: return 'free-form';
    }
}
