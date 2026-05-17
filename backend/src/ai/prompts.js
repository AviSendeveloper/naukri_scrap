/**
 * Centralized prompt builder functions for AI providers.
 * No provider-specific logic belongs here — only prompt text construction.
 */

/**
 * Build a prompt that asks the AI to compare user skills against a job posting
 * and return a holistic match percentage with reasoning.
 *
 * @param {string[]} userSkills   – skills the user has set in their profile
 * @param {string[]} jobKeySkills – skills scraped from the job detail page
 * @param {string}   jobDescription – raw job description text
 * @returns {string} prompt text
 */
function buildMatchPrompt(userSkills, jobKeySkills, jobDescription) {
    // Truncate description to first 2000 characters
    const truncatedDescription = (jobDescription || '').slice(0, 2000);

    return `You are a job-skills matching expert. Compare the candidate's skills against the job requirements and provide a match percentage.

CANDIDATE SKILLS:
${userSkills.join(', ')}

JOB KEY SKILLS:
${jobKeySkills.join(', ')}

JOB DESCRIPTION:
${truncatedDescription}

INSTRUCTIONS:
1. Compare holistically — do NOT just do exact string matching.
2. Consider related and transferable skills. For example:
   - "React" covers "React.js", "ReactJS", "React Native"
   - "Node.js" covers "Node", "NodeJS"
   - "JavaScript" covers "JS", "ES6", "ECMAScript"
   - "AWS" covers "Amazon Web Services"
   - "CI/CD" covers "Jenkins", "GitHub Actions", "GitLab CI"
3. Weight skills that appear in both the key skills AND the description higher.
4. Consider skill depth — if the description emphasises a particular skill heavily, weight it more.
5. Return ONLY a raw JSON object — no markdown, no explanation, no preamble, no code fences.

JSON format:
{ "matchPercentage": <integer 0-100>, "reasoning": "<one sentence max>" }`;
}

/**
 * Build a prompt that asks the AI to extract technical skills from resume text.
 *
 * @param {string} resumeText – raw text extracted from the resume file
 * @returns {string} prompt text
 */
function buildExtractPrompt(resumeText) {
    // Truncate resume text to first 4000 characters
    const truncatedText = (resumeText || '').slice(0, 4000);

    return `You are a technical recruiter analyzing a resume. Extract all technical skills, tools, frameworks, programming languages, platforms, and methodologies mentioned.

RESUME TEXT:
${truncatedText}

INSTRUCTIONS:
1. Extract ONLY technical skills, tools, frameworks, programming languages, platforms, databases, cloud services, and methodologies.
2. EXCLUDE soft skills such as: communication, teamwork, leadership, problem-solving, time management, etc.
3. Normalize skill names to their most commonly used form. Examples:
   - "JS" → "JavaScript"
   - "Node" → "Node.js"
   - "React.js" or "ReactJS" → "React"
   - "k8s" → "Kubernetes"
   - "Postgres" → "PostgreSQL"
   - "Mongo" → "MongoDB"
   - "AWS" stays "AWS"
   - "GCP" stays "GCP"
4. Remove duplicates.
5. Return ONLY a raw JSON object — no markdown, no explanation, no preamble, no code fences.

JSON format:
{ "skills": ["skill1", "skill2", "skill3"] }`;
}

module.exports = { buildMatchPrompt, buildExtractPrompt };
