/**
 * @fileoverview BracketProcessor module for processing text with brackets
 *
 * @module modules/text/bracket-processor
 */

/**
 * @class BracketProcessor
 * @description Class for processing text with brackets
 */
export class BracketProcessor {
    /**
     * @private
     * @type {string} Log prefix
     * @type {boolean} Whether to enable debug mode
     * @type {Object} Map of closing brackets to their opening brackets
     */
    static #LOG_PREFIX = "[BracketProcessor";
    static #DEBUG = false;
    static #BRACKET_PAIRS = {
        ")": "(",
        "）": "（",
        "]": "[",
        "］": "［",
        "}": "{",
        "｝": "｛",
        "》": "《",
        "」": "「",
        "』": "『",
        "】": "【",
        "〕": "〔",
        "〗": "〖",
        "〙": "〘",
        "〛": "〚",
        "﹂": "﹁",
        "﹄": "﹃",
    };

    /**
     * Enable debug mode
     */
    static enableDebug() {
        this.#DEBUG = true;
    }

    /**
     * Disable debug mode
     */
    static disableDebug() {
        this.#DEBUG = false;
    }

    /**
     * Logs debug information with line numbers and context
     * @private
     * @param {string} message - Message to log
     * @param {Object} [data=null] - Additional data to include in the log
     * @param {Error} [error=null] - Error object if logging an error
     * @description
     * Enhanced logging features:
     * - Includes line numbers from call stack
     * - Formats error messages with context
     * - Supports object inspection for debugging
     * - Conditional output based on debug mode
     */
    static #log(message, data = null, error = null) {
        if (!BracketProcessor.#DEBUG) return;

        const stack = new Error().stack;
        const callerLine = stack.split("\n")[2];
        const match = callerLine.match(/:(\d+):\d+\)?$/);
        const lineNumber = match ? match[1] : "unknown";
        const prefix = `${BracketProcessor.#LOG_PREFIX}: ${lineNumber}]`;

        if (error) {
            console.error(`${prefix} ERROR - ${message}:`, error);
            if (data) console.error(`${prefix} Context:`, data);
            console.error(`${prefix} Stack:`, error.stack);
        } else if (data) {
            console.log(`${prefix} ${message}:`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    /**
     * Get all bracket pairs mapping
     * @returns {Object} Map of closing brackets to their opening brackets
     * @private
     */
    static #getBracketPairs() {
        return this.#BRACKET_PAIRS;
    }

    /**
     * Check if a character is an opening bracket
     * @param {string} char - Character to check
     * @returns {boolean} Whether the character is an opening bracket
     * @private
     */
    static #isOpenBracket(char) {
        return Object.values(this.#getBracketPairs()).includes(char);
    }

    /**
     * Check if a character is a closing bracket
     * @param {string} char - Character to check
     * @returns {boolean} Whether the character is a closing bracket
     * @private
     */
    static #isCloseBracket(char) {
        return Object.keys(this.#getBracketPairs()).includes(char);
    }

    /**
     * Check if a character is a closing bracket
     * @param {string} char - Character to check
     * @returns {boolean} Whether the character is a closing bracket
     * @private
     */
    static #isClosingBracket(char) {
        return char in this.#getBracketPairs();
    }

    /**
     * Get the corresponding opening bracket for a closing bracket
     * @param {string} closeBracket - Closing bracket
     * @returns {string|null} Corresponding opening bracket or null if not a closing bracket
     * @private
     */
    static #getOpeningBracket(closeBracket) {
        return this.#getBracketPairs()[closeBracket] || null;
    }

    /**
     * Check if a pair of brackets are matching
     * @param {string} open - The opening bracket.
     * @param {string} close - The closing bracket.
     * @returns {boolean} Whether the pair of brackets are matching.
     * @private
     */
    static #isMatchingPair(open, close) {
        const pairs = this.#getBracketPairs();
        return pairs[close] === open;
    }

    /**
     * Check if a character is any type of bracket (opening or closing)
     * @param {string} char - Character to check
     * @returns {boolean} Whether the character is a bracket
     * @private
     */
    static #isBracket(char) {
        return this.#isClosingBracket(char) || Object.values(this.#getBracketPairs()).includes(char);
    }

    /**
     * Get a regex to match all brackets
     * @returns {RegExp} Regex to match all brackets
     * @private
     */
    static #getBracketRegex() {
        const pairs = this.#getBracketPairs();
        const openBrackets = Object.values(pairs);
        const closeBrackets = Object.keys(pairs);

        // Escape special characters and merge all brackets
        const allBrackets = [...openBrackets, ...closeBrackets]
            .map((bracket) => bracket.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("");

        // Create a regex to match all brackets
        return new RegExp(`[^${allBrackets}]`, "g");
    }

    /**
     * Check if a line contains only punctuation and whitespace
     * @param {string} line - Line to check
     * @returns {boolean} Whether the line contains only punctuation and whitespace
     * @private
     */
    static #isPunctuationOnly(line) {
        if (!line) return false;
        const punctuationRegex = /^[\p{P}\p{S}\s]+$/u;
        return punctuationRegex.test(line);
    }

    /**
     * Checks if brackets in text are balanced
     * Credit: https://stackoverflow.com/questions/14334740/missing-parentheses-with-regex
     * @param {string} text - Input text to check
     * @returns {[boolean, string, number]} Returns array containing:
     * - boolean: Whether brackets are balanced
     * - string: Unmatched bracket if any
     * - number: Position of unmatched bracket if any
     * @private
     *
     * Example:
     * "(text)" → [true, "", -1]
     * "(text" → [false, "(", 0]
     */
    static #areBracketsBalanced(text) {
        // Only keep bracket characters
        const brackets = text.replace(this.#getBracketRegex(), "");

        // Record the last position of each opening bracket
        const openBracketPositions = new Map();
        // Record the position of each closing bracket
        const closeBracketPositions = new Map();

        // First pass: Record the positions of all brackets
        for (let i = 0; i < brackets.length; i++) {
            const char = brackets[i];
            if (this.#isClosingBracket(char)) {
                // Closing bracket
                closeBracketPositions.set(i, char);
            } else {
                // Opening bracket
                openBracketPositions.set(i, char);
            }
        }

        // Remove all matched bracket pairs
        for (const [closePos, closeBracket] of closeBracketPositions) {
            const openBracket = this.#getOpeningBracket(closeBracket);
            this.#log("Looking for match for closing bracket", { closeBracket, closePos });
            this.#log("Need to find opening bracket", { openBracket });
            this.#log("Current openBracketPositions", { openBracketPositions });

            // Find the nearest unmatched corresponding opening bracket
            let matchFound = false;
            let lastOpenPos = -1;

            for (const [openPos, currentOpenBracket] of openBracketPositions) {
                this.#log("Checking open bracket", { currentOpenBracket, openPos });
                if (openPos < closePos && this.#isMatchingPair(currentOpenBracket, closeBracket)) {
                    lastOpenPos = openPos;
                    matchFound = true;
                    this.#log("Found match!");
                    break;
                }
            }

            if (matchFound) {
                this.#log("Removing matched pair", { openBracket, closeBracket });
                openBracketPositions.delete(lastOpenPos);
                closeBracketPositions.delete(closePos);
            } else {
                this.#log("No match found for closing bracket", { closeBracket });
            }
        }

        // If there are unmatched opening brackets, return the last one
        if (openBracketPositions.size > 0) {
            const positions = Array.from(openBracketPositions.keys());
            const lastPos = Math.max(...positions);
            // Find the position of this bracket in the original string
            const bracketChar = openBracketPositions.get(lastPos);
            const origIndex = text.indexOf(bracketChar, this.#getBracketPosition(text, lastPos));
            return [false, bracketChar, origIndex];
        }

        // If there are unmatched closing brackets, return the first one
        if (closeBracketPositions.size > 0) {
            const positions = Array.from(closeBracketPositions.keys());
            const firstPos = Math.min(...positions);
            // Find the position of this bracket in the original string
            const bracketChar = closeBracketPositions.get(firstPos);
            const origIndex = text.indexOf(bracketChar, this.#getBracketPosition(text, firstPos));
            return [false, bracketChar, origIndex];
        }

        return [true, "", -1];
    }

    /**
     * Gets the original index position of a bracket in text
     * @param {string} text - Original input text
     * @param {number} filteredPos - Position in filtered brackets string
     * @returns {number} Original index of the bracket in text
     * @private
     */
    static #getBracketPosition(text, filteredPos) {
        this.#log("Getting bracket position", { text, filteredPos });

        let bracketCount = 0;
        for (let i = 0; i < text.length; i++) {
            if (this.#isBracket(text[i])) {
                this.#log("Found bracket", {
                    char: text[i],
                    position: i,
                    currentCount: bracketCount,
                });

                if (bracketCount === filteredPos) {
                    this.#log("Found target position", { result: i });
                    return i;
                }
                bracketCount++;
            }
        }

        this.#log("No position found, returning 0");
        return 0;
    }

    /**
     * Finds safe cut position after an unmatched bracket
     * @param {string} text - Input text to process
     * @param {number} unbalancedPos - Position of the unmatched bracket
     * @returns {number} Safe position to cut the text
     * @private
     *
     * Example:
     * "Chapter 1 (text《unclosed)text" → returns position of ")"
     */
    static #findBracketCutPosition(text, unbalancedPos) {
        this.#log("Finding bracket cut position", { text, unbalancedPos });

        // Obtain all opening brackets and their corresponding closing brackets in the range of 0 to unbalancedPos
        const openStack = [];
        let neededClosingBrackets = new Map(); // Use Map to record the number of each closing bracket needed

        this.#log("Scanning before unbalancedPos", { unbalancedPos });
        // First pass: Collect all opening brackets that need to be matched
        for (let i = 0; i < unbalancedPos; i++) {
            const char = text[i];

            if (this.#isBracket(char)) {
                openStack.push(char);
                // Find the corresponding closing bracket for this opening bracket
                for (const [close, open] of Object.entries(this.#getBracketPairs())) {
                    if (open === char) {
                        // Increase the number of this closing bracket needed
                        neededClosingBrackets.set(close, (neededClosingBrackets.get(close) || 0) + 1);
                        this.#log("Added needed closing bracket", { close, char });
                        break;
                    }
                }
            } else if (this.#isClosingBracket(char)) {
                if (openStack.length > 0 && this.#isMatchingPair(openStack[openStack.length - 1], char)) {
                    openStack.pop();
                    // Decrease the number of this closing bracket needed
                    const count = neededClosingBrackets.get(char) || 0;
                    if (count > 1) {
                        neededClosingBrackets.set(char, count - 1);
                    } else {
                        neededClosingBrackets.delete(char);
                    }
                    this.#log("Matched and removed closing bracket", { char });
                }
            }
        }

        this.#log("Final openStack", { openStack });
        this.#log("Final neededClosingBrackets", { neededClosingBrackets });

        // If there are no opening brackets to match, cut at unbalancedPos
        if (openStack.length === 0) {
            return unbalancedPos;
        }

        // Search for all needed closing brackets after unbalancedPos
        let cutPos = unbalancedPos;
        this.#log("Searching for closing brackets after pos", { unbalancedPos });
        for (let i = unbalancedPos; i < text.length; i++) {
            const char = text[i];
            this.#log("Checking char", { char, i });
            if (neededClosingBrackets.has(char)) {
                cutPos = i;
                this.#log("Found needed closing bracket", { char, cutPos });
                const count = neededClosingBrackets.get(char);
                if (count > 1) {
                    neededClosingBrackets.set(char, count - 1);
                } else {
                    neededClosingBrackets.delete(char);
                }
                if (neededClosingBrackets.size === 0) {
                    break;
                }
            }
        }

        return cutPos;
    }

    /**
     * Recursively removes outermost balanced bracket pairs from text
     * @param {string} text - Input text to process
     * @returns {string} Text with all outermost balanced bracket pairs removed
     * @private
     *
     * Example:
     * "(Chapter 1)" → "Chapter 1"
     * "(((())))" → ""
     * "（text）" → "text"
     * "（a（b）c）" → "a（b）c"
     * "text（）" → "text"
     * "（a）（b）" → "（a）（b）"
     */
    static #stripBalancedBrackets(text) {
        this.#log("Starting to strip balanced brackets", { text });

        // Handle empty text
        if (!text || text.length === 0) return "";

        // Handle short text
        if (text.length <= 2) {
            const firstChar = text[0];
            const lastChar = text[text.length - 1];
            if (this.#isMatchingPair(firstChar, lastChar)) {
                return "";
            }
            return text;
        }

        let processedText = text;
        let iterationCount = 0;
        const MAX_ITERATIONS = 100;

        // Save original space information
        const spaceInfo = [];
        processedText.split("").forEach((char, index) => {
            if (char === " ") {
                spaceInfo.push(index);
            }
        });

        do {
            const previousText = processedText;
            iterationCount++;

            // Check if brackets are balanced
            const [isBalanced, unbalancedBracket, unbalancedPos] = this.#areBracketsBalanced(processedText);
            this.#log("Balance check", { isBalanced, unbalancedBracket, unbalancedPos });

            // If the text only contains brackets, return an empty string
            if (
                processedText
                    .split("")
                    .every((char) => this.#isOpenBracket(char) || this.#isCloseBracket(char) || char === " ")
            ) {
                // Check if there are unbalanced brackets
                const [isBalanced] = this.#areBracketsBalanced(processedText);
                if (!isBalanced) {
                    const stack = [];
                    const chars = processedText.split("");
                    for (let i = 0; i < chars.length; i++) {
                        const char = chars[i];
                        if (this.#isOpenBracket(char)) {
                            stack.push(char);
                        } else if (this.#isCloseBracket(char)) {
                            if (stack.length > 0 && this.#isMatchingPair(stack[stack.length - 1], char)) {
                                stack.pop();
                            }
                        }
                    }
                    if (stack.length > 0) {
                        processedText = stack[0];
                        break;
                    }
                }
                processedText = "";
                break;
            }

            if (isBalanced) {
                // Check if the first and last characters are a matching pair of brackets
                const firstChar = processedText[0];
                const lastChar = processedText[processedText.length - 1];

                if (this.#isMatchingPair(firstChar, lastChar)) {
                    const innerContent = processedText.slice(1, -1);
                    this.#log("Inner content", { innerContent });

                    if (innerContent.length === 0) {
                        processedText = "";
                    } else if (this.#isPunctuationOnly(innerContent)) {
                        // If the content is all punctuation or special characters, keep the whole content
                        processedText = innerContent;
                        this.#log("After special chars", { processedText });
                        // For logging test case 19
                        if (innerContent === "!@#$%^&*") {
                            this.#log("Case 19 - After assignment", {
                                processedText,
                                length: processedText.length,
                                lastChar: processedText[processedText.length - 1],
                            });
                        }
                    } else {
                        processedText = processedText.slice(1, -1);
                    }

                    this.#log("After bracket removal", { processedText });
                } else {
                    // Remove all empty bracket pairs
                    let newText = processedText;
                    for (const [close, open] of Object.entries(this.#getBracketPairs())) {
                        const escapedOpen = open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                        const escapedClose = close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

                        // Use a stricter whitespace character matching
                        const emptyPattern = new RegExp(`${escapedOpen}[\\s\\t\\n\\r]*${escapedClose}`, "g");

                        // First remove empty bracket pairs
                        newText = newText.replace(emptyPattern, "");
                    }

                    if (newText !== processedText) {
                        processedText = newText;
                        this.#log("Removed empty bracket pairs", { processedText });
                    }

                    // Add a cleanup step at the end to specifically handle newline and tab characters
                    if (processedText.trim() === "") {
                        processedText = "";
                    }
                }
            } else if (unbalancedPos >= 0) {
                // Handle unbalanced brackets
                const stack = [];
                const chars = processedText.split("");
                let content = "";

                // Improve content extraction logic
                for (let i = 0; i < chars.length; i++) {
                    const char = chars[i];
                    if (this.#isOpenBracket(char)) {
                        stack.push({ char, pos: i, content: content });
                        content = "";
                    } else if (this.#isCloseBracket(char)) {
                        if (stack.length > 0 && this.#isMatchingPair(stack[stack.length - 1].char, char)) {
                            const lastOpen = stack.pop();
                            content = lastOpen.content + content;
                        }
                    } else {
                        content += char;
                    }
                }

                if (stack.length > 0) {
                    // If there are unmatched opening brackets, keep the first one
                    processedText = stack[0].char;
                }
                break;
            } else {
                break;
            }

            if (processedText === previousText) {
                break;
            }
        } while (iterationCount < MAX_ITERATIONS);

        if (iterationCount >= MAX_ITERATIONS) {
            this.#log("WARNING: Max iterations reached");
        }

        this.#log("Before space restoration", { processedText });

        // Restore original spaces
        let finalText = processedText;
        spaceInfo.forEach((pos) => {
            if (pos < finalText.length && finalText[pos] !== " ") {
                finalText = finalText.slice(0, pos) + " " + finalText.slice(pos);
            }
        });

        this.#log("After space restoration", { finalText });
        return finalText;
    }

    /**
     * Processes text by removing content after unmatched brackets
     * @param {string} text - Input text to process
     * @returns {string} Processed text with content after unmatched brackets removed
     * @private
     *
     * Example:
     * "Chapter 1 (text《unclosed" → "Chapter 1"
     * "Chapter 1 (text)《unclosed" → "Chapter 1 (text)"
     * "text（a）" → "text（a）"
     * "text（a（b" → "text（a"
     * "text）a（b）" → "text）a（b）"
     */
    static processBracketsAndTrim(text) {
        this.#log("Starting bracket processing", {
            text: text,
            length: text.length,
        });

        // First check if brackets are balanced
        const [isBalanced, unbalancedBracket, unbalancedPos] = this.#areBracketsBalanced(text);

        this.#log("Balance check result", {
            isBalanced,
            unbalancedBracket,
            position: unbalancedPos,
        });

        if (!isBalanced && unbalancedPos !== -1) {
            // Handle unbalanced brackets
            this.#log("Processing unbalanced brackets", {
                bracket: unbalancedBracket,
                position: unbalancedPos,
            });

            // Find the position to cut the text
            const cutPos = this.#findBracketCutPosition(text, unbalancedPos);
            this.#log("Cut position determined", {
                cutPos,
                textBeforeCut: text.slice(0, unbalancedPos),
                textAfterCut: text.slice(cutPos),
            });

            // Process the text by removing the unbalanced section
            const processedStr = text.slice(0, unbalancedPos) + text.slice(cutPos);
            this.#log("Text after cutting unbalanced section", {
                processedStr,
                originalLength: text.length,
                newLength: processedStr.length,
            });

            // Strip any remaining balanced brackets
            const finalText = this.#stripBalancedBrackets(processedStr);
            this.#log("Final result after stripping balanced brackets", {
                result: finalText,
                length: finalText.length,
            });

            return finalText;
        }

        // If brackets are balanced, just strip balanced pairs
        this.#log("Processing balanced text", { text: text });
        const result = this.#stripBalancedBrackets(text);
        this.#log("Final result after stripping balanced brackets", {
            result: result,
            originalLength: text.length,
            finalLength: result.length,
        });
        return result;
    }

    /**
     * Runs unit tests for bracket handling
     * Tests various bracket combinations including:
     * - Basic bracket pairs
     * - Nested brackets
     * - Unmatched brackets
     * - Mixed bracket types
     * - Edge cases
     * @private
     */
    static testBracketHandling() {
        // Enable debug mode
        // this.enableDebug();

        const testCases = [
            // 1. 基本括号对 - Basic bracket pairs
            {
                input: "（）",
                expected: "",
                description: "空括号对应该返回空字符串",
            },
            {
                input: "（这是（第二层）括号）",
                expected: "这是（第二层）括号",
                description: "外层括号应该被移除",
            },
            {
                input: "(这是[第二层]括号)",
                expected: "这是[第二层]括号",
                description: "混合括号类型，外层括号应该被移除",
            },
            {
                input: "第一章（正文）",
                expected: "第一章（正文）",
                description: "文本包裹的括号应该保持不变",
            },

            // 2. 复杂嵌套 - Complex nesting
            {
                input: "（（（）））",
                expected: "",
                description: "多重嵌套的平衡括号应该全部移除",
            },
            {
                input: "（[{《》}]）",
                expected: "",
                description: "多种类型嵌套的平衡括号应该全部移除",
            },
            {
                input: "（《[()]》）",
                expected: "",
                description: "交错嵌套的平衡括号应该全部移除",
            },
            {
                input: "（第一层（第二层《第三层》）结束）",
                expected: "第一层（第二层《第三层》）结束",
                description: "带文本的多层嵌套，应该移除最外层括号",
            },

            // 3. 未匹配括号 - Unmatched brackets
            {
                input: "（这是(第一层）括号)测试",
                expected: "（这是(第一层）括号)测试",
                description: "交叉未匹配的括号应该保持不变",
            },
            {
                input: "第一章（新人《上山》下山（访客）",
                expected: "第一章（新人《上山》下山）",
                description: "末尾未匹配的括号应该被截断",
            },
            {
                input: "（（（（）））",
                expected: "（",
                description: "不平衡的嵌套括号应该只保留未匹配的开括号",
            },

            // 4. 特殊情况 - Special cases
            {
                input: "（）（）（）",
                expected: "",
                description: "多个空括号对应该全部移除",
            },
            {
                input: "（ ）",
                expected: "",
                description: "含空格的括号对应该被移除",
            },
            {
                input: "（\n）",
                expected: "",
                description: "含换行符的括号对应该被移除",
            },
            {
                input: "（\t）",
                expected: "",
                description: "含制表符的括号对应该被移除",
            },
            {
                input: "（）。",
                expected: "。",
                description: "括号对后的标点应该保留",
            },

            // 5. 混合语言和特殊字符
            {
                input: "Chapter 1 （第一章） [内容]",
                expected: "Chapter 1 （第一章） [内容]",
                description: "中英文混合的括号应该保持不变",
            },
            {
                input: "（English「中文」Mixed）",
                expected: "English「中文」Mixed",
                description: "混合语言嵌套，移除外层括号",
            },
            {
                input: "（!@#$%^&*）",
                expected: "!@#$%^&*",
                description: "特殊字符括号对应该只移除括号",
            },
            {
                input: "（😊🌟🎉）",
                expected: "😊🌟🎉",
                description: "emoji括号对应该只移除括号",
            },

            // 6. 长文本测试
            {
                input: "（这是一个很长的文本（包含了（多层（嵌套）的）括号）组合）",
                expected: "这是一个很长的文本（包含了（多层（嵌套）的）括号）组合",
                description: "长文本多层嵌套，移除最外层括号",
            },
            {
                input: "第一章（这是第一章的内容《这是引用》这是正文（这是注释）结束）第二章",
                expected: "第一章（这是第一章的内容《这是引用》这是正文（这是注释）结束）第二章",
                description: "复杂章节结构应该保持不变",
            },

            // 7. 边界情况
            {
                input: "",
                expected: "",
                description: "空字符串应该返回空字符串",
            },
            {
                input: "没有括号的文本",
                expected: "没有括号的文本",
                description: "无括号文本应该保持不变",
            },
            {
                input: "（",
                expected: "（",
                description: "单个开括号应该保持不变",
            },
            {
                input: "）",
                expected: "）",
                description: "单个闭括号应该保持不变",
            },

            // 8. 混合语言和符号
            {
                input: "（Hello世界!）",
                expected: "Hello世界!",
                description: "中英文混合内容的括号处理",
            },
            {
                input: "（Hello（世界）!）",
                expected: "Hello（世界）!",
                description: "中英文嵌套括号处理",
            },
            {
                input: "Chapter 1（第1章）Page 1",
                expected: "Chapter 1（第1章）Page 1",
                description: "数字和文本混合的括号处理",
            },

            // // 9. 特殊符号组合
            // {
            //     input: "（@#$）（123）（abc）",
            //     expected: "@#$123abc",
            //     description: "连续的特殊符号括号组合",
            // },
            // {
            //     input: "（@#$（123）abc）",
            //     expected: "@#$（123）abc",
            //     description: "嵌套的特殊符号括号组合",
            // },

            // // 10. 空白字符处理
            // {
            //     input: "（\r\n）",
            //     expected: "",
            //     description: "包含回车换行的空括号",
            // },
            // {
            //     input: "（ \n \t）",
            //     expected: "",
            //     description: "混合空白字符的空括号",
            // },
            // {
            //     input: "Text（ \n）Text",
            //     expected: "TextText",
            //     description: "文本中包含空白字符的空括号",
            // },

            // // 11. Unicode字符
            // {
            //     input: "（👨‍👩‍👧‍👦👨‍💻）",
            //     expected: "👨‍👩‍👧‍👦👨‍💻",
            //     description: "复杂Unicode字符的括号处理",
            // },
            // {
            //     input: "（🇨🇳）（🇺🇸）",
            //     expected: "🇨🇳🇺🇸",
            //     description: "国旗emoji的括号处理",
            // },

            // // 12. 极端长度
            // {
            //     input: "（" + "a".repeat(1000) + "）",
            //     expected: "a".repeat(1000),
            //     description: "处理超长文本",
            // },
            // {
            //     input: "（" + "（".repeat(100) + "）".repeat(100) + "）",
            //     expected: "",
            //     description: "处理大量嵌套括号",
            // },

            // // 13. 特殊情况
            // {
            //     input: "（[{（）}]）",
            //     expected: "",
            //     description: "混合类型的不规则嵌套",
            // },
            // {
            //     input: "（(）)",
            //     expected: "（(）)",
            //     description: "交叉嵌套的不同类型括号",
            // },
            // {
            //     input: "（\\）",
            //     expected: "\\",
            //     description: "包含转义字符的括号",
            // },
            // {
            //     input: "（\u0000）",
            //     expected: "\u0000",
            //     description: "包含空字符的括号",
            // },
            // {
            //     input: "（\u200B）",
            //     expected: "",
            //     description: "包含零宽空格的括号",
            // },
            // {
            //     input: "（\u3000）",
            //     expected: "",
            //     description: "包含全角空格的括号",
            // },

            // // 14. 所有支持的括号类型
            // {
            //     input: "（中文圆括号）(English Parentheses)[方括号]【中文方括号】{花括号}《书名号》「引号」『双引号』﹁竖引号﹂﹃双竖引号﹄",
            //     expected: "中文圆括号English Parentheses方括号中文方括号花括号书名号引号双引号竖引号双竖引号",
            //     description: "所有支持的括号类型组合",
            // },

            // // 15. 复杂嵌套场景
            // {
            //     input: "『「【（hello）】」』",
            //     expected: "hello",
            //     description: "多层不同类型括号嵌套",
            // },
            // {
            //     input: "【『「（」『】』",
            //     expected: "【『「（」『】』",
            //     description: "不匹配的多层嵌套",
            // },

            // // 16. 特殊空白字符
            // {
            //     input: "（\u200B\u200C\u200D）", // 零宽空格、零宽非连接符、零宽连接符
            //     expected: "",
            //     description: "特殊Unicode空白字符",
            // },
            // {
            //     input: "（\u2028\u2029）", // 行分隔符、段落分隔符
            //     expected: "",
            //     description: "Unicode行终止符",
            // },

            // // 17. 数学符号和特殊字符
            // {
            //     input: "（∑∏∪∩）",
            //     expected: "∑∏∪∩",
            //     description: "数学符号",
            // },
            // {
            //     input: "（♠♣♥♦）",
            //     expected: "♠♣♥♦",
            //     description: "扑克牌符号",
            // },

            // // 18. 混合语言场景
            // {
            //     input: "（こんにちは【Hello】世界）",
            //     expected: "こんにちは【Hello】世界",
            //     description: "日中英混合文本",
            // },
            // {
            //     input: "（안녕하세요【你好】Hello）",
            //     expected: "안녕하세요【你好】Hello",
            //     description: "韩中英混合文本",
            // },

            // // 19. 特殊组合
            // {
            //     input: "（ /\\/）", // 包含正斜杠和反斜杠
            //     expected: " /\\/",
            //     description: "包含正反斜杠",
            // },
            // {
            //     input: "（\r\t\f\v）", // 各种控制字符
            //     expected: "",
            //     description: "控制字符组合",
            // },

            // // 20. 极限情况
            // {
            //     input: "（" + "（".repeat(50) + "x" + "）".repeat(49),
            //     expected: "（x",
            //     description: "不平衡的大量嵌套",
            // },
            // {
            //     input: "（" + "x".repeat(10000) + "）",
            //     expected: "x".repeat(10000),
            //     description: "超长内容",
            // },

            // // 21. 多语言混合场景
            // {
            //     input: "（中文）(English)【한글】《日本語》",
            //     expected: "中文English한글日本語",
            //     description: "多语言混合括号处理",
            // },
            // {
            //     input: "（中文[English]한글）",
            //     expected: "中文[English]한글",
            //     description: "多语言嵌套括号处理",
            // },

            // // 22. 特殊格式文本
            // {
            //     input: "【加粗（斜体）文本】",
            //     expected: "加粗（斜体）文本",
            //     description: "格式化文本的括号处理",
            // },
            // {
            //     input: "《书名（作者名）》",
            //     expected: "书名（作者名）",
            //     description: "书籍引用格式处理",
            // },

            // // 23. 复杂标点组合
            // {
            //     input: "（！？。，；：）",
            //     expected: "！？。，；：",
            //     description: "中文标点符号组合",
            // },
            // {
            //     input: "（!?.,:;）",
            //     expected: "!?.,:;",
            //     description: "英文标点符号组合",
            // },

            // // 24. 数字和符号混合
            // {
            //     input: "【第1章（1.1节）】",
            //     expected: "第1章（1.1节）",
            //     description: "章节编号处理",
            // },
            // {
            //     input: "（$100.00【税前】）",
            //     expected: "$100.00【税前】",
            //     description: "货币符号处理",
            // },

            // // 25. 空格处理边缘情况
            // {
            //     input: "（ Hello  World ）",
            //     expected: " Hello  World ",
            //     description: "保留多个空格",
            // },
            // {
            //     input: "（　中文空格　）",  // 全角空格
            //     expected: "　中文空格　",
            //     description: "全角空格处理",
            // },

            // // 26. 特殊用途括号
            // {
            //     input: "「代码『函数名』」",
            //     expected: "代码『函数名』",
            //     description: "代码引用处理",
            // },
            // {
            //     input: "『注释（说明）』",
            //     expected: "注释（说明）",
            //     description: "注释文本处理",
            // },

            // // 27. RTL文本处理
            // {
            //     input: "（مرحبا بالعالم）",  // 阿拉伯语：你好，世界
            //     expected: "مرحبا بالعالم",
            //     description: "阿拉伯语RTL文本",
            // },
            // {
            //     input: "（שלום עולם）",  // 希伯来语：你好，世界
            //     expected: "שלום עולם",
            //     description: "希伯来语RTL文本",
            // },
            // {
            //     input: "（Hello مرحبا שלום）",
            //     expected: "Hello مرحبا שלום",
            //     description: "RTL与LTR混合文本",
            // },

            // // 28. 组合字符处理
            // {
            //     input: "（ā̐ē̓ī̂ō̃ū̄）", // 带有变音符号的拉丁字母
            //     expected: "ā̐ē̓ī̂ō̃ū̄",
            //     description: "组合重音字符",
            // },
            // {
            //     input: "（가̈나̈다̈）", // 带变音符号的韩文
            //     expected: "가̈나̈다̈",
            //     description: "韩文组合字符",
            // },
            // {
            //     input: "（ự̃ǹ）", // 多重组合字符
            //     expected: "ự̃ǹ",
            //     description: "多重组合字符",
            // },

            // // 29. Unicode边缘情况
            // {
            //     input: "（\u200B\u200C\u200D）", // 零宽空格、零宽非连接符、零宽连接符
            //     expected: "",
            //     description: "零宽Unicode字符",
            // },
            // {
            //     input: "（\u2028\u2029）", // 行分隔符、段落分隔符
            //     expected: "",
            //     description: "Unicode行终止符",
            // },
            // {
            //     input: "（\uFEFF）", // 字节顺序标记
            //     expected: "",
            //     description: "BOM字符",
            // },

            // // 30. Emoji和特殊符号
            // {
            //     input: "（👨‍👩‍👧‍👦）", // 家庭emoji
            //     expected: "👨‍👩‍👧‍👦",
            //     description: "复杂emoji组合",
            // },
            // {
            //     input: "（👩🏽‍💻）", // 带肤色修饰的emoji
            //     expected: "👩🏽‍💻",
            //     description: "带修饰符的emoji",
            // },
            // {
            //     input: "（🏳️‍🌈）", // 彩虹旗
            //     expected: "🏳️‍🌈",
            //     description: "带变异选择符的emoji",
            // },

            // // 31. 控制字符
            // {
            //     input: "（\x00\x01\x02\x03）", // ASCII控制字符
            //     expected: "\x00\x01\x02\x03",
            //     description: "ASCII控制字符",
            // },
            // {
            //     input: "（\u0008\u0009\u000B）", // 退格、制表符、垂直制表符
            //     expected: "\u0008\u0009\u000B",
            //     description: "特殊控制字符",
            // },
            // {
            //     input: "（\u001B[31m）", // ANSI转义序列
            //     expected: "\u001B[31m",
            //     description: "ANSI转义序列",
            // }
        ];

        console.group("=== 括号处理测试结果 ===");

        let passCount = 0;
        let failCount = 0;

        testCases.forEach((testCase, index) => {
            console.group(`测试用例 ${index + 1}:`);
            console.log("描述:", testCase.description);
            console.log("输入:", testCase.input);

            const result = this.processBracketsAndTrim(testCase.input);

            console.log("输出:", result);
            console.log("期望:", testCase.expected);
            console.log("长度:", result.length);

            const passed = result === testCase.expected;
            console.log("测试结果:", passed ? "✅ 通过" : "❌ 失败");

            if (passed) {
                passCount++;
            } else {
                failCount++;
            }

            console.groupEnd();
        });

        console.log("\n=== 测试统计 ===");
        console.log(`总用例: ${testCases.length}`);
        console.log(`通过: ${passCount} ✅`);
        console.log(`失败: ${failCount} ❌`);
        console.log(`通过率: ${((passCount / testCases.length) * 100).toFixed(2)}%`);

        // Close debug mode after testing
        // this.disableDebug();

        console.groupEnd();
    }
}
