import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';
import type {} from '../src/app/core/dep-pin-api';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({ args: [path.join(__dirname, '..')] });
  await app.context().tracing.start({ screenshots: true, snapshots: true });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app.context().tracing.stop({ path: 'e2e/tracing/trace.zip' });
  await app.close();
});

test('launches a visible window', async () => {
  // the window is shown on ready-to-show
  await expect
    .poll(() =>
      app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        return { isVisible: win.isVisible(), isCrashed: win.webContents.isCrashed() };
      }),
    )
    .toEqual({ isVisible: true, isCrashed: false });
});

test('exposes the desktop API but no Node.js', async () => {
  const globals = await page.evaluate(() => ({
    depPin: typeof window.depPin?.audit,
    require: typeof (window as unknown as { require?: unknown }).require,
    process: typeof (window as unknown as { process?: unknown }).process,
  }));
  expect(globals).toEqual({ depPin: 'function', require: 'undefined', process: 'undefined' });
});

test('shows the drop area', async () => {
  await expect(page.getByText('drag & drop a valid package.json file here')).toBeVisible();
});

test('loads a package.json and audits it', async () => {
  await page.locator('input[type=file]').setInputFiles(path.join(__dirname, 'fixtures/package.json'));
  await expect(page.locator('.package__title')).toContainText('e2e-fixture');
  await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible({ timeout: 120_000 });
});
