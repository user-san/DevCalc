let input = document.getElementById("input");
let display = document.getElementById("display");
let temp = [];
let lastResult = null;
let isProcessingInput = false;

function validateInput(currentValue, newChar) {
    if (newChar.match(/[a-zA-Z]/)) return false;

    const lastChar = currentValue.slice(-1);
    const operators = ['+', '*', '/', '%'];

    // Rule 1: No consecutive operators (with special handling for -)
    if (operators.includes(lastChar) && operators.includes(newChar)) {
        return false;
    }

    // Special case: prevent -* or -/ or -% etc.
    if (lastChar === '-' && operators.includes(newChar)) {
        return false;
    }

    // Rule 2: Only one decimal per number
    if (newChar === '.') {
        const currentSegment = currentValue.split(/[-+*/%]/).pop();
        if (currentSegment.includes('.')) {
            return false;
        }
    }

    // Rule 3: Only restrict initial operators when starting fresh
    if (currentValue === '' && lastResult === null && ['+', '*', '/', '%'].includes(newChar)) {
        return false;
    }

    // Rule 4: Allow - between numbers (as subtraction) and after operators (as negation)
    if (newChar === '-') {
        // Always allow if it's the first character
        if (currentValue === '') return true;

        // Allow after other operators (for negative numbers)
        if (operators.includes(lastChar)) return true;

        // Allow after numbers (for subtraction)
        if (/[0-9]/.test(lastChar)) return true;

        // Disallow in other cases
        return false;
    }

    return true;
}

input.addEventListener("input", () => {
    if (isProcessingInput) return;
    isProcessingInput = true;

    try {
        let val = input.value;

        // 1. Filter out invalid characters immediately
        val = val.replace(/[^0-9.\-+*/%]/g, "");

        // 2. Validate each character
        let validatedVal = '';
        for (let i = 0; i < val.length; i++) {
            const char = val[i];
            if (validateInput(validatedVal, char)) {
                validatedVal += char;
            }
        }

        // 3. Update value with validated input if different
        if (val !== validatedVal) {
            input.value = validatedVal;
            val = validatedVal;
            isProcessingInput = false;
            return; // Exit after correcting the input
        }

        // 4. Safe parsing
        temp = [];
        let i = 0;
        const len = val.length;
        let expectNumber = true;

        while (i < len) {
            let char = val[i];

            if (expectNumber) {
                let num = "";
                // Handle negative numbers only if at start or after operators
                if (char === '-' && (i === 0 || "+-*/%".includes(val[i - 1]))) {
                    num += '-';
                    i++;
                    if (i >= len) break;
                    char = val[i];
                }

                // Collect digits and decimal point
                let dotCount = 0;
                let hasDigit = false;
                while (i < len && (/[0-9]/.test(val[i]) || (val[i] === '.' && dotCount === 0))) {
                    if (val[i] === '.') dotCount++;
                    else hasDigit = true;
                    num += val[i];
                    i++;
                }

                // If we only have a minus sign without digits, skip it
                if (num === '-' || (!hasDigit && num.includes('-'))) {
                    continue;
                }

                if (num !== '') {
                    temp.push(num);
                    expectNumber = false;
                }
            } else {
                // Handle operators
                if ("+*/%-".includes(char)) {
                    // Special case: don't allow operators after standalone -
                    if (char !== '-' && val[i - 1] === '-' &&
                        (i === 1 || "+-*/%".includes(val[i - 2]))) {
                        i++;
                        continue;
                    }

                    temp.push(char);
                    i++;
                    expectNumber = true;
                } else {
                    i++;
                }
            }
        }

        // 5. Evaluate only complete expressions
        if (temp.length >= 2) {
            evaluation();
        } else {
            display.value = "";
        }
    } catch (e) {
        console.error("Parsing error:", e);
        display.value = "Err";
    } finally {
        isProcessingInput = false;
    }
});



// Updated evaluation function with BODMAS/PEMDAS rules
function evaluation() {
    if (temp.length < 3) {
        display.value = "";
        return 0;
    }

    // First pass: Handle * / % (higher precedence)
    let intermediate = [];
    for (let i = 0; i < temp.length; i++) {
        if (intermediate.length > 0 && ['*', '/', '%'].includes(intermediate[intermediate.length - 1])) { // it will check intermediate not empty && check the last index has any of this operators 
            const operator = intermediate.pop();
            const left = intermediate.pop();
            const right = temp[i];
            let result;

            switch (operator) {
                case '*': result = Number(left) * Number(right); break;
                case '/': result = Number(left) / Number(right); break;
                case '%': result = Number(left) % Number(right); break;
            }
            intermediate.push(result.toString());
        } else {
            intermediate.push(temp[i]);
        }
    }

    // Second pass: Handle + - (lower precedence)
    let result = Number(intermediate[0]);
    for (let i = 1; i < intermediate.length - 1; i += 2) {
        const operator = intermediate[i];
        const right = Number(intermediate[i + 1]);

        switch (operator) {
            case '+': result += right; break;
            case '-': result -= right; break;
        }
    }

    display.value = result; // to display the result value in the ui
    return result; // to use the result value anywhere in the code 
}


// Equals/Enter handler
function equalInput() {
    if (temp.length === 0 && lastResult !== null) {
        display.value = lastResult;
        return;
    }

    const result = evaluation();
    input.value = "";
    display.value = "";
    input.value = result;
    lastResult = result;
    temp = [result.toString()];
}

// Enhanced keyboard support
input.addEventListener('keydown', (event) => {
    const key = event.key;

    // Handle Enter key
    if (key === "Enter") {
        event.preventDefault();
        equalInput();
        return;
    }

    // Handle numbers and operators
    if (/[0-9.%+\-*/]/.test(key)) {
        event.preventDefault();

        // If starting new input after equals
        if (lastResult !== null && input.value === "") {
            if (["+", "-", "*", "/", "%"].includes(key)) {
                input.value = lastResult + key;
            } else {
                input.value = key;
            }
            lastResult = null;
        } else {
            if (!validateInput(input.value, key)) return;
            input.value += key;
        }

        input.dispatchEvent(new Event("input"));
    }

    // Handle backspace
    if (key === "Backspace") {
        event.preventDefault();
        clearInput();
    }

    // Handle escape
    if (key === "Escape") {
        event.preventDefault();
        clearallInput();
    }
});

// Button handler
function calButtons(opp) {
    if (opp === "=") {
        equalInput();
        return;
    }

    // If starting new input after equals
    if (lastResult !== null && input.value === "") {
        if (["+", "-", "*", "/", "%"].includes(opp)) {
            input.value = lastResult + opp;
            lastResult = null;
        } else {
            input.value = opp;
            lastResult = null;
        }
    } else {
        if (!validateInput(input.value, opp)) return;
        input.value += opp;
    }

    input.dispatchEvent(new Event("input"));

}

// Clear functions
function clearInput() {
    input.value = input.value.slice(0, -1);
    input.dispatchEvent(new Event("input"));
}

function clearallInput() {
    input.value = "";
    display.value = "";
    temp = [];
    lastResult = null;
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
    input.focus();
    display.addEventListener('click', () => input.focus());
});

document.addEventListener('click', () => {
    input.focus();
})