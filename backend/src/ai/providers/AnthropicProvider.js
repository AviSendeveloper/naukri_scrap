const BaseAIProvider = require('./BaseAIProvider');
const { buildMatchPrompt, buildExtractPrompt } = require('../prompts');

const DEFAULT_MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * AI provider that uses Anthropic's Messages API.
 * Strips any markdown fences from the response before JSON parsing.
 */
class AnthropicProvider extends BaseAIProvider {
    /**
     * @param {Object}  opts
     * @param {string}  [opts.model]  – Anthropic model name (default: claude-haiku-4-5)
     * @param {string}  opts.apiKey   – Anthropic API key (required)
     */
    constructor({ model, apiKey } = {}) {
        super();
        this.model = model || DEFAULT_MODEL;
        this.apiKey = apiKey;

        if (!this.apiKey) {
            throw new Error('Anthropic API key is required');
        }
    }

    /**
     * Send a prompt to Anthropic Messages API and get parsed JSON back.
     *
     * @param {string} prompt
     * @returns {Promise<Object>} parsed JSON response
     * @private
     */
    async _generate(prompt) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 512,
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(
                    `Anthropic API error (${response.status}): ${errorText}`
                );
            }

            const data = await response.json();
            const text = data.content?.[0]?.text;

            if (!text) {
                throw new Error('Anthropic returned an empty response');
            }

            // Strip markdown code fences if present
            const cleaned = text.replace(/```json|```/g, '').trim();

            return JSON.parse(cleaned);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(
                    `Anthropic request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
                );
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * @inheritdoc
     */
    async calculateMatch(userSkills, jobKeySkills, jobDescription) {
        const prompt = buildMatchPrompt(userSkills, jobKeySkills, jobDescription);
        const result = await this._generate(prompt);

        let matchPercentage = Number(result.matchPercentage);
        if (Number.isNaN(matchPercentage)) {
            throw new Error(
                `Anthropic returned invalid matchPercentage: ${result.matchPercentage}`
            );
        }
        matchPercentage = Math.max(0, Math.min(100, Math.round(matchPercentage)));

        const reasoning = String(result.reasoning || '').trim();

        return { matchPercentage, reasoning };
    }

    /**
     * @inheritdoc
     */
    async extractSkills(resumeText) {
        const prompt = buildExtractPrompt(resumeText);
        const result = await this._generate(prompt);

        if (!Array.isArray(result.skills)) {
            throw new Error(
                `Anthropic returned invalid skills format: expected array, got ${typeof result.skills}`
            );
        }

        const skills = [...new Set(
            result.skills.filter(s => typeof s === 'string' && s.trim().length > 0)
                         .map(s => s.trim())
        )];

        if (skills.length === 0) {
            throw new Error('Anthropic extracted zero valid skills from resume');
        }

        return skills;
    }
}

module.exports = AnthropicProvider;
