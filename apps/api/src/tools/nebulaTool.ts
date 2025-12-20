
export const nebulaTool = {
    name: 'nebula',
    description: `A layout engine tool for manipulating the Nebula UI tree. 
    
    NEBULA CODE MODE v2.0:
    When writing TypeScript to manipulate the UI, use the global 'nebula' and 'ast' objects.

    IMPORTANT: You MUST use an existing parentId. The root ID is often dynamic, not always 'root'.
    
    1. addNode(parentId, node): Adds a node and RETURNS a unique nodeId. ALWAYS capture this ID.
    2. updateNode(nodeId, update): Updates an existing node.
    3. moveNode(nodeId, targetParentId, index): Moves a node.
    4. deleteNode(nodeId): Deletes a node.
    5. ast.parse(jsx): Parses raw JSX into a fragment for ingestion.
    
    Example:
    const cardId = nebula.addNode('root', { type: 'Box', props: { className: 'p-4' } });
    nebula.addNode(cardId, { type: 'Text', props: { children: 'Hello v2.0' } });`,
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
    // eslint-disable-next-line @typescript-eslint/require-await
    handler: async (args: unknown) => {
        const typedArgs = args as Record<string, unknown>;
        // Return structured action for the UI to consume
        return {
            status: 'success',
            ui_action: {
                tool: 'nebula',
                ...typedArgs
            },
            message: `Nebula operation '${String(typedArgs.action)}' queued for UI execution.`
        };
    }
};
