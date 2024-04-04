import os
from selenium.webdriver import ChromeOptions, Chrome
from pages.Jobs import JobsPage
from pages.Login import LoginPage
from providers.answer_providers import JsonAnswerProvider
from utils import config


os.makedirs("userData", exist_ok=True)

options = ChromeOptions()
options.add_argument(f"user-data-dir={os.getcwd()}/userData")
for argument in config["dev"]["args"]:
    options.add_argument(argument)


browser = Chrome(options=options)

# Login to LinkedIn
login_page = LoginPage(browser)
login_page.login(username=config["credentials"]["email"], password=config["credentials"]["password"])


# Answer Provider
file_path = os.path.join(os.path.dirname(__file__), "..", "questions.json")
answer_provider = JsonAnswerProvider(file_path)


# Job Search
jobs_page = JobsPage(browser, answer_provider)
jobs_page.apply_filters(
    title=config["search"]["keyword"],
    location=config["search"]["location"],
    work_location=config["search"]["work_location"],
    job_type=config["search"]["job_type"],
    experience_level=config["search"]["experience_level"],
)
jobs_page.apply()


input("Press Enter to continue...")
browser.quit()
