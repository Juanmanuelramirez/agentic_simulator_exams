/**
 * Robustly parses a JSON string from an AI model response.
 * Handles common issues like markdown blocks, preamble/post-amble text,
 * and unescaped control characters (newlines) within string literals.
 */
export function robustParseJson<T>(rawText: string): T {
    // 1. Remove markdown code blocks if present
    let cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();

    // 2. Find the boundaries of the JSON object or array
    const start = cleaned.search(/\{|\[/);
    let bracketCounter = 0;
    let end = -1;
    let inString = false;
    let escape = false;

    if (start === -1) {
        throw new Error("No JSON object or array found in the response.");
    }

    const openChar = cleaned[start];
    const closeChar = openChar === '{' ? '}' : ']';

    for (let i = start; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === openChar) bracketCounter++;
            else if (char === closeChar) {
                bracketCounter--;
                if (bracketCounter === 0) {
                    end = i;
                    break;
                }
            }
        }
    }

    if (end === -1) {
        throw new Error("Could not find matching closing bracket for JSON.");
    }

    let jsonStr = cleaned.substring(start, end + 1);

    // 3. Sanitize string literals: Replace literal newlines/tabs with escaped versions
    // This part is the most common cause of "Bad control character"
    let sanitizedJson = "";
    inString = false;
    escape = false;

    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];

        if (escape) {
            sanitizedJson += char;
            escape = false;
            continue;
        }

        if (char === '\\') {
            sanitizedJson += char;
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            sanitizedJson += char;
            continue;
        }

        if (inString) {
            // Check for control characters (0-31 in ASCII)
            const code = char.charCodeAt(0);
            if (code < 32) {
                if (char === '\n') sanitizedJson += '\\n';
                else if (char === '\r') sanitizedJson += '\\r';
                else if (char === '\t') sanitizedJson += '\\t';
                else {
                    // Ignore other control characters or escape them as \uXXXX
                    sanitizedJson += '\\u' + code.toString(16).padStart(4, '0');
                }
            } else {
                sanitizedJson += char;
            }
        } else {
            sanitizedJson += char;
        }
    }

    try {
        return JSON.parse(sanitizedJson) as T;
    } catch (error: any) {
        // Attempt repair: fix unescaped quotes inside string values
        // Common pattern: "key": "text with "unescaped quotes" inside"
        try {
            const repaired = repairUnescapedQuotes(sanitizedJson);
            return JSON.parse(repaired) as T;
        } catch (repairError: any) {
            console.error("JSON Parsing failed after sanitation:", error.message);
            console.error("Sanitized string snippet:", sanitizedJson.substring(0, 100) + "...");
            throw new Error(`JSON_PARSE_ERROR: ${error.message}`);
        }
    }
}

/**
 * Attempts to repair JSON with unescaped quotes inside string values.
 * Strategy: Find string boundaries by tracking key-value structure,
 * and escape any quotes that appear inside values unexpectedly.
 */
function repairUnescapedQuotes(json: string): string {
    // Strategy: Replace problematic patterns where quotes appear inside values
    // Pattern: after a colon and opening quote, find content with unescaped inner quotes
    let result = '';
    let i = 0;
    let inString = false;

    while (i < json.length) {
        const char = json[i];

        if (!inString) {
            result += char;
            if (char === '"') {
                inString = true;
            }
        } else {
            // Inside a string
            if (char === '\\') {
                result += char;
                i++;
                if (i < json.length) result += json[i];
            } else if (char === '"') {
                // Check if this quote ends the string or is an unescaped inner quote
                // Look ahead: if next non-whitespace is , or } or ] or : it's a real end
                let lookAhead = i + 1;
                while (lookAhead < json.length && (json[lookAhead] === ' ' || json[lookAhead] === '\n' || json[lookAhead] === '\r' || json[lookAhead] === '\t')) {
                    lookAhead++;
                }
                const nextChar = lookAhead < json.length ? json[lookAhead] : '';
                if (nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':') {
                    // Real end of string
                    result += char;
                    inString = false;
                } else if (nextChar === '"') {
                    // Likely end of one value, start of next key — real end
                    result += char;
                    inString = false;
                } else {
                    // Unescaped inner quote — escape it
                    result += '\\"';
                }
            } else {
                result += char;
            }
        }
        i++;
    }
    return result;
}
