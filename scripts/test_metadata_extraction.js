const { localExtractMetadata } = require('../utils/fileProcessor');

// Sample text from the user's document
const sampleText = `Project ID: test001

Academic Year: 2024/2025Department of computer science and engineering (DoscE)

students:

Frank john
T21-89-56432

Suzan Michael
T21-89-56431

Trevor terance
T21-89-56430

Justin frank
T21-89-56434

supervisor: Dr Tyrone

Title: "A Blockchain-Based Voting System for University Elections"

Problem Statement:

Current university election systems suffer from a lack of transparency and trust, often leading to disputes and low voter turnout. There is a need for a secure and verifiable voting system that ensures integrity, confidentiality, and traceability while maintaining ease of use for students and administrators.

Objectives:

To analyze existing digital voting systems and their limitations.
To design a blockchain-based voting application for university elections.
To implement a prototype system with voter registration, ballot casting, and result tallying features.
To evaluate the system's performance in terms of security, usability, and transparency.`;

// Test the local metadata extraction
console.log("Testing local metadata extraction with sample text...");
const metadata = localExtractMetadata(sampleText);

// Display the results
console.log("\n--- Extraction Results ---");
console.log("Title:", metadata.title);
console.log("Supervisor:", metadata.supervisor);
console.log("Students:", metadata.students);
console.log("Academic Year:", metadata.academicYear);
console.log("Department:", metadata.department);
console.log("Problem Statement:", metadata.problemStatement);
console.log("Objectives:", metadata.objectives);

// Check if problem statement and objectives were extracted correctly
console.log("\n--- Validation ---");
if (metadata.problemStatement) {
  console.log("✅ Problem Statement was successfully extracted");
} else {
  console.log("❌ Problem Statement extraction failed");
}

if (metadata.objectives && metadata.objectives.length > 0) {
  console.log(`✅ ${metadata.objectives.length} Objectives were successfully extracted`);
} else {
  console.log("❌ Objectives extraction failed");
}
