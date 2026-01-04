// TODO: remove unnecessary dependencies from frontend and backend
import React, { Component } from 'react'
import axios from 'axios';
import { createEvents } from 'ics';
import { saveAs } from 'file-saver';

import './App.scss';

import locateImportImg from './assets/images/locate-import.png';
import importButtonImg from './assets/images/import-button.png';
import importCalImg from './assets/images/import-cal.png';
import saveSafari from './assets/images/save-safari.png';
import saveChrome from './assets/images/save-chrome.png';

export class App extends Component {
	constructor(props) {
		super(props)

		this.state = {
			// actual schedule file (form data)
			scheduleFile: undefined,
			// name of original schedule file
			scheduleFileName: undefined,
			// delay to throttle schedule upload requests
			sendScheduleDelay: false,
			// schedule data received from request
			scheduleData: undefined,
			// ics schedule data
			scheduleICS: undefined,
			// schedule status message
			scheduleStatus: '',
			scheduleError: false,
			// schedule's academic quarter - empty until loaded from API
			scheduleQuarter: "",
			// available quarters loaded from API
			availableQuarters: [],
			// loading state for quarters
			quartersLoading: true,
			// whether to include academic calendar events
			includeAcademicCalendar: false,
			// whether or not to resend schedule to backend
			scheduleChanged: true,
		}
	}

	componentDidMount() {
		// Load quarters from API
		this.loadQuarters();

		// drag and drop schedule feature
		const dragDropSchedule = document.getElementById('drag-drop-schedule');
		['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
			dragDropSchedule.addEventListener(eventName, (e) => {
				e.preventDefault();
				e.stopPropagation();
			}, false)
		})

		dragDropSchedule.ondragover = () => {
			dragDropSchedule.classList.add("dragged-over");
		}
		dragDropSchedule.ondragenter = () => {
			dragDropSchedule.classList.add("dragged-over");
		}
		dragDropSchedule.ondragleave = () => {
			dragDropSchedule.classList.remove("dragged-over");
		}
		dragDropSchedule.ondragend = () => {
			dragDropSchedule.classList.remove("dragged-over");
		}
		dragDropSchedule.ondrop = (e) => {
			dragDropSchedule.classList.remove("dragged-over");
			this.setSchedule(e.dataTransfer.files[0])
			document.getElementById('set-schedule').files = e.dataTransfer.files;
		}

		// paste schedule feature
		window.addEventListener('paste', e => {
			this.setSchedule(e.clipboardData.files[0])
			document.getElementById('set-schedule').files = e.clipboardData.files;
		})
	}

	setScheduleQuarter = (e) => {
		this.setState({ scheduleQuarter: e.target.value, scheduleChanged: true })
	}

	loadQuarters = async () => {
		try {
			const response = await axios.get('/api/quarters');
			const { quarters, default: defaultQuarter } = response.data;

			this.setState({
				availableQuarters: quarters,
				scheduleQuarter: defaultQuarter || '',
				quartersLoading: false
			});
		} catch (error) {
			console.error('Failed to load quarters:', error);
			this.setState({
				quartersLoading: false,
				scheduleStatus: 'Failed to load academic quarters. Please refresh the page.',
				scheduleError: true
			});
		}
	}

	setStatus = (status, error) => {
		this.setState({ scheduleStatus: status, scheduleError: error ?? false });
	}

	/**
	 * Sets schedule data and clears schedule data and schedule changed status.
	 * 
	 * @param {*} file file uploaded by user
	 */
	setSchedule = (file) => {
		const scheduleFile = new FormData();

		if (file.type === 'text/html' || (file.name.endsWith('.webarchive'))) {
			if (file.name.endsWith('.webarchive')) {
				scheduleFile.append("html", file, "schedule.webarchive")
			} else if (file.type === 'text/html') {
				scheduleFile.append("html", file, "schedule.html")
			}

			const fileReader = new FileReader();
			fileReader.onload = (e) => {
				this.setState({ scheduleFile, scheduleData: undefined, scheduleICS: undefined, scheduleChanged: true, scheduleFileName: file.name });
			}
			fileReader.readAsText(file);
		} else {
			alert('Please make sure that you have uploaded the correct file (usually named webregMain.html).')
			this.setState({ scheduleFile: undefined, scheduleFileName: undefined })
		}
	}

	clearSchedule = (e) => {
		e.target.value = null;
		this.setState({ scheduleFile: undefined, scheduleFileName: undefined, scheduleData: undefined, scheduleICS: undefined, scheduleChanged: false })
	}

	// Send schedule to backend and create json data / ics file
	sendSchedule = (callback) => {
		if (!this.state.sendScheduleDelay) {
			const scheduleFile = this.state.scheduleFile;
			// add quarter to form data
			if (scheduleFile.has("quarter")) scheduleFile.delete("quarter");
			scheduleFile.append("quarter", this.state.scheduleQuarter);
			// add academic calendar option
			if (scheduleFile.has("includeAcademicCalendar")) scheduleFile.delete("includeAcademicCalendar");
			scheduleFile.append("includeAcademicCalendar", this.state.includeAcademicCalendar);

			// set delay to true, clear stale data, update schedule file, and send schedule
			this.setState({ sendScheduleDelay: true, scheduleFile, scheduleChanged: false, scheduleData: undefined, scheduleICS: undefined }, () => {
				let finished = false;
				this.setStatus("Processing...")

				// if request takes too long, err
				setTimeout(() => {
					if (!finished) {
						this.setStatus("Request is taking a long time. Please try again later.", true)
						this.setState({ scheduleData: undefined, scheduleICS: undefined })
					}
				}, 10000)

				// send request
				axios.post(`/api/converthtml`, this.state.scheduleFile).then(res => {
					// Response is now { events: [...], warnings: [...] }
					const { events, warnings } = res.data;
					const { error, value } = createEvents(events);

					if (error || value === undefined || value.length === 0) {
						this.setStatus("Error creating schedule. Please try again later.", true)
						throw error;
					}

					// update finished to prevent timeout error, update state / status
					finished = true;

					// Show warnings if any
					if (warnings && warnings.length > 0) {
						this.setStatus(`Done! Warning: ${warnings[0]}`, false);
					} else {
						this.setStatus("Done!");
					}

					this.setState({ scheduleData: events, scheduleICS: value }, () => {
						document.getElementById("next-steps-title").scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
						if (callback) callback();
					});
				}).catch(err => {
					finished = true;
					this.setState({ scheduleData: undefined, scheduleICS: undefined })
					// Handle new error response format { message: "..." }
					const errorMsg = err.response?.data?.message
						|| err.response?.data
						|| "Error creating schedule. Please try again later.";
					this.setStatus(errorMsg, true)
				})
			})

			// reset send schedule delay
			setTimeout(() => {
				this.setState({ sendScheduleDelay: false })
			}, 3000);
		} else {
			alert("Please wait a few seconds before uploading another schedule.")
		}
	}

	// Determine if user filled out all required fields and updates error message as well
	validRequest = () => {
		let errorMessage = "";

		if (this.state.scheduleFile === undefined) {
			errorMessage += "Please upload a schedule. "
		}

		if (!this.state.scheduleQuarter || this.state.scheduleQuarter === "") {
			errorMessage += "Please select an academic quarter. "
		}

		if (errorMessage.length === 0) {
			return true;
		} else {
			this.setStatus(errorMessage, true);
			return false;
		}
	}

	// downloads the schedule as an ics file, sends schedule if schedule has changed
	downloadSchedule = (firstRun = true) => {
		if (!this.validRequest()) {
			return;
		}

		if (this.state.scheduleChanged) {
			this.sendSchedule(() => firstRun && this.downloadSchedule(false));
			return;
		}

		if (this.state.scheduleData === undefined) {
			return;
		}

		saveAs(new Blob([this.state.scheduleICS], { type: "text/plain;charset=utf-8" }), "UCSD Schedule.ics");
	}

	render() {
		return (
			<div className="App">
				<h1 className="mt-5 text-center">UCSD WebReg Calendar App</h1>
				<div className="mt-4 px-3 footnote text-center w-100" id="footnote">
					<p>Turn your WebReg schedule into an .ics file that can be imported into your calendar (Google Calendar, Apple Calendar, etc.)</p>
					<p><strong>Privacy is our utmost concern. No uploaded files or personal information is ever shared or saved.</strong></p>
				</div>
				<div className="my-4 content" id="first-steps">
					<h4 className="mb-3">Instructions</h4>
					<ol>
						<li>
							Go to your WebReg schedule (<a href="https://act.ucsd.edu/webreg2" rel="noreferrer" target="_blank">https://act.ucsd.edu/webreg2</a>) and <strong>SELECT a term / quarter</strong>.
						</li>
						<li>
							Right click on the page and "Save as..." or "Save Page As..." with the format / type as <strong>Webpage, Complete (Chrome, Firefox) OR Web Archive (Safari)</strong>.<br />  (It should save a file called webregMain.html or webregMain.webarchive or something similar).
						</li>
					</ol>
					<div className="d-flex space-evenly flex-wrap my-4 ">
						<div className="d-flex flex-column align-items-center mb-3 adaptive-img">
							<h5>Chrome, Firefox:</h5>
							<img className='p-2' style={{ maxWidth: '95%', border: '3px solid black' }} src={saveChrome} alt="Saving WebReg page in Chrome" />
						</div>
						<div className="d-flex flex-column align-items-center mb-3 adaptive-img">
							<h5>Safari:</h5>
							<img className='p-2' style={{ maxWidth: '95%', border: '3px solid black' }} src={saveSafari} alt="Saving WebReg page in Safari" />
						</div>
					</div>
				</div>
				<div className="mb-2 d-flex flex-column content">
					<h4 className="mb-3">Upload your saved WebReg file:</h4>
					<label className="mb-4 mt-2 no-select d-flex flex-column" id="drag-drop-schedule" htmlFor="set-schedule">
						<p className="mb-2">Drag / Paste WebReg Here (or click to upload)</p>
						{this.state.scheduleFile && <p className="m-0"><br /><strong>Uploaded file: {this.state.scheduleFileName}</strong></p>}
						<input className="form-control my-2 d-none" type="file" name="set-schedule" id="set-schedule" onChange={(e) => this.setSchedule(e.target.files[0])} onClick={this.clearSchedule} />
					</label>
					<label htmlFor="select-quarter" className="mt-4 mb-3">
						<h4>Select Academic Quarter</h4>
					</label>
					<select
						id="select-quarter"
						className="form-select"
						aria-label="Academic Quarter"
						onChange={this.setScheduleQuarter}
						value={this.state.scheduleQuarter}
						disabled={this.state.quartersLoading}
					>
						{this.state.quartersLoading ? (
							<option value="">Loading quarters...</option>
						) : (
							<>
								<option value="">Select Schedule's Academic Quarter</option>
								{this.state.availableQuarters.map(q => (
									<option key={q.value} value={q.value}>{q.label}</option>
								))}
							</>
						)}
					</select>
					<div className="form-check mt-3">
						<input
							type="checkbox"
							className="form-check-input"
							id="include-academic-calendar"
							checked={this.state.includeAcademicCalendar}
							onChange={(e) => this.setState({ includeAcademicCalendar: e.target.checked, scheduleChanged: true })}
						/>
						<label className="form-check-label" htmlFor="include-academic-calendar">
							Include UCSD academic calendar events (holidays, deadlines)
						</label>
					</div>
				</div>
				<button className="btn btn-primary mt-4 mb-3" onClick={this.downloadSchedule}>Download Schedule (ICS Format)</button>
				<p style={{ color: this.state.scheduleError ? "#DC3545" : "#198754" }}>{this.state.scheduleStatus}</p>
				{/* TODO: Update */}
				<p className="mb-4 w-100 px-5 text-center"><strong>Having Trouble? Chrome</strong> works best! Fill out this form <a href="https://forms.gle/iCZ6Fu5Lv9gBEXLk8" target="_blank" rel="noreferrer">https://forms.gle/iCZ6Fu5Lv9gBEXLk8</a> and we'll get back to you ASAP!
					<br />
					<strong>Note:</strong> Special Summer Session dates are not supported yet, because of their variable start and end dates.
				</p>
				<div className="my-4 content" id="next-steps">
					<h4 className="mb-4" id="next-steps-title">Next Steps - Adding Downloaded (ICS) Schedule to Google Calendar</h4>
					<p>To import your downloaded schedule (a .ics file) into Google Calendar, follow these steps:</p>
					<ol>
						<li>Locate 'Other calendars' on the left sidebar of your Google Calendar, near the bottom. <strong>Press the plus sign.</strong></li>
						<img className="my-3" style={{ maxHeight: '80vh' }} src={locateImportImg} alt="Locating the import button" /><br />
						<li className="my-4">Select 'Import'. Alternatively, select 'Create new calendar' to create a new calendar for your schedule (and then select 'Import' after).</li>
						<img className="my-3" style={{ maxHeight: '40vh' }} src={importButtonImg} alt="The import button" /><br />
						<li>In the new window, select the ICS file you downloaded. </li>
						<li>Select the calendar you would like to import it into.</li>
						<li>Press import!</li>
						<img className="my-3" src={importCalImg} alt="Importing the calendar." /><br />
					</ol>
				</div>
				<div className="my-4 content">
					<h4 className="mb-4">Footnote</h4>
					<p>Created by UCSD students!</p>
					<p>This app is not affiliated with UCSD. Feedback is appreciated! <a href="https://forms.gle/iCZ6Fu5Lv9gBEXLk8" target="_blank" rel="noreferrer">https://forms.gle/iCZ6Fu5Lv9gBEXLk8</a>.</p>
					<p>Source code: <a href="https://github.com/daniel-ji/webreg-export/" target="_blank" rel="noreferrer">https://github.com/daniel-ji/webreg-export/</a></p>
				</div>
			</div>
		)
	}
}

export default App
