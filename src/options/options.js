document.addEventListener('DOMContentLoaded', () => {
    const aiProviderSelect = document.getElementById('ai-provider');
    const geminiKeyInput = document.getElementById('gemini-api-key');
    const openaiKeyInput = document.getElementById('openai-api-key');
    const saveBtn = document.getElementById('save-btn');
    const status = document.getElementById('status');

    const configSections = {
        kimi: document.getElementById('kimi-config'),
        gemini: document.getElementById('gemini-config'),
        openai: document.getElementById('openai-config')
    };

    // Load saved settings
    chrome.storage.sync.get(['aiProvider', 'geminiApiKey', 'openaiApiKey'], (result) => {
        if (result.aiProvider) {
            aiProviderSelect.value = result.aiProvider;
            updateVisibleSection(result.aiProvider);
        }
        if (result.geminiApiKey) geminiKeyInput.value = result.geminiApiKey;
        if (result.openaiApiKey) openaiKeyInput.value = result.openaiApiKey;
    });

    // Handle provider change
    aiProviderSelect.addEventListener('change', (e) => {
        updateVisibleSection(e.target.value);
    });

    function updateVisibleSection(provider) {
        Object.keys(configSections).forEach(key => {
            configSections[key].style.display = (key === provider) ? 'block' : 'none';
        });
    }

    // Save settings
    saveBtn.addEventListener('click', () => {
        const settings = {
            aiProvider: aiProviderSelect.value,
            geminiApiKey: geminiKeyInput.value.trim(),
            openaiApiKey: openaiKeyInput.value.trim()
        };

        chrome.storage.sync.set(settings, () => {
            status.textContent = 'Settings saved successfully!';
            status.className = 'status-msg success';

            setTimeout(() => {
                status.textContent = '';
                status.className = 'status-msg';
            }, 3000);
        });
    });

    // Check Models
    const checkBtn = document.getElementById('check-models-btn');
    const modelsOutput = document.getElementById('models-output');

    checkBtn.addEventListener('click', async () => {
        const provider = aiProviderSelect.value;
        checkBtn.textContent = 'Checking...';
        checkBtn.disabled = true;
        modelsOutput.style.display = 'block';
        modelsOutput.textContent = `Fetching models for ${provider}...`;

        try {
            let clientModule;
            switch (provider) {
                case 'gemini':
                    clientModule = await import('../utils/gemini-client.js');
                    break;
                case 'openai':
                    clientModule = await import('../utils/openai-client.js');
                    break;
                case 'kimi':
                default:
                    clientModule = await import('../utils/kimi-client.js');
                    break;
            }
            const models = await clientModule.listModels();
            modelsOutput.textContent = 'Available Models:\n' + models;
        } catch (err) {
            modelsOutput.textContent = 'Error: ' + err.message;
        } finally {
            checkBtn.textContent = 'Check Available Models';
            checkBtn.disabled = false;
        }
    });
});
