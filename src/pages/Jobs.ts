import { Browser, ElementHandle, Page } from "puppeteer";
import BasePage from "./Base";
import { JobFilter } from "../../typings/index";

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
            this.#parseJobDetails().catch((err) => console.log(err));

            // Try Apply
            try {
                const bool = await this.#easyApply();
                if (!bool) throw new Error("Failed to apply");
            } catch (err) {
                console.log("Failed to apply to this job");

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
            console.warn("No progress element for this job?");
            return false;
        }

        let fillAttempts = 0;
        let progress = await this.page.evaluate((el) => el.value, progressEl);

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

            await button.click();
            await this.wait(2000);
            const newProgress = await this.page.evaluate((el) => el?.value, progressEl);
            if (!newProgress) {
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
            await submitBtn.click();
        }

        return true;
    }

    async #tryFillDetails() {
        const divEls = await this.page.$$(
            ".jobs-easy-apply-content div.jobs-easy-apply-form-section__grouping"
        );

        for (let i = 0; i < divEls.length; i++) {
            const qEl = divEls[i];
            const quesText = await qEl.evaluate((el) => el.innerText);
            console.log("Question: ", quesText);

            // TODO: Answer questions automatically
        }

        // TODO: This is a temporary solution
        // Please fill the details manually
        await this.wait(divEls.length * 5000); // wait for 5 seconds per question
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

        const place = await this.page.$eval(
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

        console.log("====================================");
        console.log("Title: ", title);
        console.log("Company: ", company);
        console.log("Place: ", place);
        console.log("Work Type: ", workType);
        console.log("Applicants: ", applicants);
        console.log("Posted: ", posted);
    }
}

export default JobsPage;
