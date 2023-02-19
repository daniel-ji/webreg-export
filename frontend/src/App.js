import React, { Component, Fragment } from 'react'
import axios from 'axios';
import { createEvents } from 'ics';
import { saveAs } from 'file-saver';

import './App.scss';

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
		}
	}

	componentDidMount() {
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
		}

	}

	setStatus(status, error) {
		this.setState({scheduleStatus: status, scheduleError: error ?? false});
	}

	setSchedule = (file) => {
		const scheduleFile = new FormData();
		const scheduleType = file.type;
		if (scheduleType === 'image/png') {
			scheduleFile.append("image", file, "schedule.png");
			const schedulePreview = URL.createObjectURL(file);
	
			this.setState({scheduleFile, schedulePreview, scheduleType, scheduleData: undefined, scheduleICS: undefined});
			this.setStatus('')
		} else if (scheduleType === 'image/jpeg') {
			scheduleFile.append("image", file, "schedule.jpg");
			const schedulePreview = URL.createObjectURL(file);
	
			this.setStatus('')
			this.setState({scheduleFile, schedulePreview, scheduleType, scheduleData: undefined, scheduleICS: undefined});
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

	sendSchedule = (callback) => {
		if (!this.state.sendScheduleDelay) {
			this.setState({sendScheduleDelay: true}, () => {
				let finished = false;
				this.setStatus("Processing...")
				setTimeout(() => {
					if (!finished) {
						this.setStatus("Request is taking a long time. Please try again later.", true)
					}
				}, 10000)
				const requestPath = this.state.scheduleType.includes('image') ? 'convertimage' : 'convertpdf';
				axios.post(`http://localhost:8000/${requestPath}`, this.state.scheduleFile).then(res => {
					this.setState({scheduleData: JSON.parse(res.data)})
					const {error, value} = createEvents(JSON.parse(res.data))

					if (error || value === undefined || value.length === 0) {
						this.setStatus("Error creating schedule. Please try again later.", true)
						throw error;
					}

					finished = true;
					this.setStatus("Done!")
					this.setState({scheduleData: JSON.parse(res.data), scheduleICS: value}, callback)
				}).catch(err => {
					console.log(err);
				})
			})
			setTimeout(() => {
				this.setState({sendScheduleDelay: false})
			}, 1000);
		}
	}

	downloadSchedule = (firstRun = true) => {
		if (this.state.scheduleType === undefined) {
			this.setStatus("Please upload a schedule.", true)
			return;
		}

		if (!this.state.scheduleICS) {
			this.sendSchedule(() => firstRun && this.downloadSchedule(false));
			return;
		}
		
		saveAs(new Blob([this.state.scheduleICS], {type: "text/plain;charset=utf-8"}), "UCSD Schedule.ics");
	}

	exportSchedule = () => {
		if (this.state.scheduleType === undefined) {
			this.setStatus("Please upload a schedule.", true)
			return;
		}

		if (!this.state.scheduleICS) {
			this.sendSchedule(this.exportSchedule);
			return;
		}
		
		saveAs(new Blob([this.state.scheduleICS], {type: "text/plain;charset=utf-8"}), "UCSD Schedule.ics");
	}

	render() {
		return (
			<div className="App">
				<h1 className="my-4 text-center">UCSD WebReg Export App</h1>
				<div className="my-3 d-flex flex-column align-items-center">
					<label htmlFor="setSchedule" className="form-label my-3">Upload your schedule here (PNG / JPG), see example&nbsp;
						<a href="https://cdn.discordapp.com/attachments/808568263964753931/1076746824217526322/image.png" target="_blank" rel="noreferrer">here</a>:
					</label>
					<input className="form-control my-2" type="file" id="setSchedule" accept="image/png, image/jpeg, image/jpg" onChange={(e) => this.setSchedule(e.target.files[0])} onClick={(e) => e.target.value = null}/>
					<div className="my-4 no-select" id="drag-drop-schedule">
						Drag and Drop Schedule Here
					</div>
				</div>
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
				<button className="btn btn-primary mt-4 mb-3" onClick={this.downloadSchedule}>Download Schedule (ICS Format)</button>
				<p style={{color: this.state.scheduleError ? "#DC3545" : "#198754"}}>{this.state.scheduleStatus}</p>
				{/* <button className="btn btn-primary my-4" onClick={this.exportSchedule}>Add to Google Calendar</button> */}
				<p className="my-4 footnote">
				To import downloaded schedule into Google Calendar, follow these steps:<br />
				- Locate 'Other calendars' on the left sidebar of your Google Calendar, near the bottom. Press the plus sign and press 'Import'.
				<img className="my-3" src="https://media.discordapp.net/attachments/808568263964753931/1076745103156195378/image.png?width=192&height=671" alt="Locating the import button" /><br/>
				- In the new window, select the ICS file you downloaded. <br />
				- Select the calendar you would like to import it into. <br />
				- Press import!<br/>
				<img className="my-3" src="https://media.discordapp.net/attachments/808568263964753931/1076745772298682428/image.png" alt="Importing the calendar." /><br/>
				</p>
				<p className="my-4 footnote">
				Note: This app is not affiliated with UCSD. It is still in very heavy development and contains many bugs. Apologies for any difficulty you may experience while trying to use the app. 
				<br /><br />
				To submit feedback (which is greatly appreciated!): <a href="https://forms.gle/iCZ6Fu5Lv9gBEXLk8" target="_blank" rel="noreferrer">https://forms.gle/iCZ6Fu5Lv9gBEXLk8</a>. 
				Contact daji@ucsd.edu for any further questions / comments / concerns.<br /><br />
				Regarding privacy, your uploaded schedule is stored in a server temporarily and then deleted immediately after it has been processed.</p>
			</div>
		)
	}
}

export default App