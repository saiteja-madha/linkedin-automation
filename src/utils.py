import os
import yaml
import json
import csv
from datetime import datetime

questions = []
config = None
unprepared_questions = []

# Load the config file
with open(os.path.join(os.path.dirname(__file__), "..", "config.yaml"), "r") as file:
    config = yaml.safe_load(file)

# Load questions
with open(os.path.join(os.path.dirname(__file__), "..", "questions.json"), "r") as file:
    questions = json.load(file)

# Prepare logs directory
if not os.path.exists(config["logs_dir"]):
    os.makedirs(config["logs_dir"])

# Load unprepared questions
file_path = os.path.join(config["logs_dir"], "unprepared_questions.json")
if os.path.exists(file_path):
    with open(file_path, "r") as file:
        unprepared_questions = json.load(file)
else:
    with open(file_path, "w") as file:
        json.dump(unprepared_questions, file)


def record_unprepared_question(job, question, type, options=None):
    data = {"job": job.job_id, "question": question, "type": type}
    if options is not None:
        data["options"] = options
    unprepared_questions.append(data)
    with open(file_path, "w") as file:
        json.dump(unprepared_questions, file)


def record_answered_question(job, question, type, answer):
    file_path = os.path.join(config["logs_dir"], "answered_questions.csv")
    if not os.path.exists(file_path):
        with open(file_path, "w") as file:
            writer = csv.writer(file)
            writer.writerow(["JOB_ID", "QUESTION", "TYPE", "ANSWER"])

    with open(file_path, "a") as file:
        writer = csv.writer(file)
        writer.writerow([job.job_id, question, type, answer])


def record_application_status(job, status, reason=None):
    file_path = os.path.join(config["logs_dir"], "application_status.csv")
    if not os.path.exists(file_path):
        with open(file_path, "w") as file:
            writer = csv.writer(file)
            writer.writerow(
                ["APPLICATION_DATE", "JOB_ID", "JOB_ROLE", "COMPANY", "LOCATION", "APPLICANTS", "STATUS", "REASON"]
            )

    with open(file_path, "a") as file:
        writer = csv.writer(file)
        writer.writerow(
            [
                datetime.now().strftime("%Y-%m-%d"),
                job.job_id,
                job.title,
                job.company,
                job.location,
                job.applicants,
                status,
                reason or "",
            ]
        )
