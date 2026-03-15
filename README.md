# Playwright E2E Tests

End-to-end UI automation project built with Playwright + TypeScript.

## Stack

- Playwright Test
- TypeScript
- Node.js

## Project structure

- `src/locators` - selectors
- `src/pages` - page objects / components
- `tests/smoke` - smoke scenarios
- `tests/helpers` - test helpers
- `playwright.config.ts` - test runner config

## Installation

```bash
npm install
npx playwright install chromium
```

## Run tests

Run smoke test in headed mode:

```bash
npx playwright test tests/smoke/pdp-add-to-cart.spec.ts --headed
```

Run all tests:

```bash
npx playwright test
```

Open report:

```bash
npx playwright show-report
```

## VS Code

Use Run and Debug configurations:

- Playwright: Smoke Headed
- Playwright: Smoke Debug
- Playwright: UI Mode
- Playwright: Show Report
