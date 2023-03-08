import puppeteer from "puppeteer";
import config from "./../config.js";
import JobsPage from "./pages/Jobs.js";
import LoginPage from "./pages/Login.js";

async function init() {
    const browser = await puppeteer.launch({
        headless: config.headless,
        defaultViewport: null,
        userDataDir: "./userData",
        args: config.args,
        timeout: config.timeout,
    });

    const pages = await browser.pages();
    const initialPage = pages[0];

    const loginPage = new LoginPage(browser, initialPage);

    await loginPage.open();
    await loginPage.login();

    const jobs = new JobsPage(browser, initialPage);
    const count = await jobs.applyFilters({
        title: config.keyword,
        location: config.location,
        easyApply: true,
        workLocation: config.workLocation,
        jobType: config.jobType,
        experienceLevel: config.experienceLevel,
    });

    console.log(`Job count: ${count}`);
    jobs.apply();
}

init();
