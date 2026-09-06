import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    isValidCustomElementName,
    hasAllowedPrefix,
    setAllowedPrefixes,
    getAllowedPrefixes,
} from '../../resources/js/core/register.js';

describe('custom element name policy', () => {
    afterEach(() => setAllowedPrefixes(['se-']));

    test('accepts hyphenated lowercase names', () => {
        assert.equal(isValidCustomElementName('se-modal'), true);
        assert.equal(isValidCustomElementName('se-customer-selector'), true);
    });

    test('rejects names the platform would reject', () => {
        assert.equal(isValidCustomElementName('modal'), false, 'no hyphen');
        assert.equal(isValidCustomElementName('Se-Modal'), false, 'uppercase');
        assert.equal(isValidCustomElementName('-modal'), false, 'leading hyphen');
        assert.equal(isValidCustomElementName('1-modal'), false, 'leading digit');
        assert.equal(isValidCustomElementName('annotation-xml'), false, 'reserved');
        assert.equal(isValidCustomElementName(''), false);
        assert.equal(isValidCustomElementName(undefined), false);
    });

    test('enforces the project prefix policy', () => {
        assert.equal(hasAllowedPrefix('se-modal'), true);
        assert.equal(hasAllowedPrefix('app-modal'), false);
    });

    test('the prefix allowlist is configurable for product prefixes', () => {
        setAllowedPrefixes(['se-', 'derman-']);

        assert.deepEqual(getAllowedPrefixes(), ['se-', 'derman-']);
        assert.equal(hasAllowedPrefix('derman-invoice'), true);
    });

    test('rejects a malformed prefix list', () => {
        assert.throws(() => setAllowedPrefixes([]), TypeError);
        assert.throws(() => setAllowedPrefixes(['se']), TypeError);
        assert.throws(() => setAllowedPrefixes('se-'), TypeError);
    });
});
