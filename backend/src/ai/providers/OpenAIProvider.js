const BaseAIProvider = require('./BaseAIProvider');
const { buildMatchPrompt, buildExtractPrompt } = require('../prompts');

const DEFAULT_MODEL = 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * AI provider that uses OpenAI's Chat Completions API.
 * Uses JSON mode via response_format for guaranteed valid JSON output.
 */
class OpenAIProvider extends BaseAIProvider {
    /**
     * @param {Object}  opts
     * @param {string}  [opts.model]  – OpenAI model name (default: gpt-4o-mini)
     * @param {string}  opts.apiKey   – OpenAI API key (required)
     */
    constructor({ model, apiKey } = {}) {
        super();
        this.model = model || DEFAULT_MODEL;
        this.apiKey = apiKey;

        if (!this.apiKey) {
            throw new Error('OpenAI API key is required');
        }
    }

    /**
     * Send a prompt to OpenAI Chat Completions and get parsed JSON back.
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
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'Respond only with valid JSON. No markdown, no explanation, no preamble.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(
                    `OpenAI API error (${response.status}): ${errorText}`
                );
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('OpenAI returned an empty response');
            }

            return JSON.parse(content);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(
                    `OpenAI request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
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
                `OpenAI returned invalid matchPercentage: ${result.matchPercentage}`
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
                `OpenAI returned invalid skills format: expected array, got ${typeof result.skills}`
            );
        }

        const skills = [...new Set(
            result.skills.filter(s => typeof s === 'string' && s.trim().length > 0)
                         .map(s => s.trim())
        )];

        if (skills.length === 0) {
            throw new Error('OpenAI extracted zero valid skills from resume');
        }

        return skills;
    }
}

module.exports = OpenAIProvider;
