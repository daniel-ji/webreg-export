/**
 * Constants used in the OCR process.
 */

// TODO: make into something not as ugly, probably a regex match
// List of all accepted weekdays, used for detecting professor names
const acceptedWeekdays = 
["F", 
"Th", 
"ThF", 
"W", 
"WF", 
"WTh", 
"WThF", 
"Tu", 
"TuF", 
"TuTh", 
"TuThF", 
"TuW", 
"TuWF", 
"TuWTh", 
"TuWThF", 
"M", 
"MF", 
"MTh", 
"MThF", 
"MW", 
"MWF", 
"MWTh", 
"MWThF", 
"MTu", 
"MTuF", 
"MTuTh", 
"MTuThF", 
"MTuW", 
"MTuWF", 
"MTuWTh", 
"MTuWThF", 
"Sa",
"Su"];

// a regex to ensure parsed course event time is in the correct format 
const timeRegexMatch = /[0-9]{1,2}:[0-9]{2}[ap]-[0-9]{1,2}:[0-9]{2}[ap]/gm;

// a list of academic quarters' start, end, and holidays
const academicQuarters = {
    spring2023: {
        start:  new Date(new Date('4/3/2023').toLocaleDateString('en-US', {timeZone: 'America/Los_Angeles'})),
        end: new Date(new Date('6/10/2023').toLocaleDateString('en-US', {timeZone: 'America/Los_Angeles'})),
        excludedDates: ['20230529'] 
    },
    winter2023: {
        start:  new Date(new Date('1/9/2023').toLocaleDateString('en-US', {timeZone: 'America/Los_Angeles'})),
        end: new Date(new Date('3/18/2023').toLocaleDateString('en-US', {timeZone: 'America/Los_Angeles'})),
        excludedDates: ['20230116', '20230220']
    }
}

// conversion from weekday string to number
const weekdays = {'M': 0, 'Tu': 1, 'W': 2, 'Th': 3, 'F': 4, 'Sa': 5, 'Su': 6};

// list of string to split schedule into respective separate courses, keywords at the end of courses
const splitCourseToEventsAfter = ["Enrolled Drop Change", "Planned Remove Enroll"]

// list of string to split schedule into respective separate course events, keywords at the beginning of course events
// / [A-Z0-9][0-9]{2} [A-Z]{2} /gm: matches section code and also type of course event for extra validation, e.g. B00 LE, 100 IN
const splitCourseToEventsBefore = [" Midterm ", " Final Exam ", / [A-Z0-9][0-9]{2} [A-Z]{2} /gm]

// list of grading options for parsing and validation
const gradingOptions = ["L", "P/NP"];

// list of common errors in OCR, and their replacements
const commonErrors = [[" ВОО ", " B00 "], [" DOO ", " D00 "], [" BOO ", " B00 "]];

// list of strings to omit from the OCR output
const omittedStrings = ["|", "=", "<"];

// TODO: make scrapable
// List of all departments, copy pasted table from https://blink.ucsd.edu/instructors/courses/schedule-of-classes/subject-codes.html 
const deptString = `<tbody>
<tr>
<th>Code</th>
<th>Description</th>
</tr>
<tr>
<td>AAPI</td>
<td><span>Asian American and Pacific Islander Studies</span></td>
</tr>
<tr>
<td>AAS</td>
<td>African American Studies</td>
</tr>
<tr>
<td>AESE</td>
<td>Architecture Based Enterprise Systems Engineering</td>
</tr>
<tr>
<td>AIP</td>
<td>Academic Internship Program</td>
</tr>
<tr>
<td>ANAR</td>
<td>Anthropological Archaeology</td>
</tr>
<tr>
<td>ANBI</td>
<td>Anthropology/ Biological Anthropology</td>
</tr>
<tr>
<td>ANES</td>
<td>Anesthesiology</td>
</tr>
<tr>
<td>ANSC</td>
<td>Anthro/ Sociocultural Anthropology</td>
</tr>
<tr>
<td>ANTH</td>
<td>Anthropology</td>
</tr>
<tr>
<td>AUD</td>
<td>Audiology</td>
</tr>
<tr>
<td>AWP</td>
<td>Analytical&nbsp;Writing Program</td>
</tr>
<tr>
<td>BENG</td>
<td>Bioengineering</td>
</tr>
<tr>
<td>BGGN</td>
<td>Biology/ Grad/ General</td>
</tr>
<tr>
<td>BGJC</td>
<td>Biology/ Grad/ Journal Club</td>
</tr>
<tr>
<td>BGRD</td>
<td>Biology/ Grad/ Research Discussion</td>
</tr>
<tr>
<td>BGSE</td>
<td>Biology/ Grad/ Seminar</td>
</tr>
<tr>
<td>BIBC</td>
<td>Biology/ Biochemistry</td>
</tr>
<tr>
<td>BICD</td>
<td>Biology/ Genetics, Cellular and Developmental</td>
</tr>
<tr>
<td>BIEB</td>
<td>Biology/ Ecology, Behavior, and Evolutionary</td>
</tr>
<tr>
<td>BILD</td>
<td>Biology/ Lower Division</td>
</tr>
<tr>
<td>BIMM</td>
<td>Biology/ Molecular Biology, Microbiology</td>
</tr>
<tr>
<td>BIOM</td>
<td>Biomedical Sciences</td>
</tr>
<tr>
<td>BIPN</td>
<td>Biology/ Animal Physiology and Neuroscience</td>
</tr>
<tr>
<td>BISP</td>
<td>Biology/ Special Studies</td>
</tr>
<tr>
<td>BNFO</td>
<td>Bioinformatics</td>
</tr>
<tr>
<td>CAT</td>
<td>Culture, Art, and Technology</td>
</tr>
<tr>
<td>CCS</td>
<td>Climate Change Studies</td>
</tr>
<tr>
<td>CENG</td>
<td>Chemical Engineering</td>
</tr>
<tr>
<td>CGS</td>
<td>Critical Gender Studies</td>
</tr>
<tr>
<td>CHEM</td>
<td>Chemistry and Biochemistry</td>
</tr>
<tr>
<td>CHIN</td>
<td>Chinese Studies</td>
</tr>
<tr>
<td>CLAS</td>
<td>Classical Studies</td>
</tr>
<tr>
<td>CLIN</td>
<td>Clinical Psychology</td>
</tr>
<tr>
<td>CLRE</td>
<td>Clinical Research</td>
</tr>
<tr>
<td>CLSS</td>
<td>Classics</td>
</tr>
<tr>
<td>CLX</td>
<td>Chicanx and Latinx Studies</td>
</tr>
<tr>
<td>CMM</td>
<td>Cellular &amp; Molecular Medicine</td>
</tr>
<tr>
<td>COGR</td>
<td>Communication/ Graduate</td>
</tr>
<tr>
<td>COGS</td>
<td>Cognitive Science</td>
</tr>
<tr>
<td>COMM</td>
<td>Communication</td>
</tr>
<tr>
<td>CONT</td>
<td>Contemporary Issues</td>
</tr>
<tr>
<td>CSE</td>
<td>Computer Science and Engineering</td>
</tr>
<tr>
<td>CSS</td>
<td><span>Computational Social Science</span></td>
</tr>
<tr>
<td>DDPM</td>
<td><span>Drug Development and Product Management</span></td>
</tr>
<tr>
<td>DERM</td>
<td><span>Dermatology</span></td>
</tr>
<tr>
<td>DOC</td>
<td><span>Dimensions of Culture</span></td>
</tr>
<tr>
<td>DSC</td>
<td>Data Science</td>
</tr>
<tr>
<td>DSE</td>
<td>Data Science and Engineering</td>
</tr>
<tr>
<td>DSGN</td>
<td>Design</td>
</tr>
<tr>
<td>EAP</td>
<td>Education Abroad Program</td>
</tr>
<tr>
<td>ECE</td>
<td>Electrical and Computer Engineering</td>
</tr>
<tr>
<td>ECON</td>
<td>Economics</td>
</tr>
<tr>
<td>EDS</td>
<td>Education Studies</td>
</tr>
<tr>
<td>EMED</td>
<td>Emergency Medicine</td>
</tr>
<tr>
<td>ENG</td>
<td>Engineering</td>
</tr>
<tr>
<td>ENVR</td>
<td>Environmental Studies</td>
</tr>
<tr>
<td>ERC</td>
<td>Eleanor Roosevelt College</td>
</tr>
<tr>
<td>ESYS</td>
<td>Environmental Systems</td>
</tr>
<tr>
<td>ETHN</td>
<td>Ethnic Studies</td>
</tr>
<tr>
<td>ETIM</td>
<td>Ethnic Studies/ Interdisciplinary Research Methods</td>
</tr>
<tr>
<td>EXPR</td>
<td>Exchange Programs</td>
</tr>
<tr>
<td>FILM</td>
<td>Film Studies</td>
</tr>
<tr>
<td>FMPH</td>
<td>Family Medicine and Public Health</td>
</tr>
<tr>
<td>FPM</td>
<td>Family and Preventive Medicine</td>
</tr>
<tr>
<td>GLBH</td>
<td>Global Health</td>
</tr>
<tr>
<td>GMST</td>
<td>German Studies Program</td>
</tr>
<tr>
<td>GPCO</td>
<td>GPS/ Core</td>
</tr>
<tr>
<td>GPEC</td>
<td>GPS/ Economics</td>
</tr>
<tr>
<td>GPGN</td>
<td>GPS/ General</td>
</tr>
<tr>
<td>GPIM</td>
<td>GPS/ International Management</td>
</tr>
<tr>
<td>GPLA</td>
<td>GPS/ Language</td>
</tr>
<tr>
<td>GPPA</td>
<td>GPS/ Policy Analytics</td>
</tr>
<tr>
<td>GPPS</td>
<td>GPS/ Political Science</td>
</tr>
<tr>
<td>GSS</td>
<td>Global South Studies</td>
</tr>
<tr>
<td>HDP</td>
<td>Human Development Program</td>
</tr>
<tr>
<td>HDS</td>
<td>Human Developmental Sciences</td>
</tr>
<tr>
<td>HIAF</td>
<td>History of Africa</td>
</tr>
<tr>
<td>HIEA</td>
<td>History of East Asia</td>
</tr>
<tr>
<td>HIEU</td>
<td>History of Europe</td>
</tr>
<tr>
<td>HIGL</td>
<td>History, Global</td>
</tr>
<tr>
<td>HIGR</td>
<td>History, Graduate</td>
</tr>
<tr>
<td>HILA</td>
<td>History of Latin America</td>
</tr>
<tr>
<td>HILD</td>
<td>History, Lower Division</td>
</tr>
<tr>
<td>HINE</td>
<td>History of the Near East</td>
</tr>
<tr>
<td>HISC</td>
<td>History of Science</td>
</tr>
<tr>
<td>HITO</td>
<td>History Topics</td>
</tr>
<tr>
<td>HIUS</td>
<td>History of the United States</td>
</tr>
<tr>
<td>HLAW</td>
<td>Health Law</td>
</tr>
<tr>
<td>HMNR</td>
<td>Human Rights</td>
</tr>
<tr>
<td>HUM</td>
<td>Humanities</td>
</tr>
<tr>
<td>ICAM</td>
<td>Computing and the Arts</td>
</tr>
<tr>
<td>ICEP</td>
<td>Intercampus Exchange Program</td>
</tr>
<tr>
<td>INTL</td>
<td>International Studies</td>
</tr>
<tr>
<td>IRLA</td>
<td>International Relations/ Pacific Study-Language</td>
</tr>
<tr>
<td>JAPN</td>
<td>Japanese Studies</td>
</tr>
<tr>
<td>JWSP</td>
<td>Jewish Studies Program</td>
</tr>
<tr>
<td>LATI</td>
<td>Latin American Studies</td>
</tr>
<tr>
<td>LAWS</td>
<td>Law and Society</td>
</tr>
<tr>
<td>LHCO</td>
<td>Leadership/ Health Care Organizations</td>
</tr>
<tr>
<td>LIAB</td>
<td>Linguistics/ Arabic</td>
</tr>
<tr>
<td>LIDS</td>
<td>Linguistics/ Directed Study-Language</td>
</tr>
<tr>
<td>LIEO</td>
<td>Linguistics/ Esperanto</td>
</tr>
<tr>
<td>LIFR</td>
<td>Linguistics/ French</td>
</tr>
<tr>
<td>LIGM</td>
<td>Linguistics/ German</td>
</tr>
<tr>
<td>LIGN</td>
<td>Linguistics/ General</td>
</tr>
<tr>
<td>LIHI</td>
<td>Linguistics/ Hindi</td>
</tr>
<tr>
<td>LIHL</td>
<td>Linguistics/ Heritage Languages</td>
</tr>
<tr>
<td>LIIT</td>
<td>Linguistics/ Italian</td>
</tr>
<tr>
<td>LIPO</td>
<td>Linguistics/ Portuguese</td>
</tr>
<tr>
<td>LISL</td>
<td>Linguistics/ American Sign Language</td>
</tr>
<tr>
<td>LISP</td>
<td>Linguistics/ Spanish</td>
</tr>
<tr>
<td>LTAF</td>
<td>Literature/ African</td>
</tr>
<tr>
<td>LTAM</td>
<td>Literature of the Americas</td>
</tr>
<tr>
<td>LTCH</td>
<td>Literature/ Chinese</td>
</tr>
<tr>
<td>LTCO</td>
<td>Literature/ Comparative</td>
</tr>
<tr>
<td>LTCS</td>
<td>Literature/ Cultural Studies</td>
</tr>
<tr>
<td>LTEA</td>
<td>Literatures/ East Asian</td>
</tr>
<tr>
<td>LTEN</td>
<td>Literatures in English</td>
</tr>
<tr>
<td>LTEU</td>
<td>Literature/ European and Eurasian</td>
</tr>
<tr>
<td>LTFR</td>
<td>Literature/ French</td>
</tr>
<tr>
<td>LTGK</td>
<td>Literature/ Greek</td>
</tr>
<tr>
<td>LTGM</td>
<td>Literature/ German</td>
</tr>
<tr>
<td>LTIT</td>
<td>Literature/ Italian</td>
</tr>
<tr>
<td>LTKO</td>
<td>Literature/ Korean</td>
</tr>
<tr>
<td>LTLA</td>
<td>Literature/ Latin</td>
</tr>
<tr>
<td>LTRU</td>
<td>Literature/ Russian</td>
</tr>
<tr>
<td>LTSP</td>
<td>Literature/ Spanish</td>
</tr>
<tr>
<td>LTTH</td>
<td>Literature/ Theory</td>
</tr>
<tr>
<td>LTWL</td>
<td>Literatures of the World</td>
</tr>
<tr>
<td>LTWR</td>
<td>Literature/ Writing</td>
</tr>
<tr>
<td>MAE</td>
<td>Mechanical and Aerospace Engineering</td>
</tr>
<tr>
<td>MATH</td>
<td>Mathematics</td>
</tr>
<tr>
<td>MATS</td>
<td>Materials Science and Engineering</td>
</tr>
<tr>
<td>MBC</td>
<td>Marine Biodiversity &amp; Conservation</td>
</tr>
<tr>
<td>MCWP</td>
<td>Muir College Writing Program</td>
</tr>
<tr>
<td>MDE</td>
<td>Medical Device Engineering</td>
</tr>
<tr>
<td>MED</td>
<td>Medicine</td>
</tr>
<tr>
<td>MGT</td>
<td>Rady School of Management</td>
</tr>
<tr>
<td>MGTA</td>
<td><span>Rady School of Management Business Analytics</span></td>
</tr>
<tr>
<td>MGTF</td>
<td>Rady School of Management Finance</td>
</tr>
<tr>
<td>MGTP</td>
<td>Rady School of Management Professional Accountancy</td>
</tr>
<tr>
<td>MMW</td>
<td>Making of the Modern World</td>
</tr>
<tr>
<td>MSED</td>
<td>Mathematics and Science Education</td>
</tr>
<tr>
<td>MSP</td>
<td>Muir Special Projects</td>
</tr>
<tr>
<td>MUIR</td>
<td>Muir College</td>
</tr>
<tr>
<td>MUS</td>
<td>Music</td>
</tr>
<tr>
<td>NANO</td>
<td>Nanoengineering</td>
</tr>
<tr>
<td>NEU</td>
<td>Neurosciences</td>
</tr>
<tr>
<td>NEUG</td>
<td>Neurosciences/ Graduate</td>
</tr>
<tr>
<td>OBG</td>
<td>Obstetrics and Gynecology</td>
</tr>
<tr>
<td>OPTH</td>
<td>Ophthalmology</td>
</tr>
<tr>
<td>ORTH</td>
<td>Orthopedics</td>
</tr>
<tr>
<td>PATH</td>
<td>Pathology</td>
</tr>
<tr>
<td>PEDS</td>
<td>Pediatrics</td>
</tr>
<tr>
<td>PH</td>
<td>Public Health</td>
</tr>
<tr>
<td>PHAR</td>
<td>Pharmacology</td>
</tr>
<tr>
<td>PHB</td>
<td>Public Health/ Biostatistics</td>
</tr>
<tr>
<td>PHIL</td>
<td>Philosophy</td>
</tr>
<tr>
<td>PHLH</td>
<td>Public Health/&nbsp;Leadership/ Health Care Organizations&nbsp;</td>
</tr>
<tr>
<td>PHYA</td>
<td>Physics/ Astronomy</td>
</tr>
<tr>
<td>PHYS</td>
<td>Physics</td>
</tr>
<tr>
<td>POLI</td>
<td>Political Science</td>
</tr>
<tr>
<td>PSY</td>
<td>Psychiatry</td>
</tr>
<tr>
<td>PSYC</td>
<td>Psychology</td>
</tr>
<tr>
<td>RAD</td>
<td>Radiology</td>
</tr>
<tr>
<td>RELI</td>
<td>Religion, Study of</td>
</tr>
<tr>
<td>REV</td>
<td>Revelle College</td>
</tr>
<tr>
<td>RMAS</td>
<td>Radiation Medicine and Applied Sciences</td>
</tr>
<tr>
<td>RMED</td>
<td>Reproductive Medicine</td>
</tr>
<tr>
<td>SE</td>
<td>Structural Engineering</td>
</tr>
<tr>
<td>SEV</td>
<td>Seventh College</td>
</tr>
<tr>
<td>SIO</td>
<td>Scripps Institution of Oceanography</td>
</tr>
<tr>
<td>SIOB</td>
<td>Scripps Institution of Oceanography/ Ocean Biosciences Program</td>
</tr>
<tr>
<td>SIOC</td>
<td>Scripps Institution of Oceanography/ <span>Climate, Oceans, Atmosphere Program</span></td>
</tr>
<tr>
<td>SIOG</td>
<td>Scripps Institution of Oceanography/ <span>Geosciences of Earth, Oceans and Planets</span></td>
</tr>
<tr>
<td>SOCE</td>
<td>Sociology/ Individual Research and Honors Project</td>
</tr>
<tr>
<td>SOCG</td>
<td>Sociology/ Graduate</td>
</tr>
<tr>
<td>SOCI</td>
<td>Sociology</td>
</tr>
<tr>
<td>SOCL</td>
<td>Sociology/ Lower Division</td>
</tr>
<tr>
<td>SOMC</td>
<td>School of Medicine Core Courses</td>
</tr>
<tr>
<td>SOMI</td>
<td>School of Medicine Interdisciplinary</td>
</tr>
<tr>
<td>SPPH</td>
<td>SSPPS/ Pharmaceutical Sciences</td>
</tr>
<tr>
<td>SPPS</td>
<td>Pharmacy</td>
</tr>
<tr>
<td>SURG</td>
<td>Surgery</td>
</tr>
<tr>
<td>SXTH</td>
<td>Sixth College</td>
</tr>
<tr>
<td>SYN</td>
<td>Synthesis Program</td>
</tr>
<tr>
<td>TDAC</td>
<td>Theatre/ Acting</td>
</tr>
<tr>
<td>TDDE</td>
<td>Theatre/ Design</td>
</tr>
<tr>
<td>TDDM</td>
<td>Dance/ Dance Making</td>
</tr>
<tr>
<td>TDDR</td>
<td>Theatre/ Directing and Stage Management</td>
</tr>
<tr>
<td>TDGE</td>
<td>Theatre/ General</td>
</tr>
<tr>
<td>TDGR</td>
<td>Theatre/ Graduate</td>
</tr>
<tr>
<td>TDHD</td>
<td>Dance/ History</td>
</tr>
<tr>
<td>TDHT</td>
<td>Theatre/ History &amp; Theory</td>
</tr>
<tr>
<td>TDMV</td>
<td>Dance/ Movement</td>
</tr>
<tr>
<td>TDPF</td>
<td>Dance/ Performance</td>
</tr>
<tr>
<td>TDPR</td>
<td>Theatre Dance/ Practicum</td>
</tr>
<tr>
<td>TDPW</td>
<td>Theatre/ Playwriting</td>
</tr>
<tr>
<td>TDTR</td>
<td>Dance/ Theory</td>
</tr>
<tr>
<td>TKS</td>
<td>Transnational Korean Studies</td>
</tr>
<tr>
<td>TMC</td>
<td>Thurgood Marshall College</td>
</tr>
<tr>
<td>TWS</td>
<td>Third World Studies</td>
</tr>
<tr>
<td>UROL</td>
<td>Urology</td>
</tr>
<tr>
<td>USP</td>
<td>Urban Studies and Planning</td>
</tr>
<tr>
<td>VIS</td>
<td>Visual Arts</td>
</tr>
<tr>
<td>WARR</td>
<td>Warren College</td>
</tr>
<tr>
<td>WCWP</td>
<td>Warren College Writing Program</td>
</tr>
<tr>
<td>WES</td>
<td>Wireless Embedded Systems</td>
</tr>
</tbody>`;

module.exports = {deptString, acceptedWeekdays, splitCourseToEventsAfter, splitCourseToEventsBefore, gradingOptions, commonErrors, weekdays, academicQuarters, omittedStrings, timeRegexMatch};