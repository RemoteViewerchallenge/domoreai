
export const nebulaTool = {
    name: 'nebula',
    description: 'A layout engine tool for manipulating the Nebula UI tree. Use this to add, update, move, or delete nodes in the UI.',
    input_schema: {
        type: 'object',
        properties: {
            action: { 
                type: 'string', 
                enum: ['addNode', 'updateNode', 'moveNode', 'deleteNode', 'ingest', 'setTheme'],
                description: 'The operation to perform on the layout.'
            },
            parentId: { 
                type: 'string',
                description: 'The ID of the parent node (required for addNode and ingest).'
            },
            nodeId: {
                type: 'string',
                description: 'The ID of the node to manipulate (required for updateNode, moveNode, deleteNode).'
            },
            node: {
                type: 'object',
                description: 'The node definition (required for addNode). Should include type, props, style, layout, bindings, and actions.',
                properties: {
                    type: { type: 'string', enum: ['Box', 'Text', 'Button', 'Card', 'Image', 'Input', 'Icon'] },
                    props: { type: 'object' },
                    style: { type: 'object' },
                    layout: { type: 'object' },
                    bindings: { 
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                propName: { type: 'string' },
                                sourcePath: { type: 'string' }
                            }
                        }
                    },
                    actions: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                trigger: { type: 'string', enum: ['onClick', 'onSubmit'] },
                                type: { type: 'string', enum: ['navigate', 'mutation', 'toast'] },
                                payload: { type: 'object' }
                            }
                        }
                    },
                    meta: { type: 'object' }
                }
            },
            rawJsx: {
              type: 'string',
              description: 'The raw JSX string to ingest (required for ingest).'
            },
            theme: {
              type: 'object',
              description: 'The theme configuration (required for setTheme).',
              properties: {
                primary: { type: 'string' },
                radius: { type: 'number' },
                font: { type: 'string' }
              }
            },
            update: {
                type: 'object',
                description: 'The properties to update (required for updateNode).'
            },
            targetParentId: {
                type: 'string',
                description: 'The new parent ID (required for moveNode).'
            },
            index: {
                type: 'number',
                description: 'The index to insert/move the node to (required for moveNode).'
            }
        },
        required: ['action']
    },
    handler: async (args: unknown) => {
        const typedArgs = args as Record<string, any>;
        // Return structured action for the UI to consume
        return {
            status: 'success',
            ui_action: {
                tool: 'nebula',
                ...typedArgs
            },
            message: `Nebula operation '${typedArgs.action}' queued for UI execution.`
        };
    }
};
