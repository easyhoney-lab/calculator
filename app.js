// =====================================================================
// 계산기 동작 코드
// eval() 을 쓰지 않고, "지금 입력 중인 숫자 / 앞에서 입력한 숫자 / 연산자"
// 세 가지를 기억해 두었다가 직접 계산하는 방식입니다.
// =====================================================================

const MAX_DIGITS = 15; // 한 번에 입력할 수 있는 최대 숫자 개수

// 계산기의 현재 상태
const state = {
  current: '0',        // 화면에 보이는(입력 중인) 숫자, 문자열로 보관
  previous: null,      // 연산자를 누르기 전에 입력했던 숫자 (Number)
  operator: null,      // '+', '-', '*', '/' 중 하나
  waitingForNext: false, // true 면 다음 숫자를 누를 때 화면을 새로 시작
  lastOperator: null,  // '=' 를 연속으로 누를 때 반복할 연산자
  lastOperand: null,   // '=' 를 연속으로 누를 때 반복할 숫자
  error: null,         // 오류 메시지 (0으로 나누기 등). 오류가 없으면 null
};

// 화면에 보여줄 연산자 기호
const OPERATOR_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

// HTML 요소 가져오기
const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const keysEl = document.querySelector('.keys');

// ---------------------------------------------------------------------
// 실제 계산 (eval 대신 switch 문으로 직접 계산)
// 0으로 나누면 null 을 돌려줘서 오류임을 알립니다.
// ---------------------------------------------------------------------
function calculate(a, b, operator) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? null : a / b;
    default:  return b;
  }
}

// 0.1 + 0.2 = 0.30000000000000004 같은 부동소수점 오차를 정리
function tidy(number) {
  return Number.parseFloat(number.toPrecision(12));
}

// 숫자를 상태에 저장할 문자열로 바꿈
function numberToString(number) {
  if (Object.is(number, -0)) return '0';
  return String(number);
}

// ---------------------------------------------------------------------
// 버튼 동작들
// ---------------------------------------------------------------------

function inputDigit(digit) {
  if (state.error) clearAll();

  if (state.waitingForNext) {
    state.current = digit;
    state.waitingForNext = false;
    return;
  }

  // 숫자 개수 제한 (부호와 소수점은 세지 않음)
  if (state.current.replace(/[-.]/g, '').length >= MAX_DIGITS) return;

  if (state.current === '0') {
    state.current = digit;          // 맨 앞의 0 은 바꿔치기
  } else if (state.current === '-0') {
    state.current = '-' + digit;
  } else {
    state.current += digit;
  }
}

function inputDecimal() {
  if (state.error) clearAll();

  if (state.waitingForNext) {
    state.current = '0.';
    state.waitingForNext = false;
    return;
  }
  if (!state.current.includes('.')) {
    state.current += '.';           // 소수점은 한 번만
  }
}

function chooseOperator(nextOperator) {
  if (state.error) return;

  const inputValue = Number.parseFloat(state.current);

  // 연산자를 연달아 누르면 마지막 것으로 바꾸기만 함 (예: 5 + × → 5 ×)
  if (state.operator && state.waitingForNext) {
    state.operator = nextOperator;
    return;
  }

  if (state.previous === null) {
    state.previous = inputValue;
  } else if (state.operator) {
    // 2 + 3 × 처럼 이어서 누르면, 앞의 2 + 3 을 먼저 계산
    const result = calculate(state.previous, inputValue, state.operator);
    if (result === null) return showError('0으로 나눌 수 없습니다');
    if (!Number.isFinite(result)) return showError('숫자가 너무 큽니다');
    state.previous = tidy(result);
    state.current = numberToString(state.previous);
  }

  state.operator = nextOperator;
  state.waitingForNext = true;
  state.lastOperator = null;
  state.lastOperand = null;
}

function pressEquals() {
  if (state.error) return;

  let a, b, operator;

  if (state.operator) {
    // 일반적인 경우: 앞 숫자 (연산자) 지금 숫자
    a = state.previous;
    operator = state.operator;
    // "5 + =" 처럼 두 번째 숫자 없이 누르면 5 + 5 로 계산
    b = state.waitingForNext ? state.previous : Number.parseFloat(state.current);
  } else if (state.lastOperator) {
    // '=' 를 또 누르면 직전 계산 반복 (예: 2 + 3 = = → 5, 8)
    a = Number.parseFloat(state.current);
    operator = state.lastOperator;
    b = state.lastOperand;
  } else {
    return; // 계산할 것이 없음
  }

  const result = calculate(a, b, operator);
  if (result === null) return showError('0으로 나눌 수 없습니다');
  if (!Number.isFinite(result)) return showError('숫자가 너무 큽니다');

  const finalResult = tidy(result);
  expressionEl.textContent =
    `${formatNumber(numberToString(a))} ${OPERATOR_SYMBOLS[operator]} ${formatNumber(numberToString(b))} =`;

  state.current = numberToString(finalResult);
  state.previous = null;
  state.operator = null;
  state.waitingForNext = true;
  state.lastOperator = operator;
  state.lastOperand = b;
}

function backspace() {
  if (state.error) return clearAll();
  if (state.waitingForNext) return; // 계산 결과는 한 글자씩 지우지 않음

  state.current = state.current.slice(0, -1);
  if (state.current === '' || state.current === '-') {
    state.current = '0';
  }
}

function negate() {
  if (state.error) return;
  if (state.current === '0') return;

  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;

  // 계산 결과에 ±를 누른 경우, 그 값을 새 입력으로 이어서 쓸 수 있게 함
  if (state.waitingForNext && !state.operator) {
    state.waitingForNext = false;
  }
}

function clearAll() {
  state.current = '0';
  state.previous = null;
  state.operator = null;
  state.waitingForNext = false;
  state.lastOperator = null;
  state.lastOperand = null;
  state.error = null;
  expressionEl.textContent = '';
}

function showError(message) {
  clearAll();
  state.error = message;
}

// ---------------------------------------------------------------------
// 화면 그리기
// ---------------------------------------------------------------------

// "1234567.5" → "1,234,567.5" 처럼 세 자리마다 쉼표
function formatNumber(text) {
  if (text.includes('e')) return text; // 아주 크거나 작은 수(1e+21 등)는 그대로

  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [intPart, decimalPart] = unsigned.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let output = (negative ? '-' : '') + withCommas;
  if (decimalPart !== undefined) output += '.' + decimalPart;
  return output;
}

function render() {
  resultEl.classList.remove('medium', 'small', 'tiny', 'error');

  if (state.error) {
    resultEl.textContent = state.error;
    resultEl.classList.add('error');
  } else {
    const text = formatNumber(state.current);
    resultEl.textContent = text;

    // 길이에 따라 글자 크기 조절
    if (text.length > 16) resultEl.classList.add('tiny');
    else if (text.length > 11) resultEl.classList.add('small');
    else if (text.length > 8) resultEl.classList.add('medium');
  }

  // 연산자를 누르고 다음 숫자를 기다리는 동안 위쪽에 식을 보여줌
  if (state.operator) {
    expressionEl.textContent =
      `${formatNumber(numberToString(state.previous))} ${OPERATOR_SYMBOLS[state.operator]}`;
  }

  // 선택된 연산자 버튼 강조
  document.querySelectorAll('[data-operator]').forEach((button) => {
    const isActive = state.waitingForNext && button.dataset.operator === state.operator;
    button.classList.toggle('active', isActive);
  });
}

// ---------------------------------------------------------------------
// 버튼 이름 하나로 해당 동작을 실행하는 함수 (클릭·키보드 공용)
// ---------------------------------------------------------------------
function handleInput({ digit, operator, action }) {
  if (digit !== undefined) inputDigit(digit);
  else if (operator) chooseOperator(operator);
  else if (action === 'decimal') inputDecimal();
  else if (action === 'equals') pressEquals();
  else if (action === 'clear') clearAll();
  else if (action === 'backspace') backspace();
  else if (action === 'negate') negate();

  // 새로 숫자를 입력하기 시작하면 이전 식(… =)은 지움
  if ((digit !== undefined || action === 'decimal') && !state.operator) {
    expressionEl.textContent = '';
  }

  render();
}

// 마우스/터치 클릭
keysEl.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  handleInput(button.dataset);
});

// 키보드 입력
const KEY_MAP = {
  '+': { operator: '+' },
  '-': { operator: '-' },
  '*': { operator: '*' },
  'x': { operator: '*' },
  'X': { operator: '*' },
  '/': { operator: '/' },
  '.': { action: 'decimal' },
  ',': { action: 'decimal' },
  'Enter': { action: 'equals' },
  '=': { action: 'equals' },
  'Backspace': { action: 'backspace' },
  'Escape': { action: 'clear' },
  'Delete': { action: 'clear' },
  'c': { action: 'clear' },
  'C': { action: 'clear' },
};

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return; // Ctrl+R 등은 그대로 둠

  let input = null;
  if (/^[0-9]$/.test(event.key)) input = { digit: event.key };
  else if (KEY_MAP[event.key]) input = KEY_MAP[event.key];
  if (!input) return;

  event.preventDefault(); // '/' 키가 브라우저 검색을 여는 것 등을 막음
  handleInput(input);
  flashButton(input);
});

// 키보드로 눌렀을 때도 화면의 버튼이 눌린 것처럼 잠깐 반짝임
function flashButton({ digit, operator, action }) {
  let selector;
  if (digit !== undefined) selector = `[data-digit="${digit}"]`;
  else if (operator) selector = `[data-operator="${operator}"]`;
  else selector = `[data-action="${action}"]`;

  const button = keysEl.querySelector(selector);
  if (!button) return;
  button.classList.add('pressed');
  setTimeout(() => button.classList.remove('pressed'), 120);
}

render();

// ---------------------------------------------------------------------
// 서비스 워커 등록 (오프라인 동작 + 앱 설치를 위해 필요)
// ---------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.error('서비스 워커 등록 실패:', error));
  });
}
