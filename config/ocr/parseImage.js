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
        let passedSubjectKeyword = false;

        for (let i = 1; i < detections.length; i++) {
            const detection = detections[i];
            
            if (detection.description === "Subject") {
                passedSubjectKeyword = true;
            }

            if (depts.includes(detection.description) && (passedSubjectKeyword || i <= 3)) {
                textHeight = detection.boundingPoly.vertices[2].y - detection.boundingPoly.vertices[0].y;
                if (textHeight < 0.25 * dimensions.height) {
                    break;
                }
            }
        }

        detections.sort((a, b) => {
            if (Math.abs(a.boundingPoly.vertices[0].y - b.boundingPoly.vertices[0].y) <= (textHeight ?? 10) * 1.5) {
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

        console.log(text);
        console.log(cropText(text));
        return cropText(text);
    } catch (err) {
        console.log(err);
        throw err;
    }
}

function cropText(text) {
    try {
        let finalStart = 0;
        const startSplits = [...text.matchAll(/ Status[/() ]+Position[/() ]+Action /gm)];
        if (startSplits.length > 0) {
            finalStart = startSplits[startSplits.length - 1].index + startSplits[startSplits.length - 1][0].length;
        }

        let endSplits = [];
        const endSplitPatterns = [/ My Events /gm, / UC San Diego 9500 /gm, / \*/gm];
        for (const endSplitPattern of endSplitPatterns) {
            endSplits = [...endSplits, ...text.matchAll(endSplitPattern)];
        }
        endSplits.sort((a, b) => a.index - b.index);
        const finalEnd = endSplits[0]?.index ?? text.length;
        
        return text.substring(finalStart, finalEnd);
    } catch (err) {
        console.log(err);
        throw err;
    }
}

cropText(" 8_Background on The Great Mau x 8_The Great Maudgalyayana save X M Baris Tasyakan ( MMW 12-Transf UCSD WebReg Export App X webregMain + X ← → C D act.ucsd.edu/webreg2/main?p1=W123&p2=UN#tabs-0 0:archived ucsd internships Journal Search for Classes:Advanced Search ( e.g.,BILD,BILD 3 or computer 3 ) Search A Alert:You have a final for CSE 15L on the First Saturday of Finals week on March 18 2023 My Schedule:Create new,copy,rename Add Event List Calendar Finals Print Schedule View Book List Subject Grade Course Title Section Code Type Instructor Option Units Days Time BLDG Room Status/( Position ) Action CSE 15L Software Tools & Techniques Lab ВОО LE Politz,Joseph Gibbs L 2.00 MW 10:00a-10:50a PETER 108 Enrolled Drop Change B07 LA Th 4:00p-5:50p EBU3B B270 Final Exam FI Sa 03/18/2023 3:00p-5:59p TBA TBA CSE 20 Discrete Mathematics A00 LE Jones,Miles E L 4.00 TuTh 8:00a-9:20a WLH 2001 Enrolled Drop Change A01 DI F 12:00p-12:50p WLH 2001 Final Exam FI Th 03/23/2023 8:00a-10:59a TBA TBA CSE 199 Independent Study 004 IN Moshiri,Alexander Niema P/NP 4.00 TBA TBA TBA TBA Enrolled Drop Change MMW 12 Transforming Traditions A00 LE Balberg,Mira L 6.00 TuTh 9:30a-10:50a WLH 2001 Enrolled Drop Change A22 DI WF 9:00a-9:50a ASANT 123B Final Exam FI Tu 03/21/2023 8:00a-10:59a TBA TBA My Events Name Location Start End Days Action Mon Tue Wed Thu Fri Sat Sun CSE 199 1:00p 1:30p Remove Change 0 ✓ 0000")

module.exports = {getText}