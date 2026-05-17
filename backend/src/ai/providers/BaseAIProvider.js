/**
 * Abstract base class defining the AI provider interface contract.
 * All concrete providers (Ollama, OpenAI, Anthropic) must extend this class
 * and implement both methods.
 */
class BaseAIProvider {
    /**
     * Calculate how well a candidate's skills match a job posting.
     *
     * @param {string[]} userSkills     – candidate's skills from DB
     * @param {string[]} jobKeySkills   – skills scraped from job page
     * @param {string}   jobDescription – raw job description text
     * @returns {Promise<{ matchPercentage: number, reasoning: string }>}
     */
    async calculateMatch(userSkills, jobKeySkills, jobDescription) {
        throw new Error(
            `${this.constructor.name}.calculateMatch() is not implemented. ` +
            'Subclasses of BaseAIProvider must override this method.'
        );
    }

    /**
     * Extract technical skills from resume text.
     *
     * @param {string} resumeText – raw text extracted from resume file
     * @returns {Promise<string[]>} – array of normalized skill strings
     */
    async extractSkills(resumeText) {
        throw new Error(
            `${this.constructor.name}.extractSkills() is not implemented. ` +
            'Subclasses of BaseAIProvider must override this method.'
        );
    }
}

module.exports = BaseAIProvider;
