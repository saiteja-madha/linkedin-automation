import { Browser, ElementHandle, Page } from "puppeteer";
import BasePage from "./Base";
import { JobDetails, type JobFilter } from "../../typings/index";
import config from "../../config.js";
import Utils from "../utils";

class JobsPage extends BasePage {
    #path = "/jobs/search";
    #technologiesByYears: Map<string, number>;

    constructor(browser: Browser, page: Page) {
        super(browser, page);
        this.#technologiesByYears = new Map<string, number>();

        const expConfig: { [key: number]: string[] } = config.answers.experience_years;
        for (const year of Object.keys(expConfig)) {
            const yearAsNumber = parseInt(year, 10);
            const technologies = expConfig[yearAsNumber];
            for (const technology of technologies) {
                this.#technologiesByYears.set(technology, parseInt(year));
            }
        }
    }

    async open() {
        if (!this.page) {
            this.page = super.page = await this.browser.newPage();
        }
        await this.page.goto(this.baseUrl + this.#path);
    }

    async applyFilters(filters: JobFilter) {
        const { title, location, easyApply, workLocation, jobType, experienceLevel } = filters;
        let url = this.baseUrl + this.#path;

        const params = new URLSearchParams();
        if (title) params.append("keywords", title);
        if (location) params.append("location", location);
        if (easyApply) params.append("f_AL", "true");

        if (workLocation) {
            if (workLocation === "ON_SITE") params.append("f_WT", "1");
            else if (workLocation === "REMOTE") params.append("f_WT", "2");
            else if (workLocation === "HYBRID") params.append("f_WT", "3");
        }

        if (jobType) {
            if (jobType === "PART_TIME") params.append("f_JT", "P");
            else if (jobType === "FULL_TIME") params.append("f_JT", "F");
            else if (jobType === "CONTRACT") params.append("f_JT", "C");
            else if (jobType === "TEMPORARY") params.append("f_JT", "T");
            else if (jobType === "OTHER") params.append("f_JT", "O");
        }

        if (experienceLevel) {
            if (experienceLevel === "INTERNSHIP") params.append("f_E", "1");
            else if (experienceLevel === "ENTRY_LEVEL") params.append("f_E", "2");
            else if (experienceLevel === "ASSOCIATE") params.append("f_E", "3");
            else if (experienceLevel === "MID_SENIOR") params.append("f_E", "4");
            else if (experienceLevel === "DIRECTOR") params.append("f_E", "5");
            else if (experienceLevel === "EXECUTIVE") params.append("f_E", "6");
        }

        url += "?" + params.toString();

        // open URL
        await this.page.goto(url);

        // wait for results to load
        const el = await this.page.waitForSelector("small.jobs-search-results-list__text");
        await this.wait(5000);

        // get results
        const count = await this.page.evaluate((el) => el?.innerText, el);

        // log results
        return count;
    }

    async apply() {
        const ul = await this.page.$(
            ".jobs-search-results-list > ul.scaffold-layout__list-container"
        );

        if (!ul) {
            return console.warn("Jobs Results Missing on this page!");
        }

        // TODO: Pagination logic

        const pageJobs = await ul.$$("li");
        for (let i = 1; i <= pageJobs.length; i++) {
            // wait and click i'th element
            await this.targetClick(
                `.jobs-search-results-list > ul.scaffold-layout__list-container > li:nth-child(${i})`
            );

            await this.wait(5000);

            // Log job details
            const jobDetails = await this.#parseJobDetails().catch((err) => console.log(err));
            if (!jobDetails) {
                console.log("Failed to parse job details");
                continue;
            }

            let closeModal = false;
            // Try Apply
            try {
                await this.#easyApply(jobDetails);
                if (config.testMode) {
                    closeModal = true; // close modal since we are not actually applying
                    console.log("[TEST MODE]: Applied to this job");
                } else {
                    console.log("Applied to this job");
                }
                Utils.recordApplicationStatus(jobDetails, "SUCCESS");
            } catch (err: any) {
                console.log(`Failed to apply to this job. Reason: ${err.message}`);
                Utils.recordApplicationStatus(jobDetails, "FAILED", err.message);
                closeModal = true;
            }

            if (closeModal) {
                await this.targetClick(".artdeco-modal__dismiss");
                await this.wait(2000);
                await this.targetClick(".artdeco-modal__confirm-dialog-btn:nth-child(1)");
            }
        }
    }

    async #easyApply(jobDetails: JobDetails) {
        // EasyApply button
        const btn = await this.page.$("div.jobs-details__main-content button.jobs-apply-button");
        if (!btn) {
            throw new Error("No Easy Apply button found");
        }
        await btn.click();

        await this.wait(5000);

        // track progress
        const progressEl = await this.page.$(
            ".jobs-easy-apply-content progress.artdeco-completeness-meter-linear__progress-element"
        );

        if (!progressEl) {
            console.log("No progress element found! Considering 100% progress");
        }

        let progress = progressEl ? await progressEl.evaluate((el) => el?.value) : 100;

        while (progress < 100) {
            await this.wait(5000);

            let button = null as ElementHandle<Element> | null;

            // next button
            button = await this.page.$(
                '.jobs-easy-apply-content footer button[aria-label="Continue to next step"]'
            );

            // review button
            if (!button) {
                button = await this.page.$(
                    '.jobs-easy-apply-content footer button[aria-label="Review your application"]'
                );
            }

            if (!button) {
                throw new Error("No Next/Review button found");
            }

            await this.#tryFillDetails(jobDetails);

            await button.click();
            await this.wait(2000);
            const newProgress = await this.page.evaluate((el) => el?.value, progressEl);
            if (!newProgress) {
                // TODO: Check if this is the last step
                throw new Error("No progress found");
            }

            if (newProgress === progress) {
                throw new Error("Could not fill details");
            }

            progress = newProgress;
        }

        // Don't submit in test mode
        if (config.testMode) {
            return;
        }

        // Submit button
        await this.wait(5000);
        const submitBtn = await this.page.$(
            '.jobs-easy-apply-content footer button[aria-label="Submit application"]'
        );
        if (submitBtn) {
            await submitBtn.click();
        }
    }

    async #tryFillDetails(jobDetails: JobDetails) {
        const pb4 = await this.page.$$(".jobs-easy-apply-content div.pb4");

        if (pb4.length === 0) {
            console.log("No b4 element found");
            return;
        }

        for (let i = 0; i < pb4.length; i++) {
            const b4 = pb4[i];
            try {
                await this.#tryUploadResume(b4);
            } catch (err) {}

            try {
                await this.#tryFillQuestions(b4, jobDetails);
            } catch (err) {}
        }
    }

    async #tryUploadResume(b4: ElementHandle<HTMLDivElement>) {
        const input = await b4.$("input[name='file']");
        if (!input) return;

        const span = await b4.$("span[role='button']");
        const innerText = await span?.evaluate((el) => el?.innerText.toLowerCase());

        // Resume
        if (innerText?.includes("resume")) {
            const checkedResume = await b4.$("input[type='radio']:checked");
            if (checkedResume) return;
            const uploadedResumes = await b4.$$("input[type='radio']");

            // Already uploaded
            if (uploadedResumes.length > 0) {
                const latestResume = await b4.$("input[type='radio'] + label");
                if (latestResume) {
                    await latestResume.click();
                    return;
                }
            }

            // TODO: Upload resume
            else {
            }
        }

        // Cover Letter
        if (innerText?.includes("cover")) {
            // TODO: Cover Letter Logic
        }
    }

    async #tryFillQuestions(b4: ElementHandle<HTMLDivElement>, jobDetails: JobDetails) {
        const frmEls = await b4.$$("div.jobs-easy-apply-form-section__grouping");
        let done;

        for (let i = 0; i < frmEls.length; i++) {
            const el = frmEls[i];
            try {
                done = await this.#tryFillRadio(el, jobDetails);
            } catch (err) {
                console.log("Failed to fill radio", err);
            }

            if (done) continue;

            try {
                done = await this.#tryFillDropdown(el, jobDetails);
            } catch (err) {
                console.log("Failed to fill dropdown", err);
            }

            if (done) continue;

            try {
                await this.#tryFillTextBox(el, jobDetails);
            } catch (err) {
                console.log("Failed to fill text box", err);
            }
        }
    }

    async #tryFillTextBox(el: ElementHandle<Element>, jobDetails: JobDetails) {
        const quesEl = await el.$("label");
        const txtField = await el.$("input");
        const txtArea = await el.$("textarea");
        if (!quesEl || (!txtField && !txtArea)) return false;
        const ques = await quesEl.evaluate((el) => el.innerText.toLowerCase().trim());

        // check if text box is already filled
        const value = txtField
            ? await txtField?.evaluate((el) => el.value)
            : await txtArea?.evaluate((el) => el.value);

        const answered = typeof value === "string" && value.length > 0;

        let toEnter = null;
        if (ques.includes("experience")) {
            let years = null;
            for (const [tech, y] of this.#technologiesByYears) {
                if (ques.includes(tech.toLowerCase())) {
                    years = y.toString();
                    break;
                }
            }
            if (!years) {
                years = config.answers.default_experience_years.toString();
            }
            toEnter = years;
        } else if (ques.includes("first name")) {
            toEnter = config.answers.first_name;
        } else if (ques.includes("last name")) {
            toEnter = config.answers.last_name;
        } else if (ques.includes("name")) {
            toEnter = config.answers.first_name + " " + config.answers.last_name;
        } else if (ques.includes("mobile phone")) {
            toEnter = config.answers.phone;
        } else if (ques.includes("website") || ques.includes("portfolio")) {
            toEnter = config.answers.website;
        } else if (ques.includes("linkedin")) {
            toEnter = config.answers.linkedin;
        } else if (ques.includes("github")) {
            toEnter = config.answers.github;
        } else if (ques.includes("street")) {
            toEnter = config.answers.street_address;
        } else if (ques.includes("city")) {
            toEnter = config.answers.city;
        } else if (ques.includes("state") || ques.includes("province")) {
            toEnter = config.answers.state;
        } else if (ques.includes("zip") || ques.includes("postal")) {
            toEnter = config.answers.zip_code;
        }

        // TODO: Fill remaining text boxes

        if (toEnter !== null) {
            if (!answered) {
                await txtField?.type(toEnter, { delay: 1000 });
                await txtArea?.type(toEnter, { delay: 1000 });
            }
            Utils.recordPreparedQuestion(jobDetails, "TEXT", ques, toEnter);
        } else {
            Utils.recordUnpreparedQuestion(jobDetails, "TEXT", ques);
        }

        return true;
    }

    async #tryFillRadio(el: ElementHandle<Element>, jobDetails: JobDetails) {
        const quesEl = await el.$("div.jobs-easy-apply-form-element legend");
        const radios = await el.$$(".fb-text-selectable__option input");
        if (!quesEl || radios.length === 0) return false;
        const ques = await quesEl.evaluate((el) => el.innerText.toLowerCase().trim());

        // check if any radio is already selected
        let answered = false;
        for (const radio of radios) {
            const checked = await radio.evaluate((el) => el.checked);
            if (checked) {
                answered = true;
                break;
            }
        }

        // TODO: Fill radio
        if (answered) {
            Utils.recordPreparedQuestion(jobDetails, "RADIO", ques, "TODO");
        } else {
            Utils.recordUnpreparedQuestion(jobDetails, "RADIO", ques);
        }
        return true;
    }

    async #tryFillDropdown(el: ElementHandle<Element>, jobDetails: JobDetails) {
        const quesEl = await el.$("div.jobs-easy-apply-form-element");
        const select = await quesEl?.$("select");
        if (!quesEl || !select) return false;
        const quesLabel = await quesEl.$("label");
        if (!quesLabel) return false;
        const ques = await quesLabel.evaluate((el) => el.innerText.toLowerCase().trim());

        // check if an option is already selected
        const filled = await select.evaluate((el) => el.value);
        const answered = typeof filled === "string" && filled.length > 0;

        if (answered) {
            Utils.recordPreparedQuestion(jobDetails, "DROPDOWN", ques, filled);
        } else {
            Utils.recordUnpreparedQuestion(jobDetails, "DROPDOWN", ques);
        }

        return true;
    }

    async #parseJobDetails() {
        let sel = ".jobs-details__main-content .jobs-unified-top-card";
        const title = await this.page.$eval(
            `${sel} h2.jobs-unified-top-card__job-title`,
            (el) => el.innerText
        );

        const company = await this.page.$eval(
            `${sel} span.jobs-unified-top-card__company-name`,
            (el) => el.innerText
        );

        const location = await this.page.$eval(
            `${sel} span.jobs-unified-top-card__bullet`,
            (el) => el.innerText
        );

        const workType = await this.page.$eval(
            `${sel} span.jobs-unified-top-card__workplace-type`,
            (el) => el.innerText
        );

        const applicants = await this.page.$eval(
            `${sel} .jobs-unified-top-card__subtitle-secondary-grouping > span.jobs-unified-top-card__bullet`,
            (el) => el.innerText
        );

        const posted = await this.page.$eval(
            `${sel} span.jobs-unified-top-card__posted-date`,
            (el) => el.innerText
        );

        const jobId = this.page.url().split("currentJobId=")[1].split("&")[0];

        // TODO: Style this
        console.log("====================================");
        console.log("Title: ", title);
        console.log("Company: ", company);
        console.log("Location: ", location);
        console.log("Work Type: ", workType);
        console.log("Applicants: ", applicants);
        console.log("Posted: ", posted);

        return { jobId, title, company, location, workType, applicants, posted };
    }
}

export default JobsPage;
