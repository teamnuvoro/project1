
import { createClient } from '@supabase/supabase-js';

export async function loadSecrets() {
    console.log('[Secrets] Loading secrets from Supabase...');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('[Secrets] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Cannot load secrets.');
        return;
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: secrets, error } = await supabase
            .from('app_secrets')
            .select('key, value');

        if (error) {
            console.error('[Secrets] Failed to fetch secrets:', error);
            return;
        }

        if (secrets && secrets.length > 0) {
            let count = 0;
            for (const secret of secrets) {
                if (!process.env[secret.key]) {
                    process.env[secret.key] = secret.value;
                    count++;
                }
            }
            console.log(`[Secrets] Successfully loaded ${count} secrets into process.env`);
        } else {
            console.log('[Secrets] No secrets found in app_secrets table.');
        }
    } catch (err) {
        console.error('[Secrets] Exception while loading secrets:', err);
    }
}

let secretsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function ensureSecretsLoaded(req: any, res: any, next: any) {
    if (secretsLoaded) {
        return next();
    }

    if (!loadingPromise) {
        loadingPromise = loadSecrets().then(() => {
            secretsLoaded = true;
        });
    }

    try {
        await loadingPromise;
        next();
    } catch (error) {
        console.error('[Secrets] Failed to ensure secrets loaded:', error);
        next(); // Proceed anyway, maybe some routes don't need secrets
    }
}
