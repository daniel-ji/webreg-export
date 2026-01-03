// config/academicCalendarService.js
// Academic calendar event extraction for optional holiday/deadline inclusion

const { fetchUCSDCalendar, getAcademicYear } = require('./calendarFetcher');

/**
 * Fetch academic calendar events for a specific quarter
 * @param {string} quarter - Quarter name (e.g., 'fall', 'winter', 'spring')
 * @param {number} year - Year
 * @param {Date} quarterStart - Quarter start date
 * @param {Date} quarterEnd - Quarter end date
 * @returns {Promise<Array>} Array of academic calendar events in ICS format
 */
async function fetchAcademicCalendarEvents(quarter, year, quarterStart, quarterEnd) {
  try {
    const calendarData = await fetchUCSDCalendar(quarter, year);
    const events = Object.values(calendarData);
    const academicEvents = [];

    // Filter events within quarter boundaries
    events.forEach(event => {
      if (event.type !== 'VEVENT') return;

      const eventDate = event.start;
      if (!eventDate || eventDate < quarterStart || eventDate > quarterEnd) return;

      // Handle node-ical's object structure for summary
      let summaryText = '';
      if (typeof event.summary === 'object' && event.summary?.val) {
        summaryText = event.summary.val;
      } else if (typeof event.summary === 'string') {
        summaryText = event.summary;
      }
      const summary = summaryText;

      // Include relevant academic events
      const includePatterns = [
        'holiday',
        'day', // holidays like "Veterans Day"
        'break',
        'instruction begins',
        'instruction ends',
        'finals',
        'commencement',
        'deadline',
        'registration',
        'drop',
        'add',
        'enrollment',
        'grades',
        'week'
      ];

      const excludePatterns = [
        'fifteenth day' // Internal administrative dates
      ];

      const summaryLower = summary.toLowerCase();
      const shouldInclude = includePatterns.some(pattern => summaryLower.includes(pattern)) &&
                           !excludePatterns.some(pattern => summaryLower.includes(pattern));

      if (shouldInclude) {
        // Format event for ICS
        const icsEvent = {
          title: `UCSD: ${summary}`,
          description: `Academic Calendar Event: ${summary}`,
          start: [
            eventDate.getFullYear(),
            eventDate.getMonth() + 1,
            eventDate.getDate()
          ],
          startOutputType: 'local',
          // All-day event
          duration: { days: 1 },
          categories: ['UCSD Academic Calendar'],
          busyStatus: 'FREE'
        };

        academicEvents.push(icsEvent);
      }
    });

    return academicEvents;
  } catch (error) {
    console.error('Error fetching academic calendar events:', error);
    return [];
  }
}

/**
 * Get academic calendar events for a quarter key
 * @param {string} quarterKey - Quarter key (e.g., 'fall2025')
 * @param {Object} quarterData - Quarter data with start and end dates
 * @returns {Promise<Array>} Array of academic calendar events
 */
async function getQuarterAcademicEvents(quarterKey, quarterData) {
  // Extract quarter and year from key
  const patterns = {
    fall: /^fall(\d{4})$/,
    winter: /^winter(\d{4})$/,
    spring: /^spring(\d{4})$/,
    summerSession1: /^summerSession1(\d{4})$/,
    summerSession2: /^summerSession2(\d{4})$/
  };

  let quarter = null;
  let year = null;

  for (const [q, pattern] of Object.entries(patterns)) {
    const match = quarterKey.match(pattern);
    if (match) {
      quarter = q.replace(/summerSession[12]/, 'summer');
      year = parseInt(match[1]);
      break;
    }
  }

  if (!quarter || !year) {
    throw new Error(`Invalid quarter key: ${quarterKey}`);
  }

  return fetchAcademicCalendarEvents(quarter, year, quarterData.start, quarterData.end);
}

module.exports = {
  fetchAcademicCalendarEvents,
  getQuarterAcademicEvents
};
