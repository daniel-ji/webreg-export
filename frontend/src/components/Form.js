import React, { Component } from 'react'

import axios from 'axios';
import { createEvents } from 'ics';
import { saveAs } from 'file-saver';

export class Form extends Component {
	constructor(props) {
		super(props)

		this.state = {
			// actual schedule file (form data)
			scheduleFile: undefined,
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
			scheduleQuarter: "winter2024",
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
		this.setState({ scheduleQuarter: e.target.value, scheduleChanged: true })
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

		if (file.type === 'text/html') {
			scheduleFile.append("html", file, "schedule.html")

			const fileReader = new FileReader();
			fileReader.onload = (e) => {
				this.setState({ scheduleFile, scheduleData: undefined, scheduleICS: undefined, scheduleChanged: true });
			}
			fileReader.readAsText(file);
		} else {
			alert('Please make sure that you have uploaded the correct file (usually named webregMain.html).')
			this.setState({ scheduleFile: undefined })
		}
	}

	// Send schedule to backend and create json data / ics file
	sendSchedule = (callback) => {
		if (!this.state.sendScheduleDelay) {
			const scheduleFile = this.state.scheduleFile;
			// add quarter to form data
			scheduleFile.append("quarter", this.state.scheduleQuarter);

			// set delay to true, update schedule file, and send schedule
			this.setState({ sendScheduleDelay: true, scheduleFile, scheduleChanged: false }, () => {
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
					const { error, value } = createEvents(JSON.parse(res.data))

					if (error || value === undefined || value.length === 0) {
						this.setStatus("Error creating schedule. Please try again later.", true)
						throw error;
					}

					// update finished to prevent timeout error, update state / status, call callback
					finished = true;
					this.setStatus("Done!")
					this.setState({ scheduleData: JSON.parse(res.data), scheduleICS: value }, callback)
				}).catch(err => {
					console.log(err);
				})
			})

			// reset send schedule delay
			setTimeout(() => {
				this.setState({ sendScheduleDelay: false })
			}, 3000);
		}
	}

	// Determine if user filled out all required fields and updates error message as well
	validRequest = () => {
		let errorMessage = "";

		if (this.state.scheduleFile === undefined) {
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

		if (this.state.scheduleData === undefined) {
			return;
		}

		saveAs(new Blob([this.state.scheduleICS], { type: "text/plain;charset=utf-8" }), "UCSD Schedule.ics");
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
			<div id="form-container">
				<div className="my-4 content" id="first-steps">
					<h2 className="mb-3 text-center">Instructions</h2>
					<ol>
						<li>
							Go to your WebReg schedule (<a href="https://act.ucsd.edu/webreg2" rel="noreferrer" target="_blank">https://act.ucsd.edu/webreg2</a>) and select a term / quarter.
						</li>
						<li>
							Right click on the page and select "Save As...". Press Enter.
						</li>
						<li>
							Upload the downloaded file below (usually named something like webregMain.html).
						</li>
					</ol>
				</div>
				<div className="mb-2 d-flex flex-column content">
					<label htmlFor="select-quarter" className="mt-4 mb-3 text-center">
						<h2>Select Academic Quarter</h2>
					</label>
					<select id="select-quarter" className="form-select mb-5" aria-label="Academic Quarter" onChange={this.setScheduleQuarter} value={this.state.scheduleQuarter}>
						<option value="N/a">Select Schedule's Academic Quarter</option>
						<option value="fall2023">Fall 2023</option>
						<option value="winter2024">Winter 2024</option>
						<option value="spring2024">Spring 2024</option>
					</select>
					<label htmlFor="set-schedule my-3 text-center">
						<h2 className="mb-3 text-center">Upload your WebReg file:</h2>
					</label>
					<input className="form-control my-2" type="file" id="set-schedule" accept="text/html" onChange={(e) => this.setSchedule(e.target.files[0])} onClick={(e) => e.target.value = null} />
					<div className="mb-4 mt-2 no-select" id="drag-drop-schedule">
						Drag and Drop / Paste WebReg Here
					</div>
				</div>
				<button className="btn btn-primary mt-4 mb-3" onClick={this.downloadSchedule}>Download Schedule (ICS Format)</button>
				<p style={{ color: this.state.scheduleError ? "#DC3545" : "#198754" }}>{this.state.scheduleStatus}</p>
			</div>
		)
	}
}

export default Form