const OllamaProvider = require('./providers/OllamaProvider');
const OpenAIProvider = require('./providers/OpenAIProvider');
const AnthropicProvider = require('./providers/AnthropicProvider');

/**
 * Factory function that creates the correct AI provider based on user settings.
 * This is the ONLY place that knows which provider class to instantiate.
 *
 * @param {Object}  userSettings
 * @param {string}  [userSettings.ai_provider]  – 'ollama' | 'openai' | 'anthropic'
 * @param {string}  [userSettings.ai_model]     – model name override
 * @param {string}  [userSettings.ai_api_key]   – API key (required for openai/anthropic)
 * @returns {import('./providers/BaseAIProvider')} concrete provider instance
 */
function createAIProvider(userSettings = {}) {
    const { ai_provider = 'ollama', ai_model, ai_api_key } = userSettings;

    switch (ai_provider) {
        case 'openai':
            if (!ai_api_key) {
                throw new Error(
                    'OpenAI provider requires an API key. Set ai_api_key in your settings.'
                );
            }
            return new OpenAIProvider({
                model: ai_model || undefined,
                apiKey: ai_api_key,
            });

        case 'anthropic':
            if (!ai_api_key) {
                throw new Error(
                    'Anthropic provider requires an API key. Set ai_api_key in your settings.'
                );
            }
            return new AnthropicProvider({
                model: ai_model || undefined,
                apiKey: ai_api_key,
            });

        case 'ollama':
        default:
            return new OllamaProvider({
                model: ai_model || undefined,
            });
    }
}

module.exports = { createAIProvider };
