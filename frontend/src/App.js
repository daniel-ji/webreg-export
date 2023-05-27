import React, { Component, Fragment } from 'react'
import axios from 'axios';
import { createEvents } from 'ics';
import { saveAs } from 'file-saver';

import './App.scss';

import locateImportImg from './assets/images/locate-import.png';
import importButtonImg from './assets/images/import-button.png';
import importCalImg from './assets/images/import-cal.png';

export class App extends Component {
	constructor(props) {
	  	super(props)
	
		this.state = {
			// image / pdf preview of schedule
			schedulePreview: undefined,
			// actual schedule file (form data)
			scheduleFile: undefined,
			// type of schedule 
			scheduleType: undefined,
			// delay to throttle schedule upload requests
			sendScheduleDelay: false,
			// schedule data received from request
			scheduleData: undefined,
			// ics schedule data
			scheduleICS: undefined,
			// schedule status message
			scheduleStatus: '',
			scheduleError: false,
			// schedule's academic quarter
			scheduleQuarter: "N/a",
			// whether or not to resend schedule to backend
			scheduleChanged: true,
		}
	}

	componentDidMount() {
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
		this.setState({scheduleQuarter: e.target.value, scheduleChanged: true})
	}

	setStatus = (status, error) => {
		this.setState({scheduleStatus: status, scheduleError: error ?? false});
	}

	/**
	 * Sets schedule data and clears schedule data and schedule changed status.
	 * 
	 * @param {*} file file uploaded by user
	 */
	setSchedule = (file) => {
		const scheduleFile = new FormData();
		const scheduleType = file.type;

		// ensure file type is image
		if (scheduleType === 'image/png' || scheduleType === 'image/jpeg') {
			// adds to form data
			if (scheduleType === 'image/png') {
				scheduleFile.append("image", file, "schedule.png");
			} else {
				scheduleFile.append("image", file, "schedule.jpg");
			}
			const schedulePreview = URL.createObjectURL(file);
	
			// update state and clear status
			this.setState({scheduleFile, schedulePreview, scheduleType, scheduleData: undefined, scheduleICS: undefined, scheduleChanged: true});
			this.setStatus('')
		}
		// } else if (scheduleType === 'application/pdf') {
		// 	scheduleFile.append("pdf", e.target.files[0], "schedule.pdf")

		// 	const fileReader = new FileReader();
		// 	fileReader.onload = (e) => {
		// 		const schedulePreview = e.target.result;
		// 		this.setState({scheduleFile, schedulePreview, scheduleType});
		// 	}
		// 	fileReader.readAsDataURL(e.target.files[0]);
		// } else {
		// 	// handle error here
		// }
	}

	// Send schedule to backend and create json data / ics file
	sendSchedule = (callback) => {
		if (!this.state.sendScheduleDelay) {
			const scheduleFile = this.state.scheduleFile;
			// add quarter to form data
			scheduleFile.append("quarter", this.state.scheduleQuarter);

			// set delay to true, update schedule file, and send schedule
			this.setState({sendScheduleDelay: true, scheduleFile, scheduleChanged: false}, () => {
				let finished = false;
				this.setStatus("Processing...")

				// if request takes too long, err
				setTimeout(() => {
					if (!finished) {
						this.setStatus("Request is taking a long time. Please try again later.", true)
					}
				}, 10000)

				// send request
				const requestPath = this.state.scheduleType.includes('image') ? 'convertimage' : 'convertpdf';
				axios.post(`/api/${requestPath}`, this.state.scheduleFile).then(res => {
					this.setState({scheduleData: JSON.parse(res.data)})
					const {error, value} = createEvents(JSON.parse(res.data))

					if (error || value === undefined || value.length === 0) {
						this.setStatus("Error creating schedule. Please try again later.", true)
						throw error;
					}

					// update finished to prevent timeout error, update state / status, call callback
					finished = true;
					this.setStatus("Done!")
					this.setState({scheduleData: JSON.parse(res.data), scheduleICS: value}, callback)
				}).catch(err => {
					console.log(err);
				})
			})

			// reset send schedule delay
			setTimeout(() => {
				this.setState({sendScheduleDelay: false})
			}, 3000);
		}
	}

	// Determine if user filled out all required fields and updates error message as well
	validRequest = () => {
		let errorMessage = "";

		if (this.state.scheduleType === undefined) {
			errorMessage += "Please upload a schedule. "
		}

		if (this.state.scheduleQuarter === "N/a") {
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
		
		saveAs(new Blob([this.state.scheduleICS], {type: "text/plain;charset=utf-8"}), "UCSD Schedule.ics");
	}

	// exportSchedule = () => {
	// 	if (!this.validRequest()) {
	// 		return;
	// 	}

	// 	if (this.state.scheduleChanged) {
	// 		this.sendSchedule(this.exportSchedule);
	// 		return;
	// 	}
		
	// 	saveAs(new Blob([this.state.scheduleICS], {type: "text/plain;charset=utf-8"}), "UCSD Schedule.ics");
	// }

	render() {
		return (
			<div className="App">
				<h1 className="mt-5 text-center">UCSD WebReg Export App</h1>
				<div className="my-2 d-flex flex-column align-items-center">
					<label htmlFor="set-schedule" className="form-label my-3">Upload your schedule here (PNG / JPG), see example&nbsp;
						<a href="https://cdn.discordapp.com/attachments/808568263964753931/1076746824217526322/image.png" target="_blank" rel="noreferrer">here</a>:
					</label>
					<input className="form-control my-2" type="file" id="set-schedule" accept="image/png, image/jpeg, image/jpg" onChange={(e) => this.setSchedule(e.target.files[0])} onClick={(e) => e.target.value = null}/>
					<div className="mb-5 mt-2 no-select" id="drag-drop-schedule">
						Drag and Drop / Paste Schedule Here
					</div>
					<select className="form-select" aria-label="Academic Quarter" onChange={this.setScheduleQuarter} value={this.state.scheduleQuarter}>
						<option value="N/a">Select Schedule's Academic Quarter</option>
						<option value="winter2023">Winter 2023</option>
						<option value="spring2023">Spring 2023</option>
						<option value="fall2023">Fall 2023</option>
						<option value="winter2024">Winter 2024</option>
					</select>
				</div>
				<button className="btn btn-primary mt-4 mb-3" onClick={this.downloadSchedule}>Download Schedule (ICS Format)</button>
				<p style={{color: this.state.scheduleError ? "#DC3545" : "#198754"}}>{this.state.scheduleStatus}</p>
				{/* <button className="btn btn-primary my-4" onClick={this.exportSchedule}>Add to Google Calendar</button> */}
				{this.state.schedulePreview && 
				<Fragment>
					<h4 className="my-3">Uploaded Schedule File Preview: </h4>
					{this.state.scheduleType === 'application/pdf' ? 
					<object className="sched-pdf-prev" data={this.state.schedulePreview} aria-label="Schedule PDF Preview" />
					:
					<img className="sched-img-prev" alt="Schedule Preview" src={this.state.schedulePreview} />
				}
				</Fragment>
				}
				<div className="my-4 footnote" id="preface">
					<h4 className="mb-4">Preface</h4>
					<p>Thank you for visiting the site! <b>This site takes a screenshot of your schedule and converts it into an .ics file that can be imported into your calendar (Google Calendar, Apple Calendar, Microsoft Outlook, etc.)</b></p>
					<p>This app is not affiliated with UCSD. It is still in development and contains bugs. Apologies for any difficulty you may experience while trying to use the app. The code is open source and can be found at <a href="https://github.com/ucsd-team-rocket/webreg-export" target="_blank" rel="noreferrer">https://github.com/ucsd-team-rocket/webreg-export</a></p>
					<p>To submit feedback, which is greatly appreciated: <a href="https://forms.gle/iCZ6Fu5Lv9gBEXLk8" target="_blank" rel="noreferrer">https://forms.gle/iCZ6Fu5Lv9gBEXLk8</a>.</p> 
					<p>Contact daji@ucsd.edu for any further questions / comments / concerns.</p>
					<p>Regarding privacy, your uploaded schedule is stored in a server temporarily and then deleted immediately after it has been processed.</p>
				</div>
				<div className="my-4 content">
					<h4 className="mb-4">Troubleshooting Guide</h4>
					<p>Sometimes the exported schedule has errors or does not work. With this app still being fine-tuned, this is likely to happen and we're sorry about that.</p>
					<p>To ensure for the highest chance of a properly processed schedule, please check out the example <a href="https://cdn.discordapp.com/attachments/808568263964753931/1076746824217526322/image.png" target="_blank" rel="noreferrer">here</a> and crop the screenshot to something similar, where it's just the schedule. A desktop screenshot will work best.</p>
					<p>Classes with a TBA 'Days' or TBA 'Time' section will not have events created.</p>
				</div>
				<div className="my-4 content" id="next-steps">
					<h4 className="mb-4">Next Steps - Adding Downloaded (ICS) Schedule to Google Calendar</h4>
					<p>To import your downloaded schedule (a .ics file) into Google Calendar, follow these steps:</p>
					<li>Locate 'Other calendars' on the left sidebar of your Google Calendar, near the bottom. Press the plus sign.</li>
					<img className="my-3" src={locateImportImg} alt="Locating the import button" /><br/>
					<li className="my-4">Select 'Import'.</li>
					<img className="my-3" src={importButtonImg} alt="The import button" /><br/>
					<li>In the new window, select the ICS file you downloaded. </li>
					<li>Select the calendar you would like to import it into.</li>
					<li>Press import!</li>
					<img className="my-3" src={importCalImg} alt="Importing the calendar." /><br/>
				</div>
			</div>
		)
	}
}

export default App