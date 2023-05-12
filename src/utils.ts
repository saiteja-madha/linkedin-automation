import { type ApplicationStatus, type JobDetails, type QuestionType } from "../typings";
import fs from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";

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
        const filePath = path.join(dir, "unprepared_questions.csv");
        const csv = stringify([[type, question]]);

        fs.appendFile(filePath, csv, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
}
