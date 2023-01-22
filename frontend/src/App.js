import React, { Component } from 'react'

import axios from 'axios';

import './App.scss';

export class App extends Component {
	constructor(props) {
	  	super(props)
	
		this.state = {
			scheduleData: undefined,
			scheduleType: undefined
		}
	}

	uploadSchedule = (e) => {
		const scheduleData = new FormData();
		scheduleData.append("image", e.target.files[0], "image.png");
		this.setState({scheduleData});
	}

	sendSchedule = () => {
		axios.post('http://localhost:8000/convertimage', this.state.scheduleData).then(res => {
			console.log(res);
		}).catch(err => {
			console.log(err);
		})
	}

	render() {
		return (
			<div className="App">
				<h1 className="my-4 text-center">UCSD WebReg Export App</h1>
				<div className="my-3 d-flex flex-column align-items-center">
					<label htmlFor="formFile" className="form-label my-3">Upload your schedule here:</label>
					<input className="form-control" type="file" id="formFile" onChange={this.uploadSchedule}/>
				</div>
				<button className="btn btn-primary my-4" onClick={this.sendSchedule}>Export Schedule</button>
			</div>
		)
	}
}

export default App