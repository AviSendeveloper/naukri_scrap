const BaseAIProvider = require('./BaseAIProvider');
const { buildMatchPrompt, buildExtractPrompt } = require('../prompts');

const DEFAULT_MODEL = 'qwen2.5:7b';
const DEFAULT_BASE_URL = 'http://localhost:11434';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * AI provider for local inference servers (Ollama, LM Studio, etc.).
 * Uses the OpenAI-compatible /v1/chat/completions endpoint which is
 * supported by both Ollama and LM Studio.
 */
class OllamaProvider extends BaseAIProvider {
    /**
     * @param {Object}  opts
     * @param {string}  [opts.model]   – model name (default: qwen2.5:7b)
     * @param {string}  [opts.baseUrl] – server URL (default: http://localhost:11434)
     */
    constructor({ model, baseUrl } = {}) {
        super();
        this.model = model || process.env.OLLAMA_MODEL || DEFAULT_MODEL;
        this.baseUrl = baseUrl || process.env.OLLAMA_URL || DEFAULT_BASE_URL;
    }

    /**
     * Send a prompt to the local AI server via the OpenAI-compatible
     * /v1/chat/completions endpoint and get parsed JSON back.
     *
     * @param {string} prompt
     * @returns {Promise<Object>} parsed JSON response
     * @private
     */
    async _generate(prompt) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
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
                    stream: false,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(
                    `Local AI API error (${response.status}): ${errorText}`
                );
            }

            const data = await response.json();
            
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('Local AI server returned an empty response');
            }

            // Strip markdown fences if present
            const cleaned = content.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(
                    `Local AI request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
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

        // Validate matchPercentage
        let matchPercentage = Number(result.matchPercentage);
        if (Number.isNaN(matchPercentage)) {
            throw new Error(
                `Ollama returned invalid matchPercentage: ${result.matchPercentage}`
            );
        }
        // Clamp to [0, 100]
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
                `Ollama returned invalid skills format: expected array, got ${typeof result.skills}`
            );
        }

        // Filter falsy/empty values and deduplicate
        const skills = [...new Set(
            result.skills.filter(s => typeof s === 'string' && s.trim().length > 0)
                         .map(s => s.trim())
        )];

        if (skills.length === 0) {
            throw new Error('Ollama extracted zero valid skills from resume');
        }

        return skills;
    }
}

module.exports = OllamaProvider;
