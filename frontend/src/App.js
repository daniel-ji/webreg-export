// TODO: Bug: after bad request can still download file
// TODO: remove unnecessary dependencies from frontend and backend
import React, { Component } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Intro from './components/Intro';
import Preface from './components/Preface';
import Form from './components/Form';
import NextSteps from './components/NextSteps';
import Footnote from './components/Footnote';

import './App.scss';

export class App extends Component {
	render() {
		return (
			<div className="App">
				<BrowserRouter>
					<Routes>
						<Route index element={<Intro />} />
						<Route path="preface" element={<Preface />} />
						<Route path="form" element={<Form />} />
						<Route path="next-steps" element={<NextSteps />} />
						<Route path="footnote" element={<Footnote />} />
					</Routes>
				</BrowserRouter>
			</div>
		)
	}
}

export default App
