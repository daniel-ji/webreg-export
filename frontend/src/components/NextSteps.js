import React from 'react'
import { Link } from 'react-router-dom'

import locateImportImg from '../assets/images/locate-import.png';
import importButtonImg from '../assets/images/import-button.png';
import importCalImg from '../assets/images/import-cal.png';

function NextSteps() {
	return (
		<div id="next-steps-container" className="content">
			{/* TODO: Update */}
			<div className="my-4 content" id="next-steps">
				<h4 className="mb-4">Next Steps - Adding Downloaded (ICS) Schedule to Google Calendar</h4>
				<p>To import your downloaded schedule (a .ics file) into Google Calendar, follow these steps:</p>
				<ol>
					<li>Locate 'Other calendars' on the left sidebar of your Google Calendar, near the bottom. <strong>Press the plus sign.</strong></li>
					<img className="my-3" style={{ maxHeight: '80vh' }} src={locateImportImg} alt="Locating the import button" /><br />
					<li className="my-4">Select 'Import'.</li>
					<img className="my-3" style={{ maxHeight: '40vh' }} src={importButtonImg} alt="The import button" /><br />
					<li>In the new window, select the ICS file you downloaded. </li>
					<li>Select the calendar you would like to import it into.</li>
					<li>Press import!</li>
					<img className="my-3" src={importCalImg} alt="Importing the calendar." /><br />
				</ol>
			</div>
		</div>
	)
}

export default NextSteps