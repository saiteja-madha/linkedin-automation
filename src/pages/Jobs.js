import BasePage from "./Base.js";

class JobsPage extends BasePage {
    #path = "/jobs/search";

    /**
     * @param {import('puppeteer').Browser} browser
     * @param {import('puppeteer').Page} page
     */
    constructor(browser, page = null) {
        super(browser, page);
        this.browser = browser;
    }

    async open() {
        if (!this.page) {
            this.page = super.page = await this.browser.newPage();
        }
        await this.page.goto(this.baseUrl + this.#path);
    }

    async applyFilters(filters = {}) {
        const { title, location, easyApply, workLocation, jobType, experienceLevel } = filters;
        let url = this.baseUrl + this.#path;

        const params = new URLSearchParams();
        if (title) params.append("keywords", title);
        if (location) params.append("location", location);
        if (easyApply) params.append("f_AL", true);

        if (workLocation) {
            if (workLocation === "ON_SITE") params.append("f_WT", 1);
            else if (workLocation === "REMOTE") params.append("f_WT", 2);
            else if (workLocation === "HYBRID") params.append("f_WT", 3);
        }

        if (jobType) {
            if (jobType === "PART_TIME") params.append("f_JT", "P");
            else if (jobType === "FULL_TIME") params.append("f_JT", "F");
            else if (jobType === "CONTRACT") params.append("f_JT", "C");
            else if (jobType === "TEMPORARY") params.append("f_JT", "T");
            else if (jobType === "OTHER") params.append("f_JT", "O");
        }

        if (experienceLevel) {
            if (experienceLevel === "INTERNSHIP") params.append("f_E", 1);
            else if (experienceLevel === "ENTRY_LEVEL") params.append("f_E", 2);
            else if (experienceLevel === "ASSOCIATE") params.append("f_E", 3);
            else if (experienceLevel === "MID_SENIOR") params.append("f_E", 4);
            else if (experienceLevel === "DIRECTOR") params.append("f_E", 5);
            else if (experienceLevel === "EXECUTIVE") params.append("f_E", 6);
        }

        url += "?" + params.toString();

        // open URL
        await this.page.goto(url);

        // wait for results to load
        const el = await this.page.waitForSelector("small.jobs-search-results-list__text");
        await this.wait(5000);

        // get results
        const count = await this.page.evaluate((el) => el.innerText, el);

        // log results
        console.log(`Job count: ${count}`);

        const ul = await this.page.$(
            ".jobs-search-results-list > ul.scaffold-layout__list-container"
        );
        const li = await ul.$$("li");

        for (let i = 1; i <= li.length; i++) {
            // wait and click i'th element
            await this.buttonClick(
                `.jobs-search-results-list > ul.scaffold-layout__list-container > li:nth-child(${i})`
            );

            await this.wait(5000);
            await this.parseJobDetails();
        }

        console.log("Test");
    }

    async parseJobDetails() {
        let sel = ".jobs-details__main-content .jobs-unified-top-card";
        const title = await this.page.$eval(
            `${sel} .jobs-unified-top-card__job-title`,
            (el) => el.innerText
        );

        const company = await this.page.$eval(
            `${sel} .jobs-unified-top-card__company-name`,
            (el) => el.innerText
        );

        const place = await this.page.$eval(
            `${sel} .jobs-unified-top-card__bullet`,
            (el) => el.innerText
        );

        const workType = await this.page.$eval(
            `${sel} .jobs-unified-top-card__workplace-type`,
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
