const constants = require('./constants');

function getICS(text, academicQuarter, json = false) {
    const jsonText = json ? text : getJSON(text);
    const ICSData = [];

    console.log(jsonText);

    for (const courseEvent of jsonText) {
        // TODO: ensure courseEvent is valid and auto-correct as necessary
        if (courseEvent.days === undefined || !constants.acceptedWeekdays.includes(courseEvent.days)) {
            continue;
        } 

        if (courseEvent.time === undefined || 
            courseEvent.time.match(constants.timeRegexMatch) === null || 
            courseEvent.time.match(constants.timeRegexMatch)[0] !== courseEvent.time) { 
            continue;
        }
        
        const start = (courseEvent.courseType === 'FI' || courseEvent.courseType === 'MI') ? 
            getExamDay(courseEvent) : 
            getStartDay(new Date(constants.academicQuarters[academicQuarter].start), courseEvent);

        ICSData.push({
            title: courseEvent.courseCode + " " + courseEvent.courseType,
            description: 
`${courseEvent.courseCode}, ${courseEvent.courseName}
Professor: ${courseEvent.professor}
Location: ${courseEvent.building} ${courseEvent.room}
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

function getStartDay(date, courseEvent) {
    const weekdays = courseEvent.days; 
    let day = weekdays[0] === 'T' || weekdays[0] === 'S' ? (weekdays[0] + weekdays[1]): weekdays[0];
    const startDay = new Date(date.setDate(date.getDate() + (constants.weekdays[day] + 1 + 7 - date.getDay()) % 7));
    return getDay(startDay, courseEvent);
}

function getExamDay(courseEvent) {
    return getDay(courseEvent.date, courseEvent);
}

function getDay(date, courseEvent) {
    const startTime = courseEvent.time.split("-")[0].split(":");
    const day = new Date(date);
    const add12 = startTime[1].includes('p') && parseInt(startTime[0]) !== 12;
    return [day.getFullYear(), day.getMonth() + 1, day.getDate(), parseInt(startTime[0]) + (add12 ? 12 : 0), parseInt(startTime[1])];
}

function getDuration(courseEvent) {
    const times = courseEvent.time.split("-")
    let startTime = parseInt(times[0].split(":")[0]) * 60 + parseInt(times[0].split(":")[1])
    if (times[0].includes('p') && parseInt(times[0].split(":")[0]) !== 12) {
        startTime += 12 * 60;
    }
    let endTime = parseInt(times[1].split(":")[0]) * 60 + parseInt(times[1].split(":")[1])
    if (times[1].includes('p') && parseInt(times[1].split(":")[0]) !== 12) {
        endTime += 12 * 60;
    }
    return {hours: Math.floor((endTime - startTime) / 60), minutes: (endTime - startTime) % 60}
}

function getRecurrence(courseEvent, academicQuarter) {
    if (courseEvent.courseType === 'FI' || courseEvent.courseType === 'MI') {
        return 'FREQ=WEEKLY;INTERVAL=1;COUNT=1';
    }

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
    dayFreq = dayFreq.substring(0, dayFreq.length - 1);

    const startTime = courseEvent.time.split("-")[0].split(":");
    const endDate = academicQuarter.end;
    const exDate = academicQuarter.excludedDates.map(date => '\nEXDATE:' + date + 'T' + ("0" + startTime[0]).slice(-2) + startTime[1].slice(0, -1) + '00').join('');

    return `FREQ=WEEKLY;BYDAY=${dayFreq};INTERVAL=1;UNTIL=${endDate.toISOString().replaceAll('-','').replaceAll(':','').replaceAll('.','')}${exDate}`
}

// TODO: only assign values if they're valid (literally all courseEvent fields)
function getJSON(text) {
    const courseEvents = [];

    text = fixCommonErrors(text);
    const courses = splitArrayByPattern(text, getListOfDepartments(true));
    courses.forEach(course => {
        const splitCourse = splitArrayByPattern(course, constants.splitCourseToEventsBefore, constants.splitCourseToEventsAfter)
        const courseDetails = splitCourse[0].split(" ");
        const courseCode = courseDetails[0] + " " + courseDetails[1];
        let courseName = courseDetails.slice(2).join(" ");
        // add back space after comma or period
        courseName = courseName.replaceAll(',', ', ');
        courseName = courseName.replaceAll('.', '. ');
        let professor = "";
        let gradeOption = "";
        let units = "";

        console.log(splitCourse);

        for (let i = 1; i < splitCourse.length; i++) {
            const splitCourseArray = splitCourse[i].split(" ");
            const courseEvent = {};

            if (splitCourse[i].startsWith('Final Exam') || splitCourse[i].startsWith('Midterm')) {
                if (splitCourse[i].startsWith('Final Exam')) {
                    splitCourseArray.shift();    
                }
                splitCourseArray.shift();

                courseEvent['courseType'] = splitCourseArray.shift();
                courseEvent['days'] = splitCourseArray.shift();
                courseEvent['date'] = splitCourseArray.shift();
            } else {
                courseEvent['section'] = splitCourseArray.shift();
                courseEvent['courseType'] = splitCourseArray.shift();
                
                // Not professor name following, not main course event of course
                if (!constants.acceptedWeekdays.includes(splitCourseArray[0])) {
                    while (splitCourseArray.length !== 0 && !constants.gradingOptions.includes(splitCourseArray[0])) {
                        professor += splitCourseArray.shift() + " ";
                    }
                    professor = professor.trim();
                    // add back space after comma or period
                    professor = professor.replaceAll(',', ', ');
                    professor = professor.replaceAll('.', '. ');
                    gradeOption = splitCourseArray.shift();
                    units = splitCourseArray.shift();
                }

                courseEvent['days'] = splitCourseArray.shift();
            }

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

function fixCommonErrors(text) {
    constants.commonErrors.forEach(error => {
        text = text.replaceAll(error[0], error[1])
    })

    return text;
}

function splitArrayByPattern(text, beforePatterns, afterPatterns = []) {
    let indices = [];
    beforePatterns.forEach(pattern => {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(`\\b${pattern}`, 'gm');
        indices = [...indices, ...[...text.matchAll(regex)].map(a => a.index)];
    })
    afterPatterns.forEach(pattern => {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(`\\b${pattern}`, 'gm');
        indices = [...indices, ...[...text.matchAll(regex)].map(a => a.index + a[0].length)];
    })
    indices = [...new Set(indices)];
    indices.sort((a, b) => a - b);

    let splitArray = [];
    // push text before first match
    if (indices[0] !== 0) {
        splitArray.push(text.slice(0, indices[0]).trim());
    }
    for (let i = 0; i < indices.length; i++) {
        splitArray.push(text.slice(indices[i], i !== indices.length - 1 ? indices[i + 1] : text.length).trim())
    }
    splitArray = splitArray.filter(text => text.length !== 0);
    return splitArray;
}

function getListOfDepartments(regex = false) {
    if (regex) {
        return [...constants.deptString.matchAll(/<td>[A-Z]*<\/td>/gm)].map(match => new RegExp(` ${match[0].substring(4, match[0].length - 5)} [0-9]`, 'gm'))
    }
    
    return [...constants.deptString.matchAll(/<td>[A-Z]*<\/td>/gm)].map(match => match[0].substring(4, match[0].length - 5))
}

module.exports = {getJSON, getICS, getListOfDepartments};
