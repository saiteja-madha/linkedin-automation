from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from .Base import BasePage
from urllib.parse import urlencode, urlparse, parse_qs
from providers.answer_providers import AnswerProvider
from utils import (
    config,
    record_answered_question,
    record_unprepared_question,
    record_application_status,
)
from typing import Literal


class JobDetails:
    def __init__(self, url: str, el: WebElement) -> None:
        self.url = url
        self.job_id = parse_qs(urlparse(url).query).get("currentJobId").pop()

        try:
            self.title = el.find_element(
                By.CSS_SELECTOR,
                ".jobs-unified-top-card span.job-details-jobs-unified-top-card__job-title-link",
            ).text
        except Exception:
            self.title = ""

        try:
            details_el = el.find_element(
                By.CSS_SELECTOR,
                ".jobs-details__main-content .jobs-unified-top-card .job-details-jobs-unified-top-card__primary-description-without-tagline",
            ).text
            details = details_el.split("·")
            self.company = details[0].strip()
            self.location = details[1].strip()
            self.posted = details[2].strip()
            self.applicants = details[3].strip()
        except Exception:
            self.company = self.location = self.posted = self.applicants = ""

        print(
            f"""
        JobId: {self.job_id}
        Title: {self.title}
        Company: {self.company}
        Location: {self.location}
        Applicants: {self.applicants}
        Posted: {self.posted}
        """
        )


class JobsPage(BasePage):
    path = "/jobs/search"

    def __init__(self, driver, answer_provider: AnswerProvider) -> None:
        super().__init__(driver)
        self.current_job = None
        self.answer_provider = answer_provider

    def open(self):
        self.driver.get(self.base_url + self.path)
        return self

    def apply_filters(
        self,
        title=None,
        location=None,
        work_location: Literal["ON_SITE", "REMOTE", "HYBRID"] = None,
        job_type: Literal["PART_TIME", "FULL_TIME", "CONTRACT", "TEMPORARY", "OTHER"] = None,
        experience_level: Literal[
            "INTERNSHIP",
            "ENTRY_LEVEL",
            "ASSOCIATE",
            "MID_SENIOR",
            "DIRECTOR",
            "EXECUTIVE",
        ] = None,
    ):

        params = {
            "f_AL": "true",  # Easy Apply
        }

        if title:
            params["keywords"] = title

        if location:
            params["location"] = location

        if work_location:
            if work_location == "ON_SITE":
                params["f_WT"] = "1"
            elif work_location == "REMOTE":
                params["f_WT"] = "2"
            elif work_location == "HYBRID":
                params["f_WT"] = "3"

        if job_type:
            if job_type == "PART_TIME":
                params["f_JT"] = "P"
            elif job_type == "FULL_TIME":
                params["f_JT"] = "F"
            elif job_type == "CONTRACT":
                params["f_JT"] = "C"
            elif job_type == "TEMPORARY":
                params["f_JT"] = "T"
            elif job_type == "OTHER":
                params["f_JT"] = "O"

        if experience_level:
            if experience_level == "INTERNSHIP":
                params["f_E"] = "1"
            elif experience_level == "ENTRY_LEVEL":
                params["f_E"] = "2"
            elif experience_level == "ASSOCIATE":
                params["f_E"] = "3"
            elif experience_level == "MID_SENIOR":
                params["f_E"] = "4"
            elif experience_level == "DIRECTOR":
                params["f_E"] = "5"
            elif experience_level == "EXECUTIVE":
                params["f_E"] = "6"

        url = self.base_url + self.path + "?" + urlencode(params)

        # open URL
        self.driver.get(url)

        # wait for results to load
        el = self.wait_for_selector(By.CSS_SELECTOR, "small.jobs-search-results-list__text")

        print("Total jobs found:", el.text)

    def apply(self):
        ul = self.wait_for_selector(
            By.CSS_SELECTOR,
            ".jobs-search-results-list > ul.scaffold-layout__list-container",
            fail=False,
        )

        if not ul:
            print("Jobs Results Missing on this page!")
            return

        # TODO: Pagination Logic

        page_jobs = ul.find_elements(By.CSS_SELECTOR, "li")
        for i in range(1, len(page_jobs) + 1):
            print(f"Applying to job {i} of {len(page_jobs)}")
            self.wait_and_click(
                By.CSS_SELECTOR,
                f".jobs-search-results-list > ul.scaffold-layout__list-container > li:nth-child({i})",
            )
            self.wait(1)
            self.current_job = JobDetails(self.driver.current_url, self.driver)

            applied = self.find_element(
                by=By.CSS_SELECTOR,
                value="li-icon.artdeco-inline-feedback__icon",
                fail=False,
            )

            if applied:
                print("Already applied to this job!")
                record_application_status(self.current_job, "ALREADY_APPLIED")
            else:
                self.easy_apply()
                self.wait(1)

    def easy_apply(self):
        failed = False
        started = False
        try:
            # EasyApply button
            btn = self.wait_for_selector(
                By.CSS_SELECTOR,
                "div.jobs-details__main-content button.jobs-apply-button",
                fail=False,
            )

            assert btn, "Easy Apply button not found!"
            btn.click()
            started = True

            # Job Search Safety Modal
            modal = self.wait_for_selector(
                By.CSS_SELECTOR,
                "div.job-details-pre-apply-safety-tips-modal__footer",
                timeout=2,
                fail=False,
            )

            if modal:
                modal.find_element(By.CSS_SELECTOR, "button.jobs-apply-button").click()

            # track progress
            progress_el = self.wait_for_selector(
                By.CSS_SELECTOR,
                ".jobs-easy-apply-content progress.artdeco-completeness-meter-linear__progress-element",
                fail=False,
            )

            progress = 100
            if progress_el:
                progress = int(progress_el.get_attribute("value"))
            else:
                print("No progress element found! Considering 100% progress")

            while progress < 100:
                button = None

                # next button
                button = self.wait_for_selector(
                    By.CSS_SELECTOR,
                    ".jobs-easy-apply-content footer button[aria-label='Continue to next step']",
                    fail=False,
                )

                # review button
                if button is None:
                    button = self.wait_for_selector(
                        By.CSS_SELECTOR,
                        ".jobs-easy-apply-content footer button[aria-label='Review your application']",
                        fail=False,
                    )

                assert button, "No next or review button found!"

                # Fill out the form
                pb4 = self.driver.find_elements(By.CSS_SELECTOR, ".jobs-easy-apply-content div.pb4")

                for el in pb4:
                    try:
                        self.try_upload_resume(el)
                    except Exception:
                        pass

                    try:
                        self.try_fill_questions(el)
                    except Exception:
                        pass

                button.click()
                self.wait(0.5)

                new_progress = self.wait_for_selector(
                    By.CSS_SELECTOR,
                    ".jobs-easy-apply-content progress.artdeco-completeness-meter-linear__progress-element",
                    fail=False,
                )

                assert new_progress, "Progress element not found!"
                new_progress = int(progress_el.get_attribute("value"))

                assert new_progress != progress, "Progress not updated! Could not fill details?"

                progress = new_progress

        except Exception as e:
            failed = True
            record_application_status(self.current_job, "FAILED", str(e))
            print(f"Failed to apply to this job. Reason: {e}")

        close_modal = True if failed and started else False

        if not failed:
            # Don't submit in test mode
            if config["dev"]["test_mode"]:
                print("Test mode. Not submitting application.")
                record_application_status(self.current_job, "APPLIED_TEST_MODE")
                close_modal = True
            else:
                self.wait_and_click(
                    By.CSS_SELECTOR,
                    "button.jobs-apply-form__submit-button",
                )
                record_application_status(self.current_job, "APPLIED")

        if close_modal:
            self.wait_and_click(
                By.CSS_SELECTOR,
                ".artdeco-modal__dismiss",
            )
            self.wait(0.5)
            self.wait_and_click(
                By.CSS_SELECTOR,
                ".artdeco-modal__confirm-dialog-btn:nth-child(1)",
            )

    def try_upload_resume(self, el: WebElement):
        inp = el.find_element(By.CSS_SELECTOR, "input[type='file']")
        if inp is None:
            return

        span = el.find_element(By.CSS_SELECTOR, "span[role='button']")
        inner_text = span.text.lower()

        # Resume
        if "resume" in inner_text:
            checked_resume = el.find_element(By.CSS_SELECTOR, "input[type='radio']:checked")
            if checked_resume:
                return
            uploaded_resumes = el.find_elements(By.CSS_SELECTOR, "input[type='radio'] + label")
            if uploaded_resumes:
                latest_resume = el.find_element("input[type='radio'] + label")
                if latest_resume:
                    latest_resume.click()
                    return

            else:
                pass  # TODO: Upload resume

        # Cover Letter
        if "cover letter" in inner_text:
            pass  # TODO: Cover Letter Logic

    def try_fill_questions(self, el: WebElement):
        form_els = el.find_elements(By.CSS_SELECTOR, "div.jobs-easy-apply-form-section__grouping")

        for el in form_els:
            done = False
            if not done:
                try:
                    done = self.try_fill_radio(el)
                except Exception:
                    print("Failed to fill radio")

            if not done:
                try:
                    done = self.try_fill_dropdown(el)
                except Exception:
                    print("Failed to fill dropdown")

            if not done:
                try:
                    done = self.try_fill_input(el)
                except Exception:
                    print("Failed to fill input")

    def try_fill_input(self, el: WebElement):
        ques_el = self.find_element(el, By.CSS_SELECTOR, "label", False)

        # TODO: Verify this logic
        if ques_el and self.find_element(ques_el, By.CSS_SELECTOR, "span[aria-hidden='true']", False) is not None:
            ques_el = self.find_element(ques_el, By.CSS_SELECTOR, "span[aria-hidden='true']", False)

        # Some don't have labels but have a preceding span
        if not ques_el:
            ques_el = self.find_element(
                el,
                By.XPATH,
                "preceding::span[contains(@class, 'jobs-easy-apply-form-section__group-title')][1]",
                False,
            )

        text_field = self.find_element(el, By.CSS_SELECTOR, "input", False)
        text_area = self.find_element(el, By.CSS_SELECTOR, "textarea", False)
        if not ques_el or (not text_field and not text_area):
            return False
        ques = ques_el.text.lower()

        value = text_field.get_attribute("value") if text_field else text_area.get_attribute("value")
        answered = value != ""

        if answered:
            record_answered_question(self.current_job, ques, "TEXT", value)
        else:
            to_enter = None
            if "years of experience" in ques or "work experience" in ques:
                for experience in self.answer_provider.get_basic_answer("experience"):
                    year = experience.get("years")
                    skills = experience.get("skills")
                    for tech in skills:
                        if tech in ques:
                            to_enter = year
                            break

                if not to_enter:
                    to_enter = self.answer_provider.get_basic_answer("default_experience")

            elif ques == "first name":
                to_enter = self.answer_provider.get_basic_answer("first_name")
            elif ques == "last name":
                to_enter = self.answer_provider.get_basic_answer("last_name")
            elif ques == "mobile phone number":
                to_enter = self.answer_provider.get_basic_answer("mobile_phone_number")
            elif ques == "email address":
                to_enter = self.answer_provider.get_basic_answer("email_address")
            elif ques == "city":
                to_enter = self.answer_provider.get_basic_answer("city")

            # Additional Questions
            if not to_enter:
                to_enter = self.answer_provider.get_answer(ques)

            # Enter the value
            if to_enter:
                if text_field:
                    text_field.send_keys(to_enter)
                else:
                    text_area.send_keys(to_enter)
                record_answered_question(self.current_job, ques, "TEXT", to_enter)
            else:
                record_unprepared_question(self.current_job, ques, "TEXT")

        return True

    def try_fill_radio(self, el: WebElement):
        ques_el = self.find_element(
            el, By.CSS_SELECTOR, "div.jobs-easy-apply-form-element legend span[aria-hidden='true']", False
        )
        radios = self.find_elements(el, By.CSS_SELECTOR, ".fb-text-selectable__option input", False)
        if not ques_el or len(radios) == 0:
            return False
        ques = ques_el.text.lower()

        answered = False
        options = []
        for radio in radios:
            options.append(radio.get_attribute("value"))
            if radio.is_selected():
                answered = radio.get_attribute("value")

        if answered:
            # TODO: Get already answered value
            record_answered_question(self.current_job, ques, "RADIO", answered)
        else:
            # TODO: Implement logic to select a radio
            record_unprepared_question(self.current_job, ques, "RADIO", options)

        return True

    def try_fill_dropdown(self, el: WebElement):
        ques_el = self.find_element(el, By.CSS_SELECTOR, "div.jobs-easy-apply-form-element", False)
        dropdown = self.find_element(el, By.CSS_SELECTOR, "select", False)
        if not ques_el or not dropdown:
            return False
        ques_label = self.find_element(ques_el, By.CSS_SELECTOR, "label span:not(.visually-hidden)", False)

        # Some don't have labels but have a preceding span
        if not ques_label:
            ques_label = self.find_element(
                el,
                By.XPATH,
                "preceding::span[contains(@class, 'jobs-easy-apply-form-section__group-title')][1]",
                False,
            )
        ques = ques_label.text.lower()
        answered = dropdown.get_attribute("value") not in ["", "Select an option"]

        options = []
        for option in dropdown.find_elements(By.CSS_SELECTOR, "option"):
            if option.get_attribute("value") not in ["", "Select an option"]:
                options.append(option.text)

        if answered:
            # TODO: Get already answered value
            record_answered_question(self.current_job, ques, "DROPDOWN", dropdown.get_attribute("value"))
        else:
            # TODO: Implement logic to select a dropdown
            record_unprepared_question(self.current_job, ques, "DROPDOWN", options)
        return True
