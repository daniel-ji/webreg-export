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
		}
	}

	setSchedule = (e) => {
		const scheduleFile = new FormData();
		const scheduleType = e.target.files[0].type;
		if (scheduleType === 'image/png') {
			scheduleFile.append("image", e.target.files[0], "schedule.png");
			const schedulePreview = URL.createObjectURL(e.target.files[0]);
	
			this.setState({scheduleFile, schedulePreview, scheduleType});
		} else if (scheduleType === 'image/jpeg') {
			scheduleFile.append("image", e.target.files[0], "schedule.jpg");
			const schedulePreview = URL.createObjectURL(e.target.files[0]);
	
			this.setState({scheduleFile, schedulePreview, scheduleType});
		} else if (scheduleType === 'application/pdf') {
			scheduleFile.append("pdf", e.target.files[0], "schedule.pdf")

			const fileReader = new FileReader();
			fileReader.onload = (e) => {
				const schedulePreview = e.target.result;
				this.setState({scheduleFile, schedulePreview, scheduleType});
			}
			fileReader.readAsDataURL(e.target.files[0]);
		} else {
			// handle error here
		}
	}

	sendSchedule = (callback) => {
		if (!this.state.sendScheduleDelay) {
			this.setState({sendScheduleDelay: true}, () => {
				const requestPath = this.state.scheduleType.includes('image') ? 'convertimage' : 'convertpdf';
				axios.post(`http://localhost:8000/${requestPath}`, this.state.scheduleFile).then(res => {
					this.setState({scheduleData: JSON.parse(res.data)})
					const {error, value} = createEvents(JSON.parse(res.data))

					if (error) {
						alert("Error creating schedule. Please try again later.")
						throw error;
					}

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

	downloadSchedule = () => {
		if (!this.state.scheduleICS) {
			this.sendSchedule(this.downloadSchedule);
			return;
		}
		
		saveAs(new Blob([this.state.scheduleICS], {type: "text/plain;charset=utf-8"}), "UCSD Schedule.ics");
	}

	exportSchedule = () => {
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
					<label htmlFor="setSchedule" className="form-label my-3">Upload your schedule here (PNG / JPG / PDF):</label>
					<input className="form-control" type="file" id="setSchedule" accept="image/png, image/jpeg, image/jpg, application/pdf" onChange={this.setSchedule} onClick={(e) => e.target.value = null}/>
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
				<button className="btn btn-primary my-4" onClick={this.exportSchedule}>Add to Google Calendar</button>
			</div>
		)
	}
}

export default App