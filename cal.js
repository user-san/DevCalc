let input = document.getElementById("input");
let display = document.getElementById("display");
let temp = [];
let lastResult = null;
let isProcessingInput = false;

// Strict character validation - only allow digits, operators, and decimal
function isValidChar(char) {
    return /[0-9.\-+*/%]/.test(char);
}

function validateInput(currentValue, newChar) {
    // First check if character is allowed at all
    if (!isValidChar(newChar)) return false;

    const lastChar = currentValue.slice(-1);
    const operators = ['+', '*', '/', '%'];

    // Enhanced operator validation
    if (operators.includes(newChar)) {
        if (currentValue === '' && lastResult === null) return false;
        if (operators.includes(lastChar)) return false;
        if (lastChar === '.') return false;
    }

    // Prevent -* or -/ or -% etc.
    if (lastChar === '-' && operators.includes(newChar)) {
        return false;
    }

    // Decimal point validation
    if (newChar === '.') {
        if (currentValue === '' || operators.includes(lastChar)) return false;
        const currentSegment = currentValue.split(/[-+*/%]/).pop();
        if (currentSegment.includes('.')) {
            return false;
        }
    }

    // Handle minus sign rules
    if (newChar === '-') {
        if (currentValue === '') return true;
        if (operators.includes(lastChar)) return true;
        if (/[0-9]/.test(lastChar)) return true;
        return false;
    }

    return true;
}

input.addEventListener("input", () => {
    if (isProcessingInput) return;
    isProcessingInput = true;

    try {
        let val = input.value;

        // Strictly filter out any invalid characters
        let filteredVal = '';
        for (let i = 0; i < val.length; i++) {
            if (isValidChar(val[i])) {
                filteredVal += val[i];
            }
        }

        // Validate each character's position
        let validatedVal = '';
        for (let i = 0; i < filteredVal.length; i++) {
            if (validateInput(validatedVal, filteredVal[i])) {
                validatedVal += filteredVal[i];
            }
        }

        // Update value if different
        if (val !== validatedVal) {
            input.value = validatedVal;
            isProcessingInput = false;
            return;
        }

        // Parse the validated input
        temp = [];
        let i = 0;
        const len = validatedVal.length;
        let expectNumber = true;

        while (i < len) {
            let char = validatedVal[i];

            if (expectNumber) {
                let num = "";
                let isNegative = false;

                if (char === '-' && (i === 0 || "+-*/%".includes(validatedVal[i - 1]))) {
                    isNegative = true;
                    i++;
                    if (i >= len) break;
                    char = validatedVal[i];
                }

                if (isNegative && !/[0-9.]/.test(char)) {
                    continue;
                }

                let dotCount = 0;
                let hasDigit = false;
                while (i < len && (/[0-9]/.test(validatedVal[i]) ||
                    (validatedVal[i] === '.' && dotCount === 0))) {
                    if (validatedVal[i] === '.') dotCount++;
                    else hasDigit = true;
                    num += validatedVal[i];
                    i++;
                }

                if (isNegative) num = '-' + num;

                if (num !== '' && num !== '-') {
                    temp.push(num);
                    expectNumber = false;
                }
            } else {
                if ("+*/%-".includes(char)) {
                    if (char !== '-' && validatedVal[i - 1] === '-' &&
                        (i === 1 || "+-*/%".includes(validatedVal[i - 2]))) {
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

        // Ensure temp doesn't end with operator
        if (temp.length > 0 && "+-*/%".includes(temp[temp.length - 1])) {
            temp.pop();
        }

        // Evaluate if we have a complete expression
        if (temp.length >= 2) {
            evaluation();
        } else {
            display.value = "";
        }
    } catch (e) {
        console.error("Error:", e);
        display.value = "Err";
        showError();
    } finally {
        isProcessingInput = false;
    }


});



// Evaluation function with error handling
function evaluation() {
    if (temp.length < 3) {
        display.value = "";
        return 0;
    }

    let intermediate = [];
    try {
        // First pass: * / %
        for (let i = 0; i < temp.length; i++) {
            if (intermediate.length > 0 && ['*', '/', '%'].includes(intermediate[intermediate.length - 1])) {
                const operator = intermediate.pop();
                const left = intermediate.pop();
                const right = temp[i];

                if (isNaN(left) || isNaN(right)) {
                    display.value = "Err";
                    showError();
                    return 0;
                }

                if (operator === '/' && Number(right) === 0) {
                    display.value = "Err";
                    showError();
                    return 0;
                }

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

        // Second pass: + -
        if (intermediate.length === 0 || isNaN(intermediate[0])) {
            display.value = "Err";
            showError();
            return 0;
        }

        let result = Number(intermediate[0]);
        for (let i = 1; i < intermediate.length - 1; i += 2) {
            const operator = intermediate[i];
            const right = Number(intermediate[i + 1]);

            if (isNaN(right)) {
                display.value = "Err";
                showError();
                return 0;
            }

            switch (operator) {
                case '+': result += right; break;
                case '-': result -= right; break;
                default:
                    display.value = "Err";
                    showError();
                    return 0;
            }
        }

        display.value = result;
        return result;
    } catch (e) {
        console.error("Evaluation error:", e);
        display.value = "Err";
        showError();
        return 0;
    }
}

// Visual error feedback
function showError() {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 500);
}

// Keyboard input protection
input.addEventListener('keydown', (event) => {
    const key = event.key;

    // Block all letter keys immediately
    if (/[a-z]/i.test(key) && key.length === 1) {
        event.preventDefault();
        showError();
        return;
    }

    // Handle Enter key
    if (key === "Enter") {
        event.preventDefault();
        equalInput();
        return;
    }

    // Handle numbers and operators
    if (/[0-9.%+\-*/]/.test(key)) {
        event.preventDefault();

        if (lastResult !== null && input.value === "") {
            if (["+", "-", "*", "/", "%"].includes(key)) {
                input.value = lastResult + key;
            } else {
                input.value = key;
            }
            lastResult = null;
        } else {
            if (!validateInput(input.value, key)) {
                showError();
                return;
            }
            input.value += key;
        }

        input.dispatchEvent(new Event("input"));
        // Scroll to the right after key input
        requestAnimationFrame(() => {
            input.scrollLeft = input.scrollWidth;
        });
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

// Paste protection
input.addEventListener('paste', (event) => {
    const pasteData = event.clipboardData.getData('text');
    if (/[a-z]/i.test(pasteData)) {
        event.preventDefault();
        showError();
    }
});

// Calculator functions
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

    setTimeout(() => {
        input.scrollLeft = input.scrollWidth;
    }, 0);

}

function calButtons(opp) {
    if (opp === "=") {
        equalInput();
        return;
    }

    if (lastResult !== null && input.value === "") {
        if (["+", "-", "*", "/", "%"].includes(opp)) {
            input.value = lastResult + opp;
            lastResult = null;
        } else {
            input.value = opp;
            lastResult = null;
        }
    } else {
        if (!validateInput(input.value, opp)) {
            showError();
            return;
        }
        input.value += opp;
    }

    input.dispatchEvent(new Event("input"));

    // Scroll AFTER rendering and focus stabilization
    setTimeout(() => {
        input.focus();
        input.scrollLeft = input.scrollWidth;
    }, 0);
}

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

// Initialize calculator
document.addEventListener("DOMContentLoaded", function () {
    // Focus and scroll to end on page load
    input.focus();
    setTimeout(() => input.scrollLeft = input.scrollWidth, 0);

    // Focus when clicking display
    display.addEventListener('click', () => {
        input.focus();
        setTimeout(() => input.scrollLeft = input.scrollWidth, 0);
    });
});

// Make buttons non-focusable and prevent default mouse behavior
document.querySelectorAll(".btn-primary").forEach(btn => {
    btn.setAttribute("tabindex", "-1");
    btn.addEventListener("mousedown", e => e.preventDefault());
});

// Global mousedown handler (replaces click)
document.addEventListener('mousedown', function (e) {
    // Ignore button clicks
    if (e.target.closest('.btn-primary')) return;

    // Prevent default to disable click-and-hold
    e.preventDefault();

    // Focus and scroll to end
    input.focus();
    requestAnimationFrame(() => {
        input.scrollLeft = input.scrollWidth;
    });
});

// Extra protection against text selection
document.addEventListener('selectstart', function (e) {
    if (!e.target.closest('.modal')) { // Allow selection in modal
        e.preventDefault();
    }
});