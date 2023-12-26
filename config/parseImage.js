//////////////////////////////////////////////////////////////////////////////////////////////
//
// NOTE: THIS FILE IS NO LONGER USED ANYMORE, AFTER SWITCHING TO HTML PARSING INSTEAD OF OCR.
//
//////////////////////////////////////////////////////////////////////////////////////////////

const sizeOf = require('image-size');
const constants = require('./constants');

/**
 * Gets the text from an image, to be passed to parseHTML for parsing. 
 *
 * @param {String} image path of image to parse 
 * @return {String} text from image, cropped to be ready for parsing 
 */
async function getText(image) {
	try {
		// Get image dimensions
		const dimensions = sizeOf(image);

		// Imports the Google Cloud client library
		const vision = require('@google-cloud/vision');

		// Creates a client
		const client = new vision.ImageAnnotatorClient();

		// Performs label detection on the image file
		const [result] = await client.textDetection(image);

		const detections = result.textAnnotations;

		// get string list of ucsd departments 
		const depts = constants.getListOfDepartments();

		// sort text (approximation) before getting text height to help with getting the baseline text height
		// sorts top to bottom, left to right
		detections.sort((a, b) => {
			if (Math.abs(a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y) <= 10 * 1.5) {
				return a.boundingPoly.vertices[0].x - b.boundingPoly.vertices[0].x;
			} else {
				return a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y
			}
		})

		// get the baseline height of text input (for determining if words are on the same line for sorting)
		const textHeight = getTextHeight(detections, dimensions, depts);

		// sort text one more time
		detections.sort((a, b) => {
			if (Math.abs(a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y) <= textHeight * 1.5) {
				return a.boundingPoly.vertices[0].x - b.boundingPoly.vertices[0].x;
			} else {
				return a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y
			}
		})

		// text from image
		let text = "";
		let lastTopY = 0;

		// don't add space for provided delimiters, or following word (already has spaces) 
		const noSpaceDelimiters = [",", ":", "-", "/", ".", "4.", "2.", "6.", "1."];

		// loop through detections and add to text
		for (let index = 0; index < detections.length; index++) {
			const detection = detections[index];

			// skip if detection is in omitted strings list
			if (constants.omittedStrings.includes(detection.description)) {
				continue;
			}

			// don't add first element since it is an ocr read of everything on the image
			if (index === 0) {
				continue;
			}

			// size sanity check            
			const detectionHeight = detection.boundingPoly.vertices[2].y - detection.boundingPoly.vertices[0].y;
			const detectionWidth = detection.boundingPoly.vertices[1].x - detection.boundingPoly.vertices[0].x;

			// don't add if detection is too big
			if (detectionWidth > dimensions.width * 0.3 || detectionHeight > dimensions.height * 0.3) {
				continue;
			}

			// don't add if detection height width ratio is off or detection has no width (prevent divide by 0 error)
			if (detectionWidth === 0 || (detectionHeight / detectionWidth > 2 && detection.description.length > 1)) {
				continue;
			}

			// don't add if detection is too far from last detection (text below the actual schedule)
			if (detection.boundingPoly.vertices[0].y - lastTopY > dimensions.height * 0.15) {
				break;
			}

			// determine if space should be added before detection
			const dontAddSpace = (noSpaceDelimiters.includes(detection.description) ||
				noSpaceDelimiters.includes(detections[index + 1]?.description));

			// add detection to text and update lastTopY
			text = text.replace(/[^\x00-\x7F]/g, "");
			text += detection.description + (dontAddSpace ? "" : " ");
			lastTopY = detection.boundingPoly.vertices[0].y;
		}

		console.log(cropText(fixCommonErrors(text)));

		return cropText(fixCommonErrors(text));
	} catch (err) {
		console.log(err);
		throw err;
	}
}

function getTextHeight(detections, dimensions, depts) {
	let textHeight;

	// stores if subject keyword has been read to determine that the department keyword read after it is part of the schedule
	let passedSubjectKeyword = false;

	// loop through detections and get text height
	for (let i = 1; i < detections.length; i++) {
		const detection = detections[i];

		if (detection.description === "Subject") {
			passedSubjectKeyword = true;
		}

		// store text height if it in department keyword or first 3 detections of image
		if (depts.includes(detection.description) && (passedSubjectKeyword || i <= 3)) {
			textHeight = detection.boundingPoly.vertices[2].y - detection.boundingPoly.vertices[0].y;
			// sanity check
			if (textHeight < 0.1 * dimensions.height) {
				break;
			}
		}
	}

	// default text height
	return textHeight ?? 10;
}

/**
 * Crops the text to just the schedule text.
 *
 * @param {String} text
 * @return {String} cropped / refined text 
 */
function cropText(text) {
	try {
		// determine start of schedule text 
		let finalStart = 0;

		// find the last match of the start pattern and sets that as the start index 
		const startSplits = [...text.matchAll(/ Status[/() ]+Position[/() ]+Action /gm)];
		if (startSplits.length > 0) {
			finalStart = startSplits[startSplits.length - 1].index + startSplits[startSplits.length - 1][0].length;
		}

		// find the first match of the end pattern and sets that as the end index
		let endSplits = [];

		// patterns to find the end of the schedule text
		const endSplitPatterns = [/ My Events /gm, / UC San Diego 9500 /gm, / \*/gm];
		for (const endSplitPattern of endSplitPatterns) {
			// combines all matches to one array
			endSplits = [...endSplits, ...text.matchAll(endSplitPattern)];
		}

		// sort array and determines final end index
		endSplits.sort((a, b) => a.index - b.index);
		const finalEnd = endSplits[0]?.index ?? text.length;

		// return cropped text
		return text.substring(finalStart, finalEnd);
	} catch (err) {
		console.log(err);
		throw err;
	}
}

/**
 * Fix common errors in text (see constants).
 */
function fixCommonErrors(text) {
	constants.commonErrors.forEach(error => {
		text = text.replaceAll(error[0], error[1])
	})

	return text;
}

module.exports = { getText }