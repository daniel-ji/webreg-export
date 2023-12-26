import React from 'react'
import { Link } from "react-router-dom";

function Intro(props) {
	return (
		<div id="intro-container">
			<h1 className="mb-3 mt-0 text-center" id="site-title">UCSD WebReg Export App</h1>
			<div className="mt-4 footnote text-center w-100" id="footnote">
				<h1 className="mb-4">{'Get Your Classes on Google Calendar in 2 Minutes!'}</h1>
			</div>
			<Link to="/preface" className="mt-5 btn btn-outline-primary next-button">Continue</Link>
		</div>
	)
}

export default Intro