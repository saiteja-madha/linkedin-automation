import { type ApplicationStatus, type JobDetails, type QuestionType } from "../typings";
import fs from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";

const unpreparedQuestions: Set<string> = new Set<string>();

function init() {
    const dir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const filePath = path.join(dir, "unprepared_questions.csv");
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
        unpreparedQuestions.add(line + "\n");
    }
}

init();

export default class Utils {
    static recordApplicationStatus(
        details: JobDetails,
        status: ApplicationStatus,
        reason?: string
    ) {
        const date = new Date();
        const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const filePath = path.join(__dirname, "..", "logs", "application_status.csv");
        const csv = stringify([
            [
                dateString,
                details.jobId,
                details.title,
                details.company,
                details.location,
                details.applicants,
                status,
                reason,
            ],
        ]);

        fs.appendFile(filePath, csv, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    static recordPreparedQuestion(
        details: JobDetails,
        type: QuestionType,
        question: string,
        answer: string
    ) {
        const dir = path.join(__dirname, "..", "logs");
        const filePath = path.join(dir, "answered_questions.csv");
        const csv = stringify([[details.jobId, type, question, answer]]);

        fs.appendFile(filePath, csv, (err) => {
            if (err) {
                return console.log(err);
            }
        });
    }

    static recordUnpreparedQuestion(details: JobDetails, type: QuestionType, question: string) {
        const dir = path.join(__dirname, "..", "logs");
        const filePath = path.join(dir, "unprepared_questions.csv");
        const csv = stringify([[details.jobId, type, question]]);

        if (unpreparedQuestions.has(csv)) return;

        fs.appendFile(filePath, csv, (err) => {
            if (err) {
                return console.log(err);
            }
            unpreparedQuestions.add(csv);
        });
    }
}
