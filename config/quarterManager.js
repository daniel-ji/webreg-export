// config/quarterManager.js
// Quarter data persistence and lifecycle management

const fs = require('fs').promises;
const path = require('path');
const { fetchQuarterData, fetchAcademicYearData, getDefaultQuarter } = require('./calendarFetcher');

// Path to store dynamic quarters data
const QUARTERS_FILE = path.join(__dirname, 'quarters.json');

/**
 * Load quarters data from file
 * @returns {Promise<Object>} Quarters data
 */
async function loadQuarters() {
  try {
    const data = await fs.readFile(QUARTERS_FILE, 'utf8');
    const quarters = JSON.parse(data);

    // Convert date strings back to Date objects
    Object.keys(quarters).forEach(key => {
      if (quarters[key].start) {
        quarters[key].start = new Date(quarters[key].start);
      }
      if (quarters[key].end) {
        quarters[key].end = new Date(quarters[key].end);
      }
      if (quarters[key].metadata?.createdAt) {
        quarters[key].metadata.createdAt = new Date(quarters[key].metadata.createdAt);
      }
      if (quarters[key].metadata?.lastUpdated) {
        quarters[key].metadata.lastUpdated = new Date(quarters[key].metadata.lastUpdated);
      }
    });

    return quarters;
  } catch (error) {
    // If file doesn't exist or is invalid, return existing static data
    console.log('No dynamic quarters file found, using static data');
    const constants = require('./parse/constants');
    return constants.academicQuarters;
  }
}

/**
 * Save quarters data to file
 * @param {Object} quarters - Quarters data to save
 * @returns {Promise<void>}
 */
async function saveQuarters(quarters) {
  await fs.writeFile(QUARTERS_FILE, JSON.stringify(quarters, null, 2));
}

/**
 * Clean up old quarters (older than 2 years)
 * @param {Object} quarters - Current quarters data
 * @returns {Object} Cleaned quarters data
 */
function cleanupOldQuarters(quarters) {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const cleaned = {};
  // Use environment variable for quarters to maintain
  const minQuartersToKeep = parseInt(process.env.QUARTERS_TO_MAINTAIN) || 6;

  // Sort quarters by start date
  const sortedQuarters = Object.entries(quarters)
    .sort((a, b) => (b[1].start || 0) - (a[1].start || 0));

  // Keep recent quarters and minimum number
  sortedQuarters.forEach(([key, data], index) => {
    if (index < minQuartersToKeep || (data.start && data.start > twoYearsAgo)) {
      cleaned[key] = data;
    }
  });

  return cleaned;
}

/**
 * Update quarters for a specific year
 * @param {number} year - Academic year (fall year)
 * @returns {Promise<Object>} Updated quarters data
 */
async function updateQuartersForYear(year) {
  const existingQuarters = await loadQuarters();
  const newQuarters = await fetchAcademicYearData(year);

  // Merge new quarters with existing, preferring new data
  const mergedQuarters = { ...existingQuarters, ...newQuarters };

  // Clean up old quarters
  const cleanedQuarters = cleanupOldQuarters(mergedQuarters);

  // Save to file
  await saveQuarters(cleanedQuarters);

  return cleanedQuarters;
}

/**
 * Update quarters for current and next academic year
 * @returns {Promise<Object>} Updated quarters data
 */
async function updateCurrentQuarters() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Determine which academic years to update
  // If it's before September, update previous and current year
  // If it's September or later, update current and next year
  const yearsToUpdate = currentMonth < 8
    ? [currentYear - 1, currentYear]
    : [currentYear, currentYear + 1];

  let allQuarters = await loadQuarters();

  for (const year of yearsToUpdate) {
    try {
      console.log(`Updating quarters for academic year ${year}-${year + 1}...`);
      const yearQuarters = await fetchAcademicYearData(year);
      allQuarters = { ...allQuarters, ...yearQuarters };
    } catch (error) {
      console.error(`Failed to update quarters for ${year}:`, error.message);
    }
  }

  // Clean up old quarters
  const cleanedQuarters = cleanupOldQuarters(allQuarters);

  // Save to file
  await saveQuarters(cleanedQuarters);

  return cleanedQuarters;
}

/**
 * Get available quarters with metadata
 * @returns {Promise<Object>} Quarters data with default selection
 */
async function getAvailableQuarters() {
  const quarters = await loadQuarters();
  const defaultQuarter = getDefaultQuarter(quarters);

  // Format quarters for frontend
  const formattedQuarters = Object.entries(quarters)
    .filter(([_, data]) => data.start && data.end)
    .sort((a, b) => a[1].start - b[1].start)
    .map(([key, data]) => ({
      value: key,
      label: formatQuarterLabel(key),
      start: data.start,
      end: data.end,
      metadata: data.metadata
    }));

  return {
    quarters: formattedQuarters,
    default: defaultQuarter
  };
}

/**
 * Format quarter key into human-readable label
 * @param {string} quarterKey - Quarter key (e.g., 'fall2025')
 * @returns {string} Formatted label
 */
function formatQuarterLabel(quarterKey) {
  const patterns = {
    fall: /^fall(\d{4})$/,
    winter: /^winter(\d{4})$/,
    spring: /^spring(\d{4})$/,
    summerSession1: /^summerSession1(\d{4})$/,
    summerSession2: /^summerSession2(\d{4})$/,
    specialSession: /^specialSession(\d{4})$/
  };

  for (const [quarter, pattern] of Object.entries(patterns)) {
    const match = quarterKey.match(pattern);
    if (match) {
      const year = match[1];
      switch (quarter) {
        case 'fall':
          return `Fall ${year}`;
        case 'winter':
          return `Winter ${year}`;
        case 'spring':
          return `Spring ${year}`;
        case 'summerSession1':
          return `Summer Session I ${year}`;
        case 'summerSession2':
          return `Summer Session II ${year}`;
        case 'specialSession':
          return `Special Session ${year}`;
      }
    }
  }

  return quarterKey; // Fallback
}

/**
 * Get all quarters (dynamic + static fallback)
 * @returns {Promise<Object>} All available quarters
 */
async function getAllQuarters() {
  const dynamicQuarters = await loadQuarters();
  const constants = require('./parse/constants');

  // Merge dynamic and static quarters, preferring dynamic
  return { ...constants.academicQuarters, ...dynamicQuarters };
}

/**
 * Initialize quarters file with existing static data
 * @returns {Promise<void>}
 */
async function initializeQuarters() {
  try {
    // Check if quarters file already exists
    await fs.access(QUARTERS_FILE);
    console.log('Quarters file already exists');
  } catch (error) {
    // File doesn't exist, create it with static data
    console.log('Initializing quarters file with static data...');
    const constants = require('./parse/constants');

    // Add metadata to existing quarters
    const quartersWithMetadata = {};
    Object.entries(constants.academicQuarters).forEach(([key, data]) => {
      quartersWithMetadata[key] = {
        ...data,
        metadata: {
          createdAt: new Date(),
          source: 'manual',
          lastUpdated: new Date()
        }
      };
    });

    await saveQuarters(quartersWithMetadata);
  }
}

module.exports = {
  loadQuarters,
  saveQuarters,
  updateQuartersForYear,
  updateCurrentQuarters,
  getAvailableQuarters,
  getAllQuarters,
  initializeQuarters,
  cleanupOldQuarters
};
