import { Browser, ElementHandle, Page } from "puppeteer";
import BasePage from "./Base";
import { type JobFilter } from "../../typings/index";
import config from "../../config.js";
import Utils from "../utils";

class JobsPage extends BasePage {
    #path = "/jobs/search";

    constructor(browser: Browser, page: Page) {
        super(browser, page);
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

            // Try Apply
            try {
                const bool = await this.#easyApply();
                if (!bool) throw new Error("Failed to apply");

                Utils.writeToCSV(jobDetails, "SUCCESS");
            } catch (err) {
                console.log("Failed to apply to this job");

                Utils.writeToCSV(jobDetails, "FAILED");

                // Close Easy Apply Modal
                await this.targetClick(".artdeco-modal__dismiss");
                await this.wait(2000);
                await this.targetClick(".artdeco-modal__confirm-dialog-btn:nth-child(1)");
            }
        }
    }

    async #easyApply() {
        // EasyApply button
        const btn = await this.page.$("div.jobs-details__main-content button.jobs-apply-button");
        if (!btn) {
            console.error("ERROR: No Easy Apply button found");
            return false;
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

        let fillAttempts = 0;
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
                console.error("ERROR: No button found");
                return false;
            }

            // To log questions in test mode
            if (config.testMode) {
                await this.#tryFillDetails();
            }

            await button.click();
            await this.wait(2000);
            const newProgress = await this.page.evaluate((el) => el?.value, progressEl);
            if (!newProgress) {
                // TODO: Check if this is the last step
                console.error("ERROR: No progress found");
                return false;
            }

            if (newProgress === progress) {
                fillAttempts++;
                if (fillAttempts > 3) {
                    console.error("ERROR: Failed to fill details");
                    return false;
                }
                console.log(`Attempting to fill the form. Attempt #${fillAttempts}/3`);
                await this.#tryFillDetails();
            } else {
                fillAttempts = 0;
            }

            progress = newProgress;
        }

        // Submit button
        await this.wait(5000);
        const submitBtn = await this.page.$(
            '.jobs-easy-apply-content footer button[aria-label="Submit application"]'
        );
        if (submitBtn) {
            if (config.testMode) {
                console.log("TEST MODE: Submitted application");
                return false;
            } else {
                await submitBtn.click();
            }
        }

        return true;
    }

    async #tryFillDetails() {
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
                await this.#tryFillQuestions(b4);
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

    async #tryFillQuestions(b4: ElementHandle<HTMLDivElement>) {
        const frmEls = await b4.$$("div.jobs-easy-apply-form-section__grouping");

        for (let i = 0; i < frmEls.length; i++) {
            const el = frmEls[i];
            try {
                await this.#tryFillTextBox(el);
            } catch (err) {
                console.log("Failed to fill text box", err);
            }

            try {
                await this.#tryFillRadio(el);
            } catch (err) {
                console.log("Failed to fill radio", err);
            }

            try {
                await this.#tryFillDropdown(el);
            } catch (err) {
                console.log("Failed to fill dropdown", err);
            }
        }
    }

    async #tryFillTextBox(el: ElementHandle<Element>) {
        // TODO: This logic is not working. Radio box ques are being filled here
        const quesEl = await el.$("label");
        const txtField = await el.$("input");
        const txtArea = await el.$("textarea");
        if (!quesEl || (!txtField && !txtArea)) return;
        const ques = await quesEl.evaluate((el) => el.innerText.toLowerCase().trim());

        // TODO: Fill text box

        Utils.recordUnpreparedQuestion("TEXT", ques);
    }

    async #tryFillRadio(el: ElementHandle<Element>) {
        const quesEl = await el.$("div.jobs-easy-apply-form-element");
        const radios = await el.$$(".fb-text-selectable__option");
        if (!quesEl || radios.length === 0) return;
        const ques = await quesEl.evaluate((el) => el.innerText.toLowerCase().trim());

        // TODO: Fill radio

        Utils.recordUnpreparedQuestion("RADIO", ques);
    }

    async #tryFillDropdown(el: ElementHandle<Element>) {
        const quesEl = await el.$("div.jobs-easy-apply-form-element");
        const select = await quesEl?.$("select");
        if (!quesEl || !select) return;
        const quesLabel = await quesEl.$("label");
        if (!quesLabel) return;
        const ques = await quesLabel.evaluate((el) => el.innerText.toLowerCase().trim());

        // TODO: Fill dropdown

        Utils.recordUnpreparedQuestion("DROPDOWN", ques);
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
