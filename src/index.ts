import puppeteer from "puppeteer";
import config from "./../config.js";
import LoginPage from "./pages/Login";
import JobsPage from "./pages/Jobs";
import { WorkLocation, JobType, ExperienceLevel } from "../typings/";

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
        workLocation: config.workLocation as WorkLocation,
        jobType: config.jobType as JobType,
        experienceLevel: config.experienceLevel as ExperienceLevel,
    });

    console.log(`Job count: ${count}`);
    jobs.apply();
}

init();
