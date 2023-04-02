const constants = require('./constants');

/**
 * Returns ICS data from provided text, academic quarter, and whether the text is already in JSON format or not.
 * 
 * @param {String} text text containing schedule
 * @param {String} academicQuarter academic quarter of schedule, e.g. 'Winter2023' (see constants.js)
 * @param {Boolean} [json=false] whether the text is already in JSON format or not  
 * @returns 
 */
function getICS(text, academicQuarter, json = false) {
    const jsonText = json ? text : getJSON(text);
    const ICSData = [];

    console.log(JSON.stringify(jsonText));

    // loop through each course event and create ICS event
    for (const courseEvent of jsonText) {
        // TODO: validate: courseCode, courseName, professor, building, room, courseType, section, gradeOption, units, days, time, date
        // TODO: auto-correct: courseCode, courseName, professor, building, room, courseType, section, gradeOption, units, days, time, date

        if (courseEvent.days === undefined || !constants.acceptedWeekdays.includes(courseEvent.days)) {
            continue;
        } 

        // if bad time format, skip (also skips 'TBA' times); most likely accounts for bad date formats too 
        if (courseEvent.time === undefined || 
            courseEvent.time.match(constants.timeRegexMatch) === null || 
            courseEvent.time.match(constants.timeRegexMatch)[0] !== courseEvent.time) { 
            continue;
        }
        
        // get startDay of course event, either exam day or first day of class
        const start = (courseEvent.courseType === 'FI' || courseEvent.courseType === 'MI') ? 
            getExamDay(courseEvent) : 
            getStartDay(new Date(constants.academicQuarters[academicQuarter].start), courseEvent);

        // creates location link for event description 
        const locationLink = courseEvent.building !== undefined && courseEvent.building !== 'TBA' ?
            `<a href=https://map.concept3d.com/?id=1005#!s/${courseEvent.building}_Main?ct/18312>${courseEvent.building} ${courseEvent.room}</a>` :
            `${courseEvent.building} ${courseEvent.room}`;

        // add ICS event to ICS data
        ICSData.push({
            title: courseEvent.courseCode + " " + courseEvent.courseType,
            description: 
`${courseEvent.courseCode}, ${courseEvent.courseName}
Professor: ${courseEvent.professor}
Location: ${locationLink}
Class Type: ${courseEvent.courseType}
Section ${courseEvent.section}
Grade Option: ${courseEvent.gradeOption}, Units: ${courseEvent.units}`,
            start: start,
            startOutputType: 'local',
            duration: getDuration(courseEvent),
            location: courseEvent.building === undefined ? undefined : `${courseEvent.building} ${courseEvent.room}`,
            recurrenceRule: getRecurrence(courseEvent, constants.academicQuarters[academicQuarter]) 
        })
    }

    return ICSData;
}

/**
 * Gets start day of recurring course event.
 *
 * @param {Date} date date that marks the first day of the academic quarter
 * @param {*} courseEvent course event object
 * @return {Array} array of start day in ics format: [year, month, day, hour, minute]
 */
function getStartDay(date, courseEvent) {
    const weekdays = courseEvent.days;
    // get day of week of first day of class, if it's tu / th / sat / sun, get first two letters, else get first letter
    let day = weekdays[0] === 'T' || weekdays[0] === 'S' ? weekdays[0] + weekdays[1] : weekdays[0];
    // convert day of week to number and get first date that is either on or before provided date variable 
    const startDay = new Date(date.setDate(date.getDate() + (constants.weekdays[day] + 1 + 7 - date.getDay()) % 7));
    // return ics array format of start day 
    return getDay(startDay, courseEvent);
}

/**
 * Gets day of exam in ics format. 
 * 
 * @param {*} courseEvent 
 * @returns {Array} array of exam day in ics format: [year, month, day, hour, minute]
 */
function getExamDay(courseEvent) {
    return getDay(courseEvent.date, courseEvent);
}

/**
 * Helper function to convert date and time of recurring class / exam day to ics format. 
 * 
 * @param {*} date date of recurring class / exam day
 * @param {*} courseEvent course event object
 * @returns {Array} array of start / exam day in ics format: [year, month, day, hour, minute]
 */
function getDay(date, courseEvent) {
    // get the time the class starts as an array of [hour, minute], e.g. ['5p', '30']
    const startTime = courseEvent.time.split("-")[0].split(":");
    const day = new Date(date);
    // determines whether to add 12 hours to the hour (for pm times)
    const add12 = startTime[1].includes('p') && parseInt(startTime[0]) !== 12;
    return [day.getFullYear(), day.getMonth() + 1, day.getDate(), parseInt(startTime[0]) + (add12 ? 12 : 0), parseInt(startTime[1])];
}

/**
 * Gets duration of course event in hours and minutes, in ics format (e.g. {hours: 1, minutes: 30}).
 * 
 * @param {*} courseEvent course event object
 * @returns {Object} duration of course event in hours and minutes
 */
function getDuration(courseEvent) {
    // splits time into start and end times, e.g. ['7:00p', '10:30p']
    const times = courseEvent.time.split("-")
    // get start time in minutes, e.g. 420, 630
    let startTime = parseInt(times[0].split(":")[0]) * 60 + parseInt(times[0].split(":")[1])
    // adds time in minutes if time is pm and not 12pm, e.g. 7pm -> 19 * 60 = 1140
    if (times[0].includes('p') && parseInt(times[0].split(":")[0]) !== 12) {
        startTime += 12 * 60;
    }
    // does the same for end time
    let endTime = parseInt(times[1].split(":")[0]) * 60 + parseInt(times[1].split(":")[1])
    if (times[1].includes('p') && parseInt(times[1].split(":")[0]) !== 12) {
        endTime += 12 * 60;
    }
    // returns duration in hours and minutes
    return {hours: Math.floor((endTime - startTime) / 60), minutes: (endTime - startTime) % 60}
}

/**
 * Gets recurrence rule for course event.
 * 
 * @param {*} courseEvent course event object
 * @param {String} academicQuarter academic quarter, e.g. 'Winter2023'
 * @returns {String} recurrence rule for course event
 */
function getRecurrence(courseEvent, academicQuarter) {
    // if course is a final or midterm, return recurrence rule for one-time event
    if (courseEvent.courseType === 'FI' || courseEvent.courseType === 'MI') {
        return 'FREQ=WEEKLY;INTERVAL=1;COUNT=1';
    }

    // adds days of week to recurrence rule
    let dayFreq = "";
    if (courseEvent.days.includes('M')) {
        dayFreq += "MO,"
    } 
    if (courseEvent.days.includes('Tu')) {
        dayFreq += "TU,"
    }
    if (courseEvent.days.includes('W')) {
        dayFreq += "WE,"
    }
    if (courseEvent.days.includes('Th')) {
        dayFreq += "TH,"
    }
    if (courseEvent.days.includes('F')) {
        dayFreq += "FR,"
    }
    if (courseEvent.days.includes('Sa')) {
        dayFreq += "SA,"
    }
    if (courseEvent.days.includes('Su')) {
        dayFreq += "SU,"
    }
    // removes last comma
    dayFreq = dayFreq.substring(0, dayFreq.length - 1);

    // gets start time of class as array, e.g (['7', '00p']), without it, exclusion dates don't work
    const startTime = courseEvent.time.split("-")[0].split(":");
    // converts academic quarter end to ics format
    const endDate = academicQuarter.end.toISOString().replaceAll('-','').replaceAll(':','').replaceAll('.','');
    // gets exclusion dates and converts to ics format
    const exDate = academicQuarter.excludedDates.map(date => '\nEXDATE:' + date + 'T' + ("0" + startTime[0]).slice(-2) + startTime[1].slice(0, -1) + '00').join('');

    return `FREQ=WEEKLY;BYDAY=${dayFreq};INTERVAL=1;UNTIL=${endDate}${exDate}`
}

/**
 * Convert parsed text to array of course events in JSON format, ready to be turned into ICS data.
 * 
 * @param {String} text text to be converted
 * @returns {Array} array of course events in JSON format
 */
// TODO: only assign values if they're valid (literally all courseEvent fields)
function getJSON(text) {
    const courseEvents = [];

    // split text into courses
    const courses = splitArrayByPattern(text, getListOfDepartments(true));

    // for each course, create course events
    courses.forEach(course => {
        // split course into course code / name and actual course events
        const splitCourse = splitArrayByPattern(course, constants.splitCourseToEventsBefore, constants.splitCourseToEventsAfter)

        // set course code and name
        const courseDetails = splitCourse[0].split(" ");
        const courseCode = courseDetails[0] + " " + courseDetails[1];
        let courseName = courseDetails.slice(2).join(" ");

        // add back space after comma or period (removed from no space delimiter when parsing the image)
        courseName = courseName.replaceAll(',', ', ');
        courseName = courseName.replaceAll('.', '. ');
        let professor = "";
        let gradeOption = "";
        let units = "";

        // loop through actual course events and create course event, assumes that parsing is correct (TODO: actually ensure it's correct)
        for (let i = 1; i < splitCourse.length; i++) {
            // split course event into individual fields
            const splitCourseArray = splitCourse[i].split(" ");
            const courseEvent = {};

            // assign corresponding details when final exam / midterm
            if (splitCourse[i].startsWith('Final Exam') || splitCourse[i].startsWith('Midterm')) {
                if (splitCourse[i].startsWith('Final Exam')) {
                    splitCourseArray.shift();    
                }
                splitCourseArray.shift();

                courseEvent['courseType'] = splitCourseArray.shift();
                courseEvent['days'] = splitCourseArray.shift();
                courseEvent['date'] = splitCourseArray.shift();
            // assign corresponding details for recurring course events (actual class)
            } else {
                courseEvent['section'] = splitCourseArray.shift();
                courseEvent['courseType'] = splitCourseArray.shift();
                
                // for the main course event (like lecture), it will have a professor, grade option, and units, so add those
                if (!constants.acceptedWeekdays.includes(splitCourseArray[0])) {
                    // keep on adding words to professor until we reach a valid weekday
                    while (splitCourseArray.length !== 0 && !constants.gradingOptions.includes(splitCourseArray[0]) && isNaN(splitCourseArray[0])) {
                        professor += splitCourseArray.shift() + " ";
                    }
                    professor = professor.trim();
                    // add back space after comma or period
                    professor = professor.replaceAll(',', ', ');
                    professor = professor.replaceAll('.', '. ');

                    // adds grade option and units

                    // for handling the case that a gradeOption doesn't get read
                    if (!isNaN(splitCourseArray[0])) {
                        gradeOption = "L";
                    } else {
                        gradeOption = splitCourseArray.shift();
                    }

                    units = splitCourseArray.shift();
                }

                courseEvent['days'] = splitCourseArray.shift();
            }

            // add rest of details, regardless of whether it's a final exam / midterm or a recurring course event
            courseEvent['time'] = splitCourseArray.shift();
            courseEvent['building'] = splitCourseArray.shift() ?? 'N/A';
            courseEvent['room'] = splitCourseArray.shift() ?? 'N/A';

            courseEvent['courseCode'] = courseCode;
            courseEvent['courseName'] = courseName;
            courseEvent['professor'] = professor;
            courseEvent['gradeOption'] = gradeOption;
            courseEvent['units'] = units;
            
            courseEvents.push(courseEvent);
        }
    })

    return courseEvents;
}

/**
 * Splits text into an array by provided String / Regex pattern.
 * 
 * @param {String} text text to split
 * @param {Array} beforePatterns patterns to split text by before the pattern occurrence 
 * @param {Array} afterPatterns patterns to split text by after the pattern occurrence
 * @returns {Array} array of split text
 */
function splitArrayByPattern(text, beforePatterns, afterPatterns = []) {
    let indices = [];
    // get all the split indices for before patterns, all added to the indices array
    beforePatterns.forEach(pattern => {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(`\\b${pattern}`, 'gm');
        indices = [...indices, ...[...text.matchAll(regex)].map(a => a.index)];
    })
     // get all the split indices for after patterns, all added to the indices array
    afterPatterns.forEach(pattern => {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(`\\b${pattern}`, 'gm');
        indices = [...indices, ...[...text.matchAll(regex)].map(a => a.index + a[0].length)];
    })

    // remove duplicates and sort
    indices = [...new Set(indices)];
    indices.sort((a, b) => a - b);

    let splitArray = [];
    // push text before first match, if there is any
    if (indices[0] !== 0) {
        splitArray.push(text.slice(0, indices[0]).trim());
    }

    // push text between matches, ensuring correct bounds
    for (let i = 0; i < indices.length; i++) {
        splitArray.push(text.slice(indices[i], i !== indices.length - 1 ? indices[i + 1] : text.length).trim())
    }
    // remove any empty splits
    splitArray = splitArray.filter(text => text.length !== 0);
    return splitArray;
}

/**
 * Returns an array of all departments in the form of strings or regex patterns.
 *
 * @param {boolean} [regex=false] whether to return regex patterns or strings
 * @return {Array} array of all departments
 */
function getListOfDepartments(regex = false) {
    if (regex) {
        return [...constants.deptString.matchAll(/<td>[A-Z]*<\/td>/gm)].map(match => new RegExp(` ${match[0].substring(4, match[0].length - 5)} [0-9]`, 'gm'))
    }
    
    return [...constants.deptString.matchAll(/<td>[A-Z]*<\/td>/gm)].map(match => match[0].substring(4, match[0].length - 5))
}

module.exports = {getJSON, getICS, getListOfDepartments};
