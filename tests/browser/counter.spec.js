import { test, expect } from './support/fixtures.js';

const load = page => page.evaluate(() => import('/resources/js/components/common/Counter.js'));

test.describe('<se-counter>', () => {
    test('renders owned markup and applies the value attribute', async ({ page }) => {
        await load(page);
        await page.evaluate(() => {
            document.getElementById('root').innerHTML = '<se-counter value="5"></se-counter>';
        });

        await expect(page.locator('se-counter [data-value]')).toHaveText('5');
        await expect(page.locator('se-counter button')).toHaveCount(2);
    });

    test('defaults to zero and step one', async ({ page }) => {
        await load(page);
        await page.evaluate(() => {
            document.getElementById('root').innerHTML = '<se-counter></se-counter>';
        });

        await expect(page.locator('[data-value]')).toHaveText('0');

        await page.click('[data-action="increment"]');
        await expect(page.locator('[data-value]')).toHaveText('1');
    });

    test('honours the step attribute and emits counter:changed', async ({ page }) => {
        await load(page);

        const events = await page.evaluate(async () => {
            document.getElementById('root').innerHTML =
                '<se-counter value="10" step="5"></se-counter>';

            /** @type {unknown[]} */
            const heard = [];
            document.addEventListener('counter:changed', event => heard.push(event.detail));

            document.querySelector('[data-action="increment"]').click();
            document.querySelector('[data-action="decrement"]').click();
            document.querySelector('[data-action="decrement"]').click();

            return { heard, text: document.querySelector('[data-value]').textContent };
        });

        expect(events.heard).toEqual([
            { value: 15, previous: 10, source: 'user' },
            { value: 10, previous: 15, source: 'user' },
            { value: 5, previous: 10, source: 'user' },
        ]);
        expect(events.text).toBe('5');
    });

    test('falls back to the documented default for an unusable step', async ({ page }) => {
        await load(page);

        const value = await page.evaluate(() => {
            document.getElementById('root').innerHTML = '<se-counter step="abc"></se-counter>';
            document.querySelector('[data-action="increment"]').click();

            return document.querySelector('se-counter').value;
        });

        expect(value).toBe(1);
    });

    test('reflects the value to the attribute and reacts to attribute changes', async ({
        page,
    }) => {
        await load(page);

        const result = await page.evaluate(() => {
            document.getElementById('root').innerHTML = '<se-counter></se-counter>';
            const counter = document.querySelector('se-counter');

            counter.increment();
            const reflected = counter.getAttribute('value');

            counter.setAttribute('value', '42');

            return { reflected, afterAttribute: counter.value, text: counter.textContent.trim() };
        });

        expect(result.reflected).toBe('1');
        expect(result.afterAttribute).toBe(42);
        expect(result.text).toContain('42');
    });

    test('the disabled attribute disables the buttons and blocks actions', async ({ page }) => {
        await load(page);

        const result = await page.evaluate(() => {
            document.getElementById('root').innerHTML = '<se-counter disabled></se-counter>';
            const counter = document.querySelector('se-counter');

            counter.querySelector('[data-action="increment"]').click();
            const whileDisabled = counter.value;

            counter.disabled = false;
            counter.querySelector('[data-action="increment"]').click();

            return {
                whileDisabled,
                buttonsDisabled: counter.querySelector('button').disabled,
                afterEnable: counter.value,
            };
        });

        expect(result.whileDisabled).toBe(0);
        expect(result.afterEnable).toBe(1);
        expect(result.buttonsDisabled).toBe(false);
    });

    test('HTML boolean semantics: disabled="false" is still disabled', async ({ page }) => {
        await load(page);

        const disabled = await page.evaluate(() => {
            document.getElementById('root').innerHTML =
                '<se-counter disabled="false"></se-counter>';

            return document.querySelector('se-counter').disabled;
        });

        expect(disabled).toBe(true);
    });

    test('keeps its value and fires exactly once per click after a reconnect', async ({ page }) => {
        await load(page);

        const result = await page.evaluate(() => {
            const root = document.getElementById('root');
            root.innerHTML = '<se-counter value="3"></se-counter>';

            const counter = root.querySelector('se-counter');
            let events = 0;
            document.addEventListener('counter:changed', () => (events += 1));

            counter.remove();
            root.append(counter);

            counter.querySelector('[data-action="increment"]').click();

            return {
                value: counter.value,
                events,
                markup: counter.querySelectorAll('output').length,
            };
        });

        expect(result).toEqual({ value: 4, events: 1, markup: 1 });
    });

    test('a value assigned before definition survives the upgrade', async ({ page }) => {
        const result = await page.evaluate(async () => {
            document.getElementById('root').innerHTML = '<se-counter id="c"></se-counter>';
            const element = document.getElementById('c');
            element.value = 12;

            await import('/resources/js/components/common/Counter.js');
            await customElements.whenDefined('se-counter');

            return {
                value: element.value,
                text: element.querySelector('[data-value]').textContent,
            };
        });

        expect(result).toEqual({ value: 12, text: '12' });
    });

    test('works when inserted through an AJAX fragment', async ({ page }) => {
        await load(page);

        const text = await page.evaluate(async () => {
            const { replaceFragment } = await import('/resources/js/core/fragments.js');
            replaceFragment(document.getElementById('root'), '<se-counter value="7"></se-counter>');

            document.querySelector('[data-action="increment"]').click();

            return document.querySelector('[data-value]').textContent;
        });

        expect(text).toBe('8');
    });

    test('is keyboard operable through native buttons', async ({ page }) => {
        await load(page);
        await page.evaluate(() => {
            document.getElementById('root').innerHTML = '<se-counter></se-counter>';
        });

        await page.locator('[data-action="increment"]').focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('Space');

        await expect(page.locator('[data-value]')).toHaveText('2');
    });
});
