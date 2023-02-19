const sizeOf = require('image-size');
const constants = require('./constants');
const parseAnnotation = require('./parseAnnotation');

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

        // get the baseline height of text input
        const depts = parseAnnotation.getListOfDepartments();

        let textHeight;
        for (let i = 1; i < detections.length; i++) {
            const detection = detections[i];

            if (depts.includes(detection.description)) {
                textHeight = detection.boundingPoly.vertices[2].y - detection.boundingPoly.vertices[0].y;
                if (textHeight < 0.25 * dimensions.height) {
                    break;
                }
            }
        }

        detections.sort((a, b) => {
            if (Math.abs(a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y) <= textHeight * 2.2) {
                return a.boundingPoly.vertices[0].x - b.boundingPoly.vertices[0].x;
            } else {
                return a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y
            }
        })

        let text = "";
        let lastTopY = 0;

        const noSpaceDelimiters = [",", ":", "-", "/", "."];
        for (let index = 0; index < detections.length; index++) {
            const detection = detections[index];
            if (constants.omittedStrings.includes(detection.description)) {
                continue;
            }

            if (index === 0) {
                continue;
            }

            // size sanity check            
            const detectionHeight = detection.boundingPoly.vertices[2].y - detection.boundingPoly.vertices[0].y;
            const detectionWidth = detection.boundingPoly.vertices[1].x - detection.boundingPoly.vertices[0].x;

            if (detectionWidth > dimensions.width * 0.3 || detectionHeight > dimensions.height * 0.3) {
                continue;
            }

            if (detectionWidth === 0 || (detectionHeight / detectionWidth > 2 && detection.description.length > 1)) {
                continue;
            }

            if (detection.boundingPoly.vertices[0].y - lastTopY > dimensions.height * 0.15) {
                break;
            }

            const addSpace = (noSpaceDelimiters.includes(detection.description) || 
                noSpaceDelimiters.includes(detections[index-1].description));
            
            text += (addSpace ? "" : " ") + detection.description;
            lastTopY = detection.boundingPoly.vertices[0].y;
        }

        return cropText(text);
    } catch (err) {
        console.log(err);
        throw err;
    }
}

function cropText(text) {
    try {
        const startSplits = [...text.matchAll(/ Status.+Position.+Action /gm)];
        const endSplitPatterns = [/ My Events /gm, / UC San Diego 9500 /gm, / \*/gm];
        let endSplits = [];
        for (const endSplitPattern of endSplitPatterns) {
            endSplits = [...endSplits, ...text.matchAll(endSplitPattern)];
        }
        endSplits.sort((a, b) => a.index - b.index);
        let finalStart = 0;
        if (startSplits.length > 0) {
            finalStart = startSplits[startSplits.length - 1].index + startSplits[startSplits.length - 1][0].length;
        }
        const finalEnd = endSplits[0]?.index ?? text.length;
        return text.substring(finalStart, finalEnd);
    } catch (err) {
        console.log(err);
        throw err;
    }
}

module.exports = {getText}