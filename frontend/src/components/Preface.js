import React from 'react'
import { Link } from "react-router-dom";

export default function Preface() {
	return (
		<div id="preface-container" className="content">
			<h3 className="mb-5">This site takes your WebReg schedule and converts it into an .ics file that can be imported into your calendar (Google Calendar, Apple Calendar, Microsoft Outlook, etc.)</h3>
			<h3 className="mt-4">Privacy is our utmost concern. Your uploaded file is stored temporarily and then deleted immediately after. No personal information is ever processed / stored.</h3>
			<Link to="/form" className="mt-5 btn btn-outline-primary next-button">Continue</Link>
		</div>
	)
}
