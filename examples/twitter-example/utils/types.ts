import { GameFunction } from '@virtuals-protocol/game';

// Define the GameFunctionArg type since it's not exported
interface GameFunctionArg {
    name: string;
    description: string;
}

// Helper function to convert readonly array to mutable array
export function toMutableArgs<T extends readonly GameFunctionArg[]>(args: T): GameFunctionArg[] {
    return [...args];
}

export type { GameFunctionArg }; 