export declare function generateQuantumContent(context: {
    mood: string;
    style: string;
    recentPatterns: string[];
}, contentType: 'tweet' | 'reply', apiKey: string): Promise<string>;
