#!/usr/bin/env node

/**
 * SimpleMind MCP Server
 * Allows creating and editing SimpleMind mind maps through conversation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fileManager from './file-manager.js';

const server = new Server(
    {
        name: 'simplemind-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

/**
 * List available resources (mind maps)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const files = await fileManager.listMindMaps();

    return {
        resources: [
            {
                uri: 'simplemind://mindmaps/list',
                name: 'SimpleMind Mind Maps List',
                description: 'List of all SimpleMind mind maps in iCloud Drive',
                mimeType: 'application/json',
            },
            ...files.map(filename => ({
                uri: `simplemind://mindmap/${filename}`,
                name: filename.replace('.smmx', ''),
                description: `SimpleMind mind map: ${filename}`,
                mimeType: 'application/json',
            })),
        ],
    };
});

/**
 * Read a resource (mind map content)
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === 'simplemind://mindmaps/list') {
        const files = await fileManager.listMindMaps();
        return {
            contents: [
                {
                    uri,
                    mimeType: 'application/json',
                    text: JSON.stringify(files, null, 2),
                },
            ],
        };
    }

    if (uri.startsWith('simplemind://mindmap/')) {
        const filename = uri.replace('simplemind://mindmap/', '');
        const doc = await fileManager.readMindMap(filename);

        if (!doc) {
            throw new Error(`Mind map not found: ${filename}`);
        }

        return {
            contents: [
                {
                    uri,
                    mimeType: 'application/json',
                    text: JSON.stringify(doc, null, 2),
                },
            ],
        };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
});

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'create_mindmap',
                description: 'Create a new SimpleMind mind map',
                inputSchema: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'Title of the new mind map',
                        },
                        layout: {
                            type: 'string',
                            enum: ['free-form', 'horizontal', 'vertical', 'list', 'top-down', 'linear-down', 'radial', 'matrix'],
                            description: 'Layout of the mind map (default: horizontal)',
                        },
                    },
                    required: ['title'],
                },
            },
            {
                name: 'read_mindmap',
                description: 'Read a SimpleMind mind map',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'Filename of the mind map (e.g., "project.smmx")',
                        },
                    },
                    required: ['filename'],
                },
            },
            {
                name: 'add_topic',
                description: 'Add a new topic to a mind map',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'Filename of the mind map',
                        },
                        text: {
                            type: 'string',
                            description: 'Text content of the new topic',
                        },
                        parent_id: {
                            type: 'string',
                            description: 'ID of the parent topic (optional, defaults to root)',
                        },
                        note: {
                            type: 'string',
                            description: 'Note content for the topic (optional)',
                        },
                        layout: {
                            type: 'string',
                            enum: ['free-form', 'horizontal', 'vertical', 'list', 'top-down', 'linear-down', 'radial', 'matrix'],
                            description: 'Layout for this topic and its children',
                        },
                        date: {
                            type: 'string',
                            description: 'Date associated with the topic (DD-MM-YYYY)',
                        },
                        checkbox: {
                            type: 'boolean',
                            description: 'Whether to show a checkbox',
                        },
                        link: {
                            type: 'string',
                            description: 'URL link for the topic',
                        },
                    },
                    required: ['filename', 'text'],
                },
            },
            {
                name: 'update_topic',
                description: 'Update an existing topic in a mind map',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'Filename of the mind map',
                        },
                        topic_id: {
                            type: 'string',
                            description: 'ID of the topic to update',
                        },
                        text: {
                            type: 'string',
                            description: 'New text content (optional)',
                        },
                        note: {
                            type: 'string',
                            description: 'New note content (optional)',
                        },
                        layout: {
                            type: 'string',
                            enum: ['free-form', 'horizontal', 'vertical', 'list', 'top-down', 'linear-down', 'radial', 'matrix'],
                            description: 'New layout (optional)',
                        },
                        date: {
                            type: 'string',
                            description: 'New date (DD-MM-YYYY) (optional)',
                        },
                        checkbox: {
                            type: 'boolean',
                            description: 'New checkbox state (optional)',
                        },
                        link: {
                            type: 'string',
                            description: 'New URL link (optional)',
                        },
                    },
                    required: ['filename', 'topic_id'],
                },
            },
            {
                name: 'delete_topic',
                description: 'Delete a topic from a mind map',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'Filename of the mind map',
                        },
                        topic_id: {
                            type: 'string',
                            description: 'ID of the topic to delete',
                        },
                    },
                    required: ['filename', 'topic_id'],
                },
            },
            {
                name: 'list_mindmaps',
                description: 'List all SimpleMind mind maps in iCloud Drive',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'list_mindmaps': {
                const files = await fileManager.listMindMaps();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(files, null, 2),
                        },
                    ],
                };
            }

            case 'create_mindmap': {
                const { title, layout } = args as { title: string; layout?: any };
                const filename = await fileManager.createMindMap(title, layout);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created mind map: ${filename}`,
                        },
                    ],
                };
            }

            case 'read_mindmap': {
                const { filename } = args as { filename: string };
                const doc = await fileManager.readMindMap(filename);

                if (!doc) {
                    throw new Error(`Mind map not found: ${filename}`);
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(doc, null, 2),
                        },
                    ],
                };
            }

            case 'add_topic': {
                const { filename, text, parent_id, note, layout, date, checkbox, link } = args as {
                    filename: string;
                    text: string;
                    parent_id?: string;
                    note?: string;
                    layout?: any;
                    date?: string;
                    checkbox?: boolean;
                    link?: string;
                };

                const doc = await fileManager.readMindMap(filename);
                if (!doc) {
                    throw new Error(`Mind map not found: ${filename}`);
                }

                const mindmap = doc.mindmaps[0];
                const newTopic = fileManager.addTopicToParent(
                    mindmap.rootTopic,
                    text,
                    parent_id,
                    note,
                    layout,
                    date,
                    checkbox,
                    link
                );

                await fileManager.writeMindMap(filename, doc);

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Added topic "${text}" with ID: ${newTopic.id}`,
                        },
                    ],
                };
            }

            case 'update_topic': {
                const { filename, topic_id, text, note, layout, date, checkbox, link } = args as {
                    filename: string;
                    topic_id: string;
                    text?: string;
                    note?: string;
                    layout?: any;
                    date?: string;
                    checkbox?: boolean;
                    link?: string;
                };

                const doc = await fileManager.readMindMap(filename);
                if (!doc) {
                    throw new Error(`Mind map not found: ${filename}`);
                }

                const mindmap = doc.mindmaps[0];
                const success = fileManager.updateTopic(
                    mindmap.rootTopic,
                    topic_id,
                    text,
                    note,
                    layout,
                    date,
                    checkbox,
                    link
                );

                if (!success) {
                    throw new Error(`Topic not found: ${topic_id}`);
                }

                await fileManager.writeMindMap(filename, doc);

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Updated topic ${topic_id}`,
                        },
                    ],
                };
            }

            case 'delete_topic': {
                const { filename, topic_id } = args as {
                    filename: string;
                    topic_id: string;
                };

                const doc = await fileManager.readMindMap(filename);
                if (!doc) {
                    throw new Error(`Mind map not found: ${filename}`);
                }

                const mindmap = doc.mindmaps[0];
                const success = fileManager.deleteTopic(mindmap.rootTopic, topic_id);

                if (!success) {
                    throw new Error(`Topic not found: ${topic_id}`);
                }

                await fileManager.writeMindMap(filename, doc);

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Deleted topic ${topic_id}`,
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});

/**
 * Start the server
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('SimpleMind MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
