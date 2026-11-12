// Load the Google Identity Services script asynchronously and return a promise that resolves when the script is loaded.
// Load it only once and cache the promise for subsequent calls.
const SRC = 'https://accounts.google.com/gsi/client';
let promise = null;

const isReady = () => Boolean(window.google?.accounts?.id);

export function loadGoogleScript() {
    if (isReady()) return Promise.resolve();
    if (promise) return promise;
    
    promise = new Promise((resolve, reject) => {
        function fail(script, message) {
            script.remove();
            promise = null;
            reject(new Error(message));
        }

        // Check if the script is already present in the document
        let script = document.querySelector(`script[src="${SRC}"]`);
        const isNew = !script;

        if (isNew) {
            script = document.createElement('script');
            script.src = SRC;
            script.async = true;
            script.defer = true;        
        }

        script.addEventListener('load', () => {
            if (isReady()) resolve();
            else fail(script, 'Google sign-in script loaded but not ready');
        });
        script.addEventListener('error', () => {
            fail(script, 'Failed to load Google sign-in script');
        })

        if (isNew) document.head.appendChild(script);
    });

    return promise;
}