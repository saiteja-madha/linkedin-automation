import abc
import json
from utils import config


class AnswerProvider(abc.ABC):
    def __init__(self):
        self.basic_answers = config["basic_questions"]

    def get_basic_answer(self, ques_id):
        if ques_id not in self.basic_answers:
            raise ValueError(f"Question ID '{ques_id}' not found in config.yaml")
        return self.basic_answers[ques_id]

    @abc.abstractmethod
    def get_answer(self, question, options=None):
        pass


class JsonAnswerProvider(AnswerProvider):
    def __init__(self, filepath):
        super().__init__()
        with open(filepath, "r") as f:
            self.answers = json.load(f)

    def get_answer(self, question, options=None):
        answer = None
        if options is None:
            for q in self.answers:
                if q.type == "TEXT" and q["question"] == question:
                    answer = q["answer"]
        else:
            for q in self.answers:
                if q.type in ["DROPDOWN", "RADIO"] and q["question"] == question and set(q["options"]) == set(options):
                    answer = q["answer"]
        return answer
