
import { z } from 'zod';

export const nebulaTool = {
    name: 'nebula',
    description: 'A layout engine tool for manipulating the Nebula UI tree. Use this to add, update, move, or delete nodes in the UI.',
    input_schema: {
        type: 'object',
        properties: {
            action: { 
                type: 'string', 
                enum: ['addNode', 'updateNode', 'moveNode', 'deleteNode'],
                description: 'The operation to perform on the layout.'
            },
            parentId: { 
                type: 'string',
                description: 'The ID of the parent node (required for addNode).'
            },
            nodeId: {
                type: 'string',
                description: 'The ID of the node to manipulate (required for updateNode, moveNode, deleteNode).'
            },
            node: {
                type: 'object',
                description: 'The node definition (required for addNode). Should include type, props, style, layout.',
                properties: {
                    type: { type: 'string' },
                    props: { type: 'object' },
                    style: { type: 'object' },
                    layout: { type: 'object' },
                    meta: { type: 'object' }
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
    handler: async (args: any) => {
        // Since the UI state is client-side, the server-side tool acts as a validator/relay.
        // In a real implementation, this might push an event to the client via WebSocket.
        // For now, we return a success message indicating the intent was captured.
        return {
            status: 'success',
            message: `Nebula operation '${args.action}' received. Ensure this is executed in the client context if in simulation mode.`
        };
    }
};
