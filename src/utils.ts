import { type ApplicationStatus, type JobDetails, type QuestionType } from "../typings";
import fs from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";
import config from "../config";

const unpreparedQuestions: Set<string> = new Set<string>();
const unpreparedCsv = config.testMode ? "all_questions.csv" : "unprepared_questions.csv";

function init() {
    const dir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const filePath = path.join(dir, unpreparedCsv);
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
        unpreparedQuestions.add(line + "\n");
    }
}

init();

export default class Utils {
    static writeToCSV(details: JobDetails, status: ApplicationStatus) {
        const date = new Date();
        const dateString = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}`;
        const dir = path.join(__dirname, "..", "logs", dateString);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        const filePath = path.join(dir, `${status}.csv`);
        const csv = stringify([details]);

        fs.appendFile(filePath, csv, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    static recordUnpreparedQuestion(type: QuestionType, question: string) {
        const dir = path.join(__dirname, "..", "logs");
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        const filePath = path.join(dir, unpreparedCsv);
        const csv = stringify([[type, question]]);

        if (unpreparedQuestions.has(csv)) return;

        fs.appendFile(filePath, csv, (err) => {
            if (err) {
                return console.log(err);
            }
            unpreparedQuestions.add(csv);
        });
    }
}
