import readline from "readline";

export function hasKeywords(text: string, keywords: string[], allowAny: boolean = false): boolean {
    // Convert the text and array elements to lowercase for case-insensitive comparison
    const lowercaseText = text.toLowerCase();
    const lowercaseArray = keywords.map(element => element.toLowerCase());

    // Check if all elements in the array appear in the lowercase text
    if (!allowAny) {
        return lowercaseArray.every(element => lowercaseText.includes(element));
    } else {
        return lowercaseArray.some(element => lowercaseText.includes(element));
    }
}

export function removeNullValues<T>(arr: (T | null)[]): T[] {
    return arr.filter((item): item is T => item !== null);
}

export function questionAsync(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(query, (userInput) => {
            rl.close();
            resolve(userInput);
        });
    });
}
