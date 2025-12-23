// SPDX-License-Identifier: MIT
// Copyright © 2021-2023 "ruipin", "arcanist"
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/**
 * SHIM CONTENT
 * Defines a fallback 'libWrapper' object if the module is not installed.
 */
export const libWrapper = globalThis.libWrapper ?? new class {
    static get is_shim() { return true; }

    constructor() {
        this.wraps = {};
        this.ignore_conflicts = false;
    }

    register(package_id, target, fn, type = "MIXED", { chain = undefined, bind = [] } = {}) {
        const is_setter = target.endsWith("#set");
        target = !is_setter ? target : target.slice(0, -4);
        const split = target.split(".");
        const fn_name = split.pop();
        const app = split.reduce((acc, curr) => acc && acc[curr], globalThis);
        const original = app ? app[fn_name] : undefined;

        if (!app || !original) {
            console.error(`libWrapper Shim: '${target}' could not be found.`);
            return;
        }

        this.wraps[target] = this.wraps[target] ?? [];
        this.wraps[target].push({
            package_id,
            type,
            fn,
            chain,
            bind
        });

        const wrapper = function (...args) {
            return fn.call(this, original.bind(this), ...args);
        };

        // Handle Property Descriptor (Getters/Setters)
        const descriptor = Object.getOwnPropertyDescriptor(app, fn_name);
        if (descriptor && (descriptor.get || descriptor.set)) {
            Object.defineProperty(app, fn_name, {
                get: descriptor.get ? wrapper : descriptor.get,
                set: descriptor.set ? wrapper : descriptor.set,
                configurable: true
            });
        }
        // Handle Standard Methods
        else {
            app[fn_name] = wrapper;
        }
    }
};
